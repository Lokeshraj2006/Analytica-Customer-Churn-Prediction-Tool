"""
Hyperparameter Tuning Service.

Runs GridSearchCV or RandomizedSearchCV as a FastAPI BackgroundTask.
Results are written to the TuningJob DB row as the search progresses.
"""

import json
import threading
from datetime import datetime, timezone
from typing import Optional

import numpy as np
from sklearn.model_selection import GridSearchCV, RandomizedSearchCV, cross_val_score
from sklearn.metrics import make_scorer, f1_score, roc_auc_score

from app.config import settings


# ─────────────────────────────────────────────────────────────────────────────
# Hyperparameter search spaces
# ─────────────────────────────────────────────────────────────────────────────

PARAM_GRIDS = {
    "random_forest": {
        "n_estimators": [100, 150, 200],
        "max_depth": [8, 12, 16, None],
        "min_samples_split": [2, 5, 10],
        "min_samples_leaf": [1, 2, 4],
    },
    "xgboost": {
        "n_estimators": [100, 150, 200],
        "max_depth": [3, 5, 7],
        "learning_rate": [0.05, 0.1, 0.2],
        "subsample": [0.7, 0.8, 1.0],
    },
    "gradient_boosting": {
        "n_estimators": [100, 150, 200],
        "max_depth": [3, 4, 5],
        "learning_rate": [0.05, 0.1, 0.15],
        "subsample": [0.7, 0.8, 1.0],
    },
}

TUNABLE_MODELS = list(PARAM_GRIDS.keys())


def get_tunable_models() -> list[str]:
    return TUNABLE_MODELS


def _get_model_instance(model_key: str, params: Optional[dict] = None):
    """Return a fresh model instance (optionally with given params)."""
    from app.services.ml_service import _models
    base_model = _models.get(model_key)
    if base_model is None:
        raise ValueError(f"Model '{model_key}' not loaded")
    # Create a fresh clone with updated params
    import sklearn.base as sk_base
    cloned = sk_base.clone(base_model)
    if params:
        cloned.set_params(**params)
    return cloned


def _run_search(
    job_id: int,
    model_key: str,
    search_method: str,
    cv_folds: int,
    db_session_factory,
):
    """
    Execute hyperparameter search in a background thread.
    Updates the TuningJob row with status, progress, and results.
    """
    from app.services.ml_service import _models, preprocess_input, FEATURE_COLUMNS, _scaler
    from app.models.user import TuningJob
    import os
    import joblib

    ML_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ml")

    db = db_session_factory()
    job = db.query(TuningJob).filter(TuningJob.id == job_id).first()
    if not job:
        db.close()
        return

    try:
        # ── Mark as running ──
        job.status = "running"
        job.started_at = datetime.now(timezone.utc)
        db.commit()

        # ── Load training data ──
        data_path = os.path.join(ML_DIR, "data", "WA_Fn-UseC_-Telco-Customer-Churn.csv")
        syn_path = os.path.join(ML_DIR, "data", "telco_churn_synthetic.csv")

        import pandas as pd
        if os.path.exists(data_path):
            df = pd.read_csv(data_path)
            df.columns = [c.strip() for c in df.columns]
            df["TotalCharges"] = pd.to_numeric(df["TotalCharges"], errors="coerce")
            df["TotalCharges"].fillna(df["tenure"] * df["MonthlyCharges"], inplace=True)
            if df["Churn"].dtype == object:
                df["Churn"] = (df["Churn"].str.strip() == "Yes").astype(int)
            if "customerID" in df.columns:
                df = df.drop(columns=["customerID"])
        elif os.path.exists(syn_path):
            df = pd.read_csv(syn_path)
        else:
            raise FileNotFoundError("No training data found for tuning")

        from app.ml.train_model import FEATURE_COLUMNS as FC, CATEGORICAL_COLUMNS
        from sklearn.preprocessing import LabelEncoder, StandardScaler as SS
        from sklearn.model_selection import train_test_split

        X = df[FC].copy()
        y = df["Churn"]

        label_encoders = {}
        for col in CATEGORICAL_COLUMNS:
            le = LabelEncoder()
            X[col] = le.fit_transform(X[col].astype(str))
            label_encoders[col] = le

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
        scaler = SS()
        X_train_s = scaler.fit_transform(X_train)
        X_test_s = scaler.transform(X_test)

        # ── Baseline (current model) ──
        current_model = _models.get(model_key)
        if current_model is None:
            raise ValueError(f"Model '{model_key}' not in memory")

        from sklearn.metrics import accuracy_score, f1_score as f1, roc_auc_score, precision_score as prec, recall_score as rec
        base_preds = current_model.predict(X_test_s)
        base_proba = current_model.predict_proba(X_test_s)[:, 1]
        job.baseline_accuracy = round(float(accuracy_score(y_test, base_preds)), 4)
        job.baseline_f1 = round(float(f1(y_test, base_preds)), 4)
        job.baseline_roc_auc = round(float(roc_auc_score(y_test, base_proba)), 4)
        job.baseline_precision = round(float(prec(y_test, base_preds)), 4)
        job.baseline_recall = round(float(rec(y_test, base_preds)), 4)
        job.progress = 0.1
        db.commit()

        # ── Search ──
        param_grid = PARAM_GRIDS.get(model_key, {})
        import sklearn.base as sk_base
        fresh_model = sk_base.clone(current_model)

        scoring = "roc_auc"

        if search_method == "grid":
            searcher = GridSearchCV(
                fresh_model, param_grid,
                cv=cv_folds, scoring=scoring,
                n_jobs=-1, verbose=0, refit=True,
            )
        else:
            searcher = RandomizedSearchCV(
                fresh_model, param_grid,
                n_iter=settings.TUNING_RANDOM_ITER,
                cv=cv_folds, scoring=scoring,
                n_jobs=-1, verbose=0, refit=True, random_state=42,
            )

        job.progress = 0.2
        db.commit()

        searcher.fit(X_train_s, y_train)

        job.progress = 0.85
        db.commit()

        # ── Evaluate best model ──
        best_model = searcher.best_estimator_
        best_preds = best_model.predict(X_test_s)
        best_proba = best_model.predict_proba(X_test_s)[:, 1]
        job.best_accuracy = round(float(accuracy_score(y_test, best_preds)), 4)
        job.best_f1 = round(float(f1(y_test, best_preds)), 4)
        job.best_roc_auc = round(float(roc_auc_score(y_test, best_proba)), 4)
        job.best_precision = round(float(prec(y_test, best_preds)), 4)
        job.best_recall = round(float(rec(y_test, best_preds)), 4)
        job.best_params_json = json.dumps(searcher.best_params_)

        # CV results (top 10 by rank)
        cv_df = {
            k: list(v) for k, v in searcher.cv_results_.items()
            if k in ["params", "mean_test_score", "std_test_score", "rank_test_score"]
        }
        # Serialize params properly
        top_idx = np.argsort(searcher.cv_results_["rank_test_score"])[:10]
        top_results = [
            {
                "rank": int(searcher.cv_results_["rank_test_score"][i]),
                "params": searcher.cv_results_["params"][i],
                "mean_roc_auc": round(float(searcher.cv_results_["mean_test_score"][i]), 4),
                "std": round(float(searcher.cv_results_["std_test_score"][i]), 4),
            }
            for i in top_idx
        ]
        job.results_json = json.dumps(top_results)
        job.status = "completed"
        job.completed_at = datetime.now(timezone.utc)
        job.progress = 1.0
        db.commit()

        # Optionally save the best model (overwrite pkl for this model_key)
        # Uncomment to persist the best model:
        # import os, joblib
        # ml_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ml")
        # joblib.dump(best_model, os.path.join(ml_dir, f"{model_key}_model.pkl"))

    except Exception as e:
        job = db.query(TuningJob).filter(TuningJob.id == job_id).first()
        if job:
            job.status = "failed"
            job.error_message = str(e)
            job.completed_at = datetime.now(timezone.utc)
            db.commit()
        print(f"[ERROR] Tuning job {job_id} failed: {e}")
    finally:
        db.close()


def start_tuning_job(
    job_id: int,
    model_key: str,
    search_method: str,
    cv_folds: int,
    db_session_factory,
):
    """Kick off tuning in a daemon thread (no Celery required)."""
    t = threading.Thread(
        target=_run_search,
        args=(job_id, model_key, search_method, cv_folds, db_session_factory),
        daemon=True,
    )
    t.start()
