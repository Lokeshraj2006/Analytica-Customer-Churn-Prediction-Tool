"""AI Chatbot service — now using the AI provider abstraction layer."""

from app.config import settings
from app.services.ai_provider import get_ai_provider
from typing import Optional, Dict, Any

SYSTEM_PROMPT = """You are Analytica AI, an intelligent assistant specialized in customer churn analysis, prediction, and retention strategy for an AI-Powered Multi-Industry Predictive Analytics Platform.

Your expertise includes:
- Explaining customer churn concepts, metrics, and KPIs
- Interpreting churn prediction results and SHAP explanations
- Suggesting data-driven customer retention strategies
- Analyzing CLV (Customer Lifetime Value) and revenue impact
- Explaining customer segmentation insights
- Helping users understand ML models (Random Forest, XGBoost, GBM, etc.)
- Providing actionable business insights based on prediction data

Key facts about the Telecom industry (primary demo):
- Based on the IBM Telco Customer Churn dataset (7,043 customers, 19 features)
- Key churn drivers: Month-to-month contracts, high monthly charges, fiber optic internet, electronic check payments, low tenure
- Retention strategies: Annual contracts, service bundles, tech support, auto-pay incentives

Always be concise, data-driven, and actionable. Use bullet points for clarity.
"""

_provider = None


def initialize_chatbot():
    """Initialize the AI provider on startup."""
    global _provider
    _provider = get_ai_provider(system_instruction=SYSTEM_PROMPT)
    if _provider:
        print(f"[OK] AI chatbot initialized with provider: {settings.AI_PROVIDER} ({_provider.model_name})")
    else:
        print("[WARN] No AI API key configured — chatbot will use rule-based fallback responses")


def _build_contextual_prompt(message: str, prediction_context: Optional[Dict[str, Any]] = None) -> str:
    """Build a contextual prompt incorporating prediction data."""
    if not prediction_context:
        return message

    ctx = ["[PREDICTION CONTEXT]"]
    if "churn_probability" in prediction_context:
        ctx.append(f"Churn Probability: {prediction_context['churn_probability'] * 100:.1f}%")
    if "risk_level" in prediction_context:
        ctx.append(f"Risk Level: {prediction_context['risk_level']}")
    if "contributing_factors" in prediction_context:
        ctx.append("Top Risk Factors:")
        for f in prediction_context["contributing_factors"]:
            ctx.append(f"  - {f.get('feature')}: {f.get('value', 'N/A')} (importance: {f.get('importance', 0) * 100:.1f}%)")
    for key in ["tenure", "monthly_charges", "contract", "internet_service", "tech_support", "payment_method"]:
        if key in prediction_context:
            ctx.append(f"{key}: {prediction_context[key]}")
    ctx.append(f"\n[USER QUESTION] {message}")
    ctx.append("\nPlease answer based on the prediction context above. Be specific and actionable.")
    return "\n".join(ctx)


def _fallback_response(message: str, prediction_context: Optional[Dict[str, Any]] = None) -> str:
    """Return a rule-based response when AI provider is unavailable."""
    if prediction_context:
        prob = prediction_context.get("churn_probability", 0.5)
        risk = prediction_context.get("risk_level", "Medium")
        contract = prediction_context.get("contract", "Month-to-month")
        tenure = prediction_context.get("tenure", 12)
        payment = prediction_context.get("payment_method", "Electronic check")
        internet = prediction_context.get("internet_service", "DSL")
        charges = prediction_context.get("monthly_charges", 70.0)

        recs = []
        if contract == "Month-to-month":
            recs.append("• **Contract Migration**: Offer a Value Lock-In promotion to switch to a 1-year or 2-year contract — typically drops churn probability from ~42% to under 3%.")
        if payment == "Electronic check":
            recs.append("• **Auto-Pay Incentive**: Offer a $10 bill credit for enrolling in automatic bank transfer — eliminates billing friction.")
        if internet == "Fiber optic":
            recs.append("• **Fiber Value-Add**: Include 6 months of a premium streaming service to offset perceived high cost.")
        elif charges > 75.0:
            recs.append("• **Plan Right-Sizing**: Review usage and recommend a bundle that reduces monthly charges without losing key services.")
        if tenure <= 12:
            recs.append("• **First-Year Engagement**: Enroll in priority check-in cycle to ensure early satisfaction.")
        if not recs:
            recs.append("• **Proactive Outreach**: Schedule a customer success call to identify pain points and reinforce value.")

        return f"""### 🎯 Churn Risk Analysis: {prob * 100:.1f}% ({risk} Risk)

**Customer Profile:**
- Contract: `{contract}` | Tenure: `{tenure} months` | Monthly: `${charges:.2f}`
- Internet: `{internet}` | Payment: `{payment}`

**💡 Recommended Retention Actions:**
{chr(10).join(recs)}

---
*Enable live AI responses by configuring your `GEMINI_API_KEY` in the `.env` file.*"""

    msg_lower = message.lower()
    if any(w in msg_lower for w in ["churn", "risk", "factor", "why", "cause"]):
        return """**Customer churn** occurs when customers stop using your services. Key drivers in Telecom:

• **Month-to-month contracts** → ~42% churn rate vs ~3% for 2-year contracts
• **High monthly charges** (>$70) → correlated with higher churn
• **Fiber optic internet** → price sensitivity in competitive markets
• **Electronic check payments** → highest churn rate among payment methods
• **Low tenure** (0-12 months) → highest churn risk period

Our 7 ML models analyze 19 features to predict individual churn probability."""

    elif any(w in msg_lower for w in ["retain", "retention", "reduce", "prevent", "strategy"]):
        return """**Proven Retention Strategies:**

1. **Long-term contracts** — offer incentives for annual/2-year commitments
2. **Service bundles** — customers with 3+ services churn 60% less
3. **Auto-pay setup** — reduces billing-related churn by 15-20%
4. **Proactive support** — reach out before customers escalate
5. **Loyalty rewards** — tenure milestone discounts
6. **Onboarding focus** — the first 90 days determine long-term retention"""

    elif any(w in msg_lower for w in ["model", "accuracy", "shap", "explainability", "algorithm"]):
        return """**Analytica V4.0 ML Stack:**

**Models:** Random Forest · XGBoost · Gradient Boosting · Logistic Regression · SVM · KNN · Decision Tree

**Explainability:** SHAP (SHapley Additive exPlanations) — per-prediction explanations showing exactly how each feature contributed to the churn probability.

**Best model:** Random Forest (typically 85-88% accuracy on Telco dataset)

**Training:** SMOTE oversampling to handle class imbalance (26.5% churn rate)"""

    elif any(w in msg_lower for w in ["clv", "lifetime value", "revenue", "value"]):
        return """**Customer Lifetime Value (CLV) in Analytica:**

• **Base CLV** = Monthly Charges × Remaining Months
• **Risk-Adjusted CLV** = Base CLV × (1 - Churn Probability)
• **Revenue at Risk** = Monthly Charges × 12 × Churn Probability

**CLV Tiers:** Platinum (>$2K) · Gold ($1K-2K) · Silver ($400-1K) · Bronze (<$400)

Focus retention efforts on **high CLV + high churn probability** customers first — maximum ROI."""

    elif any(w in msg_lower for w in ["segment", "cluster", "group"]):
        return """**Customer Segmentation in Analytica:**

Uses K-Means clustering on [churn_probability, monthly_charges, tenure]:

👑 **Loyal Champions** — Long tenure, low risk, high CLV
💎 **High Value** — High charges, manageable risk
💰 **Price Sensitive** — Low charges, elevated churn risk
⚠️ **High Risk Churners** — Immediate intervention needed
📈 **Growing Accounts** — New customers with high spending

Each segment gets tailored retention strategy recommendations."""

    return """I'm **Analytica AI**, your predictive analytics assistant! I can help with:

• 📊 Interpreting churn predictions and SHAP explanations
• 💎 Understanding Customer Lifetime Value (CLV)
• 🎯 What-If scenario analysis for retention planning
• 👥 Customer segmentation insights
• 📈 Hyperparameter tuning and model optimization
• 💡 Retention strategy recommendations

Try asking about churn risk factors, CLV optimization, or segment-specific strategies!"""


async def get_chat_response(
    message: str,
    prediction_context: Optional[Dict[str, Any]] = None
) -> dict:
    """Get AI response for a chat message, optionally with prediction context."""
    suggestions = [
        "What are the top churn risk factors?",
        "How can I improve CLV for high-risk customers?",
        "Explain the SHAP values for this prediction",
        "What retention strategy do you recommend?",
        "How does the What-If simulator work?",
    ]

    provider = _provider or get_ai_provider(SYSTEM_PROMPT)
    if provider:
        contextual_message = _build_contextual_prompt(message, prediction_context)
        try:
            response_text = await provider.complete(contextual_message, prediction_context)
            return {
                "response": response_text,
                "suggestions": suggestions,
                "model_used": provider.model_name,
            }
        except RuntimeError as e:
            if "rate limit" in str(e).lower():
                return {
                    "response": f"⚠️ {str(e)} Here's a rule-based response:\n\n{_fallback_response(message, prediction_context)}",
                    "suggestions": suggestions,
                    "model_used": "fallback",
                }
            print(f"AI provider error: {e}")

    # Fallback
    return {
        "response": _fallback_response(message, prediction_context),
        "suggestions": suggestions,
        "model_used": "fallback",
    }
