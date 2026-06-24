"""Script to add the role column to existing users table via ALTER TABLE."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'analyst'"))
        conn.commit()
        print("SUCCESS: role column added to users table")
    except Exception as e:
        if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
            print("INFO: role column already exists, skipping")
        else:
            print(f"ERROR: {e}")
