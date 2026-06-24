"""SHAP Explainability API routes."""

import json
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, Prediction
from app.services import ml_service
from app.services.shap_service import (
    compute_shap_values, shap_result_to_json, shap_result_from_json,
    get_explainer, KERNEL_MODELS
)
from app.utils.security import get_current_user
import numpy as np

router = APIRouter(prefix="/api/shap", tags=["SHAP Explainability"])


@router.get("/{prediction_id}")
def get_shap_explanation(
    prediction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get SHAP explanation for a specific prediction.
    Computes once and caches result in the database.
    """
    prediction = (
        db.query(Prediction)
        .filter(Prediction.id == prediction_id, Prediction.user_id == current_user.id)
        .first()
    )
    if not prediction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prediction not found")

    # Return cached SHAP if already computed
    if prediction.shap_values_json:
        cached = shap_result_from_json(prediction.shap_values_json)
        if cached and "error" not in cached:
            return {**cached, "cached": True, "prediction_id": prediction_id}

    # Compute SHAP
    if not prediction.input_features_json:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Input features not available for this prediction — cannot compute SHAP"
        )

    try:
        raw_features = json.loads(prediction.input_features_json)
    except Exception:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Corrupt input features")

    # Find model key from model_used display name
    model_key = None
    for k, display in ml_service.MODEL_DISPLAY_NAMES.items():
        if display == prediction.model_used or k == prediction.model_used.lower().replace(" ", "_"):
            model_key = k
            break
    if model_key is None:
        model_key = ml_service.MODEL_KEYS[0]  # fallback to random forest

    model = ml_service._models.get(model_key)
    if model is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Model not loaded")

    # Preprocess features to get the scaled numpy array
    X_instance = ml_service.preprocess_input(raw_features)
    feature_names = ml_service._feature_names or ml_service.FEATURE_COLUMNS

    # Build background for KernelExplainer models
    background = None
    if model_key in KERNEL_MODELS:
        # Use a small random background from feature space
        rng = np.random.RandomState(42)
        background = rng.randn(50, len(feature_names))

    shap_result = compute_shap_values(
        model_key=model_key,
        model=model,
        X_instance=X_instance,
        feature_names=feature_names,
        churn_probability=prediction.churn_probability,
        background=background,
    )

    if shap_result and "error" not in shap_result:
        # Cache in DB
        prediction.shap_values_json = shap_result_to_json(shap_result)
        db.commit()

    return {**(shap_result or {"error": "SHAP computation failed"}), "cached": False, "prediction_id": prediction_id}


@router.get("/waterfall/{prediction_id}")
def get_shap_waterfall(
    prediction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get waterfall-formatted SHAP data for a prediction.
    Returns cumulative running totals from base_value to final probability,
    suitable for rendering a waterfall chart.
    """
    prediction = (
        db.query(Prediction)
        .filter(Prediction.id == prediction_id, Prediction.user_id == current_user.id)
        .first()
    )
    if not prediction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prediction not found")

    shap_data = shap_result_from_json(prediction.shap_values_json) if prediction.shap_values_json else None
    if not shap_data or "error" in shap_data:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="SHAP values not computed for this prediction. View the explainability page first.")

    base_value = shap_data.get("base_value", 0)
    features = shap_data.get("feature_contributions", [])[:12]

    # Build waterfall steps: each step shows cumulative running total
    waterfall = []
    running = base_value
    waterfall.append({
        "label": "Base Value",
        "value": round(base_value, 6),
        "cumulative": round(base_value, 6),
        "delta": 0,
        "type": "base",
    })
    for f in features:
        sv = f.get("shap_value", 0)
        running += sv
        waterfall.append({
            "label": f["feature"],
            "value": round(sv, 6),
            "cumulative": round(running, 6),
            "delta": round(sv, 6),
            "type": "positive" if sv > 0 else "negative",
            "raw_value": f.get("raw_value"),
        })
    waterfall.append({
        "label": "Final Prediction",
        "value": round(running, 6),
        "cumulative": round(running, 6),
        "delta": 0,
        "type": "total",
    })

    return {
        "prediction_id": prediction_id,
        "base_value": round(base_value, 6),
        "final_value": round(running, 6),
        "steps": waterfall,
    }


@router.get("/summary")
def get_shap_summary(
    model_type: str = Query("random_forest"),
    limit: int = Query(30, ge=5, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Aggregate SHAP values across recent predictions to produce a global
    summary of feature importance. Returns mean |SHAP| per feature plus
    directional breakdown (how often each feature pushes churn up vs down).
    """
    predictions = (
        db.query(Prediction)
        .filter(
            Prediction.user_id == current_user.id,
            Prediction.shap_values_json.isnot(None),
        )
        .order_by(Prediction.created_at.desc())
        .limit(limit)
        .all()
    )

    if not predictions:
        return {
            "message": "No predictions with SHAP values found. View individual SHAP explanations first.",
            "features": [],
            "n_predictions": 0,
        }

    # Aggregate per-feature stats
    feature_stats = {}  # feature_name -> { sum_abs, sum_signed, count, pos_count, neg_count }
    for p in predictions:
        shap_data = shap_result_from_json(p.shap_values_json)
        if not shap_data or "error" in shap_data:
            continue
        for fc in shap_data.get("feature_contributions", []):
            fname = fc["feature"]
            sv = fc.get("shap_value", 0)
            if fname not in feature_stats:
                feature_stats[fname] = {"sum_abs": 0, "sum_signed": 0, "count": 0, "pos_count": 0, "neg_count": 0}
            feature_stats[fname]["sum_abs"] += abs(sv)
            feature_stats[fname]["sum_signed"] += sv
            feature_stats[fname]["count"] += 1
            if sv > 0:
                feature_stats[fname]["pos_count"] += 1
            else:
                feature_stats[fname]["neg_count"] += 1

    # Build sorted result
    summary = []
    for fname, stats in feature_stats.items():
        n = stats["count"]
        mean_abs = stats["sum_abs"] / n if n > 0 else 0
        mean_signed = stats["sum_signed"] / n if n > 0 else 0
        summary.append({
            "feature": fname,
            "mean_abs_shap": round(mean_abs, 6),
            "mean_signed_shap": round(mean_signed, 6),
            "positive_pct": round(stats["pos_count"] / n * 100, 1) if n > 0 else 0,
            "negative_pct": round(stats["neg_count"] / n * 100, 1) if n > 0 else 0,
            "n_samples": n,
        })
    summary.sort(key=lambda x: x["mean_abs_shap"], reverse=True)

    return {
        "model_type": model_type,
        "n_predictions": len(predictions),
        "features": summary,
    }


@router.post("/compute")
def compute_shap_adhoc(
    request: dict,
    current_user: User = Depends(get_current_user),
):
    """
    Compute SHAP values for ad-hoc feature input without saving to DB.
    Body: { features: {...}, model_type: "random_forest" }
    """
    features = request.get("features", {})
    model_type = request.get("model_type", "random_forest")

    if not features:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="features required")

    model = ml_service._models.get(model_type)
    if model is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Model '{model_type}' not loaded")

    X = ml_service.preprocess_input(features)
    feature_names = ml_service._feature_names or ml_service.FEATURE_COLUMNS

    background = None
    if model_type in KERNEL_MODELS:
        background = np.random.RandomState(42).randn(50, len(feature_names))

    prob = float(model.predict_proba(X)[0][1]) if hasattr(model, "predict_proba") else 0.5
    result = compute_shap_values(model_type, model, X, feature_names, prob, background)
    return result or {"error": "SHAP computation failed"}
