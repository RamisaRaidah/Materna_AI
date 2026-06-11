from flask import Blueprint, request, jsonify, Response
from services.rag import rag_query, clinician_rag_query, get_db
from services.tts import generate_tts_stream, is_bengali
from services.abuse_detection import run_detection_async
import json

chat_bp = Blueprint("chat", __name__)

_user_message_counts: dict[int, int] = {}

def _increment_message_count(user_id: int) -> int:
    _user_message_counts[user_id] = _user_message_counts.get(user_id, 0) + 1
    return _user_message_counts[user_id]

def ensure_user_exists(user_id, name="Mim Akter"):
    """
    Ensure the user exists in the database to satisfy the foreign key constraint.
    """
    phone = f"+88017{user_id:08d}"
    if not user_id:
        return False
        
    conn = None
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE id = %s", (user_id,))
        if not cur.fetchone():
            cur.execute("""
                INSERT INTO users (id, name, phone, password_hash, role)
                VALUES (%s, %s, %s, %s, %s)
            """, (user_id, name, phone, 'dummy_hash', 'patient'))
            conn.commit()
        cur.close()
        return True
    except Exception as e:
        print("Failed to ensure user exists:", e)
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()

def save_chat_message(user_id, role, content, intent=None, language='en'):
    """
    Persist chat message to the database.
    """
    if not user_id:
        return
        
    ensure_user_exists(user_id)
    
    conn = None
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO chat_messages (user_id, role, content, intent, language)
            VALUES (%s, %s, %s, %s, %s)
        """, (user_id, role, content, intent, language))
        conn.commit()
        cur.close()
    except Exception as e:
        print("Failed to save chat message:", e)
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()


def get_recent_history_for_detection(user_id: int, limit: int = 8, after_ts=None) -> list[dict]:
    """Fetch recent messages for abuse detection. after_ts filters to only post-resolve messages."""
    conn = None
    try:
        conn = get_db()
        cur = conn.cursor()
        if after_ts:
            cur.execute("""
                SELECT role, content FROM chat_messages
                WHERE user_id = %s AND created_at > %s
                ORDER BY id DESC LIMIT %s
            """, (user_id, after_ts, limit))
        else:
            cur.execute("""
                SELECT role, content FROM chat_messages
                WHERE user_id = %s
                ORDER BY id DESC LIMIT %s
            """, (user_id, limit))
        rows = cur.fetchall()
        cur.close()
        rows.reverse()
        return [{"role": r[0], "content": r[1]} for r in rows]
    except Exception:
        return []
    finally:
        if conn:
            conn.close()

def _get_alert_state(user_id: int) -> dict:
    """Returns whether an alert is currently open, and when the last one was resolved."""
    conn = None
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            SELECT
                EXISTS(
                    SELECT 1 FROM clinician_alerts
                    WHERE patient_id = %s
                      AND is_dismissed = FALSE
                      AND alert_type = 'abuse_alert'
                    LIMIT 1
                ) AS has_open_abuse_alert,
                (
                    SELECT created_at FROM clinician_alerts
                    WHERE patient_id = %s
                      AND is_dismissed = TRUE
                      AND alert_type = 'abuse_alert'
                    ORDER BY created_at DESC
                    LIMIT 1
                ) AS last_resolved_at
        """, (user_id, user_id))
        row = cur.fetchone()
        cur.close()
        return {
            "has_open_abuse_alert": row[0] if row else False,
            "has_open_alert": row[0] if row else False,
            "last_resolved_at": row[1] if row else None,
        }
    except Exception:
        return {"has_open_abuse_alert": False, "has_open_alert": False, "last_resolved_at": None}
    finally:
        if conn:
            conn.close()

            
def get_user_safe_word(user_id: int) -> str | None:
    from services.abuse_detection import PREDEFINED_SAFE_WORDS
    conn = None
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT safe_word FROM users WHERE id = %s", (user_id,))
        row = cur.fetchone()
        cur.close()
        word = row[0] if row and row[0] else None
        if word and word.strip().lower() in PREDEFINED_SAFE_WORDS:
            result = word.strip().lower()
        else:
            result = None
        print(f"[AbuseDetect] safe_word for user {user_id}: '{result}'")
        return result
    except Exception:
        return None
    finally:
        if conn:
            conn.close()

def _dispatch_abuse_alert(user_id, reason, location, method, confidence):
    print(f"[AbuseDetect] _dispatch_abuse_alert CALLED for user {user_id}")
    try:
        from db import query

        def _get_name(uid):
            try:
                row = query("SELECT name FROM users WHERE id = %s", (uid,), fetch="one")
                return row["name"] if row else "Unknown Patient"
            except Exception:
                return "Unknown Patient"

        patient_name = _get_name(user_id)
        title = "🔴 SILENT ABUSE ALERT"
        body = (
            f"Patient: {patient_name} (ID {user_id}). "
            f"Trigger: {method}. Reason: {reason}. "
            f"Location: {location}. Confidence: {confidence:.0%}."
        )
        result = query(
            """
            INSERT INTO clinician_alerts (patient_id, alert_type, title, body)
            VALUES (%s, %s, %s, %s)
            RETURNING id
            """,
            (user_id, "abuse_alert", title, body),
            fetch="one",
        )
        alert_id = result["id"] if result else None
        print(f"[AbuseDetect] Alert saved for user {user_id} via {method}")

        from services.firebase_service import sync_abuse_alert_to_firestore
        sync_abuse_alert_to_firestore(
            alert_id=alert_id,
            patient_id=user_id,
            patient_name=patient_name,
            title=title,
            body=body,
            trigger=method,
            location=location,
            confidence=confidence,
        )
    except Exception as e:
        print(f"[AbuseDetect] Failed to save alert: {e}")


def _run_abuse_detection(user_id: int, text: str, location: str = "Unknown"):
    safe_word = get_user_safe_word(user_id)
    state = _get_alert_state(user_id)
    # AI only sees messages sent after the last resolved alert — prevents re-triggering on old danger messages
    history = get_recent_history_for_detection(
        user_id,
        limit=8,
        after_ts=state["last_resolved_at"]
    )
    msg_count = _increment_message_count(user_id)

    run_detection_async(
        text=text,
        safe_word=safe_word,
        recent_history=history,
        message_count=msg_count,
        user_id=user_id,
        location=location,
        on_trigger=_dispatch_abuse_alert,
        has_open_alert=state["has_open_alert"],
    )
 


# scan_message_and_recompute_risk has been refactored and moved to services.risk_engine as extract_symptoms_from_text_and_update_risk

@chat_bp.route("/message", methods=["POST"])
@chat_bp.route("/analyze", methods=["POST"])
def analyze():
    data = request.json
    user_input = data.get("message", "")
    user_profile = data.get("profile", {})
    mode = data.get("mode", "danger")  # danger / ppd / nutrition / general
    user_id = data.get("user_id", 1)  # Default dummy user_id for sessionless calls
    location   = data.get("location", "Unknown")

    if not user_input:
        return jsonify({"error": "No message provided"}), 400

    # Auto-detect language
    lang = 'bn' if is_bengali(user_input) else 'en'

    # Save user message to database
    save_chat_message(user_id, 'user', user_input, intent=mode, language=lang)

    # Scan for symptoms and recompute risk if needed in background
    try:
        import threading
        from services.risk_engine import extract_symptoms_from_text_and_update_risk
        threading.Thread(
            target=extract_symptoms_from_text_and_update_risk,
            args=(user_id, user_input, lang)
        ).start()
    except Exception as e:
        print("Symptom scanning failed:", e)

    _run_abuse_detection(user_id, user_input, location)

    # Run RAG Query — pass detected language and user_id to leverage history context
    try:
        if user_profile.get("role") == "clinician":
            clinician_mode_map = {
                "triage": "rapid_triage",
                "vitals": "vitals_watch",
                "followup": "follow_up",
                "community": "community"
            }
            backend_mode = clinician_mode_map.get(mode, mode)
            response = clinician_rag_query(
                user_input=user_input,
                clinician_profile=user_profile,
                patients=[],
                mode=backend_mode,
                detected_lang=lang,
                clinician_id=user_id
            )
        else:
            response = rag_query(user_input, user_profile, mode, detected_lang=lang, user_id=user_id)
    except Exception as e:
        print("RAG failed:", e)
        response = "দুঃখিত, এখন উত্তর দিতে সমস্যা হচ্ছে। পরে আবার চেষ্টা করুন।"

    # Save assistant response to database
    save_chat_message(user_id, 'assistant', response, intent=mode, language=lang)

    # Secondary extraction ONLY if we are in nutrition mode
    extracted_nutrients = {"iron": 0.0, "folate": 0.0, "calcium": 0.0, "protein": 0.0}
    if mode == "nutrition":
        from services.rag import extract_nutrition_metrics
        extracted_nutrients = extract_nutrition_metrics(user_input, response)

    return jsonify({
        "response": response,
        "extractedNutrients": extracted_nutrients,
        "mode": mode
    })


@chat_bp.route("/clinician", methods=["POST"])
def clinician_chat():
    """
    Clinician-only chat endpoint.
    Routes to clinician_rag_query with the correct mode and patient list.

    Expected JSON body:
    {
        "message":  "Summarise Fatima's last 14 days",
        "mode":     "rapid_triage" | "vitals_watch" | "follow_up" | "community",
        "clinician_id": 42,
        "clinician_profile": {
            "name": "Dr. Reza",
            "role": "Obstetrician",
            "facility": "Kaliganj Upazila Health Complex"
        },
        "patients": [
            {
                "name": "Fatima",
                "weeks_pregnant": 28,
                "bp_history": "130/80 → 150/95 over 14 days",
                "glucose_logs": "3 elevated fasting readings",
                "fetal_movement": "Reduced twice in last week",
                "missed_appointments": 0
            }
        ]
    }
    """
    data = request.json or {}

    user_input = data.get("message", "").strip()
    if not user_input:
        return jsonify({"error": "No message provided"}), 400

    mode = data.get("mode", "rapid_triage")
    valid_modes = {"rapid_triage", "vitals_watch", "follow_up", "community"}
    if mode not in valid_modes:
        return jsonify({"error": f"Invalid mode. Choose from: {', '.join(valid_modes)}"}), 400

    clinician_id       = data.get("clinician_id")
    clinician_profile  = data.get("clinician_profile", {})
    patients           = data.get("patients", [])

    # Language detection — clinicians are usually in English but support Bengali too
    lang = "bn" if is_bengali(user_input) else "en"

    # Persist clinician message (uses same chat_messages table; role stays 'user')
    if clinician_id:
        save_chat_message(clinician_id, "user", user_input, intent=mode, language=lang)

    try:
        response = clinician_rag_query(
            user_input=user_input,
            clinician_profile=clinician_profile,
            patients=patients,
            mode=mode,
            detected_lang=lang,
            clinician_id=clinician_id,
        )
    except Exception as e:
        print(f"Clinician RAG failed: {e}")
        response = (
            "Clinical decision support is temporarily unavailable. "
            "Please follow standard protocols and escalate to a supervisor if needed."
        )

    # Persist assistant response
    if clinician_id:
        save_chat_message(clinician_id, "assistant", response, intent=mode, language=lang)

    return jsonify({
        "response": response,
        "mode": mode,
        "patients_processed": len(patients),
    })

@chat_bp.route("/speak", methods=["POST"])
def speak():
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    
    audio_file = request.files["audio"]
    audio_bytes = audio_file.read()
    mime_type = audio_file.mimetype or "audio/webm"

    user_profile_str = request.form.get("profile", "{}")
    try:
        user_profile = json.loads(user_profile_str)
    except:
        user_profile = {}
        
    mode = request.form.get("mode", "danger")
    user_id = request.form.get("user_id")
    location = request.form.get("location", "Unknown") 
    try:
        user_id = int(user_id) if user_id else 1
    except:
        user_id = 1

    # 1. Retrieve client-side transcription if provided by the Web Speech API
    transcribed_text = request.form.get("client_transcribed_text", "").strip()

    # 2. Server-side Gemini transcription as fallback
    if not transcribed_text:
        from llm_client import get_gemini_model, mark_exhausted, is_quota_error, GeminiKeysExhausted
        import google.generativeai as genai
        prompt = (
            "You are an expert audio transcriber. Transcribe this audio recording precisely. "
            "If the audio is in Bengali (or its local spoken dialects), write the transcription entirely in standard Bengali script. "
            "If the audio is in English, transcribe it in English. "
            "Do not translate. Just transcribe the exact words spoken. "
            "Return ONLY the plain text transcript. Do not include any introductory or conversational text, and do not wrap it in quotes or markdown formatting. "
            "If the audio is completely silent or contains no clear speech, return '[অডিও অস্পষ্ট - Audio unclear]'."
        )
        key = None
        while True:
            try:
                model, key = get_gemini_model("gemini-2.5-flash")
                response = model.generate_content([
                    {"mime_type": mime_type, "data": audio_bytes},
                    prompt
                ])
                if response and response.text:
                    transcribed_text = response.text.strip()
                break
            except GeminiKeysExhausted:
                print("Gemini transcription — all keys exhausted.")
                break
            except Exception as e:
                if is_quota_error(e):
                    mark_exhausted(key)
                    continue  # try next key
                print(f"Server-side Gemini transcription failed: {str(e)}")
                break

    if not transcribed_text:
        transcribed_text = "[অডিও অস্পষ্ট - Audio unclear]"

    # Clean up any trailing quotes or markdown wraps
    transcribed_text = transcribed_text.replace('"', '').replace("'", "").strip()
    if transcribed_text.startswith("```"):
        lines = transcribed_text.splitlines()
        cleaned_lines = [line for line in lines if not line.strip().startswith("```")]
        transcribed_text = "".join(cleaned_lines).strip()

    # Auto-detect language
    lang = 'bn' if is_bengali(transcribed_text) else 'en'

    # Save user speech transcription to database
    save_chat_message(user_id, 'user', transcribed_text, intent=mode, language=lang)

    # Scan for symptoms and recompute risk if needed in background
    if transcribed_text and transcribed_text != "[অডিও অস্পষ্ট - Audio unclear]":
        try:
            import threading
            from services.risk_engine import extract_symptoms_from_text_and_update_risk
            threading.Thread(
                target=extract_symptoms_from_text_and_update_risk,
                args=(user_id, transcribed_text, lang)
            ).start()
        except Exception as e:
            print("Symptom scanning failed:", e)

        _run_abuse_detection(user_id, transcribed_text, location)

    # Pass transcribed text to RAG with history context
    try:
        if user_profile.get("role") == "clinician":
            clinician_mode_map = {
                "triage": "rapid_triage",
                "vitals": "vitals_watch",
                "followup": "follow_up",
                "community": "community"
            }
            backend_mode = clinician_mode_map.get(mode, mode)
            response = clinician_rag_query(
                user_input=transcribed_text,
                clinician_profile=user_profile,
                patients=[],
                mode=backend_mode,
                detected_lang=lang,
                clinician_id=user_id
            )
        else:
            response = rag_query(transcribed_text, user_profile, mode, detected_lang=lang, user_id=user_id)
    except Exception as e:
        print("RAG failed:", e)
        response = "দুঃখিত, সমস্যা হয়েছে।"

    # Save assistant response to database
    save_chat_message(user_id, 'assistant', response, intent=mode, language=lang)

    # Secondary extraction ONLY if we are in nutrition mode
    extracted_nutrients = {"iron": 0.0, "folate": 0.0, "calcium": 0.0, "protein": 0.0}
    if mode == "nutrition" and transcribed_text and transcribed_text != "[অডিও অস্পষ্ট - Audio unclear]":
        from services.rag import extract_nutrition_metrics
        try:
            extracted_nutrients = extract_nutrition_metrics(transcribed_text, response)
        except Exception as e:
            print("Failed to extract nutrition metrics in speak route:", e)

    return jsonify({
        "transcribed_text": transcribed_text,
        "response": response,
        "extractedNutrients": extracted_nutrients,
        "mode": mode
    })

@chat_bp.route("/history/<int:user_id>", methods=["GET"])
def get_history(user_id):
    """
    Get conversation history for a given user.
    """
    ensure_user_exists(user_id)
    
    conn = None
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            SELECT role, content, intent, language, created_at
            FROM chat_messages
            WHERE user_id = %s
            ORDER BY id ASC
        """, (user_id,))
        rows = cur.fetchall()
        cur.close()
        
        history = [
            {
                "role": row[0],
                "content": row[1],
                "intent": row[2],
                "language": row[3],
                "created_at": row[4].isoformat() if row[4] else None
            }
            for row in rows
        ]
        return jsonify(history)
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve chat history: {str(e)}"}), 500
    finally:
        if conn:
            conn.close()

@chat_bp.route("/tts", methods=["GET"])
def tts():
    """
    Endpoint that streams MP3 audio back for the provided text.
    Accepts optional ?lang=bn (Bangla) or ?lang=en (English).
    Defaults to Bangla if omitted.
    """
    text = request.args.get("text", "")
    if not text:
        return jsonify({"error": "No text provided"}), 400

    # 'bn' = Bangla Neural voice, 'en' = English Neural voice, None = auto-detect from text
    lang = request.args.get("lang", None)
    if lang not in ("bn", "en", None):
        lang = None  # Fall back to auto-detect if unrecognized value

    return Response(generate_tts_stream(text, lang=lang), mimetype="audio/mpeg")