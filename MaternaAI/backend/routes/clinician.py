# Clinician portal: patient alerts, dashboard metrics

from flask import Blueprint, request, jsonify, g
from db import query
from services.auth import require_auth

clinician_bp = Blueprint("clinician", __name__)

@clinician_bp.route("/alerts", methods=["GET"])
@require_auth
def get_alerts():
    """Get all undismissed alerts (any authenticated user can see their own; clinicians see all)."""
    role = g.user.get("role", "patient")
    if role in ("clinician", "admin"):
        alerts = query(
            """SELECT ca.*, u.name AS patient_name, u.phone AS patient_phone,
                      u.weeks_pregnant, u.location
               FROM clinician_alerts ca
               JOIN users u ON u.id = ca.patient_id
               WHERE ca.is_dismissed = FALSE
               ORDER BY ca.created_at DESC LIMIT 50"""
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

    if role in ("clinician", "admin"):
        query(
            "UPDATE clinician_alerts SET is_dismissed=TRUE WHERE id=%s",
            (alert_id,),
            fetch="none"
        )
    else:
        result = query(
            "UPDATE clinician_alerts SET is_dismissed=TRUE WHERE id=%s AND patient_id=%s",
            (alert_id, g.user["id"]),
            fetch="none"
        )

    return jsonify({"message": "Alert dismissed"})

@clinician_bp.route("/patients", methods=["GET"])
@require_auth
def list_patients():
    role = g.user.get("role", "patient")
    if role not in ("clinician", "admin"):
        return jsonify({"error": "Clinician access required"}), 403
 
    patients = query(
        """SELECT id, name, phone, age, weeks_pregnant, is_postpartum, persona, location, created_at
           FROM users WHERE role = 'patient' ORDER BY created_at DESC"""
    )
    return jsonify(patients)


@clinician_bp.route("/patients/overview", methods=["GET"])
@require_auth
def patients_overview():
    role = g.user.get("role", "patient")
    if role not in ("clinician", "admin"):
        return jsonify({"error": "Clinician access required"}), 403

    limit = int(request.args.get("limit", 10))
    rows = query(
        """
        SELECT
            u.id, u.name, u.phone, u.age, u.weeks_pregnant, u.is_postpartum, u.persona, u.location, u.created_at,
            hl.bp_systolic, hl.bp_diastolic, hl.blood_glucose, hl.water_intake, hl.danger_level, hl.created_at AS vitals_created_at,
            ppd.total_score, ppd.risk_level, ppd.created_at AS ppd_created_at
        FROM users u
        LEFT JOIN LATERAL (
            SELECT bp_systolic, bp_diastolic, blood_glucose, water_intake, danger_level, created_at
            FROM health_logs
            WHERE user_id = u.id AND bp_systolic IS NOT NULL
            ORDER BY created_at DESC
            LIMIT 1
        ) hl ON TRUE
        LEFT JOIN LATERAL (
            SELECT total_score, risk_level, created_at
            FROM ppd_assessments
            WHERE user_id = u.id
            ORDER BY created_at DESC
            LIMIT 1
        ) ppd ON TRUE
        WHERE u.role = 'patient'
        ORDER BY u.created_at DESC
        LIMIT %s
        """,
        (limit,)
    )

    overview = []
    for row in rows:
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
                "danger_level": row.get("danger_level"),
                "created_at": row.get("vitals_created_at"),
            },
            "latest_ppd": {
                "total_score": row.get("total_score"),
                "risk_level": row.get("risk_level"),
                "created_at": row.get("ppd_created_at"),
            },
        })

    return jsonify(overview)
 

@clinician_bp.route("/patients/<int:patient_id>/summary", methods=["GET"])
@require_auth
def patient_summary(patient_id):
    """Latest vitals + recent alerts for one patient."""
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
 