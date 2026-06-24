"""ML model service — load and serve all 7 churn prediction models."""

import os
import joblib
import numpy as np
import pandas as pd
from typing import Optional

# Path to model artifacts
ML_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "ml")

# ── All supported model keys ──
MODEL_KEYS = [
    "random_forest",
    "decision_tree",
    "gradient_boosting",
    "logistic_regression",
    "knn",
    "svm",
    "xgboost",
]

MODEL_DISPLAY_NAMES = {
    "random_forest": "Random Forest",
    "decision_tree": "Decision Tree",
    "gradient_boosting": "Gradient Boosting",
    "logistic_regression": "Logistic Regression",
    "knn": "K-Nearest Neighbors",
    "svm": "Support Vector Machine",
    "xgboost": "XGBoost",
}

# Global model cache
_models: dict = {}
_scaler = None
_label_encoders = None
_feature_names = None
_model_accuracy: dict = {}
_feature_importances: dict = {}
_eda_stats: dict = {}

# Feature columns (order must match training)
FEATURE_COLUMNS = [
    "gender", "SeniorCitizen", "Partner", "Dependents", "tenure",
    "PhoneService", "MultipleLines", "InternetService", "OnlineSecurity",
    "OnlineBackup", "DeviceProtection", "TechSupport", "StreamingTV",
    "StreamingMovies", "Contract", "PaperlessBilling", "PaymentMethod",
    "MonthlyCharges", "TotalCharges"
]

CATEGORICAL_COLUMNS = [
    "gender", "Partner", "Dependents", "PhoneService", "MultipleLines",
    "InternetService", "OnlineSecurity", "OnlineBackup", "DeviceProtection",
    "TechSupport", "StreamingTV", "StreamingMovies", "Contract",
    "PaperlessBilling", "PaymentMethod"
]

NUMERICAL_COLUMNS = ["SeniorCitizen", "tenure", "MonthlyCharges", "TotalCharges"]


# ─────────────────────────────────────────────────────────
# STARTUP LOADING
# ─────────────────────────────────────────────────────────

def load_models():
    """Load all pre-trained models and auxiliary artifacts from disk."""
    global _models, _scaler, _label_encoders, _feature_names
    global _model_accuracy, _feature_importances, _eda_stats

    # Load each model
    for key in MODEL_KEYS:
        path = os.path.join(ML_DIR, f"{key}_model.pkl")
        if os.path.exists(path):
            try:
                _models[key] = joblib.load(path)
                print(f"[OK] {MODEL_DISPLAY_NAMES[key]} loaded")
            except Exception as e:
                print(f"[WARN] Could not load {key}: {e}")

    # Shared preprocessing artifacts
    for attr, filename, label in [
        ("_scaler",            "scaler.pkl",              "Scaler"),
        ("_label_encoders",    "label_encoders.pkl",      "Label encoders"),
        ("_feature_names",     "feature_names.pkl",       "Feature names"),
        ("_model_accuracy",    "model_accuracy.pkl",      "Model accuracies"),
        ("_feature_importances","feature_importances.pkl","Feature importances"),
        ("_eda_stats",         "eda_stats.pkl",           "EDA stats"),
    ]:
        path = os.path.join(ML_DIR, filename)
        if os.path.exists(path):
            try:
                globals()[attr] = joblib.load(path)
                print(f"[OK] {label} loaded")
            except Exception as e:
                print(f"[WARN] Could not load {filename}: {e}")

    if _model_accuracy:
        for k, v in _model_accuracy.items():
            acc = v["accuracy"] if isinstance(v, dict) else v
            print(f"      {k}: accuracy={acc:.4f}")

    if not _models:
        print("[WARN] No models found. Run: python -m app.ml.train_model")


# ─────────────────────────────────────────────────────────
# PREPROCESSING
# ─────────────────────────────────────────────────────────

def preprocess_input(features: dict) -> np.ndarray:
    """Preprocess raw API input into a scaled numpy array for model inference."""
    # Map API snake_case keys → model PascalCase keys
    key_map = {
        "gender": "gender",
        "senior_citizen": "SeniorCitizen",
        "partner": "Partner",
        "dependents": "Dependents",
        "tenure": "tenure",
        "phone_service": "PhoneService",
        "multiple_lines": "MultipleLines",
        "internet_service": "InternetService",
        "online_security": "OnlineSecurity",
        "online_backup": "OnlineBackup",
        "device_protection": "DeviceProtection",
        "tech_support": "TechSupport",
        "streaming_tv": "StreamingTV",
        "streaming_movies": "StreamingMovies",
        "contract": "Contract",
        "paperless_billing": "PaperlessBilling",
        "payment_method": "PaymentMethod",
        "monthly_charges": "MonthlyCharges",
        "total_charges": "TotalCharges",
    }

    row = {model_key: features.get(api_key) for api_key, model_key in key_map.items()}
    df = pd.DataFrame([row])

    # Encode categoricals
    if _label_encoders:
        for col in CATEGORICAL_COLUMNS:
            if col in df.columns and col in _label_encoders:
                le = _label_encoders[col]
                try:
                    df[col] = le.transform(df[col].astype(str))
                except ValueError:
                    df[col] = 0

    # Ensure numeric types
    for col in NUMERICAL_COLUMNS:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    # Align columns to training order
    feat_names = _feature_names or FEATURE_COLUMNS
    for col in feat_names:
        if col not in df.columns:
            df[col] = 0
    df = df[feat_names]

    # Scale
    if _scaler is not None:
        return _scaler.transform(df.values)
    return df.values


# ─────────────────────────────────────────────────────────
# INFERENCE
# ─────────────────────────────────────────────────────────

def predict_churn(features: dict, model_type: str = "random_forest") -> dict:
    """Predict customer churn probability using the specified model."""
    model = _models.get(model_type)

    if model is None:
        # Fallback to any available model
        if _models:
            model_type = next(iter(_models))
            model = _models[model_type]
        else:
            raise RuntimeError("No models loaded. Run: python -m app.ml.train_model")

    X = preprocess_input(features)

    prediction = int(model.predict(X)[0])
    probability = float(model.predict_proba(X)[0][1]) if hasattr(model, "predict_proba") else float(prediction)

    # Risk level
    if probability >= 0.7:
        risk_level = "High"
    elif probability >= 0.4:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    contributing_factors = _get_top_factors(features, model_type)

    return {
        "churn_prediction": prediction,
        "churn_probability": round(probability, 4),
        "risk_level": risk_level,
        "model_used": MODEL_DISPLAY_NAMES.get(model_type, model_type),
        "contributing_factors": contributing_factors,
    }


def _get_top_factors(features: dict, model_type: str, top_n: int = 5) -> list:
    """Get top N contributing features for the given model."""
    feat_names = _feature_names or FEATURE_COLUMNS
    importances = _feature_importances.get(model_type)
    if not importances:
        return []
    sorted_feats = sorted(importances.items(), key=lambda x: x[1], reverse=True)
    return [
        {"feature": name, "importance": round(imp, 4)}
        for name, imp in sorted_feats[:top_n]
    ]


# ─────────────────────────────────────────────────────────
# FEATURE IMPORTANCE
# ─────────────────────────────────────────────────────────

def get_feature_importance(model_type: str = "random_forest") -> list:
    """Return sorted feature importances for the specified model."""
    feat_names = _feature_names or FEATURE_COLUMNS
    importances = _feature_importances.get(model_type)
    if not importances:
        # Compute live if not cached
        model = _models.get(model_type)
        if model is None:
            return []
        if hasattr(model, "feature_importances_"):
            raw = dict(zip(feat_names, model.feature_importances_))
        elif hasattr(model, "coef_"):
            coef = np.abs(model.coef_[0])
            raw = dict(zip(feat_names, coef / coef.sum()))
        else:
            return []
        importances = raw

    result = [
        {"feature": name, "importance": round(float(imp), 4)}
        for name, imp in importances.items()
    ]
    result.sort(key=lambda x: x["importance"], reverse=True)
    return result


def get_all_feature_importances() -> dict:
    """Return feature importances for all trained models."""
    return {
        model_key: get_feature_importance(model_key)
        for model_key in MODEL_KEYS
        if model_key in _models
    }


# ─────────────────────────────────────────────────────────
# ACCURACY / STATS
# ─────────────────────────────────────────────────────────

def get_model_accuracy(model_type: str = "random_forest") -> float:
    """Get accuracy of the specified model (0–1)."""
    entry = _model_accuracy.get(model_type, 0.0)
    if isinstance(entry, dict):
        return entry.get("accuracy", 0.0)
    return float(entry)


def get_all_model_accuracies() -> list:
    """Return a list of all model performance metrics for comparison."""
    result = []
    for key in MODEL_KEYS:
        if key not in _models and key not in _model_accuracy:
            continue
        entry = _model_accuracy.get(key, {})
        if isinstance(entry, dict):
            acc = entry.get("accuracy", 0.0)
            f1 = entry.get("f1_score", 0.0)
            auc = entry.get("roc_auc", 0.0)
        else:
            acc = float(entry)
            f1 = 0.0
            auc = 0.0
        result.append({
            "model": key,
            "display_name": MODEL_DISPLAY_NAMES.get(key, key),
            "accuracy": round(acc, 4),
            "f1_score": round(f1, 4),
            "roc_auc": round(auc, 4),
            "available": key in _models,
        })
    # Sort by accuracy descending
    result.sort(key=lambda x: x["accuracy"], reverse=True)
    return result


def get_available_models() -> list:
    """Return list of model keys that are loaded and ready."""
    return list(_models.keys())


# ─────────────────────────────────────────────────────────
# EDA STATS
# ─────────────────────────────────────────────────────────

def get_eda_stats() -> dict:
    """Return pre-computed EDA statistics."""
    return _eda_stats or {}
