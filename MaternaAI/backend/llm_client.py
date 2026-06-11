"""
llm_client.py  —  backend/llm_client.py
----------------------------------------
Central Gemini access layer with automatic key rotation.

WHY THIS EXISTS
---------------
The free-tier Gemini quota exhausts quickly when shared across a team.
This module holds a pool of keys (from GEMINI_API_KEYS in .env) and
transparently rotates to the next key whenever a quota/rate-limit error
occurs.  When ALL keys are exhausted it raises GeminiKeysExhausted so
the caller can fall back to OpenRouter (each service file keeps its own
OpenRouter fallback logic unchanged).

PUBLIC API
----------
get_gemini_model(model_name) -> (GenerativeModel, key: str)
    Returns a configured GenerativeModel using the next available key.
    Raises GeminiKeysExhausted when all keys are exhausted.

mark_exhausted(key: str)
    Call this in an except block when generate_content() raises a quota
    error, so the pool skips that key on the next call.

is_quota_error(exc) -> bool
    Returns True when an exception signals a rate-limit / quota hit.

TYPICAL USAGE IN A SERVICE FILE
---------------------------------
    from llm_client import get_gemini_model, mark_exhausted, is_quota_error, GeminiKeysExhausted

    def call_gemini(prompt):
        while True:
            try:
                model, key = get_gemini_model("gemini-2.5-flash")
                return model.generate_content(prompt).text
            except Exception as e:
                if is_quota_error(e):
                    mark_exhausted(key)
                    continue          # retry with next key
                raise                 # non-quota error — propagate
            except GeminiKeysExhausted:
                # fall through to your existing OpenRouter fallback
                ...
"""

import logging
import time

import google.generativeai as genai

from config import GEMINI_API_KEYS

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Tuning
# ---------------------------------------------------------------------------

# HTTP / SDK status codes that mean "quota or rate limit", not a real error
_QUOTA_CODES = {429, 503}

# Re-enable an exhausted key after this many seconds (free tier resets daily
# but per-minute limits recover in ~1 min; 1 h is a safe middle ground)
_RETRY_AFTER = 60 * 60  # 1 hour


# ---------------------------------------------------------------------------
# Exception
# ---------------------------------------------------------------------------

class GeminiKeysExhausted(RuntimeError):
    """Raised when every configured Gemini key is currently exhausted."""


# ---------------------------------------------------------------------------
# Key pool (module-level singleton — one pool per Flask process)
# ---------------------------------------------------------------------------

class _KeyPool:
    def __init__(self, keys: list[str]):
        if not keys:
            logger.warning(
                "llm_client: No Gemini keys found in GEMINI_API_KEYS / GEMINI_API_KEY. "
                "All Gemini calls will raise GeminiKeysExhausted immediately."
            )
        self._keys = keys
        # key → timestamp when exhausted, or None if active
        self._exhausted: dict[str, float | None] = {k: None for k in keys}

    def get_available(self) -> str:
        """Return the next usable key, or raise GeminiKeysExhausted."""
        now = time.time()
        for key in self._keys:
            exhausted_at = self._exhausted[key]
            if exhausted_at is None:
                return key
            if now - exhausted_at >= _RETRY_AFTER:
                logger.info("llm_client: Re-enabling key ...%s (quota reset window passed)", key[-6:])
                self._exhausted[key] = None
                return key
        raise GeminiKeysExhausted(
            "All configured Gemini API keys are currently exhausted. "
            "Use the OpenRouter fallback."
        )

    def mark_exhausted(self, key: str):
        logger.warning("llm_client: Key ...%s exhausted — rotating to next key.", key[-6:])
        self._exhausted[key] = time.time()


_pool = _KeyPool(GEMINI_API_KEYS)


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------

def get_gemini_model(model_name: str = "gemini-2.5-flash") -> tuple[genai.GenerativeModel, str]:
    """
    Return a (GenerativeModel, key) tuple using the next available key.

    The key is returned so the caller can pass it to mark_exhausted() if
    generate_content() raises a quota error.

    Raises:
        GeminiKeysExhausted: when every key is exhausted.
    """
    key = _pool.get_available()
    genai.configure(api_key=key)
    return genai.GenerativeModel(model_name), key


def mark_exhausted(key: str):
    """
    Mark a key as exhausted after catching a quota error.
    The pool will skip this key and retry after _RETRY_AFTER seconds.
    """
    _pool.mark_exhausted(key)


def is_quota_error(exc: Exception) -> bool:
    """
    Return True when exc signals a Gemini quota / rate-limit hit.

    Checks both numeric status codes (google-api-core) and class names
    because the SDK wraps errors differently across versions.
    """
    code = getattr(exc, "code", None) or getattr(
        getattr(exc, "response", None), "status_code", None
    )
    if code in _QUOTA_CODES:
        return True
    return type(exc).__name__ in {
        "ResourceExhausted",
        "ServiceUnavailable",
        "TooManyRequests",
    }