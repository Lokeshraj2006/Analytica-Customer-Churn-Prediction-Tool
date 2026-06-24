"""CLV (Customer Lifetime Value) computation service."""

import json
from typing import Optional
from app.config import settings


# ─────────────────────────────────────────────────────────────────────────────
# Core CLV formulas
# ─────────────────────────────────────────────────────────────────────────────

def compute_clv(
    monthly_charges: float,
    tenure: int,
    churn_probability: float,
    avg_lifetime_months: Optional[int] = None,
) -> dict:
    """
    Compute Customer Lifetime Value metrics.

    Formulas:
        remaining_months   = max(0, avg_lifetime - tenure)
        base_clv           = monthly_charges × remaining_months
        risk_adjusted_clv  = base_clv × (1 - churn_probability)
        revenue_at_risk    = monthly_charges × 12 × churn_probability

    Args:
        monthly_charges:   Customer's monthly billing amount (USD)
        tenure:            Months the customer has been with the company
        churn_probability: Model-predicted churn probability (0.0–1.0)
        avg_lifetime_months: Expected total customer lifetime (default from config)

    Returns:
        dict with base_clv, risk_adjusted_clv, revenue_at_risk, remaining_months, tier
    """
    if avg_lifetime_months is None:
        avg_lifetime_months = settings.CLV_AVG_LIFETIME_MONTHS  # default 32

    monthly_charges = max(0.0, float(monthly_charges or 0))
    tenure = max(0, int(tenure or 0))
    churn_probability = max(0.0, min(1.0, float(churn_probability or 0)))

    remaining_months = max(0, avg_lifetime_months - tenure)
    base_clv = monthly_charges * remaining_months
    risk_adjusted_clv = base_clv * (1.0 - churn_probability)
    revenue_at_risk = monthly_charges * 12 * churn_probability

    # CLV tier classification
    if risk_adjusted_clv >= 2000:
        tier = "Platinum"
        tier_color = "#a78bfa"
    elif risk_adjusted_clv >= 1000:
        tier = "Gold"
        tier_color = "#f59e0b"
    elif risk_adjusted_clv >= 400:
        tier = "Silver"
        tier_color = "#94a3b8"
    else:
        tier = "Bronze"
        tier_color = "#92400e"

    return {
        "base_clv": round(base_clv, 2),
        "risk_adjusted_clv": round(risk_adjusted_clv, 2),
        "revenue_at_risk": round(revenue_at_risk, 2),
        "remaining_months": remaining_months,
        "monthly_charges": round(monthly_charges, 2),
        "churn_probability": round(churn_probability, 4),
        "tier": tier,
        "tier_color": tier_color,
        "avg_lifetime_months": avg_lifetime_months,
    }


def compute_clv_from_prediction(prediction) -> dict:
    """Compute CLV directly from a Prediction ORM object."""
    return compute_clv(
        monthly_charges=prediction.monthly_charges or 0.0,
        tenure=prediction.tenure or 0,
        churn_probability=prediction.churn_probability or 0.0,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Portfolio-level CLV aggregation
# ─────────────────────────────────────────────────────────────────────────────

def compute_clv_summary(predictions: list) -> dict:
    """
    Aggregate CLV metrics across a list of Prediction ORM objects.

    Returns executive KPIs:
        avg_clv, total_revenue_at_risk, high_value_count, high_value_threshold
    """
    if not predictions:
        return {
            "avg_clv": 0.0,
            "avg_risk_adjusted_clv": 0.0,
            "total_revenue_at_risk": 0.0,
            "high_value_count": 0,
            "high_value_threshold": 0.0,
            "top_churners": [],
            "clv_distribution": [],
        }

    clv_records = []
    for p in predictions:
        clv = compute_clv_from_prediction(p)
        clv_records.append({
            "prediction_id": p.id,
            "monthly_charges": p.monthly_charges or 0.0,
            "tenure": p.tenure or 0,
            "contract": p.contract or "Unknown",
            "risk_level": p.risk_level or "Low",
            "churn_prediction": p.churn_prediction,
            **clv,
        })

    # Sort by risk_adjusted_clv descending
    clv_records.sort(key=lambda x: x["risk_adjusted_clv"], reverse=True)

    all_clv = [r["risk_adjusted_clv"] for r in clv_records]
    avg_clv = sum(r["base_clv"] for r in clv_records) / len(clv_records)
    avg_risk_clv = sum(all_clv) / len(all_clv)
    total_rar = sum(r["revenue_at_risk"] for r in clv_records)

    # High value = top 20% by risk-adjusted CLV
    high_value_threshold = sorted(all_clv, reverse=True)[int(len(all_clv) * 0.2)] if all_clv else 0
    high_value_count = sum(1 for v in all_clv if v >= high_value_threshold)

    # Top 10 high-value churners (predicted to churn)
    churners = [r for r in clv_records if r["churn_prediction"] == 1]
    top_churners = churners[:10]

    # CLV tier distribution
    tiers = {}
    for r in clv_records:
        tiers[r["tier"]] = tiers.get(r["tier"], 0) + 1
    tier_dist = [{"tier": t, "count": c} for t, c in tiers.items()]

    return {
        "avg_clv": round(avg_clv, 2),
        "avg_risk_adjusted_clv": round(avg_risk_clv, 2),
        "total_revenue_at_risk": round(total_rar, 2),
        "high_value_count": high_value_count,
        "high_value_threshold": round(high_value_threshold, 2),
        "top_churners": top_churners,
        "clv_distribution": tier_dist,
        "all_customers": clv_records,
    }
