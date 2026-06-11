"""
Misinformation checker for community posts.
Uses Gemini to determine whether a post contains maternal health misinformation.
Returns: { "is_misinfo": bool, "reason": str, "confidence": "high"|"medium"|"low" }
"""

import json
import os
import re

import google.generativeai as genai

from llm_client import get_gemini_model, mark_exhausted, is_quota_error, GeminiKeysExhausted

_SYSTEM_PROMPT = """You are a maternal health safety moderator for a community platform used by pregnant women and new mothers in Bangladesh.

IMPORTANT — LANGUAGE HANDLING:
Posts may be written in any of these forms. You MUST understand and evaluate all of them equally:
- Bengali script (বাংলা)
- English
- Banglish: Bengali words written in Roman/Latin script (e.g., "gorbhobostitei", "baccha", "maa", "dudh khaben na", "egg khawa jabe na", "onek kharap hobe")
Treat Banglish as Bengali. Never skip or reduce confidence just because a post is in Banglish.

CONTEXT ASSUMPTION:
This platform is exclusively for pregnant women and new mothers. Therefore, ALL posts are implicitly about pregnancy, postpartum, or infant care — even when the post does not explicitly mention "pregnancy", "pregnant", "gorbhobostha", "maa", or similar words.

For example:
- "Mothers should not eat egg" → assume this is advice about pregnancy/postpartum diet → evaluate for misinformation
- "dudh khaben na" (do not drink milk) → assume this is advice to a pregnant/postpartum mother → evaluate for misinformation

Your job is to check whether a community post contains MEDICAL MISINFORMATION that could be harmful to mothers or babies.

Examples of MISINFORMATION to flag:
- Advising mothers to stop prescribed prenatal vitamins or medications
- Promoting dangerous home remedies (e.g., herbal concoctions that cause uterine contractions)
- False anti-vaccine claims about pregnancy vaccines
- Claiming dangerous symptoms like heavy bleeding, severe headache, or reduced fetal movement are normal and should be ignored
- Recommending unsafe traditional practices that contradict evidence-based maternal care
- False drug dosage advice or dangerous supplement combinations
- Claiming that eclampsia, pre-eclampsia, or haemorrhage signs are not serious
- Advising mothers to avoid nutritious foods (eggs, milk, fish, vegetables) without valid medical basis

Do NOT flag:
- Personal stories or experiences shared by mothers
- General emotional support or encouragement
- Questions about symptoms (asking is not misinformation)
- Cultural practices that are harmless or neutral
- General advice that is clearly non-medical
- Posts that are vague or unclear but not dangerous

Respond ONLY with valid JSON in this format:
{
  "is_misinfo": true or false,
  "confidence": "high" or "medium" or "low",
  "reason": "Brief explanation in one sentence (in English). Leave empty string if not misinformation."
}
"""


def _check_with_openrouter(content: str) -> dict:
    openrouter_key = os.environ.get("OPENROUTER_API_KEY", "")
    if not openrouter_key:
        print("[MisInfo] No OPENROUTER_API_KEY set — fallback unavailable.")
        return None

    # Map of user-friendly names to OpenRouter model IDs
    model_mapping = {
        "gemini": "google/gemini-2.5-flash",
        "qwen": "qwen/qwen-2.5-72b-instruct",
        "llama": "meta-llama/llama-3.1-8b-instruct",
        "meta": "meta-llama/llama-3.3-70b-instruct"
    }

    env_model = os.environ.get("OPENROUTER_MODEL", "gemini").lower()
    primary_model = model_mapping.get(env_model, env_model)

    # Compile the fallback sequence (primary first, then the remaining mapped models)
    models_to_try = [primary_model]
    for key, val in model_mapping.items():
        if val != primary_model and val not in models_to_try:
            models_to_try.append(val)

    url = "https://openrouter.ai/api/v1/chat/completions"

    import requests

    headers = {
        "Authorization": f"Bearer {openrouter_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/Materna-AI",
        "X-Title": "MaternaAI"
    }

    for model in models_to_try:
        print(f"[MisInfo] Attempting OpenRouter check with model: {model}")
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": f"Community post to check:\n\"\"\"\n{content.strip()}\n\"\"\""}
            ],
            "temperature": 0.1,
            "max_tokens": 256
        }

        try:
            response = requests.post(url, headers=headers, json=payload, timeout=15)
            response.raise_for_status()
            resp_data = response.json()
            
            choices = resp_data.get("choices", [])
            if not choices:
                print(f"[MisInfo] OpenRouter model {model} returned empty choices. Trying next model...")
                continue
                
            raw = choices[0].get("message", {}).get("content", "").strip()

            # Strip markdown code fences if present
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)

            result = json.loads(raw)

            # Validate and sanitise the response
            is_misinfo = bool(result.get("is_misinfo", False))
            confidence = result.get("confidence", "low")
            if confidence not in ("high", "medium", "low"):
                confidence = "medium"
            reason = str(result.get("reason", "")).strip()

            # Only flag if confidence is medium or high
            if is_misinfo and confidence == "low":
                is_misinfo = False
                reason = ""

            return {
                "is_misinfo": is_misinfo,
                "confidence": confidence,
                "reason": reason,
            }
        except Exception as exc:
            print(f"[MisInfo] OpenRouter check with model {model} failed: {exc}. Trying next model...")
            continue

    print("[MisInfo] All configured OpenRouter models failed.")
    return None


def check_for_misinfo(content: str) -> dict:
    """
    Check a community post for misinformation.

    Args:
        content: The post text to evaluate.

    Returns:
        dict with keys: is_misinfo (bool), confidence (str), reason (str)
    """
    default_safe = {"is_misinfo": False, "confidence": "low", "reason": ""}

    if not content or not content.strip():
        return default_safe

    # Attempt Gemini check first, rotating through available keys
    prompt = f"{_SYSTEM_PROMPT}\n\nCommunity post to check:\n\"\"\"\n{content.strip()}\n\"\"\""
    key = None
    while True:
        try:
            model, key = get_gemini_model("gemini-2.0-flash")
            response = model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.1,
                    max_output_tokens=256,
                ),
            )

            raw = response.text.strip()
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)

            result = json.loads(raw)

            is_misinfo = bool(result.get("is_misinfo", False))
            confidence = result.get("confidence", "low")
            if confidence not in ("high", "medium", "low"):
                confidence = "medium"
            reason = str(result.get("reason", "")).strip()

            if is_misinfo and confidence == "low":
                is_misinfo = False
                reason = ""

            return {"is_misinfo": is_misinfo, "confidence": confidence, "reason": reason}

        except GeminiKeysExhausted:
            print("[MisInfo] All Gemini keys exhausted. Trying OpenRouter fallback...")
            break
        except Exception as exc:
            if is_quota_error(exc):
                mark_exhausted(key)
                continue  # try next key
            print(f"[MisInfo] Gemini check failed: {exc}. Trying OpenRouter fallback...")
            break

    # Fallback to OpenRouter
    openrouter_res = _check_with_openrouter(content)
    if openrouter_res is not None:
        return openrouter_res

    print("[MisInfo] Both Gemini and OpenRouter checks failed — defaulting to safe.")
    return default_safe