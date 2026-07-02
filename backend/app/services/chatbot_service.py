"""AI Chatbot service — now using the AI provider abstraction layer."""

from app.config import settings
from app.services.ai_provider import get_ai_provider
from typing import Optional, Dict, Any

SYSTEM_PROMPT = """You are Analytica AI, the dedicated assistant for the Analytica platform (an AI-powered Multi-Industry Predictive Analytics Platform).

Your behavior rules:
1. Conversational Greetings: If the user says a simple greeting (e.g. "hi", "hello", "hey", "good morning"), respond with a short, friendly greeting and do not output lists of statistics or strategies.
2. Scope restriction: You must ONLY answer questions directly related to the Analytica platform, its modules, customer churn analysis, ML prediction models, Customer Lifetime Value (CLV), K-Means segmentation, What-If simulator, SHAP explainability, multi-industry analytics, database analytics, or data-driven retention strategies.
3. Out-of-scope queries: If the user asks a question unrelated to the platform or data science/churn domain (e.g. writing general code, general advice, trivia, storytelling, translation, cooking recipes, etc.), you must politely decline, stating that your scope is strictly limited to Analytica's predictive analytics and retention operations.
4. Page-aware context: When page context is provided, prioritize responses relevant to that page's domain. For example, if the user is on the Segmentation page, focus on K-Means clusters and segment strategies.

Your core expertise areas (organized by platform module):
- **Dashboard**: KPI interpretation (churn rate, revenue at risk, model accuracy), trend analysis, risk distribution
- **Churn Prediction**: Interpreting churn predictions, understanding probability scores, risk levels, model comparison across 7 ML algorithms
- **SHAP Explainability**: Explaining SHAP values, waterfall charts, feature contributions, global vs local explanations
- **What-If Simulator**: Guiding scenario analysis, comparing baseline vs modified features, retention impact estimation
- **Customer Segmentation**: K-Means clustering interpretation, segment labels (Loyal Champions, High Value, Price Sensitive, High Risk Churners), segment-specific retention strategies
- **Executive Insights**: Business intelligence summaries, revenue impact, strategic recommendations
- **CLV Dashboard**: Customer Lifetime Value calculations (Base CLV vs Risk-Adjusted CLV), revenue at risk, CLV tiers (Platinum/Gold/Silver/Bronze)
- **Multi-Industry Analytics**: Cross-industry churn benchmarks, industry-specific risk factors and retention strategies for Telecom, Banking, E-commerce, and Healthcare verticals
- **Data Quality**: Missing value analysis, outlier detection, class balance assessment, data health scoring
- **Hyperparameter Tuning**: Grid search vs random search, cross-validation, model optimization guidance
- **Data Explorer (EDA)**: Dataset statistics, correlation analysis, feature distributions, model comparison
- **Customer Management**: Customer profile analysis, filtering, risk-based prioritization

Formatting: Be concise, professional, and structured. Use markdown formatting and bullet points where helpful.
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


def _build_contextual_prompt(message: str, prediction_context: Optional[Dict[str, Any]] = None, page_context: Optional[Dict[str, Any]] = None) -> str:
    """Build a contextual prompt incorporating prediction data and currency settings."""
    ctx = []
    
    # Add page context if available
    if page_context:
        page = page_context.get("page", "")
        module = page_context.get("module", "")
        label = page_context.get("label", "")
        ctx.append("[PAGE CONTEXT]")
        ctx.append(f"The user is currently on the \"{label}\" page ({module} module).")
        
        # Page-specific guidance
        page_guidance = {
            "dashboard": "Focus on KPI interpretation, churn rate trends, revenue at risk metrics, and overall platform health.",
            "predict": "Focus on churn prediction interpretation, risk factors, model selection, and retention recommendations for specific customers.",
            "customers": "Focus on customer profile analysis, risk filtering, and bulk retention strategies.",
            "analytics": "Focus on data visualization insights, trend analysis, and analytical observations.",
            "eda": "Focus on dataset statistics, correlations, feature distributions, and data exploration guidance.",
            "explainability": "Focus on SHAP value interpretation, feature contributions, waterfall chart reading, and explaining why a prediction was made.",
            "simulator": "Focus on What-If scenario guidance, feature modification impact, and comparing baseline vs alternative outcomes.",
            "segments": "Focus on K-Means clustering results, segment characteristics (Loyal Champions, High Value, Price Sensitive, High Risk Churners), and segment-specific retention strategies.",
            "executive": "Focus on executive-level business insights, strategic recommendations, revenue impact analysis, and high-level KPI summaries.",
            "clv": "Focus on Customer Lifetime Value calculations, CLV tiers (Platinum/Gold/Silver/Bronze), revenue at risk, and value-based prioritization.",
            "multi-industry": "Focus on cross-industry churn benchmarks, industry-specific risk factors, and comparing churn patterns across Telecom, Banking, E-commerce, and Healthcare.",
            "data-quality": "Focus on data health metrics, missing values, outliers, class imbalance, and data quality improvement suggestions.",
            "tuning": "Focus on hyperparameter tuning guidance, grid search vs random search, cross-validation strategy, and model optimization.",
        }
        guidance = page_guidance.get(page, "Provide helpful analytics guidance.")
        ctx.append(guidance)
        ctx.append("")

    if prediction_context:
        # Extract currency information
        curr_code = prediction_context.get("currency_code")
        curr_symbol = prediction_context.get("currency_symbol")
        curr_rate = prediction_context.get("currency_rate")
        
        if curr_code and curr_symbol and curr_rate:
            ctx.append("[USER SETTINGS]")
            ctx.append(f"Selected Currency: {curr_code} ({curr_symbol})")
            ctx.append(f"Currency Conversion Rate (1 USD to {curr_code}): {curr_rate}")
            ctx.append(f"IMPORTANT: Please respond in {curr_code} ({curr_symbol}). Always convert any financial/monetary values (originally in USD) using the conversion rate {curr_rate} and format them with {curr_symbol}.")
            ctx.append("")

        # Add prediction context if available
        has_prediction = "churn_probability" in prediction_context or "risk_level" in prediction_context
        if has_prediction:
            ctx.append("[PREDICTION CONTEXT]")
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
                    val = prediction_context[key]
                    if key == "monthly_charges" and curr_rate:
                        val = f"{curr_symbol}{float(val) * float(curr_rate):.2f}"
                    ctx.append(f"{key}: {val}")
            ctx.append("")

    ctx.append(f"[USER QUESTION] {message}")
    if prediction_context and (prediction_context.get("currency_code") or "churn_probability" in prediction_context):
        ctx.append("\nPlease answer based on the context above. Be specific and actionable. Ensure all monetary figures are converted to the selected currency.")
        
    return "\n".join(ctx) if ctx else message


def _fallback_response(message: str, prediction_context: Optional[Dict[str, Any]] = None) -> str:
    """Return a rule-based response when AI provider is unavailable, respecting currency options."""
    curr_symbol = "$"
    curr_rate = 1.0
    
    if prediction_context:
        curr_symbol = prediction_context.get("currency_symbol", "$")
        try:
            curr_rate = float(prediction_context.get("currency_rate", 1.0))
        except (ValueError, TypeError):
            curr_rate = 1.0

    msg_lower = message.lower().strip()

    # 0. Conversational Greetings Match
    if msg_lower in ["hi", "hello", "hey", "greetings", "good morning", "good afternoon", "good evening"]:
        return "Hello! I'm **Analytica AI** 🪐. How can I help you with your customer churn analysis, predictive modeling, or retention strategies today?"

    # 1. Specific comparison question matching
    if any(w in msg_lower for w in ["differ", "different", "change", "variation", "compare", "comparison"]) and any(w in msg_lower for w in ["model", "algorithm", "prediction"]):
        return """### 🤖 Why Churn Predictions Differ Between Models

In Analytica, churn probabilities differ across models because each algorithm uses a different mathematical approach to analyze customer features:

1. **Tree-Based Ensembles (Random Forest / XGBoost / GBM)**:
   * **Mechanism**: Build multiple decision trees and aggregate their predictions.
   * **Why they differ**: They capture complex, non-linear interactions between features (e.g., how monthly charges impact month-to-month contracts differently than long-term contracts). They are generally the most accurate.

2. **Single Decision Trees**:
   * **Mechanism**: Splits the dataset based on the single most informative feature at each step.
   * **Why they differ**: They are simpler, prone to overfitting or high variance, and tend to output coarser probability steps based on leaf node ratios.

3. **Logistic Regression**:
   * **Mechanism**: A linear model that applies a sigmoid function to a weighted sum of inputs.
   * **Why they differ**: It assumes a linear relationship between features and the log-odds of churn. It cannot naturally capture complex feature combinations unless explicitly engineered.

4. **Support Vector Machines (SVM)**:
   * **Mechanism**: Finds the optimal boundary (hyperplane) that separates classes in a high-dimensional space.
   * **Why they differ**: SVM uses kernel tricks to map features, and its probabilities are estimated using Platt scaling, which can differ from tree-based counts.

5. **K-Nearest Neighbors (KNN)**:
   * **Mechanism**: Looks at the 'K' closest customers in the multi-dimensional feature space.
   * **Why they differ**: Churn probability is simply the ratio of churned neighbors. It depends heavily on local data density rather than global patterns.

---
*For live, customized AI explanations, configure a valid `GROQ_API_KEY` or `GEMINI_API_KEY` in the `.env` file.*"""

    # 2. Other specific topic keyword matches
    elif any(w in msg_lower for w in ["clv", "lifetime value", "revenue", "value"]):
        return f"""**Customer Lifetime Value (CLV) in Analytica:**

• **Base CLV** = Monthly Charges × Remaining Months
• **Risk-Adjusted CLV** = Base CLV × (1 - Churn Probability)
• **Revenue at Risk** = Monthly Charges × 12 × Churn Probability

**CLV Tiers:** Platinum ({curr_symbol}{2000 * curr_rate:.0f}) · Gold ({curr_symbol}{1000 * curr_rate:.0f}-{2000 * curr_rate:.0f}) · Silver ({curr_symbol}{400 * curr_rate:.0f}-{1000 * curr_rate:.0f}) · Bronze (<{curr_symbol}{400 * curr_rate:.0f})

Focus retention efforts on **high CLV + high churn probability** customers first — maximum ROI."""

    elif any(w in msg_lower for w in ["model", "accuracy", "shap", "explainability", "algorithm"]):
        return """**Analytica V1.0 ML Stack:**

**Models:** Random Forest · XGBoost · Gradient Boosting · Logistic Regression · SVM · KNN · Decision Tree

**Explainability:** SHAP (SHapley Additive exPlanations) — per-prediction explanations showing exactly how each feature contributed to the churn probability.

**Best model:** Random Forest (typically 85-88% accuracy on Telco dataset)

**Training:** SMOTE oversampling to handle class imbalance (26.5% churn rate)"""

    elif any(w in msg_lower for w in ["segment", "cluster", "group"]):
        return """**Customer Segmentation in Analytica:**

Uses K-Means clustering on [churn_probability, monthly_charges, tenure]:

👑 **Loyal Champions** — Long tenure, low risk, high CLV
💎 **High Value** — High charges, manageable risk
💰 **Price Sensitive** — Low charges, elevated churn risk
⚠️ **High Risk Churners** — Immediate intervention needed
📈 **Growing Accounts** — New customers with high spending

Each segment gets tailored retention strategy recommendations."""

    elif any(w in msg_lower for w in ["retain", "retention", "reduce", "prevent", "strategy"]):
        return """**Proven Retention Strategies:**

1. **Long-term contracts** — offer incentives for annual/2-year commitments
2. **Service bundles** — customers with 3+ services churn 60% less
3. **Auto-pay setup** — reduces billing-related churn by 15-20%
4. **Proactive support** — reach out before customers escalate
5. **Loyalty rewards** — tenure milestone discounts
6. **Onboarding focus** — the first 90 days determine long-term retention"""

    elif any(w in msg_lower for w in ["churn", "risk", "factor", "why", "cause"]):
        charges_threshold = 70.0 * curr_rate
        return f"""**Customer churn** occurs when customers stop using your services. Key drivers in Telecom:

• **Month-to-month contracts** → ~42% churn rate vs ~3% for 2-year contracts
• **High monthly charges** (>{curr_symbol}{charges_threshold:.2f}) → correlated with higher churn
• **Fiber optic internet** → price sensitivity in competitive markets
• **Electronic check payments** → highest churn rate among payment methods
• **Low tenure** (0-12 months) → highest churn risk period

Our 7 ML models analyze 19 features to predict individual churn probability."""

    # 3. Fall back to Prediction Context (Customer Risk Profile) if loaded
    elif prediction_context and ("churn_probability" in prediction_context or "risk_level" in prediction_context):
        prob = prediction_context.get("churn_probability", 0.5)
        risk = prediction_context.get("risk_level", "Medium")
        contract = prediction_context.get("contract", "Month-to-month")
        tenure = prediction_context.get("tenure", 12)
        payment = prediction_context.get("payment_method", "Electronic check")
        internet = prediction_context.get("internet_service", "DSL")
        
        try:
            charges = float(prediction_context.get("monthly_charges", 70.0)) * curr_rate
        except (ValueError, TypeError):
            charges = 70.0 * curr_rate

        recs = []
        if contract == "Month-to-month":
            recs.append("• **Contract Migration**: Offer a Value Lock-In promotion to switch to a 1-year or 2-year contract — typically drops churn probability from ~42% to under 3%.")
        if payment == "Electronic check":
            credit_amount = 10.0 * curr_rate
            if curr_symbol == "$":
                credit_str = "$10"
            elif curr_symbol == "₹":
                credit_str = f"₹{int(credit_amount)}"
            else:
                credit_str = f"{curr_symbol}{credit_amount:.2f}"
            recs.append(f"• **Auto-Pay Incentive**: Offer a {credit_str} bill credit for enrolling in automatic bank transfer — eliminates billing friction.")
        if internet == "Fiber optic":
            recs.append("• **Fiber Value-Add**: Include 6 months of a premium streaming service to offset perceived high cost.")
        elif charges > (75.0 * curr_rate):
            recs.append("• **Plan Right-Sizing**: Review usage and recommend a bundle that reduces monthly charges without losing key services.")
        if tenure <= 12:
            recs.append("• **First-Year Engagement**: Enroll in priority check-in cycle to ensure early satisfaction.")
        if not recs:
            recs.append("• **Proactive Outreach**: Schedule a customer success call to identify pain points and reinforce value.")

        return f"""### 🎯 Churn Risk Analysis: {prob * 100:.1f}% ({risk} Risk)

**Customer Profile:**
- Contract: `{contract}` | Tenure: `{tenure} months` | Monthly: `{curr_symbol}{charges:.2f}`
- Internet: `{internet}` | Payment: `{payment}`

**💡 Recommended Retention Actions:**
{chr(10).join(recs)}

---
*Enable live AI responses by configuring your `GROQ_API_KEY` in the `.env` file.*"""

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
    prediction_context: Optional[Dict[str, Any]] = None,
    page_context: Optional[Dict[str, Any]] = None
) -> dict:
    """Get AI response for a chat message, optionally with prediction context."""
    # Generate page-aware suggestions
    page = (page_context or {}).get("page", "")
    page_suggestions = {
        "dashboard": [
            "What does my overall churn rate indicate?",
            "Which KPIs need immediate attention?",
            "How is revenue at risk calculated?",
            "What trends do you see in the data?",
        ],
        "predict": [
            "Why is this customer at risk?",
            "What retention strategy do you recommend?",
            "How can I reduce this churn probability?",
            "What are the key risk factors here?",
        ],
        "multi-industry": [
            "Compare telecom vs banking churn rates",
            "What drives healthcare customer churn?",
            "Which industry has the highest churn?",
            "What are e-commerce retention best practices?",
        ],
        "segments": [
            "Describe the High Risk Churners segment",
            "How do I retain Price Sensitive customers?",
            "What defines Loyal Champions?",
            "Compare segment churn rates",
        ],
        "clv": [
            "How is Customer Lifetime Value calculated?",
            "Which customers have the highest revenue at risk?",
            "Explain CLV tiers",
            "How can I improve CLV for at-risk customers?",
        ],
        "executive": [
            "Generate an executive summary",
            "What are the key business insights?",
            "What is the total revenue at risk?",
            "What strategic actions do you recommend?",
        ],
        "explainability": [
            "What does SHAP stand for?",
            "Which features matter most for churn?",
            "How do I read a waterfall chart?",
            "What are global vs local explanations?",
        ],
        "simulator": [
            "What if I change the contract type?",
            "How does tenure affect churn probability?",
            "What retention scenario is most effective?",
            "Compare monthly vs annual contract impact",
        ],
        "eda": [
            "What are the key dataset statistics?",
            "Which features correlate most with churn?",
            "How are the features distributed?",
            "Compare model accuracies",
        ],
        "data-quality": [
            "Are there any data quality issues?",
            "How do I handle missing values?",
            "Is there class imbalance in the dataset?",
            "What is the overall data health score?",
        ],
        "tuning": [
            "Should I use grid search or random search?",
            "How many CV folds should I use?",
            "Which model should I tune first?",
            "What hyperparameters can I tune?",
        ],
    }
    suggestions = page_suggestions.get(page, [
        "What are the top churn risk factors?",
        "How can I improve CLV for high-risk customers?",
        "Explain the SHAP values for this prediction",
        "What retention strategy do you recommend?",
        "How does the What-If simulator work?",
    ])

    provider = _provider or get_ai_provider(SYSTEM_PROMPT)
    if provider:
        contextual_message = _build_contextual_prompt(message, prediction_context, page_context)
        try:
            response_text = await provider.complete(contextual_message, prediction_context)
            return {
                "response": response_text,
                "suggestions": suggestions,
                "model_used": provider.model_name,
            }
        except RuntimeError as e:
            print(f"AI provider error: {e}")
            if "rate limit" in str(e).lower():
                return {
                    "response": f"⚠️ {str(e)} Here's a rule-based response:\n\n{_fallback_response(message, prediction_context)}",
                    "suggestions": suggestions,
                    "model_used": "fallback",
                }
            else:
                return {
                    "response": f"⚠️ **AI Chatbot Provider Error**: {str(e)}\n\n{_fallback_response(message, prediction_context)}",
                    "suggestions": suggestions,
                    "model_used": "fallback",
                }

    # Fallback
    return {
        "response": _fallback_response(message, prediction_context),
        "suggestions": suggestions,
        "model_used": "fallback",
    }
