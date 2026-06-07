# Clinician portal: patient alerts, dashboard metrics

from flask import Blueprint, request, jsonify, g
import json
from db import query
from services.auth import require_auth

clinician_bp = Blueprint("clinician", __name__)

def _require_clinician():
    role = g.user.get("role", "patient")
    if role not in ("clinician", "admin"):
        return jsonify({"error": "Clinician access required"}), 403
    return None

from services.firebase_service import sync_notification_to_firestore

def _create_notification(user_id, title, body, notif_type="info", data=None):
    payload = json.dumps(data) if data is not None else None
    res = query(
        """
        INSERT INTO notifications (user_id, title, body, type, data)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id
        """,
        (user_id, title, body, notif_type, payload),
        fetch="one"
    )
    notif_id = res["id"] if res else None
    # Sync to Firestore in real-time
    sync_notification_to_firestore(user_id, title, body, notif_type, data, document_id=notif_id)

@clinician_bp.route("/alerts", methods=["GET"])
@require_auth
def get_alerts():
    """Get all undismissed alerts (any authenticated user can see their own; clinicians see all)."""
    role = g.user.get("role", "patient")
    if role in ("clinician", "admin"):
        clinician_district = (g.user.get("district") or "").strip()
        alerts = query(
            """
            SELECT ca.*, u.name AS patient_name, u.phone AS patient_phone,
                   u.weeks_pregnant, u.location
            FROM clinician_alerts ca
            JOIN users u ON u.id = ca.patient_id
            WHERE ca.is_dismissed = FALSE
              AND (
                    ca.alert_type <> 'sos'
                    OR (
                        ca.assigned_to = %s
                        OR (
                            ca.assigned_to IS NULL
                            AND (
                                (%s <> '' AND LOWER(u.district) = LOWER(%s))
                                OR (NOW() - ca.created_at >= INTERVAL '5 minutes')
                            )
                        )
                    )
                  )
            ORDER BY ca.created_at DESC
            LIMIT 50
            """,
            (g.user["id"], clinician_district, clinician_district)
        )
    else:
        alerts = query(
            """SELECT * FROM clinician_alerts
               WHERE patient_id = %s AND is_dismissed = FALSE
               ORDER BY created_at DESC""",
            (g.user["id"],)
        )
    return jsonify(alerts)

@clinician_bp.route("/alerts/<int:alert_id>/dismiss", methods=["PATCH"])
@require_auth
def dismiss_alert(alert_id):

    role = g.user.get("role", "patient")
    alert = query(
        "SELECT id, patient_id, title FROM clinician_alerts WHERE id=%s",
        (alert_id,),
        fetch="one"
    )
    if not alert:
        return jsonify({"error": "Alert not found"}), 404

    if role in ("clinician", "admin"):
        query(
            "UPDATE clinician_alerts SET is_dismissed=TRUE, status='resolved' WHERE id=%s",
            (alert_id,),
            fetch="none"
        )
    else:
        result = query(
            "UPDATE clinician_alerts SET is_dismissed=TRUE, status='resolved' WHERE id=%s AND patient_id=%s",
            (alert_id, g.user["id"]),
            fetch="none"
        )

    if role in ("clinician", "admin"):
        problem_name = alert.get("title") or "your concern"
        _create_notification(
            alert.get("patient_id"),
            "Clinician Assigned",
            f"Don't worry. Our clinician is ready to resolve your problem: {problem_name}.",
            "alert_resolved",
            {"alert_id": alert_id}
        )

    return jsonify({"message": "Alert resolved"})

@clinician_bp.route("/alerts/sos", methods=["GET"])
@require_auth
def get_sos_alerts():
    auth_error = _require_clinician()
    if auth_error:
        return auth_error

    clinician_district = (g.user.get("district") or "").strip()

    alerts = query(
        """
        SELECT ca.*, u.name AS patient_name, u.phone AS patient_phone,
               u.weeks_pregnant, u.location
        FROM clinician_alerts ca
        JOIN users u ON u.id = ca.patient_id
        WHERE ca.is_dismissed = FALSE
          AND ca.alert_type = 'sos'
          AND (
                ca.assigned_to = %s
                OR (
                    ca.assigned_to IS NULL
                    AND (
                        (%s <> '' AND LOWER(u.district) = LOWER(%s))
                        OR (NOW() - ca.created_at >= INTERVAL '5 minutes')
                    )
                )
              )
        ORDER BY ca.created_at DESC
        LIMIT 50
        """,
        (g.user["id"], clinician_district, clinician_district)
    )
    return jsonify(alerts)

@clinician_bp.route("/alerts/<int:alert_id>/assign", methods=["PATCH"])
@require_auth
def assign_alert(alert_id):
    auth_error = _require_clinician()
    if auth_error:
        return auth_error

    alert = query(
        "SELECT id, patient_id, assigned_to, alert_type FROM clinician_alerts WHERE id=%s",
        (alert_id,),
        fetch="one"
    )
    if not alert:
        return jsonify({"error": "Alert not found"}), 404
    if alert.get("alert_type") != "sos":
        return jsonify({"error": "Only SOS alerts can be assigned"}), 400
    if alert.get("assigned_to") and alert.get("assigned_to") != g.user["id"]:
        return jsonify({"error": "Alert already assigned"}), 409
    if alert.get("assigned_to") == g.user["id"]:
        return jsonify({"message": "Already assigned"})

    query(
        """
        UPDATE clinician_alerts
        SET assigned_to=%s, assigned_at=NOW(), status='assigned'
        WHERE id=%s
        """,
        (g.user["id"], alert_id),
        fetch="none"
    )

    clinician_name = g.user.get("name", "Clinician")
    _create_notification(
        alert.get("patient_id"),
        "SOS Assigned",
        f"{clinician_name} is handling your SOS. Please keep your phone nearby.",
        "sos_assigned",
        {"alert_id": alert_id, "clinician_name": clinician_name}
    )

    return jsonify({"message": "Alert assigned"})


@clinician_bp.route("/sos/metrics", methods=["GET"])
@require_auth
def sos_metrics():
    auth_error = _require_clinician()
    if auth_error:
        return auth_error

    totals = query(
        """
        SELECT COUNT(*) AS total_handled
        FROM clinician_alerts
        WHERE alert_type = 'sos'
          AND assigned_to = %s
          AND status = 'resolved'
        """,
        (g.user["id"],),
        fetch="one"
    )

    return jsonify({
        "total_handled": totals.get("total_handled", 0) if totals else 0,
    })

@clinician_bp.route("/patients", methods=["GET"])
@require_auth
def list_patients():
    auth_error = _require_clinician()
    if auth_error:
        return auth_error
 
    patients = query(
        """SELECT id, name, phone, age, weeks_pregnant, is_postpartum, persona, location, created_at
           FROM users WHERE role = 'patient' ORDER BY created_at DESC"""
    )
    return jsonify(patients)
 

@clinician_bp.route("/patients/<int:patient_id>/summary", methods=["GET"])
@require_auth
def patient_summary(patient_id):
    """Latest vitals + recent alerts for one patient."""
    auth_error = _require_clinician()
    if auth_error:
        return auth_error
    vitals = query(
        """SELECT bp_systolic, bp_diastolic, blood_glucose, water_intake, danger_level, created_at
           FROM health_logs WHERE user_id=%s AND bp_systolic IS NOT NULL
           ORDER BY created_at DESC LIMIT 1""",
        (patient_id,), fetch="one"
    )
    ppd = query(
        "SELECT total_score, risk_level FROM ppd_assessments WHERE user_id=%s ORDER BY created_at DESC LIMIT 1",
        (patient_id,), fetch="one"
    )
    alerts_count = query(
        "SELECT COUNT(*) AS n FROM clinician_alerts WHERE patient_id=%s AND is_dismissed=FALSE",
        (patient_id,), fetch="one"
    )
    patient = query(
        "SELECT id, name, age, weeks_pregnant, is_postpartum, location FROM users WHERE id=%s",
        (patient_id,), fetch="one"
    )
    return jsonify({
        "patient": patient or {},
        "latest_vitals": vitals or {},
        "latest_ppd": ppd or {},
        "active_alerts": (alerts_count or {}).get("n", 0) if alerts_count else 0,
    })

@clinician_bp.route("/stats", methods=["GET"])
@require_auth
def dashboard_stats():
    """High-level dashboard numbers for the clinician portal."""
    auth_error = _require_clinician()
    if auth_error:
        return auth_error
    total_patients = query("SELECT COUNT(*) AS n FROM users WHERE role='patient'", fetch="one")
    active_alerts = query("SELECT COUNT(*) AS n FROM clinician_alerts WHERE is_dismissed=FALSE", fetch="one")
    high_risk = query(
        """SELECT COUNT(DISTINCT user_id) AS n FROM health_logs
           WHERE danger_level='high' AND created_at > NOW() - INTERVAL '7 days'""",
        fetch="one"
    )
    return jsonify({
        "total_patients": total_patients.get("n", 0) if total_patients else 0,
        "active_alerts":  active_alerts.get("n", 0) if active_alerts else 0,
        "high_risk_week": high_risk.get("n", 0) if high_risk else 0,
    })


@clinician_bp.route("/patients/overview", methods=["GET"])
@require_auth
def patients_overview():
    """Latest vitals + PPD snapshot for all patients (summary view)."""
    auth_error = _require_clinician()
    if auth_error:
        return auth_error

    limit = int(request.args.get("limit", 25))

    rows = query(
        """
        SELECT
            u.id, u.name, u.phone, u.age, u.weeks_pregnant, u.is_postpartum, u.persona, u.location, u.created_at,
            lv.bp_systolic, lv.bp_diastolic, lv.blood_glucose, lv.water_intake, lv.danger_level AS vitals_danger,
            lv.created_at AS vitals_created_at,
            lp.total_score AS ppd_score, lp.risk_level AS ppd_risk, lp.created_at AS ppd_created_at,
            COALESCE(la.active_alerts, 0) AS active_alerts
        FROM users u
        LEFT JOIN LATERAL (
            SELECT bp_systolic, bp_diastolic, blood_glucose, water_intake, danger_level, created_at
            FROM health_logs
            WHERE user_id = u.id AND bp_systolic IS NOT NULL
            ORDER BY created_at DESC
            LIMIT 1
        ) lv ON TRUE
        LEFT JOIN LATERAL (
            SELECT total_score, risk_level, created_at
            FROM ppd_assessments
            WHERE user_id = u.id
            ORDER BY created_at DESC
            LIMIT 1
        ) lp ON TRUE
        LEFT JOIN LATERAL (
            SELECT COUNT(*) AS active_alerts
            FROM clinician_alerts
            WHERE patient_id = u.id AND is_dismissed = FALSE
        ) la ON TRUE
        WHERE u.role = 'patient'
        ORDER BY u.created_at DESC
        LIMIT %s
        """,
        (limit,)
    )

    overview = []
    for row in rows or []:
        overview.append({
            "id": row.get("id"),
            "name": row.get("name"),
            "phone": row.get("phone"),
            "age": row.get("age"),
            "weeks_pregnant": row.get("weeks_pregnant"),
            "is_postpartum": row.get("is_postpartum"),
            "persona": row.get("persona"),
            "location": row.get("location"),
            "created_at": row.get("created_at"),
            "latest_vitals": {
                "bp_systolic": row.get("bp_systolic"),
                "bp_diastolic": row.get("bp_diastolic"),
                "blood_glucose": row.get("blood_glucose"),
                "water_intake": row.get("water_intake"),
                "danger_level": row.get("vitals_danger"),
                "created_at": row.get("vitals_created_at"),
            },
            "latest_ppd": {
                "total_score": row.get("ppd_score"),
                "risk_level": row.get("ppd_risk"),
                "created_at": row.get("ppd_created_at"),
            },
            "active_alerts": row.get("active_alerts", 0),
        })

    return jsonify(overview)


@clinician_bp.route("/contacts", methods=["GET"])
@require_auth
def list_contacts():
    """Return clinician/patient contact list for direct messaging."""
    auth_error = _require_clinician()
    if auth_error:
        return auth_error

    role_filter = request.args.get("role", "patient")
    if role_filter not in ("patient", "clinician"):
        return jsonify({"error": "role must be patient or clinician"}), 400

    contacts = query(
        """
        SELECT id, name, phone, role, location, created_at
        FROM users
        WHERE role = %s
        ORDER BY created_at DESC
        """,
        (role_filter,)
    )
    return jsonify(contacts)
 