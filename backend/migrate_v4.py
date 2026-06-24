"""
Analytica V4.0 Database Migration
Safely adds new columns to the existing SQLite database without data loss.

Run: python migrate_v4.py
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "analytica.db")


MIGRATIONS = [
    # Prediction table — V4.0 extensions
    "ALTER TABLE predictions ADD COLUMN industry VARCHAR(50) DEFAULT 'telecom'",
    "ALTER TABLE predictions ADD COLUMN shap_values_json TEXT",
    "ALTER TABLE predictions ADD COLUMN clv_score REAL",
    "ALTER TABLE predictions ADD COLUMN risk_adjusted_clv REAL",
    "ALTER TABLE predictions ADD COLUMN revenue_at_risk REAL",
    "ALTER TABLE predictions ADD COLUMN segment_label VARCHAR(50)",
    # TuningJob table
    """CREATE TABLE IF NOT EXISTS tuning_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        model_key VARCHAR(50) NOT NULL,
        search_method VARCHAR(20) NOT NULL,
        cv_folds INTEGER DEFAULT 3,
        status VARCHAR(20) DEFAULT 'pending',
        progress REAL DEFAULT 0.0,
        best_params_json TEXT,
        results_json TEXT,
        baseline_accuracy REAL,
        best_accuracy REAL,
        baseline_f1 REAL,
        best_f1 REAL,
        baseline_roc_auc REAL,
        best_roc_auc REAL,
        error_message TEXT,
        started_at DATETIME,
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""",
    # SegmentRun table
    """CREATE TABLE IF NOT EXISTS segment_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        n_clusters INTEGER DEFAULT 4,
        results_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""",
    # V4.0.1 — Precision / Recall in tuning
    "ALTER TABLE tuning_jobs ADD COLUMN baseline_precision REAL",
    "ALTER TABLE tuning_jobs ADD COLUMN best_precision REAL",
    "ALTER TABLE tuning_jobs ADD COLUMN baseline_recall REAL",
    "ALTER TABLE tuning_jobs ADD COLUMN best_recall REAL",
]


def column_exists(cursor, table: str, column: str) -> bool:
    cursor.execute(f"PRAGMA table_info({table})")
    return any(row[1] == column for row in cursor.fetchall())


def migrate():
    if not os.path.exists(DB_PATH):
        print(f"[SKIP] Database not found at {DB_PATH} — will be created on first app start.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    applied = 0

    for sql in MIGRATIONS:
        # For ALTER TABLE ADD COLUMN, check if column already exists
        if "ALTER TABLE" in sql and "ADD COLUMN" in sql:
            parts = sql.split()
            table = parts[2]
            col = parts[5]
            if column_exists(cursor, table, col):
                print(f"[SKIP] Column '{col}' already exists in '{table}'")
                continue
        # For CREATE TABLE IF NOT EXISTS — always safe to run
        try:
            cursor.execute(sql)
            applied += 1
            print(f"[OK]   Executed: {sql[:60].strip()}...")
        except sqlite3.OperationalError as e:
            print(f"[WARN] Skipped ({e}): {sql[:60].strip()}")

    conn.commit()
    conn.close()
    print(f"\nMigration complete -- {applied} statements applied.")


if __name__ == "__main__":
    migrate()
