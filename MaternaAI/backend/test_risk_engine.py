import sys
import os
import json

# Adjust path to import services and routes
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db import query
from services.risk_engine import compute_user_risk, evaluate_rules

def run_tests():
    print("==================================================")
    print("STARTING RISK ENGINE INTEGRATION TESTS")
    print("==================================================")

    test_user_id = 99
    
    # 1. Clean up any previous test data
    query("DELETE FROM clinician_alerts WHERE patient_id = %s", (test_user_id,), fetch="none")
    query("DELETE FROM notifications WHERE user_id = %s", (test_user_id,), fetch="none")
    query("DELETE FROM risk_assessments WHERE user_id = %s", (test_user_id,), fetch="none")
    query("DELETE FROM risk_profiles WHERE user_id = %s", (test_user_id,), fetch="none")
    query("DELETE FROM health_logs WHERE user_id = %s", (test_user_id,), fetch="none")
    query("DELETE FROM users WHERE id = %s", (test_user_id,), fetch="none")

    print("[1/5] Creating test patient...")
    # Create test user
    query(
        """
        INSERT INTO users (id, name, phone, password_hash, role, age, weeks_pregnant, is_postpartum, persona)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (test_user_id, "Test Akter", "+8801999999999", "dummy_hash", "patient", 26, 24, False, "pregnant"),
        fetch="none"
    )

    print("[2/5] Running base risk assessment (should be Low)...")
    profile = compute_user_risk(test_user_id, lang="en")
    print(f"Base Profile Risk: {profile.get('risk_level')}")
    assert profile.get("risk_level") == "Low", f"Expected Low risk, got {profile.get('risk_level')}"
    print("Base profile matches!")

    print("[3/5] Simulating high-risk preeclampsia vitals and symptoms...")
    # Log high blood pressure (145/95) and severe headache, swelling
    query(
        """
        INSERT INTO health_logs (user_id, bp_systolic, bp_diastolic, symptoms, danger_level, raw_input, severity_score)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """,
        (test_user_id, 145, 95, ["severe_headache", "swelling"], "danger", "High BP and headache reported", 6),
        fetch="none"
    )

    # Re-evaluate rules
    rules_res = evaluate_rules(test_user_id)
    print("Computed rule scores:", json.dumps(rules_res["scores"]))
    assert rules_res["scores"]["preeclampsia"]["score"] >= 8, "Expected high preeclampsia score"
    print("Rule evaluation correctly flagged preeclampsia risk factors.")

    print("[4/5] Running enriched risk recomputation in Bengali...")
    profile = compute_user_risk(test_user_id, lang="bn")
    print("Escalated Profile:")
    print(" - Risk Level:", profile.get("risk_level"))
    print(" - Flags:", profile.get("condition_flags"))
    print(" - Explanation (Bengali):", profile.get("explanation"))
    print(" - Recommendation:", profile.get("recommendation"))
    
    assert profile.get("risk_level") in ["High", "Critical"], f"Expected High/Critical risk, got {profile.get('risk_level')}"
    assert len(profile.get("condition_flags")) > 0, "Expected at least one condition flag"
    print("Bengali enrichment completed successfully.")

    print("[5/5] Checking escalation alerts and notifications...")
    # Check if a notification was sent for escalation
    notif = query(
        "SELECT title, body, type FROM notifications WHERE user_id = %s ORDER BY id DESC LIMIT 1",
        (test_user_id,), fetch="one"
    )
    print("Generated Notification:", notif)
    assert notif is not None, "Expected notification to be generated"
    assert notif["type"] == "risk_escalation", f"Expected type 'risk_escalation', got {notif['type']}"

    # Check if clinician alert was generated
    alert = query(
        "SELECT title, severity, alert_type FROM clinician_alerts WHERE patient_id = %s ORDER BY id DESC LIMIT 1",
        (test_user_id,), fetch="one"
    )
    print("Generated Clinician Alert:", alert)
    assert alert is not None, "Expected clinician alert to be generated"
    assert alert["alert_type"] == "risk_escalation", f"Expected alert_type 'risk_escalation', got {alert['alert_type']}"

    # Cleanup test data
    query("DELETE FROM clinician_alerts WHERE patient_id = %s", (test_user_id,), fetch="none")
    query("DELETE FROM notifications WHERE user_id = %s", (test_user_id,), fetch="none")
    query("DELETE FROM risk_assessments WHERE user_id = %s", (test_user_id,), fetch="none")
    query("DELETE FROM risk_profiles WHERE user_id = %s", (test_user_id,), fetch="none")
    query("DELETE FROM health_logs WHERE user_id = %s", (test_user_id,), fetch="none")
    query("DELETE FROM users WHERE id = %s", (test_user_id,), fetch="none")

    print("\n==================================================")
    print("ALL TESTS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
