from flask import Blueprint, request, jsonify, g
from db import query
from services.auth import hash_password, check_password, create_token, require_auth

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    name  = data.get("name", "").strip()
    phone = data.get("phone", "").strip()
    password = data.get("password", "")
    role = data.get("role", "patient")

    division = data.get("division", "").strip()
    district = data.get("district", "").strip()
    area = data.get("area", "").strip()

    if not name or not phone or not password or not division or not district or not area:
        return jsonify({"error": "name, phone, password, division, district and area are required"}), 400
 
    existing = query("SELECT id FROM users WHERE phone = %s", (phone,), fetch="one")
    if existing:
        return jsonify({"error": "Phone number already registered"}), 409
 
    pw_hash = hash_password(password)
    user = query(
        """INSERT INTO users (name, phone, password_hash, role, age, weeks_pregnant,
           is_postpartum, persona, division, district, area, emergency_contact)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
           RETURNING *""",
        (name, phone, pw_hash, role,
         data.get("age"), data.get("weeks_pregnant"),
         data.get("is_postpartum", False),
         data.get("persona", "pregnant"),
         division, district, area, data.get("emergency_contact", "")),
        fetch="one"
    )
    token = create_token(user["id"], user["role"])
    safe = {k: v for k, v in user.items() if k != "password_hash"}
    return jsonify({"token": token, "user": safe}), 201
 
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    phone    = data.get("phone", "").strip()
    password = data.get("password", "")
 
    if not phone or not password:
        return jsonify({"error": "phone and password required"}), 400
 
    user = query("SELECT * FROM users WHERE phone = %s", (phone,), fetch="one")
    if not user or not check_password(password, user["password_hash"]):
        return jsonify({"error": "Invalid credentials"}), 401
 
    token = create_token(user["id"], user["role"])
    safe = {k: v for k, v in user.items() if k != "password_hash"}
    return jsonify({"token": token, "user": safe})

@auth_bp.route("/me", methods=["GET"])
@require_auth
def me():
    safe = {k: v for k, v in g.user.items() if k != "password_hash"}
    return jsonify(safe)

@auth_bp.route("/me", methods=["PATCH"])
@require_auth
def update_me():
    data = request.get_json() or {}
    allowed = ["name", "age", "weeks_pregnant", "is_postpartum", "persona",
               "division", "district", "area", "emergency_contact", "due_date"]
    updates = {k: v for k, v in data.items() if k in allowed}
    if not updates:
        return jsonify({"error": "Nothing to update"}), 400
 
    set_clause = ", ".join(f"{k} = %s" for k in updates)
    values = list(updates.values()) + [g.user["id"]]
    updated_user = query(f"UPDATE users SET {set_clause} WHERE id = %s RETURNING *", values, fetch="one")
    safe = {k: v for k, v in updated_user.items() if k != "password_hash"}
    return jsonify({"message": "Profile updated successfully!", "user": safe})

@auth_bp.route("/me/password", methods=["PATCH"])
@require_auth
def change_password():
    data = request.get_json() or {}
    current_password = data.get("currentPassword", "")
    new_password = data.get("newPassword", "")

    if not current_password or not new_password:
        return jsonify({"error": "Current and new passwords are required"}), 400

    if not check_password(current_password, g.user["password_hash"]):
        return jsonify({"error": "Incorrect original password verification."}), 401

    if len(new_password) < 6:
        return jsonify({"error": "Security requirement: Password must be at least 6 characters long."}), 400

    new_hash = hash_password(new_password)
    query("UPDATE users SET password_hash = %s WHERE id = %s", (new_hash, g.user["id"]), fetch="none")
    return jsonify({"message": "Security credentials rotated successfully."}), 200

@auth_bp.route("/me", methods=["DELETE"])
@require_auth
def delete_account():
    query("DELETE FROM users WHERE id = %s", (g.user["id"],), fetch="none")
    return jsonify({"message": "Account permanently deleted"}), 200