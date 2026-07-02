"""Multi-Industry Churn Prediction Router — /api/industry/*"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Any, Dict, Optional
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.industry_service import (
    predict_industry_churn,
    get_benchmark_data,
    get_industry_schemas,
    get_industry_templates,
    INDUSTRY_SCHEMAS,
)
from app.services import ml_service as _ml_service
from app.services.shap_service import compute_shap_values, shap_result_to_json, KERNEL_MODELS
from app.utils.security import get_current_user
from app.models.user import User, Prediction
import json
import numpy as np

router = APIRouter(prefix="/api/industry", tags=["Industry"])


# ── Request/Response Models ───────────────────────────────────────────────────

class IndustryPredictRequest(BaseModel):
    industry: str
    features: Dict[str, Any]
    model_type: Optional[str] = "random_forest"


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/predict")
def industry_predict(
    req: IndustryPredictRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Predict churn for a given industry with the provided feature set."""
    if req.industry.lower() not in INDUSTRY_SCHEMAS:
        raise HTTPException(status_code=400, detail=f"Unknown industry: {req.industry}")
    try:
        result = predict_industry_churn(
            features=req.features,
            industry=req.industry,
            model_type=req.model_type or "random_forest",
        )
        
        # Save prediction to database
        prediction_record = Prediction(
            user_id=current_user.id,
            industry=req.industry.lower(),
            churn_prediction=result["churn_prediction"],
            churn_probability=result["churn_probability"],
            risk_level=result["risk_level"],
            model_used=result["model_used"],
            confidence=round(max(result["churn_probability"], 1 - result["churn_probability"]), 4),
            input_features_json=json.dumps(req.features),
            top_features_json=json.dumps(result.get("contributing_factors", [])),
        )

        # Populate individual fields if present for backward compatibility and other views
        if "tenure" in req.features:
            prediction_record.tenure = int(req.features["tenure"])
        elif "tenure_months" in req.features:
            prediction_record.tenure = int(req.features["tenure_months"])

        if "monthly_charges" in req.features:
            prediction_record.monthly_charges = float(req.features["monthly_charges"])
        elif "avg_order_value" in req.features:
            prediction_record.monthly_charges = float(req.features["avg_order_value"])

        if "contract" in req.features:
            prediction_record.contract = str(req.features["contract"])
        elif "subscription_type" in req.features:
            prediction_record.contract = str(req.features["subscription_type"])
        elif "insurance_type" in req.features:
            prediction_record.contract = str(req.features["insurance_type"])

        # Populate telecom specific columns
        if req.industry.lower() == "telecom":
            for field in ["gender", "senior_citizen", "partner", "dependents", "phone_service", 
                         "multiple_lines", "internet_service", "online_security", "online_backup", 
                         "device_protection", "tech_support", "streaming_tv", "streaming_movies", 
                         "paperless_billing", "payment_method", "total_charges"]:
                if field in req.features:
                    setattr(prediction_record, field, req.features[field])

        db.add(prediction_record)
        db.commit()
        db.refresh(prediction_record)

        # Auto-compute SHAP values so Global Summary always has data
        try:
            model_key = None
            for k, display in _ml_service.MODEL_DISPLAY_NAMES.items():
                if display == result["model_used"] or k == result["model_used"].lower().replace(" ", "_"):
                    model_key = k
                    break
            if model_key is None:
                model_key = _ml_service.MODEL_KEYS[0]
            model = _ml_service._models.get(model_key)
            if model:
                X_instance = _ml_service.preprocess_input(req.features)
                feature_names = _ml_service._feature_names or _ml_service.FEATURE_COLUMNS
                background = None
                if model_key in KERNEL_MODELS:
                    background = np.random.RandomState(42).randn(50, len(feature_names))
                shap_result = compute_shap_values(
                    model_key=model_key, model=model, X_instance=X_instance,
                    feature_names=feature_names, churn_probability=result["churn_probability"],
                    background=background,
                )
                if shap_result and "error" not in shap_result:
                    prediction_record.shap_values_json = shap_result_to_json(shap_result)
                    db.commit()
        except Exception:
            pass  # SHAP is best-effort; never block the prediction response

        result["id"] = prediction_record.id
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


@router.get("/schemas")
def get_schemas(current_user: User = Depends(get_current_user)):
    """Return field schemas for all industries."""
    return get_industry_schemas()


@router.get("/schema/{industry}")
def get_schema(industry: str, current_user: User = Depends(get_current_user)):
    """Return field schema for a specific industry."""
    schema = INDUSTRY_SCHEMAS.get(industry.lower())
    if not schema:
        raise HTTPException(status_code=404, detail=f"Unknown industry: {industry}")
    return {
        "label": schema["label"],
        "icon": schema["icon"],
        "color": schema["color"],
        "description": schema["description"],
        "avg_churn_rate": schema["avg_churn_rate"],
        "typical_risk_factors": schema["typical_risk_factors"],
        "sections": schema["sections"],
    }


@router.get("/templates/{industry}")
def get_templates(industry: str, current_user: User = Depends(get_current_user)):
    """Return pre-built sample templates (high/medium/low risk) for an industry."""
    templates = get_industry_templates(industry)
    if not templates:
        raise HTTPException(status_code=404, detail=f"No templates for industry: {industry}")
    return templates


@router.get("/benchmark")
def get_benchmark(current_user: User = Depends(get_current_user)):
    """Return cross-industry churn benchmark data."""
    return {"benchmark": get_benchmark_data()}


@router.get("/industries")
def list_industries(current_user: User = Depends(get_current_user)):
    """Return a list of all supported industries."""
    return [
        {
            "key": k,
            "label": v["label"],
            "icon": v["icon"],
            "color": v["color"],
            "description": v["description"],
            "avg_churn_rate": v["avg_churn_rate"],
        }
        for k, v in INDUSTRY_SCHEMAS.items()
    ]
