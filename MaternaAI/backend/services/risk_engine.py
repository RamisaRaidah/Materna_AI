import os
import json
import google.generativeai as genai
from config import GEMINI_API_KEY, OPENROUTER_API_KEY
from db import query
import openai

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

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
    Step 1 of Hybrid Approach: Rule-Based Scoring.
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

    # 2. Fetch last 14 days of health logs
    logs = query(
        """
        SELECT bp_systolic, bp_diastolic, blood_glucose, symptoms, created_at
        FROM health_logs
        WHERE user_id = %s AND created_at >= NOW() - INTERVAL '14 days'
        ORDER BY created_at DESC
        """,
        (user_id,)
    )

    # 3. Extract symptoms and vitals
    unique_symptoms = set()
    latest_systolic = None
    latest_diastolic = None
    latest_glucose = None

    for log in logs:
        # Vitals (get latest non-null values)
        if latest_systolic is None and log.get("bp_systolic") is not None:
            latest_systolic = log["bp_systolic"]
        if latest_diastolic is None and log.get("bp_diastolic") is not None:
            latest_diastolic = log["bp_diastolic"]
        if latest_glucose is None and log.get("blood_glucose") is not None:
            latest_glucose = float(log["blood_glucose"])

        # Symptoms
        syms = log.get("symptoms")
        if syms:
            if isinstance(syms, list):
                for s in syms:
                    unique_symptoms.add(s)
            elif isinstance(syms, str):
                # Handle potential comma-separated string format
                for s in syms.split(','):
                    s_clean = s.strip()
                    if s_clean:
                        unique_symptoms.add(s_clean)

    symptoms_list = list(unique_symptoms)

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
    # Occurs after 20 weeks or postpartum
    if (weeks and weeks >= 20) or is_postpartum:
        # Blood pressure checks
        if latest_systolic is not None and latest_diastolic is not None:
            if latest_systolic >= 160 or latest_diastolic >= 110:
                conditions["preeclampsia"]["score"] += 10
            elif latest_systolic >= 140 or latest_diastolic >= 90:
                conditions["preeclampsia"]["score"] += 5
            elif latest_systolic >= 130 or latest_diastolic >= 80:
                conditions["preeclampsia"]["score"] += 2
        
        # Symptom checks
        if "severe_headache" in unique_symptoms or "headache" in unique_symptoms:
            conditions["preeclampsia"]["score"] += 3
        if "swelling" in unique_symptoms:
            conditions["preeclampsia"]["score"] += 3
        if "vision" in unique_symptoms:
            conditions["preeclampsia"]["score"] += 4

        # Risk assignment
        score = conditions["preeclampsia"]["score"]
        if score >= 12 or (latest_systolic and latest_systolic >= 160):
            conditions["preeclampsia"]["risk"] = "Critical"
        elif score >= 7:
            conditions["preeclampsia"]["risk"] = "High"
        elif score >= 3:
            conditions["preeclampsia"]["risk"] = "Medium"

    # --- ANEMIA RULES ---
    if "fatigue" in unique_symptoms:
        conditions["anemia"]["score"] += 2
    if "vision" in unique_symptoms or "dizziness" in unique_symptoms:
        conditions["anemia"]["score"] += 2
    if "pale_skin" in unique_symptoms or "paleness" in unique_symptoms:
        conditions["anemia"]["score"] += 3
    if weeks: # Pregnancy increases iron demands
        conditions["anemia"]["score"] += 1

    score = conditions["anemia"]["score"]
    if score >= 5:
        conditions["anemia"]["risk"] = "High"
    elif score >= 3:
        conditions["anemia"]["risk"] = "Medium"

    # --- GESTATIONAL DIABETES (GDM) RULES ---
    # Fasting glucose >= 7.8 mmol/L is risk threshold
    if latest_glucose is not None:
        if latest_glucose >= 11.1:
            conditions["gdm"]["score"] += 12
        elif latest_glucose >= 7.8:
            conditions["gdm"]["score"] += 8
        elif latest_glucose >= 6.1:
            conditions["gdm"]["score"] += 3

    if "excessive_thirst" in unique_symptoms:
        conditions["gdm"]["score"] += 3
    if "frequent_urination" in unique_symptoms:
        conditions["gdm"]["score"] += 3
    if "fatigue" in unique_symptoms:
        conditions["gdm"]["score"] += 1
    if weeks and 24 <= weeks <= 28: # Typical screening window
        conditions["gdm"]["score"] += 1

    score = conditions["gdm"]["score"]
    if not is_postpartum:
        if score >= 8:
            conditions["gdm"]["risk"] = "High"
        elif score >= 4:
            conditions["gdm"]["risk"] = "Medium"
    else:
        # Postpartum -> Type 2 risk instead of GDM
        if score >= 8:
            conditions["gdm"]["risk"] = "High"
        elif score >= 4:
            conditions["gdm"]["risk"] = "Medium"

    # --- POSTPARTUM DEPRESSION (PPD) RULES ---
    if is_postpartum or user.get("persona") in ["postpartum", "recovery"]:
        if "low_mood" in unique_symptoms or "sadness" in unique_symptoms:
            conditions["ppd"]["score"] += 4
        if "trouble_sleeping" in unique_symptoms or "insomnia" in unique_symptoms:
            conditions["ppd"]["score"] += 2
        if "fatigue" in unique_symptoms:
            conditions["ppd"]["score"] += 1
        if "anxiety" in unique_symptoms:
            conditions["ppd"]["score"] += 2

        # Check latest PPD assessment score in last 14 days
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
    if "fever" in unique_symptoms:
        conditions["infection"]["score"] += 5
    if "abdominal_pain" in unique_symptoms:
        conditions["infection"]["score"] += 3
    if "chills" in unique_symptoms:
        conditions["infection"]["score"] += 2

    score = conditions["infection"]["score"]
    if score >= 8:
        conditions["infection"]["risk"] = "Critical"
    elif score >= 5:
        conditions["infection"]["risk"] = "High"
    elif score >= 3:
        conditions["infection"]["risk"] = "Medium"

    # --- HEMORRHAGE / MISCARRIAGE RULES ---
    if "bleeding" in unique_symptoms:
        conditions["hemorrhage"]["score"] += 10
    if "abdominal_pain" in unique_symptoms:
        conditions["hemorrhage"]["score"] += 3

    score = conditions["hemorrhage"]["score"]
    if score >= 10:
        conditions["hemorrhage"]["risk"] = "Critical"
    elif score >= 3:
        conditions["hemorrhage"]["risk"] = "High"

    # 5. Determine overall risk level as the maximum of condition risks
    severity_order = ["Critical", "High", "Medium", "Low"]
    overall_risk = "Low"
    for r in severity_order:
        if any(c["risk"] == r for c in conditions.values()):
            overall_risk = r
            break

    # Add general danger rules
    if "reduced_movement" in unique_symptoms:
        overall_risk = "Critical"

    return {
        "overall_risk": overall_risk,
        "scores": conditions,
        "symptoms": symptoms_list,
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
    1. Identify matching condition flags to list (e.g. "Possible preeclampsia risk", "Anemia risk", "Postpartum depression risk", "Stable profile").
    2. Write a warm, compassionate plain-language explanation of these results in the requested language: { 'BENGALI (বাংলা)' if lang == 'bn' else 'ENGLISH' }.
       Explain the significance of the symptoms and vitals in 2-3 caring sentences.
    3. Generate a concrete action recommendation matching the risk level in that language:
       - Low Risk -> "Monitor at home"
       - Medium Risk -> "Monitor closely and contact midwife"
       - High Risk -> "Consult doctor or midwife soon"
       - Critical Risk -> "Seek emergency medical care immediately"
       Keep it simple and actionable.

    CRITICAL RULES:
    - You MUST output ONLY valid JSON matching the schema below.
    - Do NOT change the decided risk level of "{rule_results['overall_risk']}". Your explanation must align with it.
    - Output language MUST be strictly { 'Bengali (Unicode script)' if lang == 'bn' else 'English' } for the explanation, condition_flags, and recommendation.

    JSON Schema:
    {{
      "condition_flags": ["flag 1", "flag 2"],
      "explanation": "compassionate explanation",
      "recommendation": "action advice"
    }}
    """

    success = False
    data = None
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
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
    except Exception as e:
        print("Gemini enrichment failed:", e)

    if not success and OPENROUTER_API_KEY:
        try:
            print("Using OpenRouter fallback for risk enrichment...")
            response = or_client.chat.completions.create(
                model="google/gemini-2.5-flash",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                temperature=0.2
            )
            raw_text = response.choices[0].message.content
            if raw_text:
                data = json.loads(raw_text.strip())
                success = True
        except Exception as e:
            print("OpenRouter fallback failed:", e)

    if success and data:
        return {
            "condition_flags": data.get("condition_flags", []),
            "explanation": data.get("explanation", ""),
            "recommendation": data.get("recommendation", "")
        }

    # Secondary fallback on parser failure
    if lang == "bn":
        return {
            "condition_flags": ["গর্ভকালীন ঝুঁকি" if rule_results["overall_risk"] != "Low" else "নিয়মিত পর্যবেক্ষণ"],
            "explanation": f"ঝুঁকির মাত্রা: {rule_results['overall_risk']}। আপনার স্বাস্থ্য ভালো রাখতে বিশ্রাম ও নিয়মিত পরীক্ষা নিশ্চিত করুন।",
            "recommendation": "মিডওয়াইফের সাথে যোগাযোগ করুন এবং কোনো অস্বাভাবিক লক্ষণ দেখলে দ্রুত চিকিৎসকের কাছে যান।"
        }
    else:
        return {
            "condition_flags": ["Maternal Risk" if rule_results["overall_risk"] != "Low" else "Routine Monitoring"],
            "explanation": f"Risk level is {rule_results['overall_risk']}. Please monitor your symptoms and check your blood pressure twice daily.",
            "recommendation": "Contact your midwife and consult a healthcare provider for any danger signs."
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

    # 5. Insert history into risk_assessments
    query(
        """
        INSERT INTO risk_assessments (user_id, risk_level, condition_flags, explanation, recommendation, language, rule_score)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """,
        (
            user_id,
            overall_risk,
            enrichment["condition_flags"],
            enrichment["explanation"],
            enrichment["recommendation"],
            lang,
            sum(c["score"] for c in rules_res["scores"].values())
        ),
        fetch="none"
    )

    # 6. Upsert cached risk_profiles
    profile = query(
        """
        INSERT INTO risk_profiles (user_id, risk_level, condition_flags, explanation, recommendation, language, rule_score, symptoms_analyzed, last_computed_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
        ON CONFLICT (user_id) DO UPDATE
        SET risk_level = EXCLUDED.risk_level,
            condition_flags = EXCLUDED.condition_flags,
            explanation = EXCLUDED.explanation,
            recommendation = EXCLUDED.recommendation,
            language = EXCLUDED.language,
            rule_score = EXCLUDED.rule_score,
            symptoms_analyzed = EXCLUDED.symptoms_analyzed,
            last_computed_at = NOW(),
            updated_at = NOW()
        RETURNING *
        """,
        (
            user_id,
            overall_risk,
            enrichment["condition_flags"],
            enrichment["explanation"],
            enrichment["recommendation"],
            lang,
            sum(c["score"] for c in rules_res["scores"].values()),
            json.dumps(rules_res["symptoms"])
        ),
        fetch="one"
    )

    # 7. Escalation Check & Alert System
    prev_weight = RISK_LEVEL_ORDER.get(prev_risk, 1)
    new_weight = RISK_LEVEL_ORDER.get(overall_risk, 1)

    if new_weight > prev_weight:
        # Alert flagged in UI via notification
        title_en = f"🚨 Health Risk Alert: Escalated to {overall_risk}"
        title_bn = f"🚨 স্বাস্থ্য ঝুঁকি সর্তকতা: {overall_risk} ঝুঁকিতে উন্নীত"
        title = title_bn if lang == "bn" else title_en

        body_en = f"Your computed health risk has escalated from {prev_risk} to {overall_risk}. Recommendation: {enrichment['recommendation']}"
        body_bn = f"আপনার গর্ভকালীন স্বাস্থ্য ঝুঁকি {prev_risk} থেকে বৃদ্ধি পেয়ে {overall_risk} হয়েছে। পরামর্শ: {enrichment['recommendation']}"
        body = body_bn if lang == "bn" else body_en

        # Insert Notification
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
                    "condition_flags": enrichment["condition_flags"]
                })
            ),
            fetch="none"
        )

        # Flag Clinician Alert if Risk is High or Critical
        if overall_risk in ["High", "Critical"]:
            clinician_title = f"⚠️ RISK ESCALATION: Patient {user['name']} is now {overall_risk} Risk"
            clinician_body = (
                f"Maternal risk escalated from {prev_risk} to {overall_risk}.\n"
                f"Vitals: BP {rules_res['vitals'].get('systolic', 'N/A')}/{rules_res['vitals'].get('diastolic', 'N/A')}, Sugar {rules_res['vitals'].get('glucose', 'N/A')}\n"
                f"Symptoms: {', '.join(rules_res['symptoms'])}\n"
                f"AI Recommendation: {enrichment['recommendation']}"
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
                    json.dumps(enrichment["condition_flags"])
                ),
                fetch="none"
            )

    return profile
