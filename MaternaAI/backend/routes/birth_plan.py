from flask import Blueprint, request, jsonify
from services.rag import rag_query
from db import query
import json

birth_plan_bp = Blueprint("birth_plan", __name__)

def get_patient_context(user_id):
    """
    Query existing health database tables to get personalized risk context.
    """
    try:
        # bp_spike_count: count of health logs where bp_systolic >= 140
        bp_row = query("""
            SELECT COALESCE(COUNT(*), 0) as count
            FROM health_logs
            WHERE user_id = %s AND bp_systolic >= 140
        """, (user_id,), fetch="one")
        bp_spike_count = bp_row["count"] if bp_row else 0

        # glucose_spike_count: count of health logs where blood_glucose >= 7.8
        glucose_row = query("""
            SELECT COALESCE(COUNT(*), 0) as count
            FROM health_logs
            WHERE user_id = %s AND blood_glucose >= 7.8
        """, (user_id,), fetch="one")
        glucose_spike_count = glucose_row["count"] if glucose_row else 0

        # danger_log_count: count of health logs where danger_level = 'danger'
        danger_row = query("""
            SELECT COALESCE(COUNT(*), 0) as count
            FROM health_logs
            WHERE user_id = %s AND danger_level = 'danger'
        """, (user_id,), fetch="one")
        danger_log_count = danger_row["count"] if danger_row else 0

        # recurring_symptoms: symptoms occurring > 1 time
        symptoms_rows = query("""
            SELECT symptom
            FROM (
                SELECT unnest(symptoms) as symptom
                FROM health_logs
                WHERE user_id = %s AND symptoms IS NOT NULL
            ) sub
            GROUP BY symptom
            HAVING COUNT(*) > 1
        """, (user_id,))
        recurring_symptoms = [r["symptom"] for r in symptoms_rows] if symptoms_rows else []

        # ppd_flagged_in_logs: count of health logs flagged for PPD
        ppd_log_row = query("""
            SELECT COALESCE(COUNT(*), 0) as count
            FROM health_logs
            WHERE user_id = %s AND flagged_ppd = TRUE
        """, (user_id,), fetch="one")
        ppd_flagged_in_logs = ppd_log_row["count"] if ppd_log_row else 0

        # ppd_risk and ppd_score from latest ppd_assessments row
        ppd_assess_row = query("""
            SELECT total_score, risk_level
            FROM ppd_assessments
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT 1
        """, (user_id,), fetch="one")
        
        if ppd_assess_row:
            ppd_score = ppd_assess_row["total_score"]
            ppd_risk = ppd_assess_row["risk_level"]
        else:
            ppd_score = None
            ppd_risk = None

        # reduced_kick_count in last 30 days
        kick_row = query("""
            SELECT COALESCE(COUNT(*), 0) as count
            FROM kick_sessions
            WHERE user_id = %s AND result = 'reduced' AND created_at >= NOW() - INTERVAL '30 days'
        """, (user_id,), fetch="one")
        reduced_kick_count = kick_row["count"] if kick_row else 0

        # open_alerts from clinician_alerts
        alerts_rows = query("""
            SELECT DISTINCT alert_type
            FROM clinician_alerts
            WHERE patient_id = %s AND status = 'open'
        """, (user_id,))
        open_alerts = [r["alert_type"] for r in alerts_rows] if alerts_rows else []

        return {
            "bp_spike_count": bp_spike_count,
            "glucose_spike_count": glucose_spike_count,
            "danger_log_count": danger_log_count,
            "recurring_symptoms": recurring_symptoms,
            "ppd_flagged_in_logs": ppd_flagged_in_logs,
            "ppd_risk": ppd_risk,
            "ppd_score": ppd_score,
            "reduced_kick_count": reduced_kick_count,
            "open_alerts": open_alerts
        }
    except Exception as e:
        print("Error fetching patient context:", e)
        return {
            "bp_spike_count": 0,
            "glucose_spike_count": 0,
            "danger_log_count": 0,
            "recurring_symptoms": [],
            "ppd_flagged_in_logs": 0,
            "ppd_risk": None,
            "ppd_score": None,
            "reduced_kick_count": 0,
            "open_alerts": []
        }

def build_history_summary(ctx):
    """
    Compile risk details into plain English for AI prompt injection.
    """
    flags = []
    if ctx.get("bp_spike_count", 0) > 0:
        flags.append(f"Preeclampsia risk is flagged due to {ctx['bp_spike_count']} blood pressure spikes.")
    if ctx.get("glucose_spike_count", 0) > 0:
        flags.append(f"GDM protocol is flagged due to {ctx['glucose_spike_count']} elevated blood glucose readings.")
    if ctx.get("reduced_kick_count", 0) > 0:
        flags.append(f"Fetal monitoring is flagged due to {ctx['reduced_kick_count']} reduced kick sessions in the last 30 days.")
    
    ppd_risk = ctx.get("ppd_risk")
    if ppd_risk in ("moderate", "high"):
        flags.append(f"Postpartum mental health plan is flagged (latest PPD risk: {ppd_risk}, score: {ctx.get('ppd_score', 'N/A')}).")
        
    open_alerts = ctx.get("open_alerts", [])
    if open_alerts:
        flags.append(f"There are active clinician alerts: {', '.join(open_alerts)}.")
        
    recurring_symptoms = ctx.get("recurring_symptoms", [])
    if recurring_symptoms:
        flags.append(f"The patient has recurring symptoms: {', '.join(recurring_symptoms)}.")

    if not flags:
        return "No critical pregnancy risk factors or adverse vitals flagged in patient history."
    return " ".join(flags)


@birth_plan_bp.route("/generate", methods=["POST"])
def generate_birth_plan():
    data = request.json or {}
    user_id = data.get("user_id")

    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    hospital = data.get("hospital_name", "Nearest hospital")
    support_person = data.get("support_person", "Family member")
    pain_pref = data.get("pain_preference", "undecided")
    special_notes = data.get("special_notes", "")
    emergency_contacts = data.get("emergency_contacts", [])
    user_profile = data.get("profile", {})

    # Extract new fields
    track = data.get("track", "A")
    blood_group = data.get("blood_group")
    rh_negative = data.get("rh_negative", False)
    known_allergies = data.get("known_allergies", [])
    medical_conditions = data.get("medical_conditions", [])
    csection_consent = data.get("csection_consent", True)
    neonatal_prefs = data.get("neonatal_prefs", {})
    cultural_prefs = data.get("cultural_prefs", {})
    sba_present = data.get("sba_present")
    birth_prep_checklist = data.get("birth_prep_checklist", {})
    referral_pathway = data.get("referral_pathway", {})
    danger_signs_acknowledged = data.get("danger_signs_acknowledged", False)
    language = data.get("language", "en")

    try:
        # Call patient context & history summary
        ctx = get_patient_context(user_id)
        history_summary = build_history_summary(ctx)

        if track == 'B':
            # Home/community birth prompt
            gaps = []
            if not birth_prep_checklist.get("money_saved"):
                gaps.append("money saved for transport")
            if not birth_prep_checklist.get("donor_identified"):
                gaps.append("blood donor identified")
            if not birth_prep_checklist.get("kit_packed"):
                gaps.append("clean delivery kit packed")
            if not birth_prep_checklist.get("facility_identified"):
                gaps.append("nearest EmONC facility identified")
            
            gaps_str = ", ".join(gaps) if gaps else "None"
            ref_facility = referral_pathway.get("facility", "None identified")

            user_message = (
                f"Please generate a detailed birth plan for a community or home birth (Track B). "
                f"SBA (Skilled Birth Attendant) status: {sba_present}. "
                f"Birth preparedness checklist gaps: {gaps_str}. "
                f"Emergency referral pathway facility: {ref_facility}. "
                f"Danger signs acknowledged by mother: {danger_signs_acknowledged}. "
                f"Hospital for referral: {hospital}. "
                f"Support person: {support_person}. "
                f"Special notes: {special_notes if special_notes else 'None'}. "
                f"Use short sentences. Avoid medical jargon."
            )
        else:
            # Facility birth prompt
            rh_instruction = ""
            if rh_negative:
                rh_instruction = "IMPORTANT: The patient is Rh-negative. Your generated plan must explicitly include instructions for Anti-D/RhoGAM injection planning. "

            allergies_list = [a.get("name", a) if isinstance(a, dict) else a for a in known_allergies]
            allergies_str = ", ".join(allergies_list) if allergies_list else "None"
            conditions_str = ", ".join(medical_conditions) if medical_conditions else "None"

            user_message = (
                f"Please generate a detailed facility birth plan (Track A). "
                f"Hospital: {hospital}. "
                f"Blood Group: {blood_group if blood_group else 'Unknown'}. "
                f"Rh-negative flag: {rh_negative}. "
                f"{rh_instruction}"
                f"Known Allergies: {allergies_str}. "
                f"Medical Conditions: {conditions_str}. "
                f"C-section Consent Status: {'Consented' if csection_consent else 'Not Consented'}. "
                f"Neonatal Preferences: {json.dumps(neonatal_prefs)}. "
                f"Cultural Preferences: {json.dumps(cultural_prefs)}. "
                f"Support person: {support_person}. "
                f"Pain management preference: {pain_pref}. "
                f"Special notes: {special_notes if special_notes else 'None'}."
            )

        # Append history summary
        user_message += f" PATIENT CLINICAL HISTORY: {history_summary} Tailor all recommendations to these documented findings."

        # Language-aware prompt instruction
        lang_instruction = (
            "Respond entirely in Bengali (বাংলা). Use simple, everyday language "
            "a rural mother would understand. Avoid English medical terms."
            if language == "bn"
            else "Respond in clear, plain English."
        )
        user_message += f" LANGUAGE INSTRUCTION: {lang_instruction}"

        # Generate plan using RAG
        plan = rag_query(user_message, user_profile, mode="general", detected_lang=language)

        row = query("""
            INSERT INTO birth_plans 
            (user_id, hospital_name, support_person, pain_preference, special_notes, emergency_contacts, generated_plan,
             track, blood_group, rh_negative, known_allergies, medical_conditions, csection_consent, neonatal_prefs, 
             cultural_prefs, sba_present, birth_prep_checklist, referral_pathway, danger_signs_acknowledged)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, generated_plan, created_at
        """, (
            user_id, hospital, support_person, pain_pref,
            special_notes, json.dumps(emergency_contacts), plan,
            track, blood_group, rh_negative, json.dumps(known_allergies), json.dumps(medical_conditions),
            csection_consent, json.dumps(neonatal_prefs), json.dumps(cultural_prefs),
            sba_present, json.dumps(birth_prep_checklist), json.dumps(referral_pathway), danger_signs_acknowledged
        ), fetch="one")

        return jsonify({
            "id": row["id"],
            "generated_plan": row["generated_plan"],
            "created_at": row["created_at"].isoformat() if row["created_at"] else None
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@birth_plan_bp.route("/<int:user_id>", methods=["GET"])
def get_birth_plans(user_id):
    try:
        rows = query("""
            SELECT id, hospital_name, support_person, pain_preference, special_notes, emergency_contacts, generated_plan,
                   track, blood_group, rh_negative, known_allergies, medical_conditions, csection_consent, neonatal_prefs,
                   cultural_prefs, sba_present, birth_prep_checklist, referral_pathway, danger_signs_acknowledged, created_at
            FROM birth_plans
            WHERE user_id = %s
            ORDER BY created_at DESC
        """, (user_id,))

        return jsonify([{
            "id": r["id"],
            "hospital_name": r["hospital_name"],
            "support_person": r["support_person"],
            "pain_preference": r["pain_preference"],
            "special_notes": r["special_notes"],
            "emergency_contacts": r["emergency_contacts"],
            "generated_plan": r["generated_plan"],
            "track": r["track"],
            "blood_group": r["blood_group"],
            "rh_negative": r["rh_negative"],
            "known_allergies": r["known_allergies"],
            "medical_conditions": r["medical_conditions"],
            "csection_consent": r["csection_consent"],
            "neonatal_prefs": r["neonatal_prefs"],
            "cultural_prefs": r["cultural_prefs"],
            "sba_present": r["sba_present"],
            "birth_prep_checklist": r["birth_prep_checklist"],
            "referral_pathway": r["referral_pathway"],
            "danger_signs_acknowledged": r["danger_signs_acknowledged"],
            "created_at": r["created_at"].isoformat() if r["created_at"] else None
        } for r in rows])
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@birth_plan_bp.route("/<int:plan_id>", methods=["DELETE"])
def delete_birth_plan(plan_id):
    try:
        row = query("""
            DELETE FROM birth_plans 
            WHERE id = %s 
            RETURNING id
        """, (plan_id,), fetch="one")

        if not row:
            return jsonify({"error": "Birth plan records not found"}), 404

        return jsonify({"message": "Birth plan successfully deleted from database records"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500