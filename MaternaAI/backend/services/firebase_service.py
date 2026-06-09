import os
import requests
import json
import logging
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, messaging, firestore

logger = logging.getLogger("firebase_sync")

# Read project config from env variables
PROJECT_ID = os.getenv("VITE_FIREBASE_PROJECT_ID", "maternaai-bd943")

# Initialize Firebase Admin
db= None
try:
    cred_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "serviceAccountKey.json")
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        logger.info("Firebase Admin initialized successfully.")
    else:
        logger.warning(f"serviceAccountKey.json not found at {cred_path}. FCM push notifications will fail.")
except Exception as e:
    logger.error(f"Failed to initialize Firebase Admin: {e}")


def send_fcm_notification(fcm_token, title, body, data=None):
    """
    Sends a Push Notification to a specific device using its FCM token.
    """
    if not fcm_token:
        logger.warning("No FCM token provided; cannot send push notification.")
        return False
        
    try:
        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            token=fcm_token,
            data=data or {}
        )
        response = messaging.send(message)
        logger.info(f"Successfully sent FCM push notification: {response}")
        return True
    except Exception as e:
        logger.error(f"Error sending FCM push notification: {e}")
        return False

def sync_notification_to_firestore(user_id, title, body, notif_type="info", data=None, document_id=None):
    """
    Pushes a notification to Firebase Firestore via the Firestore REST API.
    Collection: /notifications/{userId}/items
    """
    url = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents/notifications/{user_id}/items"
    if document_id:
        url += f"?documentId={document_id}"
    
    # Format current timestamp in ISO format with Z suffix
    timestamp_str = datetime.utcnow().isoformat() + "Z"
    
    fields = {
        "userId": {"stringValue": str(user_id)},
        "title": {"stringValue": title},
        "body": {"stringValue": body},
        "type": {"stringValue": notif_type},
        "isRead": {"booleanValue": False},
        "createdAt": {"stringValue": timestamp_str}
    }
    
    if data:
        fields["data"] = {"stringValue": json.dumps(data)}
        
    payload = {"fields": fields}
    
    try:
        res = requests.post(url, json=payload, timeout=10)
        if res.status_code in (200, 201):
            logger.info(f"Sync to Firestore succeeded for user {user_id}")
            return res.json()
        else:
            logger.error(f"Firestore Sync error {res.status_code}: {res.text}")
    except Exception as e:
        logger.error(f"Firestore request exception: {e}")
        
    return None

def sync_abuse_alert_to_firestore(alert_id, patient_id, patient_name, title, body, trigger, location, confidence):
    print("DEBUG: Entering sync_abuse_alert_to_firestore")
    if db is None:
        print("[AbuseDetect] Firestore client not initialized — skipping write")
        return
    try:
        from datetime import datetime, timezone
        doc_id = f"alert_{alert_id or int(datetime.now().timestamp())}"
        db.collection("abuse_alerts").document(doc_id).set({
            "alert_id": alert_id,
            "patient_id": patient_id,
            "patient_name": patient_name,
            "title": title,
            "body": body,
            "trigger": trigger,
            "location": location,
            "confidence": confidence,
            "is_read": False,
            "createdAt": datetime.now(timezone.utc),
        })
        print(f"[AbuseDetect] Firestore written for alert {alert_id}")
    except Exception as e:
        print(f"[AbuseDetect] Firestore write failed: {e}")
