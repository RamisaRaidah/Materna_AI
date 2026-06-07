from flask import Blueprint, request, jsonify, Response
from services.rag import rag_query, get_db
from services.tts import generate_tts_stream, is_bengali
import json

chat_bp = Blueprint("chat", __name__)

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

# scan_message_and_recompute_risk has been refactored and moved to services.risk_engine as extract_symptoms_from_text_and_update_risk

@chat_bp.route("/message", methods=["POST"])
@chat_bp.route("/analyze", methods=["POST"])
def analyze():
    data = request.json
    user_input = data.get("message", "")
    user_profile = data.get("profile", {})
    mode = data.get("mode", "danger")  # danger / ppd / nutrition / general
    user_id = data.get("user_id", 1)  # Default dummy user_id for sessionless calls

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

    # Run RAG Query — pass detected language and user_id to leverage history context
    try:
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
    try:
        user_id = int(user_id) if user_id else 1
    except:
        user_id = 1

    # 1. Retrieve client-side transcription if provided by the Web Speech API
    transcribed_text = request.form.get("client_transcribed_text", "").strip()

    # 2. Server-side Gemini transcription as fallback
    if not transcribed_text:
        import google.generativeai as genai
        from config import GEMINI_API_KEY
        
        try:
            if GEMINI_API_KEY:
                genai.configure(api_key=GEMINI_API_KEY)
                model = genai.GenerativeModel("gemini-2.5-flash")
                prompt = (
                    "You are an expert audio transcriber. Transcribe this audio recording precisely. "
                    "If the audio is in Bengali (or its local spoken dialects), write the transcription entirely in standard Bengali script. "
                    "If the audio is in English, transcribe it in English. "
                    "Do not translate. Just transcribe the exact words spoken. "
                    "Return ONLY the plain text transcript. Do not include any introductory or conversational text, and do not wrap it in quotes or markdown formatting. "
                    "If the audio is completely silent or contains no clear speech, return '[অডিও অস্পষ্ট - Audio unclear]'."
                )
                response = model.generate_content([
                    {
                        "mime_type": mime_type,
                        "data": audio_bytes
                    },
                    prompt
                ])
                if response and response.text:
                    transcribed_text = response.text.strip()
        except Exception as e:
            print(f"Server-side Gemini transcription failed: {str(e)}")

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

    # Pass transcribed text to RAG with history context
    try:
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