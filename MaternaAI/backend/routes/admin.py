from flask import Blueprint, request, jsonify, g
from services.auth import require_auth
from db import query

admin_bp = Blueprint("admin", __name__)

@admin_bp.route("/pending-doctors", methods=["GET"])
@require_auth
def get_pending_doctors():
    if g.user.get("role") != "admin":
        return jsonify({"error": "Admin access required"}), 403
    
    doctors = query("""
        SELECT id, name, phone, age, division, district, area, emergency_contact, status, verification_documents, created_at
        FROM users
        WHERE role = 'clinician' AND status = 'pending'
        ORDER BY created_at DESC
    """)
    return jsonify(doctors)

@admin_bp.route("/doctors/<int:doctor_id>/verify", methods=["POST"])
@require_auth
def verify_doctor(doctor_id):
    if g.user.get("role") != "admin":
        return jsonify({"error": "Admin access required"}), 403
        
    data = request.get_json() or {}
    action = data.get("action") # 'approve' or 'reject'
    if action not in ("approve", "reject"):
        return jsonify({"error": "Invalid action. Must be 'approve' or 'reject'"}), 400
        
    new_status = "approved" if action == "approve" else "rejected"
    
    # Check if the doctor exists
    doctor = query("SELECT id, role FROM users WHERE id = %s", (doctor_id,), fetch="one")
    if not doctor:
        return jsonify({"error": "Doctor not found"}), 404
        
    if doctor["role"] != "clinician":
        return jsonify({"error": "User is not a clinician"}), 400
        
    query("UPDATE users SET status = %s WHERE id = %s", (new_status, doctor_id), fetch="none")
    
    return jsonify({"success": True, "message": f"Doctor account has been {new_status}."})
