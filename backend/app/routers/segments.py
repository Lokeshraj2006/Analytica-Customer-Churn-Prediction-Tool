"""Customer Segmentation API routes."""

import json
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, Prediction, SegmentRun
from app.services.segment_service import run_segmentation
from app.utils.security import get_current_user
from datetime import datetime, timezone
from typing import Optional

router = APIRouter(prefix="/api/segments", tags=["Customer Segmentation"])


@router.post("/run")
def run_customer_segmentation(
    n_clusters: int = Query(4, ge=2, le=8, description="Number of segments"),
    industry: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Run K-Means segmentation on the current user's prediction history.
    Returns segment summaries and per-prediction assignments.
    """
    query = db.query(Prediction).filter(Prediction.user_id == current_user.id)
    if industry and isinstance(industry, str):
        query = query.filter(Prediction.industry == industry.lower())
    predictions = query.all()

    if len(predictions) < 2:
        raise HTTPException(
            status_code=400,
            detail=f"At least 2 predictions required for segmentation in {industry or 'overall'} industry. You have {len(predictions)}."
        )

    result = run_segmentation(predictions, n_clusters=n_clusters)

    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])

    # Store industry in the results dict so we can retrieve it per industry vertical
    result["industry"] = industry.lower() if (industry and isinstance(industry, str)) else None

    # Save run to DB
    run = SegmentRun(
        user_id=current_user.id,
        n_clusters=n_clusters,
        results_json=json.dumps(result),
    )
    db.add(run)

    # Update segment_label on each prediction
    label_map = {a["prediction_id"]: a["segment_label"] for a in result.get("assignments", [])}
    for p in predictions:
        if p.id in label_map:
            p.segment_label = label_map[p.id]

    db.commit()
    return {**result, "run_id": run.id}


@router.get("/summary")
def get_segment_summary(
    industry: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the latest segmentation run summary for the current user and industry."""
    runs = (
        db.query(SegmentRun)
        .filter(SegmentRun.user_id == current_user.id)
        .order_by(SegmentRun.created_at.desc())
        .all()
    )
    
    target_ind = industry.lower() if (industry and isinstance(industry, str)) else None
    for run in runs:
        if not run.results_json:
            continue
        try:
            data = json.loads(run.results_json)
            if data.get("industry") == target_ind:
                return data
        except Exception:
            continue

    return {"message": f"No segmentation run found for {industry or 'overall'} industry. Run segmentations to see metrics.", "segments": []}


@router.get("/customers")
def get_segmented_customers(
    segment_label: str = Query(None, description="Filter by segment label"),
    industry: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get predictions grouped by their assigned segment and industry."""
    query = db.query(Prediction).filter(Prediction.user_id == current_user.id)
    if segment_label:
        query = query.filter(Prediction.segment_label == segment_label)
    if industry and isinstance(industry, str):
        query = query.filter(Prediction.industry == industry.lower())
    predictions = query.order_by(Prediction.churn_probability.desc()).all()

    return [
        {
            "prediction_id": p.id,
            "segment_label": p.segment_label or "Unassigned",
            "tenure": p.tenure,
            "contract": p.contract,
            "monthly_charges": p.monthly_charges,
            "churn_probability": p.churn_probability,
            "risk_level": p.risk_level,
            "churn_prediction": p.churn_prediction,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in predictions
    ]


@router.get("/history")
def get_segment_run_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all past segmentation runs."""
    runs = (
        db.query(SegmentRun)
        .filter(SegmentRun.user_id == current_user.id)
        .order_by(SegmentRun.created_at.desc())
        .limit(10)
        .all()
    )
    return [
        {
            "run_id": r.id,
            "n_clusters": r.n_clusters,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in runs
    ]
