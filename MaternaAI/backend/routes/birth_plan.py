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


def compute_readiness_score(data, ctx):
    """
    Compute a birth readiness score (0-100) and list of gap strings.
    Supports both camelCase and snake_case keys for robustness.
    """
    score = 0
    gaps = []

    def get_val(keys, default=None):
        for k in keys:
            if k in data:
                return data[k]
        return default

    track = get_val(["track"], "A")
    blood_group = get_val(["blood_group", "bloodGroup"])
    known_allergies = get_val(["known_allergies", "knownAllergies"])
    medical_conditions = get_val(["medical_conditions", "medicalConditions"])
    birth_prep_checklist = get_val(["birth_prep_checklist", "birthPrepChecklist"], {})
    hospital_name = get_val(["hospital_name", "hospitalName", "hospital"])
    emergency_contacts = get_val(["emergency_contacts", "emergencyContacts"], [])
    sba_present = get_val(["sba_present", "sbaPresent"])
    support_person = get_val(["support_person", "supportPerson"])
    csection_consent = get_val(["csection_consent", "csectionConsent"], True)
    danger_signs_acknowledged = get_val(["danger_signs_acknowledged", "dangerSignsAcknowledged", "dangerSignsAck"], False)

    # 1. Medical preparedness (25 pts)
    if blood_group and str(blood_group).strip().lower() not in ("", "unknown", "none"):
        score += 10
    else:
        gaps.append("Blood group not recorded")

    if known_allergies is not None:
        score += 8
    else:
        gaps.append("Allergies list not recorded")

    if medical_conditions is not None:
        score += 7
    else:
        gaps.append("Medical conditions list not recorded")

    # 2. Birth preparedness (25 pts)
    if track == "B":
        checked = 0
        if isinstance(birth_prep_checklist, dict):
            checked = sum(1 for v in birth_prep_checklist.values() if v)
        score += min(25, checked * 6)
        if checked < 4:
            gaps.append(f"{4 - checked} birth preparedness item(s) incomplete")
    else:
        if hospital_name and str(hospital_name).strip():
            score += 25
        else:
            gaps.append("No delivery facility selected")

    # 3. Clinical history (25 pts)
    # no-spike bonuses (10+8+7) vs deductions for spikes
    if ctx.get("bp_spike_count", 0) == 0:
        score += 10
    else:
        gaps.append("Elevated blood pressure readings logged")

    if ctx.get("glucose_spike_count", 0) == 0:
        score += 8
    else:
        gaps.append("Elevated blood glucose readings logged")

    if ctx.get("reduced_kick_count", 0) == 0:
        score += 7
    else:
        gaps.append("Reduced fetal kick sessions detected")

    if ctx.get("ppd_risk") in ("moderate", "high"):
        gaps.append(f"PPD risk flagged: {ctx.get('ppd_risk')}")

    # 4. Support & planning (25 pts)
    if emergency_contacts:
        score += 9
    else:
        gaps.append("No emergency contact recorded")

    if track == "B":
        if sba_present == "yes":
            score += 8
        elif sba_present == "arranging":
            score += 4
            gaps.append("Skilled birth attendant still being arranged")
        else:
            gaps.append("No skilled birth attendant confirmed")

        if danger_signs_acknowledged:
            score += 8
        else:
            gaps.append("Danger signs not acknowledged")
    else:
        if support_person and str(support_person).strip():
            score += 8
        else:
            gaps.append("No birth companion selected")

        if csection_consent:
            score += 8
        else:
            gaps.append("C-section consent not given")

    return min(max(score, 0), 100), gaps


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
    print(f"TRACK RECEIVED FROM FRONTEND: {track}, hospital: {hospital}")
    blood_group = data.get("blood_group")
    rh_negative = data.get("rh_negative", False)
    known_allergies = data.get("known_allergies", [])
    medical_conditions = data.get("medical_conditions", [])
    csection_consent = data.get("csection_consent", "yes")
    csection_str = {
        "yes": "Consented to emergency C-section if medically required",
        "no": "Has NOT consented to C-section — clinician must discuss before delivery",
        "not_sure": "Undecided on C-section consent — requires discussion with care team"
    }.get(str(csection_consent), "Not specified")
    neonatal_prefs = data.get("neonatal_prefs", {})
    cultural_prefs = data.get("cultural_prefs", {})
    sba_present = data.get("sba_present")
    birth_prep_checklist = data.get("birth_prep_checklist", {})
    referral_pathway = data.get("referral_pathway", {})
    danger_signs_acknowledged = data.get("danger_signs_acknowledged", False)
    language = data.get("language", "en")

    try:
        print("=== BIRTH PLAN GENERATE CALLED ===")
        print("user_id:", user_id, "track:", data.get("track"))
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
                f"C-section Consent Status: {csection_str}. "
                f"Neonatal Preferences: {json.dumps(neonatal_prefs)}. "
                f"Cultural Preferences: {json.dumps(cultural_prefs)}. "
                f"Support person: {support_person}. "
                f"Pain management preference: {pain_pref}. "
                f"Special notes: {special_notes if special_notes else 'None'}."
            )

        # Append history summary
        user_message += (
            f" PATIENT HEALTH BACKGROUND: {history_summary} "
            f"Based on this background, weave in personalised, friendly suggestions "
            f"throughout the plan — not as warnings or a separate section, but naturally "
            f"as if a caring midwife who knows her history is giving advice. "
            f"Keep suggestions gentle and empowering, never alarming."
        )

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

        # Compute readiness score
        score_data = {
            "blood_group": blood_group,
            "known_allergies": known_allergies,
            "medical_conditions": medical_conditions,
            "track": track,
            "birth_prep_checklist": birth_prep_checklist,
            "hospital_name": hospital,
            "emergency_contacts": emergency_contacts,
            "sba_present": sba_present,
            "support_person": support_person,
        }
        print("DEBUG data keys:", list(data.keys()))
        print("DEBUG track:", data.get("track"))
        print("DEBUG birth_prep_checklist:", data.get("birth_prep_checklist"))
        print("DEBUG sba_present:", data.get("sba_present"))
        print("DEBUG ctx:", ctx)
        readiness_score, readiness_gaps = compute_readiness_score(score_data, ctx)

        # Versioning: deactivate previous active plans
        try:
            query("""
                UPDATE birth_plans SET is_active = FALSE
                WHERE user_id = %s AND is_active = TRUE
            """, (user_id,), fetch="none")
        except Exception as update_err:
            print(f"Warning: could not deactivate old plans: {update_err}")
            # Non-fatal — continue with insert

        version_row = query("""
            SELECT COUNT(*) as cnt FROM birth_plans WHERE user_id = %s
        """, (user_id,), fetch="one")
        new_version = (version_row["cnt"] if version_row else 0) + 1

        weeks_at_generation = data.get("profile", {}).get("weeks_pregnant") or None

        print("DEBUG score:", readiness_score, "gaps:", readiness_gaps)

        # Extract transport strategy
        transport_strategy = data.get("transport", "")

        row = query("""
            INSERT INTO birth_plans 
            (user_id, hospital_name, transport, support_person, pain_preference, special_notes, emergency_contacts, generated_plan,
             track, blood_group, rh_negative, known_allergies, medical_conditions, csection_consent, neonatal_prefs, 
             cultural_prefs, sba_present, birth_prep_checklist, referral_pathway, danger_signs_acknowledged,
             readiness_score, readiness_gaps, is_active, version, weeks_at_generation)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, generated_plan, created_at, readiness_score, readiness_gaps, version, is_active
        """, (
            user_id, hospital, transport_strategy, support_person, pain_pref,
            special_notes, json.dumps(emergency_contacts), plan,
            track, blood_group, rh_negative, json.dumps(known_allergies), json.dumps(medical_conditions),
            csection_consent, json.dumps(neonatal_prefs), json.dumps(cultural_prefs),
            sba_present, json.dumps(birth_prep_checklist), json.dumps(referral_pathway), danger_signs_acknowledged,
            readiness_score, json.dumps(readiness_gaps), True, new_version, weeks_at_generation
        ), fetch="one")

        return jsonify({
            "id": row["id"],
            "generated_plan": row["generated_plan"],
            "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            "readiness_score": row["readiness_score"],
            "readiness_gaps": row["readiness_gaps"],
            "version": row["version"],
            "is_active": row["is_active"]
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@birth_plan_bp.route("/<int:user_id>", methods=["GET"])
def get_birth_plans(user_id):
    try:
        rows = query("""
            SELECT id, track, hospital_name, transport, readiness_score, readiness_gaps,
                generated_plan, support_person, pain_preference, special_notes,
                emergency_contacts, blood_group,
                medical_conditions,
                known_allergies,
                csection_consent,
                neonatal_prefs,
                sba_present, birth_prep_checklist,
                referral_pathway, danger_signs_acknowledged,
                is_active, version,
                weeks_at_generation, created_at
            FROM birth_plans
            WHERE user_id = %s
            ORDER BY created_at DESC
        """, (user_id,))

        return jsonify([{
            "id": r["id"],
            "hospital_name": r["hospital_name"],
            "transport": r.get("transport"),
            "support_person": r.get("support_person"),
            "pain_preference": r.get("pain_preference"),
            "special_notes": r.get("special_notes"),
            "emergency_contacts": r.get("emergency_contacts"),
            "generated_plan": r["generated_plan"],
            "track": r["track"],
            "blood_group": r.get("blood_group"),
            "sba_present": r.get("sba_present"),
            "birth_prep_checklist": r.get("birth_prep_checklist"),
            "referral_pathway": r.get("referral_pathway"),
            "danger_signs_acknowledged": r.get("danger_signs_acknowledged"),
            "readiness_score": r["readiness_score"],
            "readiness_gaps": r["readiness_gaps"],
            "is_active": r["is_active"],
            "version": r["version"],
            "weeks_at_generation": r.get("weeks_at_generation"),
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
