import os
from dotenv import load_dotenv

load_dotenv()

def _with_connect_timeout(url, timeout_seconds=5):
    if not url:
        return url
    if "connect_timeout=" in url:
        return url
    separator = "&" if "?" in url else "?"
    return f"{url}{separator}connect_timeout={timeout_seconds}"


DATABASE_URL = _with_connect_timeout(os.getenv("DATABASE_URL"))

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
JWT_EXPIRY_HOURS = int(os.getenv("JWT_EXPIRY_HOURS", "24"))

CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    ",".join([
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://materna-ai-eta.vercel.app",
    ])
).split(",")

COHERE_API_KEY = os.getenv("COHERE_API_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# ---------------------------------------------------------------------------
# Gemini API keys — supports multiple keys for rotation.
#
# In your .env, you can use either:
#   GEMINI_API_KEYS=key1,key2,key3   ← preferred (multiple keys)
#   GEMINI_API_KEY=key1              ← still works (single key, backward-compatible)
#
# Priority: GEMINI_API_KEYS > GEMINI_API_KEY
# ---------------------------------------------------------------------------
_raw_keys = os.getenv("GEMINI_API_KEYS") or os.getenv("GEMINI_API_KEY", "")
GEMINI_API_KEYS: list[str] = [k.strip() for k in _raw_keys.split(",") if k.strip()]

# Keep this alias so any file doing `from config import GEMINI_API_KEY`
# still works without changes — it just gets the first key.
GEMINI_API_KEY: str | None = GEMINI_API_KEYS[0] if GEMINI_API_KEYS else None