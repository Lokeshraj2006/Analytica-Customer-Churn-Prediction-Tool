"""EDA (Exploratory Data Analysis) API router — V1.0 with data quality endpoint."""

from fastapi import APIRouter, HTTPException, status, Depends
from app.services.ml_service import (
    get_eda_stats,
    get_all_model_accuracies,
    get_feature_importance,
    get_all_feature_importances,
    get_available_models,
    MODEL_KEYS,
    MODEL_DISPLAY_NAMES,
)
from app.utils.security import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/eda", tags=["EDA"])


@router.get("/dataset-info")
def dataset_info(current_user: User = Depends(get_current_user)):
    """Return dataset metadata: source, size, churn rate."""
    stats = get_eda_stats()
    if not stats:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="EDA stats not available. Run training first."
        )
    return {
        "dataset_source": stats.get("dataset_source", "unknown"),
        "total_records": stats.get("total_records", 0),
        "churn_rate": stats.get("churn_rate", 0.0),
        "churn_distribution": stats.get("churn_distribution", {}),
        "available_models": get_available_models(),
        "total_models": len(get_available_models()),
    }


@router.get("/correlation")
def correlation_matrix(current_user: User = Depends(get_current_user)):
    """Return full 19-feature correlation matrix data for heatmap rendering."""
    stats = get_eda_stats()
    if not stats or "correlation_matrix" not in stats:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Correlation data not available. Run training first."
        )
    return {
        "columns": stats["correlation_matrix"]["columns"],
        "data": stats["correlation_matrix"]["data"],
        "churn_correlations": stats.get("churn_correlations", []),
    }


@router.get("/churn-distribution")
def churn_distribution(current_user: User = Depends(get_current_user)):
    """Return churn vs. non-churn counts and rates by key features."""
    stats = get_eda_stats()
    if not stats:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="EDA stats not available.")
    return {
        "overall": stats.get("churn_distribution", {}),
        "by_contract": stats.get("contract_churn", []),
        "by_internet": stats.get("internet_churn", []),
        "by_payment": stats.get("payment_churn", []),
        "by_tenure": stats.get("tenure_distribution", []),
        "by_charges": stats.get("charges_distribution", []),
        "by_senior": stats.get("senior_churn", []),
    }


@router.get("/model-comparison")
def model_comparison(current_user: User = Depends(get_current_user)):
    """Return all model accuracies, F1 scores, and ROC-AUC for comparison."""
    comparison = get_all_model_accuracies()
    if not comparison:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Model data not available. Run training first.")
    return {
        "models": comparison,
        "total_trained": len([m for m in comparison if m["available"]]),
        "best_model": comparison[0] if comparison else None,
    }


@router.get("/feature-importance")
def all_feature_importances(current_user: User = Depends(get_current_user)):
    """Return feature importances for all trained models."""
    importances = get_all_feature_importances()
    if not importances:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Feature importance data not available.")
    return importances


@router.get("/feature-importance/{model_type}")
def single_model_feature_importance(model_type: str, current_user: User = Depends(get_current_user)):
    """Return feature importances for a specific model."""
    if model_type not in MODEL_KEYS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown model type '{model_type}'. Valid: {MODEL_KEYS}")
    result = get_feature_importance(model_type)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Model '{model_type}' not trained or no importances available.")
    return {"model": model_type, "display_name": MODEL_DISPLAY_NAMES.get(model_type), "importances": result}


@router.get("/data-quality")
def data_quality(current_user: User = Depends(get_current_user)):
    """
    Return data quality metrics for the training dataset.
    Covers missing values, duplicates, outliers, class distribution, and feature statistics.
    """
    import os
    import pandas as pd
    import numpy as np

    ML_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ml")
    data_path = os.path.join(ML_DIR, "data", "WA_Fn-UseC_-Telco-Customer-Churn.csv")
    syn_path = os.path.join(ML_DIR, "data", "telco_churn_synthetic.csv")

    if os.path.exists(data_path):
        df = pd.read_csv(data_path)
        df.columns = [c.strip() for c in df.columns]
        source = "real"
    elif os.path.exists(syn_path):
        df = pd.read_csv(syn_path)
        source = "synthetic"
    else:
        raise HTTPException(status_code=503, detail="Dataset not found. Run model training first.")

    total_rows = len(df)
    total_cols = len(df.columns)

    # Missing values
    missing = []
    for col in df.columns:
        n_missing = int(df[col].isna().sum())
        missing.append({
            "column": col,
            "missing_count": n_missing,
            "missing_pct": round(n_missing / total_rows * 100, 2),
            "dtype": str(df[col].dtype),
        })
    missing.sort(key=lambda x: x["missing_count"], reverse=True)

    # Duplicates
    n_duplicates = int(df.duplicated().sum())

    # Outliers (IQR method)
    outliers = []
    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    for col in num_cols:
        q1 = df[col].quantile(0.25)
        q3 = df[col].quantile(0.75)
        iqr = q3 - q1
        lower = q1 - 1.5 * iqr
        upper = q3 + 1.5 * iqr
        n_out = int(((df[col] < lower) | (df[col] > upper)).sum())
        outliers.append({
            "column": col,
            "outlier_count": n_out,
            "outlier_pct": round(n_out / total_rows * 100, 2),
            "q1": round(float(q1), 3),
            "q3": round(float(q3), 3),
            "iqr": round(float(iqr), 3),
            "lower_fence": round(float(lower), 3),
            "upper_fence": round(float(upper), 3),
        })

    # Class distribution
    churn_col = "Churn" if "Churn" in df.columns else None
    class_dist = {}
    if churn_col:
        churn_series = df[churn_col]
        if churn_series.dtype == object:
            churn_series = (churn_series.str.strip() == "Yes").astype(int)
        counts = churn_series.value_counts().to_dict()
        n_churn = int(counts.get(1, 0))
        n_no_churn = int(counts.get(0, 0))
        class_dist = {
            "churned": n_churn,
            "not_churned": n_no_churn,
            "churn_rate_pct": round(n_churn / total_rows * 100, 1),
            "imbalance_ratio": round(n_no_churn / n_churn, 2) if n_churn > 0 else None,
            "is_imbalanced": n_churn / total_rows < 0.3 if total_rows > 0 else False,
        }

    # Feature statistics
    feature_stats = []
    for col in num_cols:
        feature_stats.append({
            "column": col,
            "mean": round(float(df[col].mean()), 3),
            "std": round(float(df[col].std()), 3),
            "min": round(float(df[col].min()), 3),
            "max": round(float(df[col].max()), 3),
            "median": round(float(df[col].median()), 3),
        })

    # Quality score
    total_missing = sum(m["missing_count"] for m in missing)
    total_cells = total_rows * total_cols
    completeness = round((1 - total_missing / total_cells) * 100, 1) if total_cells > 0 else 100
    quality_score = min(100.0, round(completeness * 0.5 + (1 - n_duplicates / total_rows) * 30 + 20, 1))

    return {
        "source": source,
        "total_rows": total_rows,
        "total_columns": total_cols,
        "quality_score": quality_score,
        "completeness_pct": completeness,
        "n_duplicates": n_duplicates,
        "duplicate_pct": round(n_duplicates / total_rows * 100, 2),
        "missing_values": missing,
        "outliers": outliers,
        "class_distribution": class_dist,
        "feature_statistics": feature_stats,
    }
