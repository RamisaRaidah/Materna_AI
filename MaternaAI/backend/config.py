import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
JWT_EXPIRY_HOURS = int(os.getenv("JWT_EXPIRY_HOURS","24"))
CORS_ORIGINS = os.getenv(
	"CORS_ORIGINS",
	"http://localhost:5173,http://127.0.0.1:5173,"
	"http://localhost:5174,http://127.0.0.1:5174,"
	"http://localhost:3000,http://127.0.0.1:3000",
).split(",")
COHERE_API_KEY = os.getenv("COHERE_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")