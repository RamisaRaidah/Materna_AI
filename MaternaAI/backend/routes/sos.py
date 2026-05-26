from flask import Blueprint, request, jsonify
from db import query

sos_bp = Blueprint("sos", __name__)

EMERGENCY_CONTACTS = [
    {"name": "National Emergency", "number": "999", "type": "emergency"},
    {"name": "Ambulance", "number": "199", "type": "ambulance"},
    {"name": "Police", "number": "999", "type": "police"},
    {"name": "Women Helpline", "number": "10921", "type": "helpline"},
    {"name": "Domestic Violence Helpline", "number": "10921", "type": "helpline"},
]

@sos_bp.route("/trigger", methods=["POST"])
def trigger_sos():
    data = request.json or {}
    user_id = data.get("user_id")
    reason = data.get("reason", "Emergency SOS triggered")
    location = data.get("location", "Unknown")
    symptoms = data.get("symptoms", [])

    try:
        if user_id:
            query("""
                INSERT INTO clinician_alerts (patient_id, alert_type, title, body)
                VALUES (%s, %s, %s, %s)
            """, (
                user_id,
                "sos",
                "🚨 EMERGENCY SOS TRIGGERED",
                f"Reason: {reason}. Location: {location}. Symptoms: {', '.join(symptoms) if symptoms else 'Not specified'}"
            ), fetch="none")

        return jsonify({
            "message": "SOS alert sent to clinician network",
            "emergency_contacts": EMERGENCY_CONTACTS,
            "alert_sent": True
        }), 201

    except Exception as e:
        return jsonify({
            "emergency_contacts": EMERGENCY_CONTACTS,
            "alert_sent": False,
            "error": str(e)
        }), 200


@sos_bp.route("/contacts", methods=["GET"])
def get_emergency_contacts():
    return jsonify(EMERGENCY_CONTACTS)


@sos_bp.route("/contacts/personal/<int:user_id>", methods=["GET"])
def get_personal_contacts(user_id):
    try:
        row = query("""
            SELECT emergency_contacts FROM birth_plans
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT 1
        """, (user_id,), fetch="one")

        personal = row["emergency_contacts"] if row and row["emergency_contacts"] else []
        return jsonify({
            "personal_contacts": personal,
            "emergency_contacts": EMERGENCY_CONTACTS
        })
    except Exception as e:
        return jsonify({"emergency_contacts": EMERGENCY_CONTACTS}), 200