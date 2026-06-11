from flask import Blueprint, request, jsonify, g
from db import query
from services.auth import require_auth
from services.rag import get_db
from services.misinfo_checker import check_for_misinfo

community_bp = Blueprint("community", __name__)

# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def _row_to_group(row):
    return {
        "id":           row[0],
        "name":         row[1],
        "description":  row[2],
        "category":     row[3],
        "emoji":        row[4],
        "color":        row[5],
        "creator_id":   row[6],
        "member_count": row[7],
        "is_private":   row[8],
        "created_at":   row[9].isoformat() if row[9] else None,
    }

def _row_to_post(row):
    return {
        "id":                 row[0],
        "group_id":           row[1],
        "user_id":            row[2],
        "content":            row[3],
        "is_anonymous":       row[4],
        "is_flagged":         row[5],
        "likes":              row[6],
        "created_at":         row[7].isoformat() if row[7] else None,
        "author_name":        row[8] if len(row) > 8 else None,
        "moderation_status":  row[9] if len(row) > 9 else "approved",
        "moderation_reason":  row[10] if len(row) > 10 else None,
        "author_image":       row[11] if len(row) > 11 else None,
    }

def _row_to_comment(row):
    return {
        "id":          row[0],
        "post_id":     row[1],
        "user_id":     row[2],
        "content":     row[3],
        "is_flagged":  row[4],
        "created_at":  row[5].isoformat() if row[5] else None,
        "author_name": row[6] if len(row) > 6 else None,
    }

def _row_to_dm(row):
    return {
        "id":          row[0],
        "sender_id":   row[1],
        "receiver_id": row[2],
        "content":     row[3],
        "is_read":     row[4],
        "created_at":  row[5].isoformat() if row[5] else None,
        "sender_name": row[6] if len(row) > 6 else None,
    }


# ─────────────────────────────────────────────
# GROUPS
# ─────────────────────────────────────────────

@community_bp.route("/contacts", methods=["GET"])
@require_auth
def list_contacts():
    """List contacts by role for direct messaging."""
    role_filter = request.args.get("role", "clinician")
    if role_filter not in ("patient", "clinician"):
        return jsonify({"error": "role must be patient or clinician"}), 400

    contacts = query(
        """
        SELECT id, name, phone, role, location, profile_image, created_at
        FROM users
        WHERE role = %s AND id != %s
        ORDER BY created_at DESC
        """,
        (role_filter, g.user["id"])
    )
    return jsonify(contacts)

@community_bp.route("/groups", methods=["GET"])
def list_groups():
    """List all public groups, optionally filtered by category."""
    category = request.args.get("category")
    conn = None
    try:
        conn = get_db()
        cur = conn.cursor()
        if category:
            cur.execute("""
                SELECT id, name, description, category, emoji, color,
                       creator_id, member_count, is_private, created_at
                FROM groups
                WHERE is_private = FALSE AND category = %s
                ORDER BY member_count DESC
            """, (category,))
        else:
            cur.execute("""
                SELECT id, name, description, category, emoji, color,
                       creator_id, member_count, is_private, created_at
                FROM groups
                WHERE is_private = FALSE
                ORDER BY member_count DESC
            """)
        rows = cur.fetchall()
        cur.close()
        return jsonify([_row_to_group(r) for r in rows])
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()


@community_bp.route("/groups/<int:group_id>", methods=["GET"])
def get_group(group_id):
    """Get a single group by ID."""
    conn = None
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            SELECT id, name, description, category, emoji, color,
                   creator_id, member_count, is_private, created_at
            FROM groups WHERE id = %s
        """, (group_id,))
        row = cur.fetchone()
        cur.close()
        if not row:
            return jsonify({"error": "Group not found"}), 404
        return jsonify(_row_to_group(row))
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()


@community_bp.route("/groups", methods=["POST"])
def create_group():
    """
    Create a new community group.
    Body: { name, description, category, emoji, color, creator_id, is_private }
    """
    data = request.json or {}
    required = ["name", "creator_id"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    conn = None
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO groups (name, description, category, emoji, color,
                                creator_id, is_private)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, name, description, category, emoji, color,
                      creator_id, member_count, is_private, created_at
        """, (
            data["name"],
            data.get("description", ""),
            data.get("category", "support"),
            data.get("emoji", "💬"),
            data.get("color", "#6366f1"),
            data["creator_id"],
            data.get("is_private", False),
        ))
        row = cur.fetchone()

        # Auto-join creator
        cur.execute("""
            INSERT INTO group_members (group_id, user_id)
            VALUES (%s, %s) ON CONFLICT DO NOTHING
        """, (row[0], data["creator_id"]))

        conn.commit()
        cur.close()
        return jsonify(_row_to_group(row)), 201
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()


@community_bp.route("/groups/<int:group_id>/join", methods=["POST"])
def join_group(group_id):
    """
    Join a group.
    Body: { user_id }
    """
    data = request.json or {}
    user_id = data.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    conn = None
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO group_members (group_id, user_id)
            VALUES (%s, %s) ON CONFLICT DO NOTHING
        """, (group_id, user_id))

        cur.execute("""
            UPDATE groups SET member_count = member_count + 1 WHERE id = %s
        """, (group_id,))

        conn.commit()
        cur.close()
        return jsonify({"message": "Joined group successfully", "group_id": group_id})
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()


@community_bp.route("/groups/<int:group_id>/leave", methods=["POST"])
def leave_group(group_id):
    """
    Leave a group.
    Body: { user_id }
    """
    data = request.json or {}
    user_id = data.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    conn = None
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            DELETE FROM group_members WHERE group_id = %s AND user_id = %s
        """, (group_id, user_id))

        cur.execute("""
            UPDATE groups SET member_count = GREATEST(member_count - 1, 0) WHERE id = %s
        """, (group_id,))

        conn.commit()
        cur.close()
        return jsonify({"message": "Left group successfully"})
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()


@community_bp.route("/groups/<int:group_id>/members", methods=["GET"])
def group_members(group_id):
    """List members of a group."""
    conn = None
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            SELECT u.id, u.name, u.role, gm.joined_at, u.profile_image
            FROM group_members gm
            JOIN users u ON u.id = gm.user_id
            WHERE gm.group_id = %s
            ORDER BY gm.joined_at ASC
        """, (group_id,))
        rows = cur.fetchall()
        cur.close()
        return jsonify([
            {"id": r[0], "name": r[1], "role": r[2], "joined_at": r[3].isoformat() if r[3] else None, "profile_image": r[4]}
            for r in rows
        ])
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()


# ─────────────────────────────────────────────
# POSTS
# ─────────────────────────────────────────────

@community_bp.route("/groups/<int:group_id>/posts", methods=["GET"])
def list_posts(group_id):
    """Get all posts in a group, newest first.
    
    Visibility rules:
    - 'approved' posts are visible to everyone.
    - 'pending' and 'rejected' posts are only visible to their author.
      The viewer's user_id is passed as an optional query param (?viewer_id=...).
    """
    viewer_id = request.args.get("viewer_id", type=int)
    conn = None
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            SELECT p.id, p.group_id, p.user_id, p.content,
                   p.is_anonymous, p.is_flagged, p.likes, p.created_at,
                   CASE WHEN p.is_anonymous THEN 'Anonymous' ELSE u.name END as author_name,
                   COALESCE(p.moderation_status, 'approved') as moderation_status,
                   p.moderation_reason,
                   CASE WHEN p.is_anonymous THEN NULL ELSE u.profile_image END as author_image
            FROM posts p
            LEFT JOIN users u ON u.id = p.user_id
            WHERE p.group_id = %s
              AND (
                COALESCE(p.moderation_status, 'approved') = 'approved'
                OR p.user_id = %s
              )
            ORDER BY p.created_at DESC
        """, (group_id, viewer_id))
        rows = cur.fetchall()
        cur.close()
        return jsonify([_row_to_post(r) for r in rows])
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()


@community_bp.route("/groups/<int:group_id>/posts", methods=["POST"])
def create_post(group_id):
    """
    Create a post in a group.
    Body: { user_id, content, is_anonymous }
    
    The post content is checked by an LLM for misinformation before being saved.
    - Clean content  → moderation_status = 'approved'  (published immediately)
    - Suspicious     → moderation_status = 'pending'   (held for admin review)
    """
    data = request.json or {}
    user_id = data.get("user_id")
    content = data.get("content", "").strip()

    if not user_id or not content:
        return jsonify({"error": "user_id and content are required"}), 400

    # ── LLM Misinformation Check ──────────────────────────────
    misinfo_result = check_for_misinfo(content)
    if misinfo_result["is_misinfo"]:
        moderation_status = "pending"
        moderation_reason = misinfo_result.get("reason", "")
    else:
        moderation_status = "approved"
        moderation_reason = None
    # ─────────────────────────────────────────────────────────

    conn = None
    try:
        conn = get_db()
        cur = conn.cursor()
        # Insert the post first
        cur.execute("""
            INSERT INTO posts (group_id, user_id, content, is_anonymous, is_flagged, flag_reason, moderation_status, moderation_reason)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, group_id, user_id, content, is_anonymous, is_flagged, likes, created_at, moderation_status, moderation_reason
        """, (
            group_id,
            user_id,
            content,
            data.get("is_anonymous", False),
            misinfo_result["is_misinfo"],
            misinfo_result.get("reason", ""),
            moderation_status,
            moderation_reason
        ))
        inserted = cur.fetchone()

        # Fetch author details separately to avoid long-running joined statements during insert
        author_name = None
        author_image = None
        if inserted and not inserted[4]:  # not anonymous
            cur.execute("SELECT name, profile_image FROM users WHERE id = %s", (inserted[2],))
            urow = cur.fetchone()
            if urow:
                author_name = urow[0]
                author_image = urow[1]

        # Compose the returned row in the same order expected by _row_to_post
        row = (
            inserted[0],  # id
            inserted[1],  # group_id
            inserted[2],  # user_id
            inserted[3],  # content
            inserted[4],  # is_anonymous
            inserted[5],  # is_flagged
            inserted[6],  # likes
            inserted[7],  # created_at
            (author_name if not inserted[4] else 'Anonymous'),
            inserted[8],  # moderation_status
            inserted[9],  # moderation_reason
            (author_image if not inserted[4] else None)  # author_image
        )

        conn.commit()
        cur.close()
        return jsonify(_row_to_post(row)), 201
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()


@community_bp.route("/posts/<int:post_id>/like", methods=["POST"])
def like_post(post_id):
    """Increment like count on a post."""
    conn = None
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            UPDATE posts SET likes = likes + 1 WHERE id = %s
            RETURNING id, likes
        """, (post_id,))
        row = cur.fetchone()
        conn.commit()
        cur.close()
        if not row:
            return jsonify({"error": "Post not found"}), 404
        return jsonify({"post_id": row[0], "likes": row[1]})
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()


@community_bp.route("/posts/<int:post_id>", methods=["DELETE"])
def delete_post(post_id):
    """
    Delete a post (only by the original author).
    Body: { user_id }
    """
    data = request.json or {}
    user_id = data.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    conn = None
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            DELETE FROM posts WHERE id = %s AND user_id = %s
            RETURNING id
        """, (post_id, user_id))
        deleted = cur.fetchone()
        conn.commit()
        cur.close()
        if not deleted:
            return jsonify({"error": "Post not found or permission denied"}), 403
        return jsonify({"message": "Post deleted", "post_id": post_id})
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()


# ─────────────────────────────────────────────
# COMMENTS
# ─────────────────────────────────────────────

@community_bp.route("/posts/<int:post_id>/comments", methods=["GET"])
def list_comments(post_id):
    """Get all comments on a post."""
    conn = None
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            SELECT c.id, c.post_id, c.user_id, c.content,
                   c.is_flagged, c.created_at, u.name as author_name
            FROM comments c
            LEFT JOIN users u ON u.id = c.user_id
            WHERE c.post_id = %s
            ORDER BY c.created_at ASC
        """, (post_id,))
        rows = cur.fetchall()
        cur.close()
        return jsonify([_row_to_comment(r) for r in rows])
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()


@community_bp.route("/posts/<int:post_id>/comments", methods=["POST"])
def add_comment(post_id):
    """
    Add a comment to a post.
    Body: { user_id, content }
    """
    data = request.json or {}
    user_id = data.get("user_id")
    content = data.get("content", "").strip()

    if not user_id or not content:
        return jsonify({"error": "user_id and content are required"}), 400

    conn = None
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO comments (post_id, user_id, content)
            VALUES (%s, %s, %s)
            RETURNING id, post_id, user_id, content, is_flagged, created_at
        """, (post_id, user_id, content))
        row = cur.fetchone()
        conn.commit()
        cur.close()
        return jsonify(_row_to_comment(row)), 201
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()


# ─────────────────────────────────────────────
# DIRECT MESSAGES
# ─────────────────────────────────────────────

@community_bp.route("/dm/<int:receiver_id>", methods=["POST"])
def send_dm(receiver_id):
    """
    Send a direct message to a user.
    Body: { sender_id, content }
    """
    data = request.json or {}
    sender_id = data.get("sender_id")
    content = data.get("content", "").strip()

    if not sender_id or not content:
        return jsonify({"error": "sender_id and content are required"}), 400
    if sender_id == receiver_id:
        return jsonify({"error": "Cannot send a message to yourself"}), 400

    conn = None
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO direct_messages (sender_id, receiver_id, content)
            VALUES (%s, %s, %s)
            RETURNING id, sender_id, receiver_id, content, is_read, created_at
        """, (sender_id, receiver_id, content))
        row = cur.fetchone()
        conn.commit()
        cur.close()

        # Run background symptom extraction if one of the users is a patient
        try:
            sender = query("SELECT role FROM users WHERE id = %s", (sender_id,), fetch="one")
            receiver = query("SELECT role FROM users WHERE id = %s", (receiver_id,), fetch="one")
            patient_id = None
            if sender and sender.get("role") == "patient":
                patient_id = sender_id
            elif receiver and receiver.get("role") == "patient":
                patient_id = receiver_id
            
            if patient_id:
                prof = query("SELECT language FROM risk_profiles WHERE user_id = %s", (patient_id,), fetch="one")
                pat_lang = prof.get("language", "bn") if prof else "bn"
                import threading
                from services.risk_engine import extract_symptoms_from_text_and_update_risk
                threading.Thread(
                    target=extract_symptoms_from_text_and_update_risk,
                    args=(patient_id, content, pat_lang)
                ).start()
        except Exception as spawn_err:
            print("Background DM symptom extraction thread spawn failed:", spawn_err)

        return jsonify(_row_to_dm(row)), 201
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()


@community_bp.route("/dm/thread/<int:user_a>/<int:user_b>", methods=["GET"])
def get_dm_thread(user_a, user_b):
    """
    Retrieve the full DM thread between two users, ordered chronologically.
    Also marks all incoming messages to user_a as read.
    """
    conn = None
    try:
        conn = get_db()
        cur = conn.cursor()

        # Mark messages sent by user_b to user_a as read
        cur.execute("""
            UPDATE direct_messages SET is_read = TRUE
            WHERE sender_id = %s AND receiver_id = %s AND is_read = FALSE
        """, (user_b, user_a))

        # Fetch full thread
        cur.execute("""
            SELECT dm.id, dm.sender_id, dm.receiver_id, dm.content,
                   dm.is_read, dm.created_at, u.name as sender_name
            FROM direct_messages dm
            LEFT JOIN users u ON u.id = dm.sender_id
            WHERE (dm.sender_id = %s AND dm.receiver_id = %s)
               OR (dm.sender_id = %s AND dm.receiver_id = %s)
            ORDER BY dm.created_at ASC
        """, (user_a, user_b, user_b, user_a))
        rows = cur.fetchall()
        conn.commit()
        cur.close()
        return jsonify([_row_to_dm(r) for r in rows])
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()


@community_bp.route("/dm/inbox/<int:user_id>", methods=["GET"])
def get_inbox(user_id):
    """
    Returns the most recent DM per conversation partner for a given user.
    Suitable for rendering the DM inbox / conversation list.
    """
    conn = None
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            SELECT * FROM (
                SELECT DISTINCT ON (partner_id)
                    partner_id,
                    partner_name,
                    last_message,
                    last_sent_at,
                    unread_count,
                    partner_image
                FROM (
                    SELECT
                        CASE WHEN dm.sender_id = %(uid)s THEN dm.receiver_id ELSE dm.sender_id END AS partner_id,
                        CASE WHEN dm.sender_id = %(uid)s THEN rv.name ELSE sv.name END AS partner_name,
                        CASE WHEN dm.sender_id = %(uid)s THEN rv.profile_image ELSE sv.profile_image END AS partner_image,
                        dm.content AS last_message,
                        dm.created_at AS last_sent_at,
                        (
                            SELECT COUNT(*) FROM direct_messages
                            WHERE sender_id != %(uid)s
                              AND receiver_id = %(uid)s
                              AND is_read = FALSE
                              AND sender_id = CASE WHEN dm.sender_id = %(uid)s THEN dm.receiver_id ELSE dm.sender_id END
                        ) AS unread_count
                    FROM direct_messages dm
                    LEFT JOIN users sv ON sv.id = dm.sender_id
                    LEFT JOIN users rv ON rv.id = dm.receiver_id
                    WHERE dm.sender_id = %(uid)s OR dm.receiver_id = %(uid)s
                    ORDER BY dm.created_at DESC
                ) sub
                ORDER BY partner_id, last_sent_at DESC
            ) final_sub
            ORDER BY last_sent_at DESC
        """, {"uid": user_id})
        rows = cur.fetchall()
        cur.close()
        return jsonify([
            {
                "partner_id":    r[0],
                "partner_name":  r[1],
                "last_message":  r[2],
                "last_sent_at":  r[3].isoformat() if r[3] else None,
                "unread_count":  r[4],
                "profile_image": r[5],
            }
            for r in rows
        ])
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()


@community_bp.route("/dm/<int:dm_id>/read", methods=["PATCH"])
def mark_dm_read(dm_id):
    """Mark a specific DM as read."""
    conn = None
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            UPDATE direct_messages SET is_read = TRUE WHERE id = %s RETURNING id
        """, (dm_id,))
        row = cur.fetchone()
        conn.commit()
        cur.close()
        if not row:
            return jsonify({"error": "Message not found"}), 404
        return jsonify({"message": "Marked as read", "dm_id": dm_id})
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()
