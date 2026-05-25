from flask import Blueprint, request, jsonify
from services.rag import get_db, rag_query

nutrition_bp = Blueprint("nutrition", __name__)

@nutrition_bp.route("/plans", methods=["POST"])
def generate_nutrition_plan():
    """
    Generates a WHO-grounded, personalized Bangladeshi nutrition plan via RAG.
    Body: { user_id, trimester, conditions: [], profile: {} }
    """
    data = request.json or {}
    user_id = data.get("user_id")
    trimester = data.get("trimester", 2)
    conditions = data.get("conditions", [])
    user_profile = data.get("profile", {})

    # Enrich profile with trimester info so build_prompt has it
    user_profile.setdefault("weeks_pregnant", trimester * 13)

    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    try:
        # Frame as a natural user question so rag_query's
        # built-in "nutrition" task prompt and WHO context kick in
        condition_text = f" আমার অতিরিক্ত সমস্যা: {', '.join(conditions)}।" if conditions else ""
        user_message = (
            f"আমি গর্ভাবস্থার {trimester} তম ট্রাইমেস্টারে আছি।{condition_text} "
            f"আমার জন্য একটি দৈনিক খাদ্য পরিকল্পনা তৈরি করুন।"
        )

        # Full RAG pipeline — uses build_prompt(mode="nutrition") + WHO context + fallback
        plan = rag_query(user_message, user_profile, mode="nutrition")

        # Persist
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO nutrition_plans (user_id, trimester, conditions, generated_plan)
            VALUES (%s, %s, %s, %s)
            RETURNING id, generated_plan, created_at
        """, (user_id, trimester, conditions, plan))
        row = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            "id":             row[0],
            "generated_plan": row[1],
            "created_at":     row[2].isoformat() if row[2] else None
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@nutrition_bp.route("/plans/<int:user_id>", methods=["GET"])
def get_nutrition_plans(user_id):
    """Get all nutrition plans for a user."""
    conn = None
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            SELECT id, trimester, conditions, generated_plan, created_at
            FROM nutrition_plans
            WHERE user_id = %s
            ORDER BY created_at DESC
        """, (user_id,))
        rows = cur.fetchall()
        cur.close()
        return jsonify([{
            "id":             r[0],
            "trimester":      r[1],
            "conditions":     r[2],
            "generated_plan": r[3],
            "created_at":     r[4].isoformat() if r[4] else None
        } for r in rows])
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()
