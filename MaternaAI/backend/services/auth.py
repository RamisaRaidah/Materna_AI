# JWT token creation and validation

import jwt
import bcrypt
from datetime import datetime, timedelta, timezone
from functools import wraps
from flask import request, jsonify, g
from config import SECRET_KEY, JWT_EXPIRY_HOURS
from db import query

# Password helpers
 
def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()
 
 
def check_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())

# Token helpers
 
def create_token(user_id: int, role: str = "patient") -> str:
    payload = {
        "sub": str(user_id),
        "role": role,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")
 
 
def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
 

# Flask decorator
 
def require_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid token"}), 401
        token = auth.split(" ", 1)[1]
        try:
            payload = decode_token(token)
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
 
        user = query("SELECT * FROM users WHERE id = %s", (payload["sub"],), fetch="one")
        if not user:
            return jsonify({"error": "User not found"}), 401
        g.user = user
        return f(*args, **kwargs)
    return wrapper
 
 
def require_clinician(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"error": "Unauthorized"}), 401
        token = auth.split(" ", 1)[1]
        try:
            payload = decode_token(token)
        except Exception:
            return jsonify({"error": "Invalid token"}), 401
        user = query("SELECT * FROM users WHERE id = %s", (payload["sub"],), fetch="one")
        if not user or user.get("role") not in ("clinician", "admin"):
            return jsonify({"error": "Clinician access required"}), 403
        g.user = user
        return f(*args, **kwargs)
    return wrapper
 