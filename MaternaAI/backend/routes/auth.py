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

    if not name or not phone or not password:
        return jsonify({"error": "name, phone and password are required"}), 400
 
    existing = query("SELECT id FROM users WHERE phone = %s", (phone,), fetch="one")
    if existing:
        return jsonify({"error": "Phone number already registered"}), 409
 
    pw_hash = hash_password(password)
    user = query(
        """INSERT INTO users (name, phone, password_hash, role, age, weeks_pregnant,
           is_postpartum, persona, location, emergency_contact)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
           RETURNING id, name, phone, role, persona""",
        (name, phone, pw_hash, role,
         data.get("age"), data.get("weeks_pregnant"),
         data.get("is_postpartum", False),
         data.get("persona", "pregnant"),
         data.get("location", ""), data.get("emergency_contact", "")),
        fetch="one"
    )
    token = create_token(user["id"], user["role"])
    return jsonify({"token": token, "user": user}), 201
 
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
               "location", "emergency_contact", "due_date"]
    updates = {k: v for k, v in data.items() if k in allowed}
    if not updates:
        return jsonify({"error": "Nothing to update"}), 400
 
    set_clause = ", ".join(f"{k} = %s" for k in updates)
    values = list(updates.values()) + [g.user["id"]]
    query(f"UPDATE users SET {set_clause} WHERE id = %s", values, fetch="none")
    return jsonify({"message": "Profile updated"})