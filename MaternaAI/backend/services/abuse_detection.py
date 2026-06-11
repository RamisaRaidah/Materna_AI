import json
import re
import threading
from typing import Literal

import google.generativeai as genai
import openai

from config import OPENROUTER_API_KEY
from llm_client import get_gemini_model, mark_exhausted, mark_invalid, is_quota_error, is_invalid_key_error, GeminiKeysExhausted

_or_client = openai.OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY,
)

DangerLevel = Literal["safe", "warning", "critical"]

PREDEFINED_SAFE_WORDS: frozenset[str] = frozenset({
    'telescope', 'mosaic', 'lantern', 'compass', 'anchor',
    'prism', 'fortress', 'velvet', 'cobalt', 'labyrinth',
    'marble', 'quartz', 'signal', 'ember', 'zenith',
    'পথ', 'নৌকা', 'গাম', 'বেল', 'পাথর', 
    'সোনা', 'পেন', 'বাস', 'টপ', 'লক',
})

def validate_safe_word(word: str | None) -> str | None:
    if not word or not word.strip():
        return None
    cleaned = word.strip().lower()
    return cleaned if cleaned in PREDEFINED_SAFE_WORDS else None


_DANGER_SIGNALS: list[str] = [
    # English
    "help me", "please help", "i'm scared", "i am scared", "im scared",
    "i'm not safe", "i am not safe", "im not safe",
    "i can't leave", "i cant leave", "he won't let me", "she won't let me",
    "i need to get out", "call the police", "someone is hurting me",
    "he hit me", "she hit me", "being abused", "he threatened me",
    "i'm being hurt", "i am being hurt",
    # Bengali script
    "আমি ভয় পাচ্ছি", "আমাকে সাহায্য করো", "আমাকে মারছে",
    "আমি নিরাপদ নই", "সে আমাকে মারে", "আমি বের হতে পারছি না",
    "আমাকে ছাড়তে দিচ্ছে না", "পুলিশ ডাকো", "আমার বিপদ",
    "কেউ আমাকে সাহায্য করো",
    # Banglish
    "ami voy pacchi", "amake help koro", "ami safe nai",
    "se amake mare", "ber hote parchi na", "help koro",
    "police dao", "amar bipod",
]

_COMPILED_PATTERNS = [
    re.compile(r'\b' + re.escape(sig) + r'\b', re.IGNORECASE)
    for sig in _DANGER_SIGNALS
    if ' ' not in sig
] + [
    re.compile(re.escape(sig), re.IGNORECASE)
    for sig in _DANGER_SIGNALS
    if ' ' in sig
]

def _keyword_match(text: str) -> bool:
    for pattern in _COMPILED_PATTERNS:
        if pattern.search(text):
            return True
    return False

_AI_PROMPT = """You are a silent safety monitor embedded in MaternaAI health app used in rural Bangaldesh..
Analyze the conversation snippet for ANY of these signals:
- Fear, panic, or terror expressed by the user
- Descriptions of being physically hurt, threatened or controlled
- Subtle attempts to ask for help indirectly
- Sudden shift from normal conversation to distress
- Mentions of being locked in, not allowed to leave or being watched

Conversation (last few messages):
{conversation}

Reply ONLY with valid JSON - no markdown, no explanation:
{{"level": "safe"|"warning"|"critical", "confidence": 0.0-1.0, "reason": "one sentence"}}"""

_MODEL_QUEUE = [
    "gemini-2.5-flash",          # direct Gemini
    "google/gemini-2.5-flash",   # OpenRouter
    "qwen/qwen-2.5-72b-instruct",
    "meta-llama/llama-3.1-8b-instruct:free",
]


def _ai_analyze(conversation_snippet:str)->dict:
    """Returns {"level": ..., "confidence": ..., "reason": ...} or safe default."""
    prompt = _AI_PROMPT.format(conversation=conversation_snippet)

    key = None
    while True:
        try:
            model, key = get_gemini_model("gemini-2.5-flash")
            res = model.generate_content(
                prompt,
                generation_config={"max_output_tokens": 120, "temperature": 0.1}
            )
            raw = res.text.strip().lstrip("```json").rstrip("```").strip()
            return json.loads(raw)
        except GeminiKeysExhausted:
            print("[AbuseDetect] All Gemini keys exhausted/invalid — falling back to OpenRouter.")
            break
        except Exception as e:
            if is_invalid_key_error(e):
                mark_invalid(key)
                continue
            if is_quota_error(e):
                mark_exhausted(key)
                continue
            print(f"[AbuseDetect] Gemini failed: {e}")
            break

    for model_id in _MODEL_QUEUE[1:]:
        try:
            resp = _or_client.chat.completions.create(
                model=model_id,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=120,
                temperature=0.1,
            )
            raw = resp.choices[0].message.content.strip()
            raw = raw.lstrip("```json").rstrip("```").strip()
            return json.loads(raw)
        except Exception as e:
            print(f"[AbuseDetect] {model_id} failed: {e}")

    return {"level": "safe", "confidence": 0.0, "reason": "analysis unavailable"}


def analyze_message(text: str, safe_word: str | None, recent_history: list[dict], message_count: int, has_open_alert: bool = False, ai_every_n: int = 5,) -> dict:
    """
    Run all three detection layers.
    Returns:
        {
            "triggered": bool,
            "level": "safe"|"warning"|"critical",
            "method": "safe_word"|"keyword"|"ai"|None,
            "reason": str,
            "confidence": float, 
        }
    """
    print(f"[AbuseDetect] Checking text: '{text[:50]}' | safe_word: '{safe_word}' | count: {message_count} | open_alert={has_open_alert}")

    # Safe word ALWAYS fires — no cooldown, no suppression
    if safe_word and safe_word.strip() and safe_word.lower() in PREDEFINED_SAFE_WORDS:
        pattern = re.compile(r'\b' + re.escape(safe_word.lower()) + r'\b', re.IGNORECASE)
        if pattern.search(text):
            return {
                "triggered": True,
                "level": "critical",
                "method": "safe_word",
                "reason": "Predefined safe word detected",
                "confidence": 1.0,
            }
        
    if has_open_alert:
        return {"triggered": False, "level": "safe", "method": None, "reason": "dedup", "confidence": 0.0}

        
    if _keyword_match(text):
        return {
            "triggered": True,
            "level": "critical",
            "method": "keyword",
            "reason": "Danger keyword matched",
            "confidence": 0.95,
        }
    
    if message_count % ai_every_n == 0 and recent_history:
        snippet = "\n".join(
            f"{m['role'].upper()}: {m['content']}"
            for m in recent_history[-6:]
        )
        result = _ai_analyze(snippet)
        level = result.get("level", "safe")
        confidence = float(result.get("confidence", 0.0))

        if level == "critical" and confidence >= 0.75:
            return {
                "triggered": True,
                "level": "critical",
                "method": "ai",
                "reason": result.get("reason", "AI detected critical danger"),
                "confidence": confidence,
            }
        if level == "warning":
            return {
                "triggered": False,
                "level": "warning",
                "method": "ai",
                "reason": result.get("reason", "AI detected warning signs"),
                "confidence": confidence,
            }
    return {"triggered": False, "level": "safe", "method": None, "reason": "", "confidence": 0.0}   
    

def run_detection_async(text: str, safe_word: str | None, recent_history: list[dict], message_count: int, user_id: int , on_trigger, location: str = "Unknown", has_open_alert: bool = False,) -> None:
    """Fire-and-forget wrapper — runs detection in a background thread."""
    def _run():
        try:
            result = analyze_message(
                text=text,
                safe_word=safe_word,
                recent_history=recent_history,
                message_count=message_count,
                has_open_alert=has_open_alert,
            )
            if result["triggered"]:
                on_trigger(
                    user_id=user_id,
                    reason=f"[{result['method'].upper()}] {result['reason']}",
                    location=location,
                    method=result["method"],
                    confidence=result["confidence"],
                )
            elif result["level"] == "warning":
                print(
                    f"[AbuseDetect] WARNING for user {user_id}: "
                    f"{result['reason']} (confidence={result['confidence']:.2f})"
                )
        except Exception as e:
            print(f"[AbuseDetect] Background thread error: {e}")
 
    threading.Thread(target=_run, daemon=True).start()