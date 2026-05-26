from flask import Blueprint, request, jsonify
from services.rag import rag_query
from db import query
import json

birth_plan_bp = Blueprint("birth_plan", __name__)

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

    try:
        user_message = (
            f"Please generate a detailed birth plan for me. "
            f"Hospital: {hospital}. "
            f"Support person: {support_person}. "
            f"Pain management preference: {pain_pref}. "
            f"Special notes: {special_notes if special_notes else 'None'}."
        )

        plan = rag_query(user_message, user_profile, mode="general")

        row = query("""
            INSERT INTO birth_plans 
            (user_id, hospital_name, support_person, pain_preference, special_notes, emergency_contacts, generated_plan)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, generated_plan, created_at
        """, (
            user_id, hospital, support_person, pain_pref,
            special_notes, json.dumps(emergency_contacts), plan
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
            SELECT id, hospital_name, support_person, pain_preference,
                   special_notes, emergency_contacts, generated_plan, created_at
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
            "created_at": r["created_at"].isoformat() if r["created_at"] else None
        } for r in rows])
    except Exception as e:
        return jsonify({"error": str(e)}), 500