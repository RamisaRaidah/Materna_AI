from flask import Blueprint, request, jsonify
from services.rag import get_db, rag_query

nutrition_bp = Blueprint("nutrition", __name__)

# ---------------------------------------------------------------------------
# Static fallback plan returned when the AI/RAG pipeline is unavailable
# (quota exhausted, network error, etc.)
# ---------------------------------------------------------------------------
def _static_fallback_plan(trimester, is_postpartum, conditions):
    iron   = 30 if any(c in ["Anemia", "রক্তস্বল্পতা"] for c in conditions) else (9 if is_postpartum else 27)
    folate = 500 if is_postpartum else 600
    protein = 75 if is_postpartum else 71

    if is_postpartum:
        overview = (
            "প্রিয় মা, প্রসবের পর আপনার শরীরের পুনরুদ্ধার এবং বুকের দুধ তৈরির জন্য পুষ্টিকর খাবার খুব জরুরি। "
            "নিচে একটি সহজ দৈনিক খাদ্য পরিকল্পনা দেওয়া হলো।"
        )
        meals = [
            "[MEAL: সকালের নাস্তা | 8:00 AM | লাল চালের ভাত বা রুটি, ডিম সেদ্ধ, কলা | Iron, Protein]",
            "[MEAL: দুপুরের খাবার | 1:00 PM | ভাত, মসুর ডাল, পালং শাক ভাজি, ছোট মাছ | Iron, Calcium, Folate]",
            "[MEAL: রাতের খাবার | 8:00 PM | ভাত, মুরগির ঝোল, সবজি, টক দই | Protein, Calcium]",
        ]
        snacks = [
            "[SNACK: বিকেলে এক গ্লাস দুধ বা টক দই এবং একটি কলা খান।]",
            "[SNACK: রাতে ঘুমানোর আগে এক মুঠো চিনাবাদাম বা বাদাম খেতে পারেন।]",
        ]
    else:
        tri_label = {1: "প্রথম", 2: "দ্বিতীয়", 3: "তৃতীয়"}.get(trimester, "দ্বিতীয়")
        overview = (
            f"প্রিয় মা, আপনি গর্ভাবস্থার {tri_label} ট্রাইমেস্টারে আছেন। "
            "আপনার ও শিশুর সুস্বাস্থ্যের জন্য নিচের খাদ্য পরিকল্পনা অনুসরণ করুন।"
        )
        meals = [
            "[MEAL: সকালের নাস্তা | 8:00 AM | লাল চালের ভাত বা রুটি, ডিম সেদ্ধ, কলা, দুধ | Iron, Folate, Protein]",
            "[MEAL: দুপুরের খাবার | 1:00 PM | ভাত, মসুর ডাল, পালং শাক ভাজি, মলা মাছ, লেবু | Iron, Calcium, Folate]",
            "[MEAL: রাতের খাবার | 8:00 PM | ভাত, মুরগির ঝোল, মিষ্টি কুমড়া, টক দই | Protein, Calcium]",
        ]
        snacks = [
            "[SNACK: সকাল ১০টায় এক গ্লাস দুধ বা টক দই এবং একটি কলা খান।]",
            "[SNACK: বিকেলে চিনাবাদাম বা ছোলা সেদ্ধ এবং গুয়াভা (পেয়ারা) খান — এতে আয়রন শোষণ ভালো হয়।]",
        ]

    nutrient_tag = (
        f"[NUTRIENT: iron={iron}, folate={folate}, calcium=1000, protein={protein}]"
    )

    parts = [overview, "", nutrient_tag, ""] + meals + [""] + snacks
    return "\n".join(parts)


@nutrition_bp.route("/plans", methods=["POST"])
def generate_nutrition_plan():
    """
    Generates a WHO-grounded, personalized Bangladeshi nutrition plan via RAG.
    Body: { user_id, trimester, conditions: [], profile: {}, is_postpartum: bool }
    """
    data = request.json or {}
    user_id = data.get("user_id")

    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    is_postpartum = bool(data.get("is_postpartum", False))

    # trimester may arrive as null/None for postpartum users — never multiply None * 13
    raw_trimester = data.get("trimester")
    if raw_trimester is not None:
        trimester = int(raw_trimester)
    else:
        trimester = None if is_postpartum else 2

    conditions = data.get("conditions") or []
    user_profile = data.get("profile") or {}

    # Only set weeks_pregnant for pregnant users
    if not is_postpartum:
        safe_trimester = trimester if trimester is not None else 2
        user_profile.setdefault("weeks_pregnant", safe_trimester * 13)

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

        if is_postpartum:
            target_iron = 9
            target_folate = 500
            target_protein = 75
            condition_text = f" আমার অতিরিক্ত স্বাস্থ্য সমস্যা: {', '.join(conditions)}।" if conditions else " আমার কোনো অতিরিক্ত স্বাস্থ্য জটিলতা নেই।"
            user_message = (
                f"আমি সম্প্রতি সন্তান প্রসব করেছি এবং এখন প্রসবোত্তর পুনরুদ্ধারের পর্যায়ে আছি।{condition_text} "
                f"আমার জন্য একটি দৈনিক প্রসবোত্তর খাদ্য পরিকল্পনা তৈরি করুন।\n\n"
                f"CLINICAL DIRECTIONS FOR THIS GENERATION:{conditional_guardrails}\n\n"
                f"CRITICAL SYSTEM CODE TAG FORMATTING INSTRUCTIONS:\n"
                f"Throughout your conversational text response, you MUST embed these exact token strings:\n"
                f"- [NUTRIENT: iron={target_iron}, folate={target_folate}, calcium={target_calcium}, protein={target_protein}]\n"
                f"- [MEAL: Meal Name | Estimated Time | Item 1, Item 2, Item 3 | NutrientBadge1, NutrientBadge2]\n"
                f"- [SNACK: Snack summary description line]\n\n"
                f"Focus on: breastfeeding support, wound recovery, iron replenishment, lactation foods (lau, moringa, hilsa). "
                f"Start with a warm Bengali overview."
            )
        else:
            # 2. Frame the user request injected with structural instruction tags
            condition_text = f" আমার অতিরিক্ত স্বাস্থ্য সমস্যা: {', '.join(conditions)}।" if conditions else " আমার কোনো অতিরিক্ত স্বাস্থ্য জটিলতা নেই।"
            baseline_force_instruction = ""
            if not conditions or len(conditions) == 0:
                baseline_force_instruction = (
                    "\n* ABSOLUTE MANDATE: Even though the patient is perfectly healthy, you MUST still output the "
                    "structured tracking tags. Do not summarize or skip them. You are providing their preventive baseline meal schedule. "
                    "Every single tag pattern below MUST be printed exactly once in your response text body."
                )
            safe_trimester = trimester if trimester is not None else 2
            user_message = (
                f"আমি গর্ভাবস্থার {safe_trimester} তম ট্রাইমেস্টারে আছি।{condition_text} "
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
        try:
            plan = rag_query(user_message, user_profile, mode="nutrition")
        except Exception as rag_err:
            print(f"RAG pipeline failed (quota or network), using static fallback: {rag_err}")
            plan = _static_fallback_plan(trimester, is_postpartum, conditions)

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
        # Last-resort: return static plan as 200 so the UI still renders
        print(f"nutrition /plans critical error: {e}")
        fallback_plan = _static_fallback_plan(trimester, is_postpartum, conditions)
        return jsonify({
            "id":             None,
            "generated_plan": fallback_plan,
            "created_at":     None
        }), 200
    

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