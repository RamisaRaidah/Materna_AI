from flask import Blueprint, request, jsonify
from services.rag import get_db, rag_query
import json

ppd_bp = Blueprint("ppd", __name__)

def calculate_risk(score: int) -> str:
    if score >= 13:
        return "high"
    elif score >= 10:
        return "moderate"
    return "low"

@ppd_bp.route("/assess", methods=["POST"])
def submit_assessment():
    """
    Submit EPDS answers and get a WHO-grounded PPD assessment via RAG.
    Body: { user_id, answers: { "q1": 2, "q2": 1, ... }, profile: {} }
    """
    data = request.json or {}
    user_id = data.get("user_id")
    answers = data.get("answers", {})
    user_profile = data.get("profile", {})

    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    try:
        total_score = sum(int(v) for v in answers.values())
        risk_level = calculate_risk(total_score)

        # Frame the EPDS result as a user message so rag_query's
        # built-in "ppd" task prompt and WHO context kick in naturally
        user_message = (
            f"আমার EPDS স্ক্রিনিং স্কোর {total_score}/30 এবং ঝুঁকির মাত্রা: {risk_level.upper()}। "
            f"আমার অনুভূতি এবং পরবর্তী পদক্ষেপ সম্পর্কে পরামর্শ দিন।"
        )

        # Full RAG pipeline — uses build_prompt(mode="ppd") + WHO context + fallback
        advice = rag_query(user_message, user_profile, mode="ppd")

        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO ppd_assessments (user_id, answers, total_score, risk_level, llm_advice)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, risk_level, llm_advice, created_at
        """, (user_id, json.dumps(answers), total_score, risk_level, advice))
        row = cur.fetchone()

        # Auto-alert clinician on high risk
        if risk_level == "high":
            cur.execute("""
                INSERT INTO clinician_alerts (patient_id, alert_type, severity, title, body)
                VALUES (%s, 'ppd', 'critical', 'High PPD Risk Detected',
                        'Patient scored >= 13 on EPDS screening.')
            """, (user_id,))

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            "id":         row[0],
            "total_score": total_score,
            "risk_level": row[1],
            "advice":     row[2],
            "created_at": row[3].isoformat() if row[3] else None
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@ppd_bp.route("/history/<int:user_id>", methods=["GET"])
def get_ppd_history(user_id):
    """Get all past PPD assessments for a user."""
    conn = None
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            SELECT id, total_score, risk_level, llm_advice, created_at
            FROM ppd_assessments
            WHERE user_id = %s
            ORDER BY created_at DESC
        """, (user_id,))
        rows = cur.fetchall()
        cur.close()
        return jsonify([{
            "id":          r[0],
            "total_score": r[1],
            "risk_level":  r[2],
            "advice":      r[3],
            "created_at":  r[4].isoformat() if r[4] else None
        } for r in rows])
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()
