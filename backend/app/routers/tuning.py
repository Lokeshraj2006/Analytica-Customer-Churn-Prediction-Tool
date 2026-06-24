"""Hyperparameter Tuning API routes."""

import json
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db, SessionLocal
from app.models.user import User, TuningJob
from app.services.tuning_service import start_tuning_job, TUNABLE_MODELS, PARAM_GRIDS
from app.utils.security import get_current_user
from datetime import datetime, timezone

router = APIRouter(prefix="/api/tuning", tags=["Hyperparameter Tuning"])


class TuningRequest(BaseModel):
    model_key: str = Field(..., description=f"One of: {TUNABLE_MODELS}")
    search_method: str = Field("random", pattern="^(grid|random)$", description="'grid' or 'random'")
    cv_folds: int = Field(3, ge=2, le=10, description="Number of cross-validation folds")


@router.post("/start", status_code=status.HTTP_202_ACCEPTED)
def start_tuning(
    request: TuningRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Start a hyperparameter tuning job (runs in background thread).
    Returns job_id to poll for progress.
    """
    if request.model_key not in TUNABLE_MODELS:
        raise HTTPException(
            status_code=400,
            detail=f"Model '{request.model_key}' is not tunable. Tunable models: {TUNABLE_MODELS}"
        )

    # Check for already-running job for this model
    running = (
        db.query(TuningJob)
        .filter(
            TuningJob.user_id == current_user.id,
            TuningJob.model_key == request.model_key,
            TuningJob.status == "running",
        )
        .first()
    )
    if running:
        raise HTTPException(
            status_code=409,
            detail=f"A tuning job for '{request.model_key}' is already running (job #{running.id}). Wait for it to complete."
        )

    # Create DB record
    job = TuningJob(
        user_id=current_user.id,
        model_key=request.model_key,
        search_method=request.search_method,
        cv_folds=request.cv_folds,
        status="pending",
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Launch background thread
    start_tuning_job(
        job_id=job.id,
        model_key=request.model_key,
        search_method=request.search_method,
        cv_folds=request.cv_folds,
        db_session_factory=SessionLocal,
    )

    return {
        "message": f"Tuning job started for '{request.model_key}' using {request.search_method} search",
        "job_id": job.id,
        "status": "pending",
        "estimated_time": "3-15 minutes depending on model and search method",
    }


@router.get("/status/{job_id}")
def get_job_status(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Poll the status and progress of a tuning job."""
    job = db.query(TuningJob).filter(TuningJob.id == job_id, TuningJob.user_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Tuning job not found")

    result = {
        "job_id": job.id,
        "model_key": job.model_key,
        "search_method": job.search_method,
        "cv_folds": job.cv_folds,
        "status": job.status,
        "progress": round(job.progress * 100, 0),
        "started_at": job.started_at.isoformat() if job.started_at else None,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        "error_message": job.error_message,
    }

    if job.status == "completed":
        result["baseline"] = {
            "accuracy": job.baseline_accuracy,
            "f1": job.baseline_f1,
            "roc_auc": job.baseline_roc_auc,
            "precision": job.baseline_precision,
            "recall": job.baseline_recall,
        }
        result["best"] = {
            "accuracy": job.best_accuracy,
            "f1": job.best_f1,
            "roc_auc": job.best_roc_auc,
            "precision": job.best_precision,
            "recall": job.best_recall,
            "params": json.loads(job.best_params_json) if job.best_params_json else {},
        }
        result["improvement"] = {
            "accuracy": round((job.best_accuracy or 0) - (job.baseline_accuracy or 0), 4),
            "f1": round((job.best_f1 or 0) - (job.baseline_f1 or 0), 4),
            "roc_auc": round((job.best_roc_auc or 0) - (job.baseline_roc_auc or 0), 4),
            "precision": round((job.best_precision or 0) - (job.baseline_precision or 0), 4),
            "recall": round((job.best_recall or 0) - (job.baseline_recall or 0), 4),
        }
        result["top_results"] = json.loads(job.results_json) if job.results_json else []

    return result


@router.get("/results")
def get_all_tuning_results(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all completed tuning jobs with comparison data."""
    jobs = (
        db.query(TuningJob)
        .filter(TuningJob.user_id == current_user.id)
        .order_by(TuningJob.created_at.desc())
        .limit(20)
        .all()
    )
    return [
        {
            "job_id": j.id,
            "model_key": j.model_key,
            "search_method": j.search_method,
            "status": j.status,
            "progress": round(j.progress * 100, 0),
            "baseline_accuracy": j.baseline_accuracy,
            "best_accuracy": j.best_accuracy,
            "improvement": round((j.best_accuracy or 0) - (j.baseline_accuracy or 0), 4) if j.status == "completed" else None,
            "created_at": j.created_at.isoformat() if j.created_at else None,
            "completed_at": j.completed_at.isoformat() if j.completed_at else None,
        }
        for j in jobs
    ]


@router.get("/param-spaces")
def get_param_spaces(current_user: User = Depends(get_current_user)):
    """Return the hyperparameter search spaces for each tunable model."""
    return {
        "tunable_models": TUNABLE_MODELS,
        "param_grids": PARAM_GRIDS,
    }
