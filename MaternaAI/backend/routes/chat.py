from flask import Blueprint, request, jsonify
from services.rag import rag_query

chat_bp = Blueprint("chat", __name__)

@chat_bp.route("/analyze", methods=["POST"])
def analyze():
    data = request.json
    user_input = data.get("message", "")
    user_profile = data.get("profile", {})
    mode = data.get("mode", "danger")  # danger / ppd / nutrition / general

    if not user_input:
        return jsonify({"error": "No message provided"}), 400

    response = rag_query(user_input, user_profile, mode)

    return jsonify({
        "response": response,
        "mode": mode
    })