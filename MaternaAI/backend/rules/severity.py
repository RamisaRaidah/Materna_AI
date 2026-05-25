SYMPTOM_SEVERITY = {
    "bleeding": 5,
    "vision": 4,
    "swelling": 4,
    "severe_headache": 3,
    "fever": 3,
    "abdominal_pain": 3,
    "reduced_movement": 5,
    "vomiting": 2,
    "fatigue": 1
}


def calculate_severity(symptoms: list) -> int:
    return sum(SYMPTOM_SEVERITY.get(s, 0) for s in symptoms)


def get_risk_level(score: int) -> str:
    if score >= 8:
        return "danger"
    elif score >= 4:
        return "warning"
    return "safe"