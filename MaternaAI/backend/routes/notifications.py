from flask import Blueprint, request, jsonify, g
from db import query
from services.auth import require_auth

notifications_bp = Blueprint("notifications", __name__)

@notifications_bp.route("/", methods=["GET"])
@notifications_bp.route("", methods=["GET"])
@require_auth
def list_notifications():
    limit = int(request.args.get("limit", 10))
    rows = query(
        """
        SELECT id, title, body, type, data, is_read, created_at
        FROM notifications
        WHERE user_id = %s
        ORDER BY created_at DESC
        LIMIT %s
        """,
        (g.user["id"], limit)
    )
    return jsonify(rows)

@notifications_bp.route("/<int:notification_id>/read", methods=["PATCH"])
@require_auth
def mark_read(notification_id):
    updated = query(
        """
        UPDATE notifications
        SET is_read = TRUE
        WHERE id = %s AND user_id = %s
        RETURNING id
        """,
        (notification_id, g.user["id"]),
        fetch="one"
    )
    if not updated:
        return jsonify({"error": "Notification not found"}), 404
    return jsonify({"message": "Notification marked as read", "id": notification_id})
