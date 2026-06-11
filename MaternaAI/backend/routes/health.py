# Vitals logging, danger signs checklist, fetal kick counter

from flask import Blueprint, request, jsonify, g
from db import query
from services.auth import require_auth
from rules.severity import calculate_severity, get_risk_level
import google.generativeai as genai
from llm_client import get_gemini_model, mark_exhausted, is_quota_error, GeminiKeysExhausted
import json
import re
import base64
import requests as http_requests
from config import OPENROUTER_API_KEY

health_bp = Blueprint("health", __name__)

# Vitals Logging
 
@health_bp.route("/vitals", methods=["POST"])
@require_auth
def log_vitals():
    data = request.get_json() or {}
    sys_bp = data.get("bp_systolic")
    dia_bp = data.get("bp_diastolic")
    glucose = data.get("blood_glucose")
    weight = data.get("weight_gain")
    water = data.get("water_intake")
 
    # Determine danger level from vitals
    danger_level = "safe"
    if sys_bp and int(sys_bp) >= 140:
        danger_level = "danger"
        _create_bp_alert(g.user["id"], int(sys_bp), int(dia_bp or 90))
    elif sys_bp and int(sys_bp) >= 130:
        danger_level = "warning"
 
    if glucose and float(glucose) >= 7.8:
        danger_level = "danger"
        _create_glucose_alert(g.user["id"], float(glucose))
 
    log = query(
        """INSERT INTO health_logs
           (user_id, bp_systolic, bp_diastolic, blood_glucose, weight_gain, water_intake, danger_level, raw_input)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
           RETURNING *""",
        (g.user["id"], sys_bp, dia_bp, glucose, weight, water, danger_level, f"BP: {sys_bp}/{dia_bp}, Glucose: {glucose}"
),
        fetch="one"
    )
    return jsonify({"log": log, "danger_level": danger_level}), 201

@health_bp.route("/vitals/history", methods=["GET"])
@require_auth
def vitals_history():
    limit = int(request.args.get("limit", 10))
    logs = query(
        """SELECT bp_systolic, bp_diastolic, blood_glucose, weight_gain, water_intake,
                  danger_level, created_at
           FROM health_logs WHERE user_id = %s AND bp_systolic IS NOT NULL
           ORDER BY created_at DESC LIMIT %s""",
        (g.user["id"], limit)
    )
    return jsonify(logs)
 

# Danger Signs
 
@health_bp.route("/danger-signs", methods=["POST"])
@require_auth
def report_danger_signs():
    data = request.get_json() or {}
    symptoms = data.get("symptoms", [])   # list of strings
    if not symptoms:
        return jsonify({"error": "symptoms list required"}), 400
 
    score = calculate_severity(symptoms)
    danger_level = get_risk_level(score)
 
    query(
        """INSERT INTO health_logs (user_id, symptoms, danger_level, raw_input, severity_score)
           VALUES (%s, %s, %s, %s, %s)""",
        (g.user["id"], symptoms, danger_level,
         f"Danger signs reported: {', '.join(symptoms)}", score),
        fetch="none"
    )

    # Create alert for clinician
    is_postpartum = g.user.get("is_postpartum", False)
    if is_postpartum:
        alert_map = {
            "bleeding": ("hemorrhage", "🚨 POSTPARTUM HAEMORRHAGE: Heavy Bleeding Reported"),
            "vision":   ("preeclampsia", "⚡ POSTPARTUM PRE-ECLAMPSIA: Danger Signs"),
            "swelling": ("preeclampsia", "⚡ POSTPARTUM PRE-ECLAMPSIA: Danger Signs"),
            "fever":    ("infection", "🔥 POSTPARTUM INFECTION RISK: Wound Fever/Infection"),
        }
        sos_title = "🚨 POSTPARTUM EMERGENCY SOS — Danger Signs"
    else:
        alert_map = {
            "bleeding": ("hemorrhage", "🚨 CRITICAL: Active Severe Vaginal Bleeding"),
            "vision":   ("preeclampsia", "⚡ PREECLAMPSIA DANGER SIGNS FLAGGED"),
            "swelling": ("preeclampsia", "⚡ PREECLAMPSIA DANGER SIGNS FLAGGED"),
            "fever":    ("infection", "🔥 INFECTION ALERT: High Fever Reported"),
        }
        sos_title = "🚨 EMERGENCY SOS — Danger Signs"

    if score >= 8:
        matched = False

        for sym in symptoms:
            if sym in alert_map:
                atype, title = alert_map[sym]
                query(
                    """INSERT INTO clinician_alerts (patient_id, alert_type, title, body)
                    VALUES (%s,%s,%s,%s)""",
                    (g.user["id"], atype, title,
                    f"Symptoms: {', '.join(symptoms)}"),
                    fetch="none"
                )
                matched = True
                break
        if not matched:
            query(
                """INSERT INTO clinician_alerts (patient_id, alert_type, title, body)
                VALUES (%s,%s,%s,%s)""",
                (g.user["id"], "high_risk", "⚠️ HIGH RISK SYMPTOMS DETECTED",
                f"Symptoms: {', '.join(symptoms)}"),
                fetch="none"
            )
    else:
        query(
            """INSERT INTO clinician_alerts (patient_id, alert_type, title, body)
            VALUES (%s,%s,%s,%s)""",
            (g.user["id"], "sos", sos_title,
            f"Symptoms: {', '.join(symptoms)}"),
            fetch="none"
        )
 
    return jsonify({
        "danger_level": danger_level,
        "message": "Emergency alert dispatched to clinician network.",
        "symptoms": symptoms,
    })

# Fetal Kick Counter
 
@health_bp.route("/kick", methods=["POST"])
@require_auth
def log_kick_session():
    data = request.get_json() or {}
    kick_count   = data.get("kick_count", 0)
    elapsed_secs = data.get("elapsed_secs", 0)
 
    if kick_count >= 10:
        result = "normal"
    elif elapsed_secs >= 7200:
        result = "reduced"
    else:
        result = "inconclusive"          
    ai_feedback = _kick_feedback(kick_count, elapsed_secs)
 
    session = query(
        """INSERT INTO kick_sessions (user_id, kick_count, elapsed_secs, result, ai_feedback)
           VALUES (%s,%s,%s,%s,%s) RETURNING *""",
        (g.user["id"], kick_count, elapsed_secs, result, ai_feedback),
        fetch="one"
    )
 
    if result == "reduced":
        query(
            """INSERT INTO clinician_alerts (patient_id, alert_type, title, body)
               VALUES (%s,'kick','👶 CRITICAL: Reduced Fetal Movement',%s)""",
            (g.user["id"],
             f"Cardiff protocol: only {kick_count} kicks after full 2-hour session. Emergency SOS active."),
            fetch="none"
        )
 
    return jsonify({"session": session, "result": result, "ai_feedback": ai_feedback})
 
def _kick_feedback(count: int, elapsed_secs: int) -> str:
    mins = max(1, elapsed_secs // 60)
    if count >= 10:
        if mins <= 15:
            return f"✨ Outstanding reactivity! {count} kicks in just {mins} min — reassuring fetal movement pattern observed."
        elif mins <= 60:
            return f"✨ Normal pattern. {count} kicks in {mins} min — well within Cardiff protocol parameters."
        else:
            return f"✨ Goal met in {mins} min. Try drinking cold juice and lying on your left side to boost circulation."
        
    elif elapsed_secs >= 7200:
        return (
            f"⚠️ Cardiff protocol NOT met: only {count} kicks in {mins} min. "
            f"Fewer than 10 kicks in 2 hours requires immediate obstetric assessment. "
            f"Lie on your left side and contact your midwife now."
        )
    
    else:
    # Session still in progress / early submit
        remaining = max(0, (7200 - elapsed_secs) // 60)
        return (
            f"Session in progress — {count} kick{'s' if count != 1 else ''} recorded so far. "
            f"You have {remaining} min remaining in the 2-hour Cardiff window. Keep monitoring."
        )
    
# Alert helpers
 
def _create_bp_alert(patient_id, sys_bp, dia_bp):
    query(
        """INSERT INTO clinician_alerts (patient_id, alert_type, title, body)
           VALUES (%s,'bp','🩺 HIGH BP ALERT: Hypertension Threshold Crossed',%s)""",
        (patient_id, f"BP reading: {sys_bp}/{dia_bp} mmHg — above 140/90 threshold. Preeclampsia risk elevated."),
        fetch="none"
    )
 
 
def _create_glucose_alert(patient_id, glucose):
    query(
        """INSERT INTO clinician_alerts (patient_id, alert_type, title, body)
           VALUES (%s,'glucose','🩸 ELEVATED GLUCOSE: GDM Risk Detected',%s)""",
        (patient_id, f"Blood glucose: {glucose} mmol/L — above GDM threshold of 7.8. Endocrinology referral recommended."),
        fetch="none"
    )


# AI Medical Report & Prescription Analyzer OCR Route
@health_bp.route("/analyze-report", methods=["POST"])
@require_auth
def analyze_report():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    uploaded_file = request.files["file"]
    file_bytes = uploaded_file.read()
    mime_type = uploaded_file.mimetype or "image/png"

    filename = uploaded_file.filename or ""
    if filename.lower().endswith(".pdf"):
        mime_type = "application/pdf"

    VAL_PROMPT = (
        "Is this a medical document (prescription, lab report, or ultrasound scan)? "
        'Reply ONLY with valid JSON, no markdown fences: {"is_medical": true} or {"is_medical": false}'
    )
    EXT_PROMPT = (
        "Extract details from this medical document into JSON. "
        "Return ONLY valid JSON, no markdown, no backticks: "
        '{"title": "", "date": "", "findings": "", "meds": [{"name": "", "purpose": "", '
        '"timing": "", "safety": "", "warning": "", "danger": true}]}'
    )

    def parse_is_medical(text: str) -> bool:
        clean = re.sub(r"```[a-zA-Z]*", "", text, flags=re.IGNORECASE).strip().strip("`").strip()
        try:
            return json.loads(clean).get("is_medical", True)
        except json.JSONDecodeError:
            lower = clean.lower()
            return not ("false" in lower and "true" not in lower)

    def parse_extraction(text: str):
        clean = re.sub(r"```(?:json)?", "", text, flags=re.IGNORECASE).strip().rstrip("`").strip()
        return json.loads(clean)

    # PATH A — Gemini SDK with key rotation
    key = None
    while True:
        try:
            model, key = get_gemini_model("gemini-2.5-flash")

            val_response = model.generate_content(
                [{"mime_type": mime_type, "data": file_bytes}, VAL_PROMPT]
            )
            if not parse_is_medical(val_response.text):
                return jsonify({
                    "error": "not_medical",
                    "message": "This doesn't look like a medical document. Please upload a prescription, lab report, or scan."
                }), 400

            ext_response = model.generate_content(
                [{"mime_type": mime_type, "data": file_bytes}, EXT_PROMPT],
                generation_config={"response_mime_type": "application/json"}
            )
            return jsonify(parse_extraction(ext_response.text)), 200

        except GeminiKeysExhausted:
            print("[analyze_report] All Gemini keys exhausted, trying OpenRouter.")
            break
        except (json.JSONDecodeError, AttributeError):
            return jsonify({"error": "analysis_failed", "message": "Could not parse document data. Please try again."}), 500
        except Exception as e:
            if is_quota_error(e):
                mark_exhausted(key)
                continue
            print(f"[analyze_report] Gemini failed, trying OpenRouter: {e}")
            break

    # PATH B — OpenRouter fallback (google/gemini-2.5-flash via REST)
    if not OPENROUTER_API_KEY:
        return jsonify({"error": "analysis_failed", "message": "AI service is temporarily at capacity. Please try again later."}), 503

    try:
        b64_image = base64.b64encode(file_bytes).decode("utf-8")

        def openrouter_vision(prompt_text: str) -> str:
            resp = http_requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://materna-ai-eta.vercel.app",
                    "X-Title": "MaternaAI-OCR"
                },
                json={
                    "model": "google/gemini-2.5-flash",
                    "messages": [{
                        "role": "user",
                        "content": [
                            {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{b64_image}"}},
                            {"type": "text", "text": prompt_text}
                        ]
                    }]
                },
                timeout=30
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]

        if not parse_is_medical(openrouter_vision(VAL_PROMPT)):
            return jsonify({
                "error": "not_medical",
                "message": "This doesn't look like a medical document. Please upload a prescription, lab report, or scan."
            }), 400

        return jsonify(parse_extraction(openrouter_vision(EXT_PROMPT))), 200

    except (json.JSONDecodeError, AttributeError):
        return jsonify({"error": "analysis_failed", "message": "Could not parse document data. Please try again."}), 500
    except Exception as e:
        print(f"[analyze_report] OpenRouter fallback failed: {e}")
        return jsonify({"error": "analysis_failed", "message": "Failed to analyze document. Please try again."}), 500
    

@health_bp.route("/care-plan", methods=["POST"])
@require_auth
def generate_care_plan():
    data = request.get_json() or {}
    lang = data.get("lang", "bn")
    
    weeks = data.get("weeks_pregnant", 24)
    bp = data.get("bp", "120/80")
    glucose = data.get("glucose", 5.4)
    weight = data.get("weight", 6.2)
    water = data.get("water", 1.5)
    name = g.user.get("name", "Patient")
    bp_val = int(str(data.get("bp", "120/80")).split("/")[0])
    is_postpartum = data.get("is_postpartum", False)

    if is_postpartum:
        prompt = f"""You are a postnatal health AI advisor for new mothers in rural Bangladesh.

Generate a personalized daily postpartum care plan in {"Bengali" if lang == "bn" else "English"} for this patient:
- Name: {name}
- Mode: Postpartum (already delivered baby, in the recovery stage)
- Latest BP: {bp} mmHg
- Latest glucose: {glucose} mmol/L
- Water intake today: {water} L
- Location: Dhaka/Sreemangal, Bangladesh

Return ONLY a valid JSON array (no markdown, no backticks) of exactly 4 care plan items. Schema:
[
  {{
    "id": "ai-1",
    "title": "Short action title",
    "desc": "Specific, postpartum-related actionable advice in 1-2 sentences tailored to her vitals and postpartum status."
  }}
]

Rules:
- Focus: wound recovery (cesarean or perineal), lochia monitoring (postpartum bleeding), breastfeeding/formula support, postpartum nutrition (iron, calcium, protein-rich foods for lactation), newborn sleep/feeding patterns, maternal mental well-being (checking for low mood/PPD).
- No trimester references. No weeks-pregnant references (the patient has already given birth).
- If BP systolic >= 140, include postpartum preeclampsia / hypertension monitoring advice.
- If glucose >= 7.8, include postpartum blood sugar / dietary guidance.
- Always include one nutrition tip using locally available Bangladeshi foods suitable for lactating mothers (e.g., small mola fish, spinach, lentils, bottle gourd/lau, bananas, milk).
- Keep language simple, empathetic, warm, and appropriate for a rural Bangladeshi patient.
- If language is 'bn', use natural, empathetic, and culturally appropriate Bengali."""
    else:

        prompt = f"""You are a maternal health AI advisor for pregnant women in rural Bangladesh.

Generate a personalized daily pregnancy care plan in {"Bengali" if lang == "bn" else "English"} for this patient:
- Name: {name}
- Weeks pregnant: {weeks} (Trimester {"1" if weeks < 13 else "2" if weeks < 28 else "3"})
- Latest BP: {bp} mmHg
- Latest glucose: {glucose} mmol/L
- Weight gain: {weight} kg
- Water intake today: {water} L
- Location: Dhaka/Sreemangal, Bangladesh

Return ONLY a valid JSON array (no markdown, no backticks) of exactly 4 care plan items. Schema:
[
  {{
    "id": "ai-1",
    "title": "Short action title",
    "desc": "Specific, actionable advice in 1-2 sentences relevant to her week and vitals."
  }}
]

Rules:
- If BP systolic >= 140, include hypertension monitoring advice
- If glucose >= 7.8, include GDM dietary guidance
- Always include one nutrition tip using locally available Bangladeshi foods (e.g. mola fish, lentils, guava)
- Always include one movement/rest tip appropriate for her trimester
- Keep language simple and warm, suitable for a rural Bangladeshi patient
- If language is 'bn', use natural, empathetic, and culturally appropriate Bengali."""

    # Try Gemini with key rotation
    key = None
    while True:
        try:
            model, key = get_gemini_model("gemini-2.5-flash")
            response = model.generate_content(
                prompt,
                generation_config={
                    "response_mime_type": "application/json",
                    "temperature": 0.4
                }
            )
            if response and response.text:
                clean = response.text.strip().replace("```json", "").replace("```", "")
                parsed = json.loads(clean)
                if isinstance(parsed, list) and len(parsed) > 0:
                    return jsonify(parsed), 200
            break  # empty response — fall through to static fallback
        except GeminiKeysExhausted:
            print("Care plan — all Gemini keys exhausted, using static fallback.")
            break
        except Exception as e:
            if is_quota_error(e):
                mark_exhausted(key)
                continue  # try next key
            print("Gemini care plan failed:", e)
            break

    # Fallback — static contextual plan based on vitals
    if is_postpartum:
        if lang == "bn":
            fallback = [
                {
                    "id": "fallback-1",
                    "title": "রক্তচাপ পর্যবেক্ষণ" if bp_val >= 130 else "প্রসবোত্তর বিশ্রাম",
                    "desc": "প্রসবের পর রক্তচাপের দিকে নজর রাখুন। মাথা ব্যথা বা ঝাপসা দৃষ্টি হলে দ্রুত মিডওয়াইফকে জানান।" if bp_val >= 130 else "নবজাতকের ঘুমের সাথে নিজের ঘুমের সমন্বয় করুন এবং শরীরকে নিরাময় হতে পর্যাপ্ত বিশ্রাম দিন।"
                },
                {
                    "id": "fallback-2",
                    "title": "স্তন্যপান করানোর পুষ্টি",
                    "desc": "স্তন্যদানকারী মায়েদের অতিরিক্ত ক্যালোরি ও পুষ্টি প্রয়োজন। খাবারে ডিম, দুধ, ও প্রোটিন রাখুন এবং আয়রন-ক্যালসিয়াম সাপ্লিমেন্ট চালু রাখুন।"
                },
                {
                    "id": "fallback-3",
                    "title": "পানি পানের লক্ষ্য",
                    "desc": f"আপনি আজ {water} লিটার পানি পান করেছেন। স্তন্যপান করানোর জন্য শরীর হাইড্রেটেড রাখা অত্যন্ত জরুরি, তাই দৈনিক ৩ লিটার পানি পান করার চেষ্টা করুন।"
                },
                {
                    "id": "fallback-4",
                    "title": "প্রসবোত্তর বিপদের লক্ষণ",
                    "desc": "যদি অতিরিক্ত রক্তপাত (লোচিয়া), প্রস্রাবে জ্বালাপোড়া বা তীব্র জ্বর হয়, তবে কালবিলম্ব না করে মিডওয়াইফ বা হাসপাতালে যোগাযোগ করুন।"
                }
            ]
        else:
            fallback = [
                {
                    "id": "fallback-1",
                    "title": "Blood Pressure Monitoring" if bp_val >= 130 else "Postpartum Rest",
                    "desc": "Monitor your blood pressure closely. Report severe headache or vision changes to your midwife." if bp_val >= 130 else "Rest whenever your newborn sleeps to help your body heal and recover."
                },
                {
                    "id": "fallback-2",
                    "title": "Nutrition for Lactation",
                    "desc": "Lactating mothers need extra calories and protein. Include eggs, milk, lentils in your meals, and continue iron/calcium supplements."
                },
                {
                    "id": "fallback-3",
                    "title": "Hydration Goal",
                    "desc": f"You've logged {water}L today. Aim for 3L of water daily to support healthy lactation and recovery."
                },
                {
                    "id": "fallback-4",
                    "title": "Postpartum Danger Signs",
                    "desc": "Seek immediate care if you experience excessive bleeding, foul-smelling discharge, or high fever."
                }
            ]
    else:
        if lang == "bn":
            fallback = [
                {
                    "id": "fallback-1",
                    "title": "রক্তচাপ পর্যবেক্ষণ" if bp_val >= 130 else "প্রতিদিনের আয়রন ট্যাবলেট",
                    "desc": "প্রতিদিন দুবার রক্তচাপ মাপুন এবং মাথাব্যথা বা ঝাপসা দৃষ্টি দেখলে ধাত্রীকে জানান।" if bp_val >= 130 else "আয়রনের অভাব দূর করতে প্রতিদিন দুপুর ২টায় একটি আয়রন ট্যাবলেট খান।"
                },
                {
                    "id": "fallback-2",
                    "title": "পানি পানের লক্ষ্য",
                    "desc": f"আপনি আজ {water} লিটার পানি পান করেছেন। গর্ভের তরল ঠিক রাখতে প্রতিদিন অন্তত ২.৫ লিটার বিশুদ্ধ পানি পান করুন।"
                },
                {
                    "id": "fallback-3",
                    "title": "পুষ্টি — স্থানীয় খাবার",
                    "desc": "আয়রন, প্রোটিন এবং ফোলেটের জন্য আজকের খাবারে ছোট মলা মাছ, ডাল এবং শাকসবজি অন্তর্ভুক্ত করুন।"
                },
                {
                    "id": "fallback-4",
                    "title": "হালকা ব্যায়াম",
                    "desc": f"{weeks} সপ্তাহে, ১০ মিনিট ধীরে হাঁটুন বা হালকা ব্যায়াম করুন। ভারী কাজ বা হঠাৎ ঝোঁক নেওয়া থেকে বিরত থাকুন।"
                }
            ]
        else:
            fallback = [
                {
                    "id": "fallback-1",
                    "title": "Blood Pressure Monitoring" if bp_val >= 130 else "Daily Iron Supplementation",
                    "desc": "Monitor your BP twice daily and report any headache or vision changes to your midwife immediately." if bp_val >= 130 else "Take your iron tablet at 2 PM with a glass of guava juice for best absorption."
                },
                {
                    "id": "fallback-2",
                    "title": "Hydration Goal",
                    "desc": f"You've logged {water}L today. Aim for 2.5L of filtered water daily to support amniotic fluid levels."
                },
                {
                    "id": "fallback-3",
                    "title": "Nutrition — Local Foods",
                    "desc": "Include small mola fish, lentil soup, and leafy greens in today's meals for iron, protein and folate."
                },
                {
                    "id": "fallback-4",
                    "title": "Gentle Movement",
                    "desc": f"At week {weeks}, try 10 minutes of slow walking or pelvic tilts. Avoid heavy lifting or sudden exertion."
                }
            ]
    return jsonify(fallback), 200


# Newborn Tracking Endpoints

@health_bp.route("/newborn/feed", methods=["POST"])
@require_auth
def log_newborn_feed():
    # force=True  — ignore Content-Type header (axios omits it for bodyless POST)
    # silent=True — return None instead of raising a 415 when body is absent/invalid
    data = request.get_json(force=True, silent=True) or {}
    # Accept optional feed_type: 'breast' | 'formula' — defaults to 'breast'
    feed_type = data.get("feed_type", "breast")
    if feed_type not in ("breast", "formula"):
        feed_type = "breast"

    log = query(
        """
        INSERT INTO newborn_logs (user_id, log_type, notes)
        VALUES (%s, 'feed', %s)
        RETURNING *
        """,
        (g.user["id"], feed_type),
        fetch="one"
    )
    return jsonify({"success": True, "log": log}), 201


@health_bp.route("/newborn/sleep", methods=["POST"])
@require_auth
def log_newborn_sleep():
    data = request.get_json(force=True, silent=True) or {}
    duration_mins = data.get("duration_mins")
    notes = data.get("notes")
    
    log = query(
        """
        INSERT INTO newborn_logs (user_id, log_type, duration_mins, notes)
        VALUES (%s, 'sleep', %s, %s)
        RETURNING *
        """,
        (g.user["id"], duration_mins, notes),
        fetch="one"
    )
    return jsonify({"success": True, "log": log}), 201


@health_bp.route("/newborn/diaper", methods=["POST"])
@require_auth
def log_newborn_diaper():
    """Log a wet diaper event. No body required — just a tap counter."""
    log = query(
        """
        INSERT INTO newborn_logs (user_id, log_type)
        VALUES (%s, 'diaper')
        RETURNING *
        """,
        (g.user["id"],),
        fetch="one"
    )
    return jsonify({"success": True, "log": log}), 201


@health_bp.route("/newborn/today", methods=["GET"])
@require_auth
def get_newborn_today():
    # Counts by log_type
    logs = query(
        """
        SELECT log_type, COUNT(*) as count
        FROM newborn_logs
        WHERE user_id = %s AND created_at >= CURRENT_DATE
        GROUP BY log_type
        """,
        (g.user["id"],),
        fetch="all"
    )

    result = {"feed": 0, "sleep": 0, "diaper": 0}
    for row in logs:
        log_type = row["log_type"]
        if log_type in result:
            result[log_type] = row["count"]

    # Return timestamp of the most recent feed today so the frontend
    # can display "last feed X minutes ago" without a separate request
    last_feed_row = query(
        """
        SELECT created_at
        FROM newborn_logs
        WHERE user_id = %s
          AND log_type = 'feed'
          AND created_at >= CURRENT_DATE
        ORDER BY created_at DESC
        LIMIT 1
        """,
        (g.user["id"],),
        fetch="one"
    )
    result["last_feed_at"] = (
        last_feed_row["created_at"].isoformat() if last_feed_row else None
    )

    return jsonify(result), 200