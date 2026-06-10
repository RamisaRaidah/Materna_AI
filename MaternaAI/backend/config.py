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
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
JWT_EXPIRY_HOURS = int(os.getenv("JWT_EXPIRY_HOURS","24"))
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
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")