import os
import sys
from sqlalchemy.orm import Session

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal, init_db
from app.models.user import User
from app.utils.security import hash_password

def reset_users():
    init_db()
    db: Session = SessionLocal()
    try:
        # Define users to insert/reset
        users_data = [
            {"username": "lokiadmin", "email": "loki@admin.com", "password": "Password123!", "role": "admin", "full_name": "Loki Admin"},
            {"username": "demo", "email": "demo@analytica.com", "password": "Password123!", "role": "analyst", "full_name": "Demo Analyst"},
            {"username": "viewer", "email": "viewer@analytica.com", "password": "Password123!", "role": "viewer", "full_name": "Viewer User"}
        ]
        
        for udata in users_data:
            # Delete if exists
            db.query(User).filter(User.email == udata["email"]).delete()
            # Create fresh
            new_user = User(
                username=udata["username"],
                email=udata["email"],
                hashed_password=hash_password(udata["password"]),
                full_name=udata["full_name"],
                role=udata["role"],
                is_active=True
            )
            db.add(new_user)
            print(f"Created/Reset user: {udata['username']} ({udata['role']})")
        
        db.commit()
        print("Successfully reset users in database!")
    except Exception as e:
        db.rollback()
        print("Error resetting users:", e)
    finally:
        db.close()

if __name__ == "__main__":
    reset_users()
