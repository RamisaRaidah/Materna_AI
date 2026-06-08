import sys
import os

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import query, ensure_clinician_verification_columns
from services.auth import hash_password

def seed_admin():
    # Run migration first to make sure status column exists
    try:
        ensure_clinician_verification_columns()
    except Exception as e:
        print(f"[SEED] Migration failed or skipped: {e}")
        
    phone = "01900000000"
    password = "adminpassword123"
    role = "admin"
    status = "approved"
    name = "System Admin"
    
    # Check if admin already exists
    existing = query("SELECT id FROM users WHERE phone = %s", (phone,), fetch="one")
    if existing:
        print(f"[SEED] Admin with phone {phone} already exists (ID: {existing['id']})")
        return
        
    pw_hash = hash_password(password)
    user = query(
        """INSERT INTO users (name, phone, password_hash, role, status, age, division, district, area)
           VALUES (%s, %s, %s, %s, %s, 30, 'Dhaka Division', 'Dhaka', 'Dhanmondi')
           RETURNING id""",
        (name, phone, pw_hash, role, status),
        fetch="one"
    )
    print(f"[SEED] Admin successfully seeded. ID: {user['id']}")

if __name__ == "__main__":
    seed_admin()
