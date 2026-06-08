from flask import Blueprint, request, jsonify, g
from db import query
from services.auth import require_auth

import google.generativeai as genai
from config import GEMINI_API_KEY
import json as _json

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

care_plan_bp = Blueprint("care_plan", __name__)

@care_plan_bp.route("/items", methods=["GET"])
@require_auth
def get_care_plan_items():
    source_filter = request.args.get("source")  # optional: 'ai' | 'imported'

    if source_filter:
        if source_filter not in ("ai", "imported"):
            return jsonify({"error": "source must be 'ai' or 'imported'"}), 400
        items = query(
            """
            SELECT id, item_key, source, title, description,
                   title_bn, description_bn,
                   weeks_at_generation, bp_at_generation,
                   glucose_at_generation, weight_at_generation,
                   water_at_generation, created_at
            FROM care_plan_items
            WHERE user_id = %s
              AND is_dismissed = FALSE
              AND source = %s
            ORDER BY created_at DESC
            """,
            (g.user["id"], source_filter),
        )
    else:
        items = query(
            """
            SELECT id, item_key, source, title, description, title_bn, description_bn,
                   weeks_at_generation, bp_at_generation,
                   glucose_at_generation, weight_at_generation,
                   water_at_generation, created_at
            FROM care_plan_items
            WHERE user_id = %s
              AND is_dismissed = FALSE
            ORDER BY source DESC, created_at DESC
            """,
            (g.user["id"],),
        )

    return jsonify(items or []), 200


@care_plan_bp.route("/items", methods=["POST"])
@require_auth
def save_care_plan_items():
    data = request.get_json() or {}

    source = data.get("source")
    items = data.get("items", [])
    context = data.get("context", {})

    # --- validation ---
    if source not in ("ai", "imported"):
        return jsonify({"error": "source must be 'ai' or 'imported'"}), 400
    if not items or not isinstance(items, list):
        return jsonify({"error": "items array is required and must be non-empty"}), 400
    for item in items:
        if not item.get("id") or not item.get("title") or not item.get("desc"):
            return jsonify({"error": "each item must have id, title, and desc"}), 400

    user_id = g.user["id"]

    # Translate imported items to Bengali if Gemini is available
    if source == "imported" and GEMINI_API_KEY:
        try:
            items_for_translation = [{"title": i["title"], "desc": i["desc"]} for i in items]
            translate_prompt = f"""Translate these medication/care instruction items into simple, warm Bengali suitable for a rural Bangladeshi pregnant woman.
Return ONLY a valid JSON array in the same order, no markdown, no backticks:
[{{"title_bn": "", "desc_bn": ""}}]

    Items:
    {_json.dumps(items_for_translation, ensure_ascii=False)}"""

            model = genai.GenerativeModel("gemini-2.5-flash")
            resp = model.generate_content(
                translate_prompt,
                generation_config={"response_mime_type": "application/json", "temperature": 0.2}
            )
            translations = _json.loads(resp.text.strip())
            for i, item in enumerate(items):
                if i < len(translations):
                    item["title_bn"] = translations[i].get("title_bn", item["title"])
                    item["desc_bn"]  = translations[i].get("desc_bn",  item["desc"])
        except Exception as e:
            print("Bengali translation failed, using English fallback:", e)
            for item in items:
                item["title_bn"] = item.get("title_bn", item["title"])
                item["desc_bn"]  = item.get("desc_bn",  item["desc"])
    else:
        for item in items:
            item["title_bn"] = item.get("title_bn", item["title"])
            item["desc_bn"]  = item.get("desc_bn",  item["desc"])

    # --- for AI items: retire the previous batch before saving the new one ---
    if source == "ai":
        query(
            """
            UPDATE care_plan_items
            SET is_dismissed = TRUE,
                dismissed_at = NOW()
            WHERE user_id = %s
              AND source = 'ai'
              AND is_dismissed = FALSE
            """,
            (user_id,),
            fetch="none",
        )

    # --- extract generation context (AI only) ---
    weeks = context.get("weeks")
    bp = context.get("bp")
    glucose = context.get("glucose")
    weight = context.get("weight")
    water = context.get("water")

    inserted = []
    for item in items:
        item_key = item["id"]

        if source == "imported":
            # Skip silently if this key is already active (idempotent import)
            existing = query(
                """
                SELECT id FROM care_plan_items
                WHERE user_id = %s
                  AND item_key = %s
                  AND is_dismissed = FALSE
                """,
                (user_id, item_key),
                fetch="one",
            )
            if existing:
                continue

        row = query(
            """
            INSERT INTO care_plan_items
                (user_id, item_key, source, title, description, title_bn, description_bn,
                 weeks_at_generation, bp_at_generation,
                 glucose_at_generation, weight_at_generation,
                 water_at_generation)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, item_key, source, title, description, title_bn, description_bn, created_at
            """,
            (
                user_id, item_key, source,
                item["title"], item["desc"],
                item.get("title_bn"), item.get("desc_bn"),
                weeks if source == "ai" else None,
                bp    if source == "ai" else None,
                glucose if source == "ai" else None,
                weight  if source == "ai" else None,
                water   if source == "ai" else None,
            ),
            fetch="one",
        )
        if row:
            inserted.append(row)

    return jsonify({"saved": inserted, "count": len(inserted)}), 201


@care_plan_bp.route("/items/<string:item_key>", methods=["DELETE"])
@require_auth
def dismiss_care_plan_item(item_key: str):
    updated = query(
        """
        UPDATE care_plan_items
        SET    is_dismissed = TRUE,
               dismissed_at = NOW()
        WHERE  user_id = %s
          AND  item_key = %s
          AND  is_dismissed = FALSE
        RETURNING id
        """,
        (g.user["id"], item_key),
        fetch="one",
    )

    if not updated:
        return jsonify({"error": "Item not found or already dismissed"}), 404

    return jsonify({"dismissed": True, "id": updated["id"]}), 200


@care_plan_bp.route("/items", methods=["DELETE"])
@require_auth
def dismiss_all_care_plan_items():
    data   = request.get_json() or {}
    source = data.get("source")

    if source not in ("ai", "imported"):
        return jsonify({"error": "source must be 'ai' or 'imported'"}), 400

    query(
        """
        UPDATE care_plan_items
        SET    is_dismissed = TRUE,
               dismissed_at = NOW()
        WHERE  user_id      = %s
          AND  source       = %s
          AND  is_dismissed = FALSE
        """,
        (g.user["id"], source),
        fetch="none",
    )

    return jsonify({"dismissed": True, "source": source}), 200