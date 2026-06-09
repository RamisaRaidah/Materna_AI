from flask import Blueprint, request, jsonify, g
from services.auth import require_auth
from db import query

admin_bp = Blueprint("admin", __name__)

ONLINE_THRESHOLD_MINUTES = 2


def _require_admin():
    if g.user.get("role") != "admin":
        return jsonify({"error": "Admin access required"}), 403
    return None


def _serialize_row(row):
    if not row:
        return row
    result = dict(row)
    for key, value in result.items():
        if hasattr(value, "isoformat"):
            result[key] = value.isoformat()
    return result


@admin_bp.route("/pending-doctors", methods=["GET"])
@require_auth
def get_pending_doctors():
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    doctors = query("""
        SELECT id, name, phone, age, division, district, area, emergency_contact, status, verification_documents, created_at
        FROM users
        WHERE role = 'clinician' AND status = 'pending'
        ORDER BY created_at DESC
    """)
    return jsonify(doctors)


@admin_bp.route("/doctors/<int:doctor_id>/verify", methods=["POST"])
@require_auth
def verify_doctor(doctor_id):
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    data = request.get_json() or {}
    action = data.get("action")
    if action not in ("approve", "reject"):
        return jsonify({"error": "Invalid action. Must be 'approve' or 'reject'"}), 400

    new_status = "approved" if action == "approve" else "rejected"

    doctor = query("SELECT id, role FROM users WHERE id = %s", (doctor_id,), fetch="one")
    if not doctor:
        return jsonify({"error": "Doctor not found"}), 404

    if doctor["role"] != "clinician":
        return jsonify({"error": "User is not a clinician"}), 400

    query("UPDATE users SET status = %s WHERE id = %s", (new_status, doctor_id), fetch="none")

    return jsonify({"success": True, "message": f"Doctor account has been {new_status}."})


@admin_bp.route("/dashboard", methods=["GET"])
@require_auth
def admin_dashboard():
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    total_patients = query(
        "SELECT COUNT(*) AS n FROM users WHERE role = 'patient'",
        fetch="one",
    )

    doctor_counts = query(
        """
        SELECT
            COUNT(*) FILTER (WHERE status = 'pending') AS pending,
            COUNT(*) FILTER (WHERE status = 'approved') AS approved,
            COUNT(*) FILTER (WHERE status = 'rejected') AS rejected,
            COUNT(*) AS total
        FROM users
        WHERE role = 'clinician'
        """,
        fetch="one",
    )

    ai_sessions_today = query(
        """
        SELECT COUNT(DISTINCT user_id) AS n
        FROM chat_messages
        WHERE role = 'user'
          AND created_at >= CURRENT_DATE
        """,
        fetch="one",
    )

    high_critical_risk = query(
        """
        SELECT COUNT(*) AS n
        FROM risk_profiles
        WHERE risk_level IN ('High', 'Critical')
        """,
        fetch="one",
    )

    risk_assessments_today = query(
        """
        SELECT COUNT(*) AS n
        FROM risk_assessments
        WHERE created_at >= CURRENT_DATE
        """,
        fetch="one",
    )

    sos_this_week = query(
        """
        SELECT COUNT(*) AS n
        FROM clinician_alerts
        WHERE alert_type = 'sos'
          AND created_at >= DATE_TRUNC('week', CURRENT_DATE)
        """,
        fetch="one",
    )

    unacknowledged_alerts = query(
        """
        SELECT COUNT(*) AS n
        FROM clinician_alerts
        WHERE is_dismissed = FALSE
          AND status = 'open'
        """,
        fetch="one",
    )

    recent_registrations = query(
        """
        SELECT id, name, role, phone, district, created_at
        FROM users
        WHERE role IN ('patient', 'clinician')
        ORDER BY created_at DESC
        LIMIT 10
        """,
    )

    recent_escalations = query(
        """
        SELECT ca.id, ca.patient_id, ca.severity, ca.title, ca.created_at,
               u.name AS patient_name
        FROM clinician_alerts ca
        JOIN users u ON u.id = ca.patient_id
        WHERE ca.alert_type IN ('risk_escalation', 'high_risk')
        ORDER BY ca.created_at DESC
        LIMIT 10
        """,
    )

    recent_sos = query(
        """
        SELECT ca.id, ca.patient_id, ca.status, ca.title, ca.created_at,
               u.name AS patient_name, u.district AS patient_district
        FROM clinician_alerts ca
        JOIN users u ON u.id = ca.patient_id
        WHERE ca.alert_type = 'sos'
        ORDER BY ca.created_at DESC
        LIMIT 10
        """,
    )

    activity_feed = []
    for row in recent_registrations or []:
        activity_feed.append({
            "type": "registration",
            "id": row["id"],
            "title": row["name"],
            "subtitle": f"New {row['role']} registered",
            "meta": row.get("district") or row.get("phone"),
            "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
        })
    for row in recent_escalations or []:
        activity_feed.append({
            "type": "risk_escalation",
            "id": row["id"],
            "title": row.get("patient_name") or "Patient",
            "subtitle": row.get("title") or "Risk escalation",
            "meta": row.get("severity"),
            "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
        })
    for row in recent_sos or []:
        activity_feed.append({
            "type": "sos",
            "id": row["id"],
            "title": row.get("patient_name") or "Patient",
            "subtitle": row.get("title") or "SOS triggered",
            "meta": row.get("patient_district") or row.get("status"),
            "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
        })

    activity_feed.sort(key=lambda item: item.get("created_at") or "", reverse=True)
    activity_feed = activity_feed[:15]

    online_patients = query(
        """
        SELECT id, name, phone, district, area, last_seen_at
        FROM users
        WHERE role = 'patient'
          AND last_seen_at >= NOW() - INTERVAL '2 minutes'
        ORDER BY last_seen_at DESC
        """
    )

    online_clinicians = query(
        """
        SELECT id, name, phone, district, area, status, last_seen_at
        FROM users
        WHERE role = 'clinician'
          AND status = 'approved'
          AND last_seen_at >= NOW() - INTERVAL '2 minutes'
        ORDER BY last_seen_at DESC
        """
    )

    registrations_7d = query(
        """
        SELECT DATE(created_at) AS day, role, COUNT(*) AS count
        FROM users
        WHERE role IN ('patient', 'clinician')
          AND created_at >= CURRENT_DATE - INTERVAL '6 days'
        GROUP BY DATE(created_at), role
        ORDER BY day ASC
        """
    )

    risk_distribution = query(
        """
        SELECT COALESCE(risk_level, 'Unknown') AS risk_level, COUNT(*) AS count
        FROM risk_profiles
        GROUP BY risk_level
        ORDER BY count DESC
        """
    )

    alerts_by_type_week = query(
        """
        SELECT alert_type, COUNT(*) AS count
        FROM clinician_alerts
        WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE)
        GROUP BY alert_type
        ORDER BY count DESC
        """
    )

    alert_status_breakdown = query(
        """
        SELECT
            COUNT(*) FILTER (WHERE is_dismissed = FALSE AND status = 'open') AS open,
            COUNT(*) FILTER (WHERE is_dismissed = FALSE AND status = 'assigned') AS assigned,
            COUNT(*) FILTER (WHERE status = 'resolved' OR is_dismissed = TRUE) AS resolved
        FROM clinician_alerts
        """
        ,
        fetch="one",
    )

    ai_chat_7d = query(
        """
        SELECT DATE(created_at) AS day, COUNT(DISTINCT user_id) AS sessions
        FROM chat_messages
        WHERE role = 'user'
          AND created_at >= CURRENT_DATE - INTERVAL '6 days'
        GROUP BY DATE(created_at)
        ORDER BY day ASC
        """
    )

    sos_daily_week = query(
        """
        SELECT DATE(created_at) AS day, COUNT(*) AS count
        FROM clinician_alerts
        WHERE alert_type = 'sos'
          AND created_at >= DATE_TRUNC('week', CURRENT_DATE)
        GROUP BY DATE(created_at)
        ORDER BY day ASC
        """
    )

    pending_posts_count = query(
        "SELECT COUNT(*) AS n FROM posts WHERE COALESCE(moderation_status, 'approved') = 'pending'",
        fetch="one"
    )

    def _serialize_chart_rows(rows):
        result = []
        for row in rows or []:
            item = dict(row)
            if item.get("day") and hasattr(item["day"], "isoformat"):
                item["day"] = item["day"].isoformat()
            result.append(item)
        return result

    return jsonify({
        "stats": {
            "total_patients": (total_patients or {}).get("n", 0),
            "doctors": {
                "total": (doctor_counts or {}).get("total", 0),
                "pending": (doctor_counts or {}).get("pending", 0),                "approved": (doctor_counts or {}).get("approved", 0),
                "rejected": (doctor_counts or {}).get("rejected", 0),
            },
            "ai_chat_sessions_today": (ai_sessions_today or {}).get("n", 0),
            "high_critical_risk_patients": (high_critical_risk or {}).get("n", 0),
            "pending_community_posts": (pending_posts_count or {}).get("n", 0),
        },
        "platform_health": {
            "risk_assessments_today": (risk_assessments_today or {}).get("n", 0),
            "sos_alerts_this_week": (sos_this_week or {}).get("n", 0),
            "unacknowledged_clinician_alerts": (unacknowledged_alerts or {}).get("n", 0),
        },
        "recent_activity": activity_feed,
        "online_users": {
            "patients": [_serialize_row(row) for row in (online_patients or [])],
            "clinicians": [_serialize_row(row) for row in (online_clinicians or [])],
            "patient_count": len(online_patients or []),
            "clinician_count": len(online_clinicians or []),
        },
        "presence_threshold_minutes": ONLINE_THRESHOLD_MINUTES,
        "charts": {
            "registrations_7d": _serialize_chart_rows(registrations_7d),
            "risk_distribution": [dict(r) for r in (risk_distribution or [])],
            "alerts_by_type_week": [dict(r) for r in (alerts_by_type_week or [])],
            "alert_status_breakdown": {
                "open": (alert_status_breakdown or {}).get("open", 0),
                "assigned": (alert_status_breakdown or {}).get("assigned", 0),
                "resolved": (alert_status_breakdown or {}).get("resolved", 0),
            },
            "ai_chat_7d": _serialize_chart_rows(ai_chat_7d),
            "sos_daily_week": _serialize_chart_rows(sos_daily_week),
        },
    })



# ─────────────────────────────────────────────
# COMMUNITY MODERATION
# ─────────────────────────────────────────────

@admin_bp.route("/community/pending-posts", methods=["GET"])
@require_auth
def get_pending_community_posts():
    """List all community posts with moderation_status = 'pending', newest first."""
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    posts = query(
        """
        SELECT p.id, p.group_id, p.user_id, p.content,
               p.is_anonymous, p.moderation_status, p.moderation_reason,
               p.created_at,
               CASE WHEN p.is_anonymous THEN 'Anonymous' ELSE u.name END AS author_name,
               g.name AS group_name
        FROM posts p
        LEFT JOIN users u ON u.id = p.user_id
        LEFT JOIN groups g ON g.id = p.group_id
        WHERE COALESCE(p.moderation_status, 'approved') = 'pending'
        ORDER BY p.created_at DESC
        """
    )

    result = []
    for row in (posts or []):
        result.append({
            "id":                row["id"],
            "group_id":          row["group_id"],
            "group_name":        row["group_name"],
            "user_id":           row["user_id"],
            "author_name":       row["author_name"],
            "content":           row["content"],
            "is_anonymous":      row["is_anonymous"],
            "moderation_status": row["moderation_status"],
            "moderation_reason": row["moderation_reason"],
            "created_at":        row["created_at"].isoformat() if row.get("created_at") else None,
        })

    return jsonify(result)


@admin_bp.route("/community/posts/<int:post_id>/moderate", methods=["POST"])
@require_auth
def moderate_community_post(post_id):
    """
    Approve or decline a pending community post.
    Body: { "action": "approve" | "decline" }
    """
    auth_error = _require_admin()
    if auth_error:
        return auth_error

    data = request.get_json() or {}
    action = data.get("action")
    if action not in ("approve", "decline"):
        return jsonify({"error": "action must be 'approve' or 'decline'"}), 400

    new_status = "approved" if action == "approve" else "rejected"

    updated = query(
        """
        UPDATE posts
        SET moderation_status = %s
        WHERE id = %s AND COALESCE(moderation_status, 'approved') = 'pending'
        RETURNING id, moderation_status
        """,
        (new_status, post_id),
        fetch="one"
    )

    if not updated:
        return jsonify({"error": "Post not found or is not pending review"}), 404

    return jsonify({
        "success": True,
        "post_id": post_id,
        "moderation_status": new_status,
        "message": f"Post has been {new_status}."
    })

