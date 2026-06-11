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

mark_invalid(key: str)
    Call this when a key is permanently invalid/expired. It is removed
    from the pool entirely (not retried after a timeout).

is_quota_error(exc) -> bool
    Returns True when an exception signals a transient rate-limit / quota
    hit (429, 503). Returns False for permanent errors like invalid/expired
    keys (API_KEY_INVALID), which should call mark_invalid() instead.

is_invalid_key_error(exc) -> bool
    Returns True when an exception signals a permanently bad key
    (expired, revoked, or never valid).

TYPICAL USAGE IN A SERVICE FILE
---------------------------------
    from llm_client import (
        get_gemini_model, mark_exhausted, mark_invalid,
        is_quota_error, is_invalid_key_error, GeminiKeysExhausted,
    )

    def call_gemini(prompt):
        while True:
            try:
                model, key = get_gemini_model("gemini-2.5-flash")
                return model.generate_content(prompt).text
            except GeminiKeysExhausted:
                # fall through to your existing OpenRouter fallback
                ...
                break
            except Exception as e:
                if is_invalid_key_error(e):
                    mark_invalid(key)   # permanent — remove from pool
                    continue            # try next key immediately
                if is_quota_error(e):
                    mark_exhausted(key) # transient — retry after 1 h
                    continue
                raise                   # non-quota error — propagate
"""

import logging
import time

import google.generativeai as genai

from config import GEMINI_API_KEYS

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Tuning
# ---------------------------------------------------------------------------

# HTTP / SDK status codes that mean "quota or rate limit" (transient).
# 400 is intentionally excluded: it covers both quota AND permanently
# invalid/expired keys, so we disambiguate in is_quota_error() via the
# error message instead.
_QUOTA_CODES = {429, 503}

# Substrings in the error message that indicate a permanently bad key.
_INVALID_KEY_PHRASES = (
    "API_KEY_INVALID",
    "API key expired",
    "API key not valid",
    "invalid api key",
)

# Re-enable an exhausted key after this many seconds (free tier resets daily
# but per-minute limits recover in ~1 min; 1 h is a safe middle ground).
_RETRY_AFTER = 60 * 60  # 1 hour


# ---------------------------------------------------------------------------
# Exception
# ---------------------------------------------------------------------------

class GeminiKeysExhausted(RuntimeError):
    """Raised when every configured Gemini key is currently exhausted or invalid."""


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
        self._keys: list[str] = list(keys)
        # key → timestamp when transiently exhausted, or None if active.
        # Keys removed by mark_invalid() are dropped from _keys entirely.
        self._exhausted: dict[str, float | None] = {k: None for k in keys}

    def get_available(self) -> str:
        """Return the next usable key, or raise GeminiKeysExhausted."""
        now = time.time()
        for key in self._keys:
            exhausted_at = self._exhausted.get(key)
            if exhausted_at is None:
                return key
            if now - exhausted_at >= _RETRY_AFTER:
                logger.info(
                    "llm_client: Re-enabling key ...%s (quota reset window passed).",
                    key[-6:],
                )
                self._exhausted[key] = None
                return key
        raise GeminiKeysExhausted(
            "All configured Gemini API keys are currently exhausted or invalid. "
            "Use the OpenRouter fallback."
        )

    def mark_exhausted(self, key: str):
        """Mark a key as transiently exhausted (rate-limit). Retried after _RETRY_AFTER."""
        if key in self._exhausted:
            logger.warning(
                "llm_client: Key ...%s rate-limited — rotating to next key (retry in %d min).",
                key[-6:],
                _RETRY_AFTER // 60,
            )
            self._exhausted[key] = time.time()

    def mark_invalid(self, key: str):
        """Permanently remove a key from the pool (expired / revoked / never valid)."""
        if key in self._exhausted:
            logger.error(
                "llm_client: Key ...%s is permanently invalid — removing from pool.",
                key[-6:],
            )
            del self._exhausted[key]
            try:
                self._keys.remove(key)
            except ValueError:
                pass


_pool = _KeyPool(GEMINI_API_KEYS)


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------

def get_gemini_model(model_name: str = "gemini-2.5-flash") -> tuple[genai.GenerativeModel, str]:
    """
    Return a (GenerativeModel, key) tuple using the next available key.

    The key is returned so the caller can pass it to mark_exhausted() or
    mark_invalid() depending on the error type.

    Raises:
        GeminiKeysExhausted: when every key is exhausted or invalid.
    """
    key = _pool.get_available()
    genai.configure(api_key=key)
    return genai.GenerativeModel(model_name), key


def mark_exhausted(key: str):
    """
    Mark a key as transiently exhausted after catching a rate-limit error.
    The pool will skip this key and retry it after _RETRY_AFTER seconds.
    """
    _pool.mark_exhausted(key)


def mark_invalid(key: str):
    """
    Permanently remove a key from the pool after catching an invalid/expired
    key error. The key will never be retried.
    """
    _pool.mark_invalid(key)


def is_invalid_key_error(exc: Exception) -> bool:
    """
    Return True when exc signals a permanently bad Gemini key
    (expired, revoked, or never valid).

    These should call mark_invalid(), not mark_exhausted(), so the key
    is dropped from the pool rather than retried after an hour.
    """
    exc_str = str(exc).lower()
    return any(phrase.lower() in exc_str for phrase in _INVALID_KEY_PHRASES)


def is_quota_error(exc: Exception) -> bool:
    """
    Return True when exc signals a transient Gemini quota / rate-limit hit.

    Deliberately returns False for API_KEY_INVALID / expired-key errors
    (even though Google sometimes returns those as HTTP 400) so callers
    don't retry a permanently dead key as if it were a transient limit.

    Checks both numeric status codes (google-api-core) and class names
    because the SDK wraps errors differently across versions.
    """
    # Permanent invalid-key errors are NOT quota errors — check first.
    if is_invalid_key_error(exc):
        return False

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