from flask import Blueprint, request, jsonify
from db import query
import json
from datetime import datetime, timezone
from services.firebase_service import sync_abuse_alert_to_firestore
sos_bp = Blueprint("sos", __name__)

EMERGENCY_CONTACTS = [
    {"name": "National Emergency", "number": "999", "type": "emergency"},
    {"name": "Ambulance", "number": "199", "type": "ambulance"},
    {"name": "Police", "number": "999", "type": "police"},
    {"name": "Women Helpline", "number": "10921", "type": "helpline"},
    {"name": "Domestic Violence Helpline", "number": "10921", "type": "helpline"},
]

def _write_clinician_alert(patient_id, alert_type, title, body):
    """Insert into clinician_alerts and return the new row id."""
    try:
        result = query(
            """
            INSERT INTO clinician_alerts (patient_id, alert_type, title, body)
            VALUES (%s, %s, %s, %s)
            RETURNING id, created_at
            """,
            (patient_id, alert_type, title, body),
            fetch="one",
        )
        return result
    except Exception as e:
        print(f"[SOS] DB write failed: {e}")
        return None
    
def _get_user_info(user_id):
    """Fetch minimal patient info for alert enrichment."""
    try:
        return query(
            "SELECT name, phone FROM users WHERE id = %s",
            (user_id,),
            fetch="one",
        )
    except Exception:
        return None


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

@sos_bp.route("/abuse-alert", methods=["POST"])
def abuse_alert():
    """
    Triggered either by:
      • AI detection in chat.py (silent, automatic)
      • Long-press on the avatar in Layout.jsx (manual stealth)
    """

    data = request.json or {}
    user_id = data.get("user_id")
    trigger = data.get("trigger", data.get("method", "unknown"))
    reason = data.get("reason", "Abuse alert triggered")
    location = data.get("location", "Unknown")
    confidence = float(data.get("confidence", 1.0))

    if user_id:
        existing = query(
            """SELECT id FROM clinician_alerts
               WHERE patient_id = %s
                 AND alert_type = 'abuse_alert'
                 AND is_dismissed = FALSE
               LIMIT 1""",
            (user_id,),
            fetch="one"
        )
        if existing:
            return jsonify({
                "message": "Alert already active",
                "alert_sent": False,
                "firebase_payload": None,
                "emergency_contacts": EMERGENCY_CONTACTS,
            }), 200

    user_info  = _get_user_info(user_id) if user_id else None
    patient_name = user_info["name"] if user_info else "Unknown Patient"

    title = "🔴 SILENT ABUSE ALERT"
    body  = (
        f"Patient: {patient_name} (ID {user_id}). "
        f"Trigger: {trigger}. "
        f"Reason: {reason}. "
        f"Location: {location}. "
        f"Confidence: {confidence:.0%}."
    )
     
    row = None
    if user_id:
        row = _write_clinician_alert(user_id, "abuse_alert", title, body)
 

    firebase_payload = None
    if row and row.get("id"):
        firebase_payload = {
        "alert_id": row["id"] if row else None,
        "type": "abuse_alert",
        "title": title,
        "body": body,
        "patient_id": user_id,
        "patient_name": patient_name,
        "trigger": trigger,
        "location": location,
        "confidence": confidence,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "alert_id": row["id"] if row else None,
        "is_read": False,
    }
        
    try:
        sync_abuse_alert_to_firestore(
            alert_id=row["id"],
            patient_id=user_id,
            patient_name=patient_name,
            title=title,
            body=body,
            trigger=trigger,
            location=location,
            confidence=confidence
        )
    except Exception as e:
        print(f"[SOS] Firebase sync failed in route: {e}")
    

    return jsonify({
        "message": "Abuse alert dispatched" if row else "Alert failed",
        "alert_sent": row is not None,
        "firebase_payload": firebase_payload,
        "emergency_contacts": EMERGENCY_CONTACTS,
    }), 201 if row else 500



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