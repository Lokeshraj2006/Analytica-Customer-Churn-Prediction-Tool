"""
SHAP Explainability Service — per-prediction SHAP value computation.

Strategy:
  - TreeExplainer  → Random Forest, XGBoost, Gradient Boosting, Decision Tree  (fast)
  - LinearExplainer→ Logistic Regression                                         (fast)
  - KernelExplainer→ KNN, SVM (slow — uses 50-row background sample, approximate)

SHAP values are cached in-memory (LRU) and persisted in the DB predictions table.
"""

import json
import numpy as np
from functools import lru_cache
from typing import Optional

# Lazy import shap to avoid startup errors if not installed
_shap = None


def _get_shap():
    global _shap
    if _shap is None:
        try:
            import shap as _shap_lib
            _shap = _shap_lib
        except ImportError:
            _shap = None
    return _shap


# ─────────────────────────────────────────────────────────────────────────────
# Explainer factory
# ─────────────────────────────────────────────────────────────────────────────

TREE_MODELS = {"random_forest", "xgboost", "gradient_boosting", "decision_tree"}
LINEAR_MODELS = {"logistic_regression"}
KERNEL_MODELS = {"knn", "svm"}

# Background data for KernelExplainer — filled on first use
_background_data: Optional[np.ndarray] = None
_explainers: dict = {}


def _build_background(X_train_sample: np.ndarray) -> np.ndarray:
    """Return a 50-row background sample for KernelExplainer."""
    n = min(50, len(X_train_sample))
    idx = np.random.choice(len(X_train_sample), n, replace=False)
    return X_train_sample[idx]


def get_explainer(model_key: str, model, background: Optional[np.ndarray] = None):
    """Return a cached SHAP explainer for the given model."""
    shap = _get_shap()
    if shap is None:
        return None

    if model_key in _explainers:
        return _explainers[model_key]

    try:
        if model_key in TREE_MODELS:
            explainer = shap.TreeExplainer(model)
        elif model_key in LINEAR_MODELS:
            explainer = shap.LinearExplainer(model, background) if background is not None else shap.LinearExplainer(model, np.zeros((1, model.n_features_in_)))
        else:
            # KernelExplainer — approximate, slow
            if background is None:
                return None
            def predict_fn(X):
                return model.predict_proba(X)[:, 1]
            explainer = shap.KernelExplainer(predict_fn, background)
        _explainers[model_key] = explainer
        return explainer
    except Exception as e:
        print(f"[WARN] SHAP explainer init failed for {model_key}: {e}")
        return None


# ─────────────────────────────────────────────────────────────────────────────
# Main computation
# ─────────────────────────────────────────────────────────────────────────────

def compute_shap_values(
    model_key: str,
    model,
    X_instance: np.ndarray,
    feature_names: list[str],
    churn_probability: float,
    background: Optional[np.ndarray] = None,
) -> Optional[dict]:
    """
    Compute SHAP values for a single prediction instance.

    Returns a dict with:
        base_value       — expected model output (baseline probability)
        shap_values      — list of {feature, value(raw), shap, direction}
        approximate      — True if KernelExplainer was used
        error            — error message if computation failed
    """
    shap = _get_shap()
    if shap is None:
        return {"error": "shap package not installed"}

    explainer = get_explainer(model_key, model, background)
    if explainer is None:
        return {"error": f"Could not build explainer for {model_key}"}

    try:
        shap_vals = explainer.shap_values(X_instance)

        # For binary classifiers, pick the array corresponding to class=1 (churn)
        if isinstance(shap_vals, list):
            sv = shap_vals[1][0] if len(shap_vals) > 1 else shap_vals[0][0]
        elif isinstance(shap_vals, np.ndarray):
            if shap_vals.ndim == 3:
                # Shape: (n_samples, n_features, n_classes)
                sv = shap_vals[0, :, 1] if shap_vals.shape[2] > 1 else shap_vals[0, :, 0]
            elif shap_vals.ndim == 2:
                # Shape: (n_samples, n_features)
                sv = shap_vals[0]
            else:
                sv = shap_vals
        else:
            sv = shap_vals

        # Base value for expected output
        if isinstance(explainer.expected_value, (list, np.ndarray)):
            base_value = float(explainer.expected_value[1] if len(explainer.expected_value) > 1 else explainer.expected_value[0])
        else:
            base_value = float(explainer.expected_value)

        # Build per-feature breakdown
        feature_contributions = []
        for i, fname in enumerate(feature_names):
            shap_val = float(sv[i])
            raw_val = float(X_instance[0][i]) if X_instance.ndim == 2 else float(X_instance[i])
            feature_contributions.append({
                "feature": fname,
                "raw_value": round(raw_val, 4),
                "shap_value": round(shap_val, 6),
                "abs_shap": round(abs(shap_val), 6),
                "direction": "increases_churn" if shap_val > 0 else "decreases_churn",
            })

        # Sort by absolute SHAP descending
        feature_contributions.sort(key=lambda x: x["abs_shap"], reverse=True)

        return {
            "base_value": round(base_value, 6),
            "predicted_probability": round(churn_probability, 6),
            "shap_sum": round(float(sum(sv)), 6),
            "feature_contributions": feature_contributions,
            "top_features": feature_contributions[:10],
            "approximate": model_key in KERNEL_MODELS,
            "model_key": model_key,
        }

    except Exception as e:
        print(f"[WARN] SHAP computation failed for {model_key}: {e}")
        return {"error": str(e)}


def shap_result_to_json(shap_result: Optional[dict]) -> Optional[str]:
    """Serialize SHAP result to JSON string for DB storage."""
    if shap_result is None:
        return None
    return json.dumps(shap_result)


def shap_result_from_json(json_str: Optional[str]) -> Optional[dict]:
    """Deserialize SHAP result from DB JSON string."""
    if not json_str:
        return None
    try:
        return json.loads(json_str)
    except Exception:
        return None
