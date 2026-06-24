"""What-If Simulator API routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, Prediction
from app.services.simulator_service import compare_scenarios, batch_scenarios, get_preset_scenarios
from app.utils.security import get_current_user
import json

router = APIRouter(prefix="/api/simulator", tags=["What-If Simulator"])


class SimulatorCompareRequest(BaseModel):
    base_prediction_id: Optional[int] = None
    base_features: Optional[dict] = None
    modifications: dict
    model_type: str = "random_forest"


class SimulatorBatchRequest(BaseModel):
    base_prediction_id: Optional[int] = None
    base_features: Optional[dict] = None
    scenarios: list[dict]
    model_type: str = "random_forest"


def _resolve_features(
    base_prediction_id: Optional[int],
    base_features: Optional[dict],
    model_type: str,
    db: Session,
    current_user: User,
) -> tuple[dict, str]:
    """Resolve base features from either a prediction ID or a direct features dict."""
    if base_prediction_id:
        prediction = (
            db.query(Prediction)
            .filter(Prediction.id == base_prediction_id, Prediction.user_id == current_user.id)
            .first()
        )
        if not prediction:
            raise HTTPException(status_code=404, detail="Prediction not found")
        if not prediction.input_features_json:
            raise HTTPException(status_code=422, detail="Input features not stored for this prediction")
        features = json.loads(prediction.input_features_json)
        model_type = model_type or prediction.model_used.lower().replace(" ", "_")
        return features, model_type
    elif base_features:
        return base_features, model_type
    else:
        raise HTTPException(status_code=400, detail="Either base_prediction_id or base_features must be provided")


@router.post("/compare")
def compare_what_if(
    request: SimulatorCompareRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Compare original vs modified customer features.
    Returns original prediction, modified prediction, and delta analysis.
    """
    features, model_type = _resolve_features(
        request.base_prediction_id, request.base_features,
        request.model_type, db, current_user
    )
    try:
        return compare_scenarios(features, request.modifications, model_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch")
def batch_what_if(
    request: SimulatorBatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Run multiple what-if scenarios against the same base customer.
    Body: { base_prediction_id OR base_features, scenarios: [{name, modifications}] }
    """
    features, model_type = _resolve_features(
        request.base_prediction_id, request.base_features,
        request.model_type, db, current_user
    )
    try:
        return batch_scenarios(features, request.scenarios, model_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/presets/{prediction_id}")
def get_presets(
    prediction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return smart preset retention scenarios for a given prediction."""
    prediction = (
        db.query(Prediction)
        .filter(Prediction.id == prediction_id, Prediction.user_id == current_user.id)
        .first()
    )
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found")
    if not prediction.input_features_json:
        raise HTTPException(status_code=422, detail="Input features not available")
    features = json.loads(prediction.input_features_json)
    return get_preset_scenarios(features)
