"""CLV (Customer Lifetime Value) API routes."""

from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, Prediction
from app.services.clv_service import compute_clv_from_prediction, compute_clv_summary
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/clv", tags=["Customer Lifetime Value"])


@router.get("/summary")
def get_clv_summary(
    industry: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get aggregate CLV metrics across all predictions for the current user."""
    query = db.query(Prediction).filter(Prediction.user_id == current_user.id)
    if industry and isinstance(industry, str):
        query = query.filter(Prediction.industry == industry.lower())
    predictions = query.all()
    return compute_clv_summary(predictions)


@router.get("/customers")
def get_clv_customers(
    limit: int = Query(50, ge=1, le=200),
    sort_by: str = Query("risk_adjusted_clv", enum=["risk_adjusted_clv", "revenue_at_risk", "base_clv"]),
    only_churners: bool = Query(False),
    industry: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get per-prediction CLV data sorted by chosen metric."""
    query = db.query(Prediction).filter(Prediction.user_id == current_user.id)
    if industry and isinstance(industry, str):
        query = query.filter(Prediction.industry == industry.lower())
    predictions = query.all()
    if not predictions:
        return []

    records = []
    for p in predictions:
        if only_churners and p.churn_prediction != 1:
            continue
        clv = compute_clv_from_prediction(p)
        records.append({
            "prediction_id": p.id,
            "tenure": p.tenure,
            "contract": p.contract,
            "monthly_charges": p.monthly_charges,
            "risk_level": p.risk_level,
            "churn_prediction": p.churn_prediction,
            "churn_probability": p.churn_probability,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            **clv,
        })

    records.sort(key=lambda x: x.get(sort_by, 0), reverse=True)
    return records[:limit]


@router.get("/{prediction_id}")
def get_clv_for_prediction(
    prediction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get CLV breakdown for a specific prediction."""
    from fastapi import HTTPException, status
    prediction = (
        db.query(Prediction)
        .filter(Prediction.id == prediction_id, Prediction.user_id == current_user.id)
        .first()
    )
    if not prediction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prediction not found")
    return {
        "prediction_id": prediction_id,
        "tenure": prediction.tenure,
        "contract": prediction.contract,
        "monthly_charges": prediction.monthly_charges,
        **compute_clv_from_prediction(prediction),
    }
