# EPDS screening, mood journal analysis

from flask import Blueprint, request, jsonify, g
from db import query
from services.auth import require_auth
from services.rag import rag_query
import json

ppd_bp = Blueprint("ppd", __name__)

# Edinburgh Postnatal Depression Scale — 10 questions
# Scoring is reversed for questions 1, 2, 4 (0-1-2-3) and forward for 3, 5-10 (3-2-1-0)

EPDS_REVERSE = {1, 2, 4}

EPDS_QUESTIONS = [
    {"num": 1,  "text": "I have been able to laugh and see the funny side of things", "reversed": True,
     "options": ["As much as I always could", "Not quite so much now", "Definitely not so much now", "Not at all"]},
    {"num": 2,  "text": "I have looked forward with enjoyment to things", "reversed": True,
     "options": ["As much as I ever did", "Rather less than I used to", "Definitely less than I used to", "Hardly at all"]},
    {"num": 3,  "text": "I have blamed myself unnecessarily when things went wrong", "reversed": False,
     "options": ["Yes, most of the time", "Yes, some of the time", "Not very often", "No, never"]},
    {"num": 4,  "text": "I have been anxious or worried for no good reason", "reversed": True,
     "options": ["No, not at all", "Hardly ever", "Yes, sometimes", "Yes, very often"]},
    {"num": 5,  "text": "I have felt scared or panicky for no very good reason", "reversed": False,
     "options": ["Yes, quite a lot", "Yes, sometimes", "No, not much", "No, not at all"]},
    {"num": 6,  "text": "Things have been getting on top of me", "reversed": False,
     "options": ["Yes, most of the time I haven't been able to cope at all",
                 "Yes, sometimes I haven't been coping as well as usual",
                 "No, most of the time I have coped quite well", "No, I have been coping as well as ever"]},
    {"num": 7,  "text": "I have been so unhappy that I have had difficulty sleeping", "reversed": False,
     "options": ["Yes, most of the time", "Yes, sometimes", "Not very often", "No, not at all"]},
    {"num": 8,  "text": "I have felt sad or miserable", "reversed": False,
     "options": ["Yes, most of the time", "Yes, quite often", "Not very often", "No, not at all"]},
    {"num": 9,  "text": "I have been so unhappy that I have been crying", "reversed": False,
     "options": ["Yes, most of the time", "Yes, quite often", "Only occasionally", "No, never"]},
    {"num": 10, "text": "The thought of harming myself has occurred to me", "reversed": False,
     "options": ["Yes, quite often", "Sometimes", "Hardly ever", "Never"]},
]

@ppd_bp.route("/questions", methods=["GET"])
def get_questions():
    return jsonify(EPDS_QUESTIONS)

@ppd_bp.route("/submit", methods=["POST"])
@require_auth
def submit_epds():
    """
    Body: { "answers": {"1": 0, "2": 1, ... "10": 0} }
    Each value is 0-3 (index into options list).
    Server computes actual EPDS score from answer indices.
    """
    data = request.get_json() or {}
    answers = data.get("answers", {})
 
    if len(answers) != 10:
        return jsonify({"error": "All 10 EPDS answers are required"}), 400
 
    total = 0
    for q in EPDS_QUESTIONS:
        key = str(q["num"])
        try:
            idx = int(answers.get(key, 0))
        except:
            idx = 0
        if q["reversed"]:
            # Reverse scoring: option 0 = 0 pts, option 3 = 3 pts
            total += (3-idx)
        else:
            # Forward scoring: option 0 = 3 pts, option 3 = 0 pts
            total += idx
 
    risk = "low" if total <= 9 else ("moderate" if total <= 12 else "high")
 
    # Get LLM advice
    profile = {
        "name": g.user.get("name"),
        "is_postpartum": g.user.get("is_postpartum"),
        "location": g.user.get("location"),
    }
    rag_result = rag_query(
        f"EPDS score {total}/30. Risk level: {risk}. Please provide empathetic advice.",
        profile, mode="ppd"
    )
 
    assessment = query(
        """INSERT INTO ppd_assessments (user_id, answers, total_score, risk_level, llm_advice)
           VALUES (%s,%s,%s,%s,%s) RETURNING id, total_score, risk_level, created_at""",
        (g.user["id"], json.dumps(answers), total, risk, rag_result),
        fetch="one"
    )
 
    if risk == "high":
        query(
            """INSERT INTO clinician_alerts (patient_id, alert_type, title, body)
               VALUES (%s,'ppd','🧠 High PPD Risk Score Detected',%s)""",
            (g.user["id"],
             f"EPDS score {total}/30 — above clinical threshold of 13. Peer circle and specialist referral recommended."),
            fetch="none"
        )
 
    return jsonify({
        "score": total,
        "risk_level": risk,
        "advice": rag_result,
        "assessment_id": assessment["id"],
    })

@ppd_bp.route("/history", methods=["GET"])
@require_auth
def ppd_history():
    records = query(
        """SELECT id, total_score, risk_level, created_at
           FROM ppd_assessments WHERE user_id = %s ORDER BY created_at DESC LIMIT 10""",
        (g.user["id"],)
    )
    return jsonify(records)
 

@ppd_bp.route("/mood", methods=["POST"])
@require_auth
def analyze_mood():
    """Analyze free-text mood journal entry."""
    data = request.get_json() or {}
    text = data.get("text", "").strip()
    if not text:
        return jsonify({"error": "text is required"}), 400
 
    KEYWORDS = {
        "anxiety": ["anxious", "worry", "worried", "nervous", "panic", "scared",
                    "fear", "restless", "tense", "stressed", "overwhelmed"],
        "sadness": ["sad", "cry", "crying", "depressed", "hopeless", "empty",
                    "unhappy", "tears", "low", "down", "miserable", "struggling"],
        "isolation": ["alone", "lonely", "isolated", "no one", "nobody",
                      "ignored", "abandoned", "disconnected", "no support"],
        "pain": ["pain", "hurt", "ache", "sore", "cramp", "bleeding",
                 "headache", "swelling", "nausea", "vomit", "dizzy", "unwell"],
    }
    lower = text.lower()
    scores = {}
    for dim, words in KEYWORDS.items():
        hits = sum(1 for w in words if w in lower)
        scores[dim] = min(100, hits * 30 + (20 if hits > 0 else 0))
 
    # Boost if general negativity
    negative_phrases = ["not good", "feeling bad", "terrible", "awful", "tired", "exhausted"]
    if any(p in lower for p in negative_phrases):
        scores["sadness"] = max(scores["sadness"], 50)
        scores["anxiety"] = max(scores["anxiety"], 30)
 
    profile = {"name": g.user.get("name"), "is_postpartum": g.user.get("is_postpartum")}
    advice = rag_query(text, profile, mode="ppd")

    if scores:
        danger_score = max(scores.values())
    else:
        danger_score = 0

    if danger_score >= 80:
        danger_level = "high"
    elif danger_score >= 50:
        danger_level = "moderate"
    else:
        danger_level = "low"
 
    return jsonify({
        "scores": scores,
        "advice": advice,
        "danger_level": danger_level,
    })