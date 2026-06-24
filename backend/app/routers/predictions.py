"""Prediction API routes."""

import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, Prediction
from app.schemas.prediction import (
    PredictionRequest, PredictionResponse, PredictionHistory,
    PredictionDetail, DashboardStats, FeatureImportance, ContributingFactor
)
from app.services.ml_service import predict_churn, get_feature_importance, get_model_accuracy
from app.utils.security import get_current_user
from typing import List, Optional

router = APIRouter(prefix="/api/predict", tags=["Predictions"])


@router.post("/", response_model=PredictionResponse)
def make_prediction(
    request: PredictionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Make a churn prediction for a customer."""
    try:
        # Get prediction from ML model
        features = request.model_dump(exclude={"model_type"})
        result = predict_churn(features, request.model_type)

        # Build contributing factors with values
        # Lookup for per-feature churn direction:
        # "increases": higher value of this feature increases churn
        # "decreases": higher value of this feature decreases churn
        CHURN_DIRECTION = {
            "tenure": "decreases",
            "contract": "decreases",
            "online_security": "decreases",
            "tech_support": "decreases",
            "online_backup": "decreases",
            "device_protection": "decreases",
            "dependents": "decreases",
            "partner": "decreases",
            "monthly_charges": "increases",
            "total_charges": "increases",
            "senior_citizen": "increases",
            "paperless_billing": "increases",
            "internet_service": "increases",
            "payment_method": "increases",
            "streaming_tv": "increases",
            "streaming_movies": "increases",
            "multiple_lines": "increases",
            "phone_service": "increases",
        }
        contributing_factors = []
        for factor in result["contributing_factors"]:
            feature_name = factor["feature"]
            # Map model feature name back to input feature value
            feature_value = features.get(feature_name.lower(), features.get(feature_name))
            feature_key = feature_name.lower()
            if feature_key in CHURN_DIRECTION:
                direction = "increases_churn" if CHURN_DIRECTION[feature_key] == "increases" else "decreases_churn"
            else:
                # Fallback: use overall churn probability
                direction = "increases_churn" if result["churn_probability"] >= 0.5 else "decreases_churn"
            contributing_factors.append(ContributingFactor(
                feature=feature_name,
                importance=factor["importance"],
                value=feature_value,
                direction=direction
            ))

        # Save prediction to database
        prediction = Prediction(
            user_id=current_user.id,
            gender=request.gender,
            senior_citizen=request.senior_citizen,
            partner=request.partner,
            dependents=request.dependents,
            tenure=request.tenure,
            phone_service=request.phone_service,
            multiple_lines=request.multiple_lines,
            internet_service=request.internet_service,
            online_security=request.online_security,
            online_backup=request.online_backup,
            device_protection=request.device_protection,
            tech_support=request.tech_support,
            streaming_tv=request.streaming_tv,
            streaming_movies=request.streaming_movies,
            contract=request.contract,
            paperless_billing=request.paperless_billing,
            payment_method=request.payment_method,
            monthly_charges=request.monthly_charges,
            total_charges=request.total_charges,
            churn_prediction=result["churn_prediction"],
            churn_probability=result["churn_probability"],
            risk_level=result["risk_level"],
            model_used=result["model_used"],
            confidence=round(max(result["churn_probability"], 1 - result["churn_probability"]), 4),
            input_features_json=json.dumps(features),
            top_features_json=json.dumps([f.model_dump() for f in contributing_factors]),
        )
        db.add(prediction)
        db.commit()
        db.refresh(prediction)

        return PredictionResponse(
            id=prediction.id,
            churn_prediction=result["churn_prediction"],
            churn_probability=result["churn_probability"],
            risk_level=result["risk_level"],
            model_used=result["model_used"],
            contributing_factors=contributing_factors,
            confidence=prediction.confidence,
            predicted_at=prediction.created_at,
            created_at=prediction.created_at
        )
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/history", response_model=List[PredictionHistory])
def get_prediction_history(
    skip: int = 0,
    limit: int = 50,
    risk_level: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get the current user's prediction history."""
    query = db.query(Prediction).filter(Prediction.user_id == current_user.id)

    if risk_level and risk_level in ("Low", "Medium", "High"):
        query = query.filter(Prediction.risk_level == risk_level)

    predictions = (
        query
        .order_by(Prediction.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return predictions


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get dashboard statistics for the current user."""
    predictions = db.query(Prediction).filter(Prediction.user_id == current_user.id).all()

    total = len(predictions)
    churn_count = sum(1 for p in predictions if p.churn_prediction == 1)
    no_churn = total - churn_count
    churn_rate = (churn_count / total * 100) if total > 0 else 0
    avg_prob = (sum(p.churn_probability for p in predictions) / total) if total > 0 else 0

    high_risk = sum(1 for p in predictions if p.risk_level == "High")
    medium_risk = sum(1 for p in predictions if p.risk_level == "Medium")
    low_risk = sum(1 for p in predictions if p.risk_level == "Low")

    # Revenue at risk from churning customers
    revenue_at_risk = sum(
        p.monthly_charges * 12 for p in predictions
        if p.churn_prediction == 1 and p.monthly_charges
    )

    return DashboardStats(
        total_predictions=total,
        churn_count=churn_count,
        no_churn_count=no_churn,
        churn_rate=round(churn_rate, 1),
        avg_probability=round(avg_prob, 4),
        high_risk_count=high_risk,
        medium_risk_count=medium_risk,
        low_risk_count=low_risk,
        model_accuracy=round(get_model_accuracy("random_forest") * 100, 1),
        total_customers=total,
        revenue_at_risk=round(revenue_at_risk, 2)
    )


@router.get("/feature-importance", response_model=List[FeatureImportance])
def get_feature_importance_data(model_type: str = "random_forest"):
    """Get feature importance rankings from the model."""
    importances = get_feature_importance(model_type)
    if not importances:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Model not loaded"
        )
    return importances


@router.get("/{prediction_id}", response_model=PredictionDetail)
def get_prediction(
    prediction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a single prediction by ID."""
    prediction = (
        db.query(Prediction)
        .filter(Prediction.id == prediction_id, Prediction.user_id == current_user.id)
        .first()
    )
    if not prediction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prediction not found"
        )
    return prediction


@router.delete("/{prediction_id}")
def delete_prediction(
    prediction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a prediction by ID (owner only)."""
    prediction = (
        db.query(Prediction)
        .filter(Prediction.id == prediction_id, Prediction.user_id == current_user.id)
        .first()
    )
    if not prediction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prediction not found"
        )
    db.delete(prediction)
    db.commit()
    return {"message": "Prediction deleted successfully"}
