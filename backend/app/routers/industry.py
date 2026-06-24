"""Multi-Industry Churn Prediction Router — /api/industry/*"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Any, Dict, Optional
from app.services.industry_service import (
    predict_industry_churn,
    get_benchmark_data,
    get_industry_schemas,
    get_industry_templates,
    INDUSTRY_SCHEMAS,
)
from app.utils.security import get_current_user
from app.models.user import User

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
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
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
