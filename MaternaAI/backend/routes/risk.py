from flask import Blueprint, request, jsonify, g
from db import query
from services.auth import require_auth
from services.risk_engine import compute_user_risk
from datetime import datetime, timezone, timedelta

risk_bp = Blueprint("risk", __name__)

@risk_bp.route("/profile", methods=["GET"])
@require_auth
def get_profile():
    """
    Retrieve the user's latest risk profile.
    If the profile does not exist or is older than 7 days, trigger lazy recomputation.
    Accepts ?lang=bn or ?lang=en.
    """
    lang = request.args.get("lang", "bn")
    if lang not in ["bn", "en"]:
        lang = "bn"

    user_id = g.user["id"]
    profile = query("SELECT * FROM risk_profiles WHERE user_id = %s", (user_id,), fetch="one")

    should_recompute = False
    if not profile:
        should_recompute = True
    else:
        last_computed = profile.get("last_computed_at")
        if last_computed:
            # Check if last computation was more than 7 days ago
            if datetime.now(timezone.utc) - last_computed > timedelta(days=7):
                should_recompute = True

    if should_recompute:
        try:
            profile = compute_user_risk(user_id, lang=lang)
        except Exception as e:
            print(f"Lazy risk recomputation failed for user {user_id}: {e}")
            # Fall back to existing profile if it failed (if any)
            if not profile:
                profile = {
                    "user_id": user_id,
                    "risk_level": "Low",
                    "condition_flags": ["Routine monitoring"],
                    "explanation": "ঝুঁকি গণনা করা যায়নি। অনুগ্রহ করে পরে চেষ্টা করুন।" if lang == "bn" else "Unable to calculate risk. Please try again later.",
                    "recommendation": "পর্যাপ্ত বিশ্রাম নিন।" if lang == "bn" else "Take adequate rest.",
                    "language": lang,
                    "rule_score": 0,
                    "symptoms_analyzed": []
                }

    # Ensure symptoms_analyzed is returned in JSON format
    if profile and "symptoms_analyzed" in profile and isinstance(profile["symptoms_analyzed"], str):
        import json
        try:
            profile["symptoms_analyzed"] = json.loads(profile["symptoms_analyzed"])
        except:
            profile["symptoms_analyzed"] = []

    return jsonify(profile)

@risk_bp.route("/recompute", methods=["POST"])
@require_auth
def recompute():
    """
    Manually trigger risk recomputation.
    Accepts JSON body: { "lang": "bn" | "en" }
    """
    data = request.get_json() or {}
    lang = data.get("lang", "bn")
    if lang not in ["bn", "en"]:
        lang = "bn"

    user_id = g.user["id"]
    try:
        profile = compute_user_risk(user_id, lang=lang)
        
        if profile and "symptoms_analyzed" in profile and isinstance(profile["symptoms_analyzed"], str):
            import json
            try:
                profile["symptoms_analyzed"] = json.loads(profile["symptoms_analyzed"])
            except:
                profile["symptoms_analyzed"] = []
                
        return jsonify(profile)
    except Exception as e:
        print(f"Manual risk recomputation failed for user {user_id}: {e}")
        return jsonify({"error": f"Failed to recompute risk: {str(e)}"}), 500

@risk_bp.route("/cron-reassess", methods=["POST"])
def cron_reassess():
    """
    Cron endpoint to recompute risk profiles for all users whose profile
    is missing or older than 7 days.
    Usually secured, but here we run it for all patient users.
    """
    # Fetch all patients
    patients = query("SELECT id FROM users WHERE role = 'patient'", fetch="all")
    recomputations_count = 0
    errors = []

    for patient in patients:
        pid = patient["id"]
        # Check latest profile
        profile = query("SELECT last_computed_at, language FROM risk_profiles WHERE user_id = %s", (pid,), fetch="one")
        
        should_recompute = False
        lang = "bn" # Default language
        
        if not profile:
            should_recompute = True
        else:
            lang = profile.get("language", "bn")
            last_computed = profile.get("last_computed_at")
            if last_computed:
                if datetime.now(timezone.utc) - last_computed > timedelta(days=7):
                    should_recompute = True
        
        if should_recompute:
            try:
                compute_user_risk(pid, lang=lang)
                recomputations_count += 1
            except Exception as e:
                errors.append(f"User {pid}: {str(e)}")

    return jsonify({
        "status": "success",
        "processed_recomputations": recomputations_count,
        "errors": errors
    })
