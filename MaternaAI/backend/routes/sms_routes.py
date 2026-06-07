from flask import Blueprint, request, jsonify
from db import query
from services.sms import send_simulated_sms

sms_bp = Blueprint("sms", __name__)

@sms_bp.route("/send_offline_notify", methods=["POST"])
def send_offline_notify():
    """
    Sends a simulated carrier SMS alert to an offline recipient.
    Body: { sender_name, recipient_phone, message_content }
    """
    data = request.json or {}
    sender_name = data.get("sender_name", "Someone")
    recipient_phone = data.get("recipient_phone")
    message_content = data.get("message_content", "")
    
    if not recipient_phone:
        return jsonify({"error": "recipient_phone is required"}), 400
        
    sms_body = f"MaternaAI: You received a new message from {sender_name}: '{message_content[:50]}...'. Log in to view details."
    send_simulated_sms(recipient_phone, sms_body)
    
    # Send FCM Push Notification if token exists
    from services.firebase_service import send_fcm_notification
    user_row = query("SELECT fcm_token FROM users WHERE phone = %s", (recipient_phone,), fetch="one")
    if user_row and user_row.get("fcm_token"):
        send_fcm_notification(
            fcm_token=user_row["fcm_token"],
            title=f"New message from {sender_name}",
            body=f"{message_content[:100]}",
            data={"type": "chat_message"}
        )
    
    return jsonify({"success": True, "message": "Offline SMS and FCM notification sent."})

@sms_bp.route("/logs", methods=["GET"])
def get_sms_logs():
    """
    Fetches the logs of simulated SMS messages.
    """
    limit = int(request.args.get("limit", 20))
    logs = query("""
        SELECT id, recipient_phone, body, status, created_at
        FROM sms_logs
        ORDER BY created_at DESC
        LIMIT %s
    """, (limit,))
    return jsonify(logs)
