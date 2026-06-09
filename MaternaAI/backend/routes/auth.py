from flask import Blueprint, request, jsonify, g
import random
from db import query
from services.auth import hash_password, check_password, create_token, require_auth
from services.sms import send_simulated_sms
from services.abuse_detection import PREDEFINED_SAFE_WORDS, validate_safe_word

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/otp/send", methods=["POST"])
def send_otp():
    data = request.get_json() or {}
    phone = data.get("phone", "").strip()
    if not phone:
        return jsonify({"error": "Phone number is required"}), 400
        
    code = f"{random.randint(100000, 999999)}"
    
    query("""
        INSERT INTO phone_verifications (phone, code, expires_at)
        VALUES (%s, %s, NOW() + INTERVAL '10 minutes')
        ON CONFLICT (phone) DO UPDATE
        SET code = EXCLUDED.code, created_at = NOW(), expires_at = EXCLUDED.expires_at
    """, (phone, code), fetch="none")
    
    send_simulated_sms(phone, f"MaternaAI: Your OTP for registration is {code}. It is valid for 10 minutes.")
    
    # Send the code back so the frontend can display the simulated SMS notification
    return jsonify({
        "success": True, 
        "message": "OTP sent successfully.",
        "simulated_code": code
    }), 200

@auth_bp.route("/otp/verify", methods=["POST"])
def verify_otp():
    data = request.get_json() or {}
    phone = data.get("phone", "").strip()
    code = data.get("code", "").strip()
    
    if not phone or not code:
        return jsonify({"error": "phone and code are required"}), 400
        
    verification = query("""
        SELECT * FROM phone_verifications
        WHERE phone = %s AND code = %s AND expires_at > NOW()
    """, (phone, code), fetch="one")
    
    if not verification:
        return jsonify({"error": "Invalid or expired OTP code"}), 400
        
    return jsonify({"success": True, "message": "Phone number verified successfully."}), 200

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
    otp_code = data.get("otp_code", "").strip()

    if not name or not phone or not password or not division or not district or not area or not otp_code:
        return jsonify({"error": "name, phone, password, division, district, area and otp_code are required"}), 400
 
    # Verify OTP
    verification = query("""
        SELECT * FROM phone_verifications
        WHERE phone = %s AND code = %s AND expires_at > NOW()
    """, (phone, otp_code), fetch="one")
    if not verification:
        return jsonify({"error": "Invalid or expired OTP code"}), 400

    existing = query("SELECT id FROM users WHERE phone = %s", (phone,), fetch="one")
    if existing:
        return jsonify({"error": "Phone number already registered"}), 409
 
    # Clean up verification entry on successful validation
    query("DELETE FROM phone_verifications WHERE phone = %s", (phone,), fetch="none")

 
    pw_hash = hash_password(password)
    status = "pending" if role == "clinician" else "approved"
    verification_docs = data.get("verification_documents", "")

    user = query(
        """INSERT INTO users (name, phone, password_hash, role, age, weeks_pregnant,
           is_postpartum, persona, division, district, area, emergency_contact, status, verification_documents)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
           RETURNING *""",
        (name, phone, pw_hash, role,
         data.get("age"), data.get("weeks_pregnant"),
         data.get("is_postpartum", False),
         data.get("persona", "pregnant"),
         division, district, area, data.get("emergency_contact", ""),
         status, verification_docs),
        fetch="one"
    )
    token = create_token(user["id"], user["role"])
    query("UPDATE users SET last_seen_at = NOW() WHERE id = %s", (user["id"],), fetch="none")
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

    if user.get("status") == "rejected":
        return jsonify({"error": "Your account has been rejected and you are banned from the system."}), 403
 
    query("UPDATE users SET last_seen_at = NOW() WHERE id = %s", (user["id"],), fetch="none")

    token = create_token(user["id"], user["role"])
    safe = {k: v for k, v in user.items() if k != "password_hash"}
    return jsonify({"token": token, "user": safe})

@auth_bp.route("/presence", methods=["POST"])
@require_auth
def update_presence():
    query("UPDATE users SET last_seen_at = NOW() WHERE id = %s", (g.user["id"],), fetch="none")
    return jsonify({"success": True})

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
               "division", "district", "area", "emergency_contact", "due_date", "profile_image", "location", "latitude", "longitude", "safe_word"]
    updates = {k: v for k, v in data.items() if k in allowed and v is not None}

    if "safe_word" in updates:
        raw_word = updates["safe_word"]
        validated = validate_safe_word(raw_word)
        if raw_word != "" and validated is None:
            return jsonify({
                "error": "Invalid safe word. Please choose one of the predefined options.",
                "valid_options": sorted(PREDEFINED_SAFE_WORDS),
            }), 400
        updates["safe_word"] = validated or ""

    if not updates:
        return jsonify({"error": "Nothing to update"}), 400
 
    set_clause = ", ".join(f"{k} = %s" for k in updates)
    values = list(updates.values()) + [g.user["id"]]
    updated_user = query(f"UPDATE users SET {set_clause} WHERE id = %s RETURNING *", values, fetch="one")
    
    # Trigger risk recomputation if key health fields are updated
    health_keys = {"age", "weeks_pregnant", "is_postpartum", "persona", "due_date"}
    if any(k in updates for k in health_keys):
        from services.risk_engine import compute_user_risk
        try:
            current_profile = query("SELECT language FROM risk_profiles WHERE user_id = %s", (g.user["id"],), fetch="one")
            lang = current_profile.get("language", "bn") if current_profile else "bn"
            compute_user_risk(g.user["id"], lang=lang)
        except Exception as e:
            print(f"Failed to auto-recompute risk after profile update: {e}")

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

@auth_bp.route("/me/fcm", methods=["POST"])
@require_auth
def register_fcm_token():
    data = request.get_json() or {}
    token = data.get("fcmToken", "").strip()
    if not token:
        return jsonify({"error": "Token is required"}), 400

    query("UPDATE users SET fcm_token = %s WHERE id = %s", (token, g.user["id"]), fetch="none")
    return jsonify({"message": "FCM token registered successfully."}), 200