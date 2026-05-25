# Vitals logging, danger signs checklist, fetal kick counter

from flask import Blueprint, request, jsonify, g
from db import query
from services.auth import require_auth
from rules.severity import calculate_severity, get_risk_level

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
    alert_map = {
        "bleeding": ("hemorrhage", "🚨 CRITICAL: Active Severe Vaginal Bleeding"),
        "vision":   ("preeclampsia", "⚡ PREECLAMPSIA DANGER SIGNS FLAGGED"),
        "swelling": ("preeclampsia", "⚡ PREECLAMPSIA DANGER SIGNS FLAGGED"),
        "fever":    ("infection", "🔥 INFECTION ALERT: High Fever Reported"),
    }

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
            (g.user["id"], "sos", "🚨 EMERGENCY SOS — Danger Signs",
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
 
    result = "normal" if kick_count >= 10 and elapsed_secs <= 7200 else "reduced"
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
             f"Cardiff protocol: only {kick_count} kicks in {elapsed_secs//60} min. Emergency SOS active."),
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
    return (f"⚠️ Cardiff protocol NOT met: only {count} kicks in {mins} min. "
            f"Fewer than 10 kicks in 2 hours requires immediate obstetric assessment. "
            f"Lie on your left side and contact your midwife now.")

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
 