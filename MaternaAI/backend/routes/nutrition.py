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
        # 1. Build Clinical Guardrails dynamically based on incoming patient conditions array
        conditional_guardrails = ""
        target_iron = 27
        target_folate = 600
        target_calcium = 1000
        target_protein = 71

        if any(c in ["Gestational Diabetes", "GDM", "ডায়াবেটিস"] for c in conditions):
            conditional_guardrails += (
                "\n* CRITICAL: Patient has Gestational Diabetes. Strict carbohydrate control required. "
                "Eliminate simple refined sugars/white rice overloads. Focus on complex carbs balanced with protein."
            )
        
        if any(c in ["Preeclampsia", "Hypertension", "উচ্চ রক্তচাপ"] for c in conditions):
            conditional_guardrails += (
                "\n* CRITICAL: Patient has Preeclampsia/Hypertension risks. "
                "Limit total sodium across all meal layouts. Emphasize magnesium and potassium-dense foods."
            )
            
        if any(c in ["Anemia", "রক্তস্বল্পতা"] for c in conditions):
            target_iron = 30  # Escalate therapeutic nutrient target threshold
            conditional_guardrails += (
                "\n* ALERT: Patient is Anemic. Maximize bioavailable iron. "
                "Pair iron-rich foods with Vitamin C (citrus/lemon) and restrict tea/coffee within 2 hours of eating."
            )

        # 2. Frame the user request injected with structural instruction tags
        condition_text = f" আমার অতিরিক্ত স্বাস্থ্য সমস্যা: {', '.join(conditions)}।" if conditions else " আমার কোনো অতিরিক্ত স্বাস্থ্য জটিলতা নেই।"
        baseline_force_instruction = ""
        if not conditions or len(conditions) == 0:
            baseline_force_instruction = (
                "\n* ABSOLUTE MANDATE: Even though the patient is perfectly healthy, you MUST still output the "
                "structured tracking tags. Do not summarize or skip them. You are providing their preventive baseline meal schedule. "
                "Every single tag pattern below MUST be printed exactly once in your response text body."
            )
        user_message = (
            f"আমি গর্ভাবস্থার {trimester} তম ট্রাইমেস্টারে আছি।{condition_text} "
            f"আমার জন্য একটি দৈনিক খাদ্য পরিকল্পনা তৈরি করুন।\n\n"
            f"CLINICAL DIRECTIONS FOR THIS GENERATION:{conditional_guardrails}{baseline_force_instruction}\n\n"
            f"CRITICAL SYSTEM CODE TAG FORMATTING INSTRUCTIONS:\n"
            f"Throughout your conversational text response, you MUST embed these exact token strings "
            f"so our system can parse metrics live. Do not alter the syntax structure:\n"
            f"- [NUTRIENT: iron={target_iron}, folate={target_folate}, calcium={target_calcium}, protein={target_protein}]\n"
            f"- [MEAL: Meal Name | Estimated Time | Item 1, Item 2, Item 3 | NutrientBadge1, NutrientBadge2]\n"
            f"- [SNACK: Snack summary description line]\n\n"
            f"Ensure meal items feature traditional, affordable, accessible Bangladeshi options (e.g., Lal chal, Mola fish, Daal, Tok doi). "
            f"Start with a warm conversational overview in Bengali, addressing their conditions, then provide the tagged metrics."
        )

        # Full RAG pipeline execution — uses build_prompt(mode="nutrition") + WHO context
        plan = rag_query(user_message, user_profile, mode="nutrition")

        # Persist to database
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
