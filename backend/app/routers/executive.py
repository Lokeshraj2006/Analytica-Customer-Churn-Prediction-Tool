"""Executive Insights Dashboard API routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, Prediction
from app.services.clv_service import compute_clv_summary
from app.utils.security import get_current_user
import asyncio

router = APIRouter(prefix="/api/executive", tags=["Executive Insights"])


# ─────────────────────────────────────────────────────────────────────────────
# Rule-based insights engine
# ─────────────────────────────────────────────────────────────────────────────

def _generate_rule_insights(stats: dict) -> list[dict]:
    """Generate business insights from stats without calling the AI API."""
    insights = []
    cr = stats.get("churn_rate", 0)
    rar = stats.get("total_revenue_at_risk", 0)
    total = stats.get("total_predictions", 0)
    high_risk = stats.get("high_risk_count", 0)
    avg_clv = stats.get("avg_risk_adjusted_clv", 0)
    high_val = stats.get("high_value_count", 0)

    if cr > 35:
        insights.append({"type": "danger", "icon": "🚨", "title": "Critical Churn Rate", "text": f"Churn rate of {cr:.1f}% exceeds the 35% danger threshold. Immediate retention campaigns required."})
    elif cr > 25:
        insights.append({"type": "warning", "icon": "⚠️", "title": "High Churn Rate", "text": f"Churn rate of {cr:.1f}% is above the 25% industry warning level. Review contract mix and service quality."})
    else:
        insights.append({"type": "success", "icon": "✅", "title": "Churn Under Control", "text": f"Churn rate of {cr:.1f}% is within healthy range. Maintain proactive engagement programs."})

    if rar > 100_000:
        insights.append({"type": "danger", "icon": "💸", "title": "High Revenue at Risk", "text": f"${rar:,.0f} annual revenue at risk from potential churners. Prioritize high-CLV customer retention."})
    elif rar > 10_000:
        insights.append({"type": "warning", "icon": "💰", "title": "Revenue at Risk", "text": f"${rar:,.0f} in annual revenue is at risk. Focus retention budget on top churning segments."})

    if high_risk > 0 and total > 0:
        hr_pct = high_risk / total * 100
        insights.append({"type": "info", "icon": "🎯", "title": "High-Risk Customers", "text": f"{high_risk} customers ({hr_pct:.1f}%) are classified as High Risk. Personalized outreach can recover up to 60% of these."})

    if avg_clv < 200:
        insights.append({"type": "warning", "icon": "📉", "title": "Low Average CLV", "text": f"Average risk-adjusted CLV of ${avg_clv:.0f} suggests tenure is low or churn probability is high. Focus on new customer onboarding."})
    elif avg_clv > 800:
        insights.append({"type": "success", "icon": "💎", "title": "Strong Customer Value", "text": f"Average risk-adjusted CLV of ${avg_clv:.0f} is excellent. Protect your high-value segment proactively."})

    if high_val > 0:
        insights.append({"type": "info", "icon": "👑", "title": "High-Value Churners Detected", "text": f"{high_val} high-value customers are at risk of churning. Each represents above-average revenue impact."})

    # Actionable recommendation
    if cr > 20:
        insights.append({"type": "action", "icon": "🔑", "title": "Top Retention Lever", "text": "Migrating Month-to-month customers to annual contracts is your highest-ROI retention action — typically reduces churn by 85%."})

    return insights


# ─────────────────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/summary")
def get_executive_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Executive KPI summary:
    total predictions, churn rate, revenue at risk, CLV metrics, segment performance.
    """
    predictions = db.query(Prediction).filter(Prediction.user_id == current_user.id).all()
    if not predictions:
        return {
            "total_predictions": 0, "churn_rate": 0.0, "total_revenue_at_risk": 0.0,
            "avg_risk_adjusted_clv": 0.0, "high_value_count": 0, "high_risk_count": 0,
        }

    total = len(predictions)
    churned = sum(1 for p in predictions if p.churn_prediction == 1)
    churn_rate = churned / total * 100

    high_risk = sum(1 for p in predictions if p.risk_level == "High")
    medium_risk = sum(1 for p in predictions if p.risk_level == "Medium")
    low_risk = sum(1 for p in predictions if p.risk_level == "Low")

    # CLV summary
    clv_data = compute_clv_summary(predictions)

    # Segment performance (from stored segment labels)
    segment_perf = {}
    for p in predictions:
        label = p.segment_label or "Unassigned"
        if label not in segment_perf:
            segment_perf[label] = {"label": label, "count": 0, "churned": 0, "total_revenue_at_risk": 0}
        segment_perf[label]["count"] += 1
        if p.churn_prediction == 1:
            segment_perf[label]["churned"] += 1
            segment_perf[label]["total_revenue_at_risk"] += (p.monthly_charges or 0) * 12 * (p.churn_probability or 0)

    for seg in segment_perf.values():
        seg["churn_rate"] = round(seg["churned"] / seg["count"] * 100, 1) if seg["count"] > 0 else 0
        seg["total_revenue_at_risk"] = round(seg["total_revenue_at_risk"], 2)

    # Monthly trend (last 6 months of predictions)
    from collections import defaultdict
    monthly = defaultdict(lambda: {"total": 0, "churned": 0})
    for p in predictions:
        if p.created_at:
            month_key = p.created_at.strftime("%Y-%m")
            monthly[month_key]["total"] += 1
            if p.churn_prediction == 1:
                monthly[month_key]["churned"] += 1
    trend = [
        {"month": k, "total": v["total"], "churned": v["churned"],
         "churn_rate": round(v["churned"] / v["total"] * 100, 1) if v["total"] > 0 else 0}
        for k, v in sorted(monthly.items())[-6:]
    ]

    return {
        "total_predictions": total,
        "churned_count": churned,
        "retained_count": total - churned,
        "churn_rate": round(churn_rate, 1),
        "high_risk_count": high_risk,
        "medium_risk_count": medium_risk,
        "low_risk_count": low_risk,
        "avg_risk_adjusted_clv": clv_data["avg_risk_adjusted_clv"],
        "total_revenue_at_risk": clv_data["total_revenue_at_risk"],
        "high_value_count": clv_data["high_value_count"],
        "top_churners": clv_data["top_churners"][:5],
        "segment_performance": list(segment_perf.values()),
        "monthly_trend": trend,
    }


@router.get("/insights")
def get_rule_based_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get rule-based business insights — fast, no AI API call."""
    predictions = db.query(Prediction).filter(Prediction.user_id == current_user.id).all()
    if not predictions:
        return {"insights": [{"type": "info", "icon": "📊", "title": "No Data Yet", "text": "Make some predictions to see executive insights."}]}

    total = len(predictions)
    churned = sum(1 for p in predictions if p.churn_prediction == 1)
    high_risk = sum(1 for p in predictions if p.risk_level == "High")
    clv_data = compute_clv_summary(predictions)

    stats = {
        "total_predictions": total,
        "churn_rate": churned / total * 100 if total else 0,
        "total_revenue_at_risk": clv_data["total_revenue_at_risk"],
        "avg_risk_adjusted_clv": clv_data["avg_risk_adjusted_clv"],
        "high_value_count": clv_data["high_value_count"],
        "high_risk_count": high_risk,
    }
    return {"insights": _generate_rule_insights(stats), "generated_at": "rule-based"}


@router.post("/ai-insights")
async def get_ai_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate AI-powered executive narrative — calls AI provider only on demand.
    Returns Gemini/OpenAI analysis of the current portfolio.
    """
    from app.services.ai_provider import get_ai_provider

    predictions = db.query(Prediction).filter(Prediction.user_id == current_user.id).all()
    if not predictions:
        raise HTTPException(status_code=400, detail="No prediction data available for AI analysis")

    total = len(predictions)
    churned = sum(1 for p in predictions if p.churn_prediction == 1)
    high_risk = sum(1 for p in predictions if p.risk_level == "High")
    clv_data = compute_clv_summary(predictions)

    prompt = f"""You are an executive business analyst reviewing a customer churn portfolio.

Portfolio Summary:
- Total Customers Analyzed: {total}
- Churned (predicted): {churned} ({churned/total*100:.1f}%)
- High Risk: {high_risk}
- Average Risk-Adjusted CLV: ${clv_data['avg_risk_adjusted_clv']:.2f}
- Total Annual Revenue at Risk: ${clv_data['total_revenue_at_risk']:,.0f}
- High-Value Customers at Risk: {clv_data['high_value_count']}

Provide a concise executive summary (3-4 paragraphs) covering:
1. Overall portfolio health assessment
2. Revenue impact and priority actions
3. Top 3 strategic recommendations with expected outcomes
4. Key metric to watch next quarter

Be data-driven, specific, and business-focused. No generic advice."""

    provider = get_ai_provider()
    if not provider:
        raise HTTPException(status_code=503, detail="No AI provider configured. Set GEMINI_API_KEY in .env to enable AI insights.")

    try:
        narrative = await provider.complete(prompt)
        return {
            "narrative": narrative,
            "model_used": provider.model_name,
            "generated_at": "ai",
            "stats_used": {
                "total": total,
                "churn_rate": round(churned/total*100, 1),
                "revenue_at_risk": clv_data["total_revenue_at_risk"],
            }
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))
