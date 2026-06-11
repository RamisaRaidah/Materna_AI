import os
import json
import google.generativeai as genai
from config import OPENROUTER_API_KEY
from llm_client import get_gemini_model, mark_exhausted, is_quota_error, GeminiKeysExhausted
from db import query
import openai

or_client = openai.OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY
)

# Risk Level Ordering for Escalation Check
RISK_LEVEL_ORDER = {
    "Low": 1,
    "Medium": 2,
    "High": 3,
    "Critical": 4
}

def evaluate_rules(user_id: int) -> dict:
    """
    Step 1 of Hybrid Approach: Rule-Based Scoring with exponential decay and dynamic LLM evaluation.
    Queries the last 14 days of health logs, vitals, and symptoms.
    Returns calculated condition scores and overall risk level.
    """
    # 1. Fetch User Info
    user = query(
        "SELECT id, age, weeks_pregnant, is_postpartum, persona FROM users WHERE id = %s",
        (user_id,), fetch="one"
    )
    if not user:
        return {
            "overall_risk": "Low",
            "scores": {},
            "symptoms": [],
            "vitals": {}
        }

    weeks = user.get("weeks_pregnant")
    is_postpartum = user.get("is_postpartum", False)

    # 2. Fetch last 14 days of health logs in chronological order (oldest to newest)
    logs = query(
        """
        SELECT bp_systolic, bp_diastolic, blood_glucose, symptoms, created_at
        FROM health_logs
        WHERE user_id = %s AND created_at >= NOW() - INTERVAL '14 days'
        ORDER BY created_at ASC
        """,
        (user_id,)
    )

    # 3. Process symptoms and vitals chronologically
    active_symptoms = {}
    latest_systolic = None
    latest_diastolic = None
    latest_glucose = None
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)

    for log in logs:
        # Vitals (get latest non-null values)
        if log.get("bp_systolic") is not None:
            latest_systolic = log["bp_systolic"]
        if log.get("bp_diastolic") is not None:
            latest_diastolic = log["bp_diastolic"]
        if log.get("blood_glucose") is not None:
            latest_glucose = float(log["blood_glucose"])

        # Symptoms
        syms = log.get("symptoms")
        log_time = log.get("created_at")
        if syms:
            if isinstance(syms, list):
                for s in syms:
                    s_clean = s.strip()
                    if s_clean.startswith("-"):
                        name = s_clean[1:].strip()
                        active_symptoms[name] = {"is_active": False, "created_at": log_time}
                    elif s_clean.startswith("resolved:"):
                        name = s_clean[len("resolved:"):].strip()
                        active_symptoms[name] = {"is_active": False, "created_at": log_time}
                    else:
                        active_symptoms[s_clean] = {"is_active": True, "created_at": log_time}
            elif isinstance(syms, str):
                for s in syms.split(','):
                    s_clean = s.strip()
                    if s_clean:
                        if s_clean.startswith("-"):
                            name = s_clean[1:].strip()
                            active_symptoms[name] = {"is_active": False, "created_at": log_time}
                        elif s_clean.startswith("resolved:"):
                            name = s_clean[len("resolved:"):].strip()
                            active_symptoms[name] = {"is_active": False, "created_at": log_time}
                        else:
                            active_symptoms[s_clean] = {"is_active": True, "created_at": log_time}

    # Filter for active symptoms and calculate their decayed weights
    active_symptoms_summary = {}
    for name, info in active_symptoms.items():
        if info["is_active"]:
            age_days = (now - info["created_at"]).total_seconds() / 86400.0
            # Exponential decay with half-life of 3.5 days
            weight = 0.5 ** (age_days / 3.5)
            active_symptoms_summary[name] = {
                "created_at": info["created_at"].isoformat() if info["created_at"] else None,
                "weight": weight
            }

    # Helper to retrieve normalized symptom weight
    def get_weight(symptom_name):
        n = symptom_name.lower().strip().replace(" ", "_")
        for sym_name, sym_info in active_symptoms_summary.items():
            if sym_name.lower().strip().replace(" ", "_") == n:
                return sym_info["weight"]
        return 0.0

    # 4. Initialize Scores & Risk Levels per Condition
    conditions = {
        "preeclampsia": {"score": 0, "risk": "Low"},
        "anemia": {"score": 0, "risk": "Low"},
        "gdm": {"score": 0, "risk": "Low"},
        "ppd": {"score": 0, "risk": "Low"},
        "infection": {"score": 0, "risk": "Low"},
        "hemorrhage": {"score": 0, "risk": "Low"}
    }

    # --- PREECLAMPSIA RULES ---
    if (weeks and weeks >= 20) or is_postpartum:
        # Blood pressure checks
        if latest_systolic is not None and latest_diastolic is not None:
            if latest_systolic >= 160 or latest_diastolic >= 110:
                conditions["preeclampsia"]["score"] += 10
            elif latest_systolic >= 140 or latest_diastolic >= 90:
                conditions["preeclampsia"]["score"] += 5
            elif latest_systolic >= 130 or latest_diastolic >= 80:
                conditions["preeclampsia"]["score"] += 2
        
        # Symptom checks with weights
        hw = max(get_weight("severe_headache"), get_weight("headache"))
        if hw > 0:
            conditions["preeclampsia"]["score"] += 3 * hw
        sw = get_weight("swelling")
        if sw > 0:
            conditions["preeclampsia"]["score"] += 3 * sw
        vw = get_weight("vision")
        if vw > 0:
            conditions["preeclampsia"]["score"] += 4 * vw

        score = conditions["preeclampsia"]["score"]
        if score >= 12 or (latest_systolic and latest_systolic >= 160):
            conditions["preeclampsia"]["risk"] = "Critical"
        elif score >= 7:
            conditions["preeclampsia"]["risk"] = "High"
        elif score >= 3:
            conditions["preeclampsia"]["risk"] = "Medium"

    # --- ANEMIA RULES ---
    fw = get_weight("fatigue")
    if fw > 0:
        conditions["anemia"]["score"] += 2 * fw
    dw = max(get_weight("vision"), get_weight("dizziness"))
    if dw > 0:
        conditions["anemia"]["score"] += 2 * dw
    pw = max(get_weight("pale_skin"), get_weight("paleness"))
    if pw > 0:
        conditions["anemia"]["score"] += 3 * pw
    if weeks: 
        conditions["anemia"]["score"] += 1

    score = conditions["anemia"]["score"]
    if score >= 5:
        conditions["anemia"]["risk"] = "High"
    elif score >= 3:
        conditions["anemia"]["risk"] = "Medium"

    # --- GESTATIONAL DIABETES (GDM) RULES ---
    if latest_glucose is not None:
        if latest_glucose >= 11.1:
            conditions["gdm"]["score"] += 12
        elif latest_glucose >= 7.8:
            conditions["gdm"]["score"] += 8
        elif latest_glucose >= 6.1:
            conditions["gdm"]["score"] += 3

    tw = get_weight("excessive_thirst")
    if tw > 0:
        conditions["gdm"]["score"] += 3 * tw
    uw = get_weight("frequent_urination")
    if uw > 0:
        conditions["gdm"]["score"] += 3 * uw
    if fw > 0:
        conditions["gdm"]["score"] += 1 * fw
    if weeks and 24 <= weeks <= 28:
        conditions["gdm"]["score"] += 1

    score = conditions["gdm"]["score"]
    if score >= 8:
        conditions["gdm"]["risk"] = "High"
    elif score >= 4:
        conditions["gdm"]["risk"] = "Medium"

    # --- POSTPARTUM DEPRESSION (PPD) RULES ---
    if is_postpartum or user.get("persona") in ["postpartum", "recovery"]:
        mw = max(get_weight("low_mood"), get_weight("sadness"))
        if mw > 0:
            conditions["ppd"]["score"] += 4 * mw
        iw = max(get_weight("trouble_sleeping"), get_weight("insomnia"))
        if iw > 0:
            conditions["ppd"]["score"] += 2 * iw
        if fw > 0:
            conditions["ppd"]["score"] += 1 * fw
        aw = get_weight("anxiety")
        if aw > 0:
            conditions["ppd"]["score"] += 2 * aw

        ppd_assess = query(
            "SELECT total_score FROM ppd_assessments WHERE user_id = %s AND created_at >= NOW() - INTERVAL '14 days' ORDER BY created_at DESC LIMIT 1",
            (user_id,), fetch="one"
        )
        if ppd_assess:
            score_val = ppd_assess.get("total_score", 0)
            if score_val >= 13:
                conditions["ppd"]["score"] += 8
            elif score_val >= 10:
                conditions["ppd"]["score"] += 4

        score = conditions["ppd"]["score"]
        if score >= 8:
            conditions["ppd"]["risk"] = "Critical"
        elif score >= 5:
            conditions["ppd"]["risk"] = "High"
        elif score >= 3:
            conditions["ppd"]["risk"] = "Medium"

    # --- INFECTION / SEPSIS RULES ---
    fev_w = get_weight("fever")
    if fev_w > 0:
        conditions["infection"]["score"] += 5 * fev_w
    ab_w = get_weight("abdominal_pain")
    if ab_w > 0:
        conditions["infection"]["score"] += 3 * ab_w
    ch_w = get_weight("chills")
    if ch_w > 0:
        conditions["infection"]["score"] += 2 * ch_w

    score = conditions["infection"]["score"]
    if score >= 8:
        conditions["infection"]["risk"] = "Critical"
    elif score >= 5:
        conditions["infection"]["risk"] = "High"
    elif score >= 3:
        conditions["infection"]["risk"] = "Medium"

    # --- HEMORRHAGE / MISCARRIAGE RULES ---
    bl_w = get_weight("bleeding")
    if bl_w > 0:
        conditions["hemorrhage"]["score"] += 10 * bl_w
    if ab_w > 0:
        conditions["hemorrhage"]["score"] += 3 * ab_w

    score = conditions["hemorrhage"]["score"]
    if score >= 10:
        conditions["hemorrhage"]["risk"] = "Critical"
    elif score >= 3:
        conditions["hemorrhage"]["risk"] = "High"

    # 5. Run Dynamic LLM Evaluation for non-hardcoded symptoms and conditions
    if active_symptoms_summary:
        symptoms_str = ", ".join([f"{name} (importance weight: {round(info['weight'], 2)})" for name, info in active_symptoms_summary.items()])
        dynamic_prompt = f"""
        You are a clinical risk analyzer assistant.
        Analyze the following active symptoms and vitals of a pregnant/postpartum patient to identify any potential maternal/fetal health risks, conditions, or diseases *other* than or in addition to:
        - preeclampsia
        - anemia
        - gestational diabetes (gdm)
        - postpartum depression (ppd)
        - infection
        - hemorrhage

        Patient Profile:
        - Age: {user.get('age', 'Unknown')}
        - Weeks pregnant: {user.get('weeks_pregnant', 'Unknown')}
        - Is Postpartum: {user.get('is_postpartum', False)}
        - Persona: {user.get('persona', 'pregnant')}

        Vitals:
        - Blood Pressure: {latest_systolic if latest_systolic else 'N/A'}/{latest_diastolic if latest_diastolic else 'N/A'} mmHg
        - Blood Glucose: {latest_glucose if latest_glucose else 'N/A'} mmol/L

        Active Symptoms:
        {symptoms_str}

        Identify any potential diseases or health risks (e.g. cholestasis, urinary tract infection, asthma exacerbation, hyperemesis gravidarum, etc.) based on these inputs.
        For each identified condition:
        - Assign a name/label (e.g. "urinary_tract_infection").
        - Assign a numeric risk score (0 to 10) based on clinical severity. Apply the importance weights of the symptoms.
        - Assign a risk level: "Low", "Medium", "High", or "Critical".

        Return ONLY a JSON object mapping condition names to their score and risk level.
        Example:
        {{
          "urinary_tract_infection": {{
            "score": 6,
            "risk": "Medium"
          }}
        }}

        If no other conditions are indicated, return an empty object: {{}}
        Return ONLY valid JSON and nothing else.
        """

        success = False
        dynamic_res = None
        key = None
        while True:
            try:
                model, key = get_gemini_model("gemini-2.5-flash")
                response = model.generate_content(
                    dynamic_prompt,
                    generation_config={
                        "response_mime_type": "application/json",
                        "temperature": 0.1
                    },
                    request_options={"timeout": 25}
                )
                if response and response.text:
                    dynamic_res = json.loads(response.text.strip())
                    success = True
                break
            except GeminiKeysExhausted:
                print("Dynamic rules — all Gemini keys exhausted, trying OpenRouter.")
                break
            except Exception as e:
                if is_quota_error(e):
                    mark_exhausted(key)
                    continue  # try next key
                print("Gemini dynamic rules failed:", e)
                break
        if not success and OPENROUTER_API_KEY:
            try:
                response = or_client.chat.completions.create(
                    model="google/gemini-2.5-flash",
                    messages=[{"role": "user", "content": dynamic_prompt}],
                    response_format={"type": "json_object"},
                    temperature=0.1,
                    max_tokens=800
                )
                raw_text = response.choices[0].message.content
                if raw_text:
                    dynamic_res = json.loads(raw_text.strip())
                    success = True
            except Exception as e:
                print("OpenRouter fallback for dynamic rules failed:", e)
        
        if success and isinstance(dynamic_res, dict):
            for cond, val in dynamic_res.items():
                if isinstance(val, dict) and "score" in val and "risk" in val:
                    conditions[cond] = {
                        "score": int(val["score"]),
                        "risk": val["risk"]
                    }

    # Determine overall risk level as the maximum of condition risks
    severity_order = ["Critical", "High", "Medium", "Low"]
    overall_risk = "Low"
    for r in severity_order:
        if any(c["risk"] == r for c in conditions.values()):
            overall_risk = r
            break

    # Add general danger rules
    if get_weight("reduced_movement") > 0:
        overall_risk = "Critical"

    return {
        "overall_risk": overall_risk,
        "scores": conditions,
        "symptoms": list(active_symptoms_summary.keys()),
        "vitals": {
            "systolic": latest_systolic,
            "diastolic": latest_diastolic,
            "glucose": latest_glucose
        }
    }


def enrich_with_llm(user_profile: dict, rule_results: dict, lang: str = "bn") -> dict:
    """
    Step 2 of Hybrid Approach: Gemini enrichment.
    Takes rule-based findings and generates bilingual explanation + recommendation.
    """

    print("Entering the second step of risk engine (bilingual mode).")

    # Build Prompt
    prompt = f"""
    You are the predictive risk engine for MaternaAI.
    Analyze the following patient profile and computed clinical scores over a rolling 14-day window:

    Patient Profile:
    - Age: {user_profile.get('age', 'Unknown')}
    - Weeks pregnant: {user_profile.get('weeks_pregnant', 'Unknown')}
    - Is Postpartum: {user_profile.get('is_postpartum', False)}
    - Persona: {user_profile.get('persona', 'pregnant')}

    Latest Vitals in 14-day window:
    - Blood Pressure: {rule_results['vitals'].get('systolic', 'Not logged')}/{rule_results['vitals'].get('diastolic', 'Not logged')} mmHg
    - Blood Glucose: {rule_results['vitals'].get('glucose', 'Not logged')} mmol/L

    Symptoms reported in 14-day window:
    - Symptoms: {', '.join(rule_results['symptoms']) if rule_results['symptoms'] else 'None reported'}

    Rule-based Analysis:
    - Decided Risk Level: {rule_results['overall_risk']}
    - Condition Scores: {json.dumps(rule_results['scores'])}

    Your Tasks:
    1. Identify matching condition flags in both English and Bengali.
    2. Write a warm, compassionate plain-language explanation of these results in both English and Bengali (Unicode script). Explain the significance of the symptoms and vitals in 2-3 caring sentences.
    3. Generate a concrete action recommendation matching the risk level in both English and Bengali:
       - Low Risk -> en: "Monitor at home", bn: "বাড়িতে পর্যবেক্ষণ করুন"
       - Medium Risk -> en: "Monitor closely and contact midwife", bn: "নিবিড়ভাবে পর্যবেক্ষণ করুন এবং মিডওয়াইফের সাথে যোগাযোগ করুন"
       - High Risk -> en: "Consult doctor or midwife soon", bn: "অবিলম্বে ডাক্তার বা মিডওয়াইফের সাথে পরামর্শ করুন"
       - Critical Risk -> en: "Seek emergency medical care immediately", bn: "অবিলম্বে জরুরি চিকিৎসা সেবা নিন"
       Keep it simple and actionable.

    CRITICAL RULES:
    - You MUST output ONLY valid JSON matching the schema below.
    - Do NOT change the decided risk level of "{rule_results['overall_risk']}". Your explanation must align with it.
    - Output languages MUST be strictly English for the _en fields and Bengali (Unicode) for the _bn fields.

    JSON Schema:
    {{
      "condition_flags_en": ["flag 1", "flag 2"],
      "condition_flags_bn": ["পতাকা ১", "পতাকা ২"],
      "explanation_en": "compassionate explanation in English",
      "explanation_bn": "compassionate explanation in Bengali",
      "recommendation_en": "action advice in English",
      "recommendation_bn": "action advice in Bengali"
    }}
    """

    success = False
    data = None
    key = None
    while True:
        try:
            model, key = get_gemini_model("gemini-2.5-flash")
            response = model.generate_content(
                prompt,
                generation_config={
                    "response_mime_type": "application/json",
                    "temperature": 0.2
                }
            )
            if response and response.text:
                data = json.loads(response.text.strip())
                success = True
            break
        except GeminiKeysExhausted:
            print("Enrichment — all Gemini keys exhausted, trying OpenRouter.")
            break
        except Exception as e:
            if is_quota_error(e):
                mark_exhausted(key)
                continue  # try next key
            print("Gemini bilingual enrichment failed:", e)
            break

    if not success and OPENROUTER_API_KEY:
        try:
            print("Using OpenRouter fallback for risk enrichment...")
            response = or_client.chat.completions.create(
                model="google/gemini-2.5-flash",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                temperature=0.2,
                max_tokens=2000
            )
            raw_text = response.choices[0].message.content
            if raw_text:
                data = json.loads(raw_text.strip())
                success = True
        except Exception as e:
            print("OpenRouter fallback failed:", e)

    if success and data:
        return {
            "condition_flags_en": data.get("condition_flags_en", []),
            "condition_flags_bn": data.get("condition_flags_bn", []),
            "explanation_en": data.get("explanation_en", ""),
            "explanation_bn": data.get("explanation_bn", ""),
            "recommendation_en": data.get("recommendation_en", ""),
            "recommendation_bn": data.get("recommendation_bn", "")
        }

    # Secondary fallback on parser failure
    if rule_results["overall_risk"] != "Low":
        fallback_flags_en = ["Maternal Risk"]
        fallback_flags_bn = ["গর্ভকালীন ঝুঁকি"]
    else:
        fallback_flags_en = ["Routine Monitoring"]
        fallback_flags_bn = ["নিয়মিত পর্যবেক্ষণ"]

    return {
        "condition_flags_en": fallback_flags_en,
        "condition_flags_bn": fallback_flags_bn,
        "explanation_en": f"Risk level is {rule_results['overall_risk']}. Please monitor your symptoms and check your blood pressure twice daily.",
        "explanation_bn": f"ঝুঁকির মাত্রা: {rule_results['overall_risk']}। আপনার স্বাস্থ্য ভালো রাখতে বিশ্রাম ও নিয়মিত পরীক্ষা নিশ্চিত করুন।",
        "recommendation_en": "Contact your midwife and consult a healthcare provider for any danger signs.",
        "recommendation_bn": "মিডওয়াইফের সাথে যোগাযোগ করুন এবং কোনো অস্বাভাবিক লক্ষণ দেখলে দ্রুত চিকিৎসকের কাছে যান।"
    }


def compute_user_risk(user_id: int, force: bool = False, lang: str = "bn") -> dict:
    """
    Main entry point. Evaluates rules, enriches with Gemini, logs history,
    updates latest profile, and dispatches alerts on escalation.
    """
    # 1. Fetch User Profile
    user = query(
        "SELECT id, name, age, weeks_pregnant, is_postpartum, persona, location FROM users WHERE id = %s",
        (user_id,), fetch="one"
    )
    if not user:
        return {}

    # 2. Run Rule-Based Evaluation
    rules_res = evaluate_rules(user_id)
    overall_risk = rules_res["overall_risk"]

    # 3. Fetch previous profile to check escalation
    prev_profile = query(
        "SELECT risk_level FROM risk_profiles WHERE user_id = %s",
        (user_id,), fetch="one"
    )
    prev_risk = prev_profile["risk_level"] if prev_profile else "Low"

    # 4. Run LLM Enrichment
    enrichment = enrich_with_llm(user, rules_res, lang)

    # Legacy fields mapping
    c_flags = enrichment["condition_flags_bn"] if lang == "bn" else enrichment["condition_flags_en"]
    exp = enrichment["explanation_bn"] if lang == "bn" else enrichment["explanation_en"]
    rec = enrichment["recommendation_bn"] if lang == "bn" else enrichment["recommendation_en"]

    # 5. Insert history into risk_assessments
    query(
        """
        INSERT INTO risk_assessments (user_id, risk_level, condition_flags, explanation, recommendation, language, rule_score)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """,
        (
            user_id,
            overall_risk,
            c_flags,
            exp,
            rec,
            lang,
            sum(c["score"] for c in rules_res["scores"].values())
        ),
        fetch="none"
    )

    # 6. Upsert cached risk_profiles
    profile = query(
        """
        INSERT INTO risk_profiles (
            user_id, risk_level, condition_flags, explanation, recommendation, language, rule_score, symptoms_analyzed, last_computed_at, updated_at,
            condition_flags_en, condition_flags_bn, explanation_en, explanation_bn, recommendation_en, recommendation_bn
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW(), %s, %s, %s, %s, %s, %s)
        ON CONFLICT (user_id) DO UPDATE
        SET risk_level = EXCLUDED.risk_level,
            condition_flags = EXCLUDED.condition_flags,
            explanation = EXCLUDED.explanation,
            recommendation = EXCLUDED.recommendation,
            language = EXCLUDED.language,
            rule_score = EXCLUDED.rule_score,
            symptoms_analyzed = EXCLUDED.symptoms_analyzed,
            last_computed_at = NOW(),
            updated_at = NOW(),
            condition_flags_en = EXCLUDED.condition_flags_en,
            condition_flags_bn = EXCLUDED.condition_flags_bn,
            explanation_en = EXCLUDED.explanation_en,
            explanation_bn = EXCLUDED.explanation_bn,
            recommendation_en = EXCLUDED.recommendation_en,
            recommendation_bn = EXCLUDED.recommendation_bn
        RETURNING *
        """,
        (
            user_id,
            overall_risk,
            c_flags,
            exp,
            rec,
            lang,
            sum(c["score"] for c in rules_res["scores"].values()),
            json.dumps(rules_res["symptoms"]),
            enrichment["condition_flags_en"],
            enrichment["condition_flags_bn"],
            enrichment["explanation_en"],
            enrichment["explanation_bn"],
            enrichment["recommendation_en"],
            enrichment["recommendation_bn"]
        ),
        fetch="one"
    )

    # 7. Escalation Check & Alert System
    prev_weight = RISK_LEVEL_ORDER.get(prev_risk, 1)
    new_weight = RISK_LEVEL_ORDER.get(overall_risk, 1)

    if new_weight > prev_weight:
        title_en = f"🚨 Health Risk Alert: Escalated to {overall_risk}"
        title_bn = f"🚨 স্বাস্থ্য ঝুঁকি সর্তকতা: {overall_risk} ঝুঁকিতে উন্নীত"
        title = title_bn if lang == "bn" else title_en

        body_en = f"Your computed health risk has escalated from {prev_risk} to {overall_risk}. Recommendation: {enrichment['recommendation_en']}"
        body_bn = f"আপনার গর্ভকালীন স্বাস্থ্য ঝুঁকি {prev_risk} থেকে বৃদ্ধি পেয়ে {overall_risk} হয়েছে। পরামর্শ: {enrichment['recommendation_bn']}"
        body = body_bn if lang == "bn" else body_en

        query(
            """
            INSERT INTO notifications (user_id, title, body, type, data)
            VALUES (%s, %s, %s, 'risk_escalation', %s)
            """,
            (
                user_id,
                title,
                body,
                json.dumps({
                    "previous_risk": prev_risk,
                    "new_risk": overall_risk,
                    "condition_flags": enrichment["condition_flags_bn"] if lang == "bn" else enrichment["condition_flags_en"]
                })
            ),
            fetch="none"
        )

        if overall_risk in ["High", "Critical"]:
            clinician_title = f"⚠️ RISK ESCALATION: Patient {user['name']} is now {overall_risk} Risk"
            clinician_body = (
                f"Maternal risk escalated from {prev_risk} to {overall_risk}.\n"
                f"Vitals: BP {rules_res['vitals'].get('systolic', 'N/A')}/{rules_res['vitals'].get('diastolic', 'N/A')}, Sugar {rules_res['vitals'].get('glucose', 'N/A')}\n"
                f"Symptoms: {', '.join(rules_res['symptoms'])}\n"
                f"AI Recommendation: {enrichment['recommendation_en']}"
            )
            query(
                """
                INSERT INTO clinician_alerts (patient_id, alert_type, severity, title, body, meta)
                VALUES (%s, 'risk_escalation', %s, %s, %s, %s)
                """,
                (
                    user_id,
                    overall_risk.lower(),
                    clinician_title,
                    clinician_body,
                    json.dumps(enrichment["condition_flags_en"])
                ),
                fetch="none"
            )

    return profile


def extract_symptoms_from_text_and_update_risk(user_id: int, message_text: str, current_lang: str = "bn"):
    """
    Extracts symptoms (both present and resolved) from the chat text using Gemini.
    Saves the symptoms in health_logs and updates the risk profile in the background.
    """
    from rules.severity import SYMPTOM_SEVERITY

    if not message_text or not user_id:
        return

    extraction_prompt = f"""
    You are a clinical symptom extraction bot.
    Analyze the following chat message (which may be in English, Bengali, or Banglish) and extract any maternal or fetal health symptoms.

    Message: "{message_text}"

    You must identify:
    1. Symptoms currently present or experienced by the patient (e.g. severe headache, swelling, dizziness, vaginal bleeding, pelvic pain, chest pain, back pain, anxiety, breathing difficulty, etc.).
    2. Symptoms that were previously present but have now disappeared, resolved, or stopped (e.g. "my headache is gone", "no more fever", "vomiting has stopped").

    Format all extracted symptoms as standardized lowercase strings using underscores instead of spaces (e.g. "severe_headache", "vaginal_bleeding", "fever", "chest_pain").

    Return ONLY a JSON object with two lists:
    {{
      "present": ["symptom_1", "symptom_2"],
      "resolved": ["symptom_3"]
    }}

    If no symptoms are mentioned, return:
    {{
      "present": [],
      "resolved": []
    }}

    CRITICAL: Output MUST be a valid JSON object matching the schema above and nothing else. No explanation, no markdown backticks.
    """

    present_symptoms = []
    resolved_symptoms = []

    success = False
    data = None
    key = None
    while True:
        try:
            model, key = get_gemini_model("gemini-2.5-flash")
            response = model.generate_content(
                extraction_prompt,
                generation_config={
                    "response_mime_type": "application/json",
                    "temperature": 0.1
                },
                request_options={"timeout": 25}
            )
            if response and response.text:
                cleaned_res = response.text.strip().replace("```json", "").replace("```", "").strip()
                data = json.loads(cleaned_res)
                success = True
            break
        except GeminiKeysExhausted:
            print("Symptom extraction — all Gemini keys exhausted, trying OpenRouter.")
            break
        except Exception as e:
            if is_quota_error(e):
                mark_exhausted(key)
                continue  # try next key
            print("Gemini symptom extraction failed:", e)
            break

    if not success and OPENROUTER_API_KEY:
        try:
            response = or_client.chat.completions.create(
                model="google/gemini-2.5-flash",
                messages=[{"role": "user", "content": extraction_prompt}],
                response_format={"type": "json_object"},
                temperature=0.1,
                max_tokens=500
            )
            raw_text = response.choices[0].message.content
            if raw_text:
                data = json.loads(raw_text.strip())
                success = True
        except Exception as e:
            print("OpenRouter symptom extraction failed:", e)

    if success and isinstance(data, dict):
        present_symptoms = [s.strip().lower().replace(" ", "_") for s in data.get("present", []) if s]
        resolved_symptoms = [s.strip().lower().replace(" ", "_") for s in data.get("resolved", []) if s]

    # Combine into a single list with minus prefix for resolved symptoms
    all_extracted = present_symptoms + [f"-{s}" for s in resolved_symptoms]

    if not all_extracted:
        return

    print(f"[CHAT SYMPTOM EXTRACTION] Extracted for user {user_id}: {all_extracted}")

    # Fetch user's previous active symptoms from health_logs in the last 14 days
    previous_logs = query(
        """
        SELECT symptoms FROM health_logs
        WHERE user_id = %s AND created_at >= NOW() - INTERVAL '14 days'
        """,
        (user_id,)
    )
    
    previous_symptoms = set()
    for log in previous_logs:
        syms = log.get("symptoms")
        if syms:
            if isinstance(syms, list):
                for s in syms:
                    if not s.startswith("-"):
                        previous_symptoms.add(s)
            elif isinstance(syms, str):
                for s in syms.split(','):
                    s_clean = s.strip()
                    if s_clean and not s_clean.startswith("-"):
                        previous_symptoms.add(s_clean)

    # Check if there are new symptoms, high-severity symptoms, or resolved symptoms
    new_symptoms = [s for s in present_symptoms if s not in previous_symptoms]
    high_severity_symptoms = [s for s in present_symptoms if SYMPTOM_SEVERITY.get(s, 2) >= 3]

    should_recompute = len(new_symptoms) > 0 or len(high_severity_symptoms) > 0 or len(resolved_symptoms) > 0

    # Log these extracted symptoms to health_logs
    severity_score = sum(SYMPTOM_SEVERITY.get(s, 2) for s in present_symptoms)
    danger_level = "safe"
    if severity_score >= 8:
        danger_level = "danger"
    elif severity_score >= 4:
        danger_level = "warning"

    query(
        """
        INSERT INTO health_logs (user_id, symptoms, danger_level, raw_input, severity_score, transcribed_text)
        VALUES (%s, %s, %s, %s, %s, %s)
        """,
        (
            user_id,
            all_extracted,
            danger_level,
            f"Chat-extracted symptoms: {', '.join(all_extracted)}",
            severity_score,
            message_text
        ),
        fetch="none"
    )

    if should_recompute:
        print(f"[CHAT RISK] Recomputing risk for user {user_id} due to symptoms updates.")
        try:
            current_profile = query("SELECT language FROM risk_profiles WHERE user_id = %s", (user_id,), fetch="one")
            profile_lang = current_profile.get("language", current_lang) if current_profile else current_lang
            compute_user_risk(user_id, lang=profile_lang)
        except Exception as err:
            print("Failed to recompute risk after chat extraction:", err)