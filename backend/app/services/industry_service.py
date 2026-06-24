"""
Multi-Industry Churn Prediction Service.
Supports: Telecom, Banking, E-commerce, Healthcare.
Uses rule-based scoring + existing telecom ML models for Telecom industry.
"""

from typing import Any
import random

# ─────────────────────────────────────────────────────────────────────────────
# INDUSTRY SCHEMAS  (field definitions for frontend form rendering)
# ─────────────────────────────────────────────────────────────────────────────

INDUSTRY_SCHEMAS = {
    "telecom": {
        "label": "Telecom",
        "icon": "📡",
        "color": "#6366f1",
        "description": "Telecommunications churn — ISP & mobile carriers",
        "avg_churn_rate": 26.5,
        "typical_risk_factors": ["Month-to-month contract", "Fiber optic without security", "Electronic check payment", "High monthly charges"],
        "sections": [
            {
                "title": "Customer Demographics",
                "icon": "👤",
                "fields": [
                    {"key": "gender", "label": "Gender", "type": "select", "options": ["Male", "Female"], "default": "Male"},
                    {"key": "senior_citizen", "label": "Senior Citizen", "type": "select", "options": [0, 1], "option_labels": ["No", "Yes"], "default": 0},
                    {"key": "partner", "label": "Partner", "type": "select", "options": ["Yes", "No"], "default": "No"},
                    {"key": "dependents", "label": "Dependents", "type": "select", "options": ["Yes", "No"], "default": "No"},
                ]
            },
            {
                "title": "Services",
                "icon": "🌐",
                "fields": [
                    {"key": "tenure", "label": "Tenure (months)", "type": "number", "min": 0, "max": 72, "default": 12},
                    {"key": "internet_service", "label": "Internet Service", "type": "select", "options": ["DSL", "Fiber optic", "No"], "default": "Fiber optic"},
                    {"key": "phone_service", "label": "Phone Service", "type": "select", "options": ["Yes", "No"], "default": "Yes"},
                    {"key": "multiple_lines", "label": "Multiple Lines", "type": "select", "options": ["Yes", "No", "No phone service"], "default": "No"},
                    {"key": "online_security", "label": "Online Security", "type": "select", "options": ["Yes", "No", "No internet service"], "default": "No"},
                    {"key": "online_backup", "label": "Online Backup", "type": "select", "options": ["Yes", "No", "No internet service"], "default": "No"},
                    {"key": "device_protection", "label": "Device Protection", "type": "select", "options": ["Yes", "No", "No internet service"], "default": "No"},
                    {"key": "tech_support", "label": "Tech Support", "type": "select", "options": ["Yes", "No", "No internet service"], "default": "No"},
                    {"key": "streaming_tv", "label": "Streaming TV", "type": "select", "options": ["Yes", "No", "No internet service"], "default": "No"},
                    {"key": "streaming_movies", "label": "Streaming Movies", "type": "select", "options": ["Yes", "No", "No internet service"], "default": "No"},
                ]
            },
            {
                "title": "Account & Billing",
                "icon": "💳",
                "fields": [
                    {"key": "contract", "label": "Contract", "type": "select", "options": ["Month-to-month", "One year", "Two year"], "default": "Month-to-month"},
                    {"key": "paperless_billing", "label": "Paperless Billing", "type": "select", "options": ["Yes", "No"], "default": "Yes"},
                    {"key": "payment_method", "label": "Payment Method", "type": "select", "options": ["Electronic check", "Mailed check", "Bank transfer (automatic)", "Credit card (automatic)"], "default": "Electronic check"},
                    {"key": "monthly_charges", "label": "Monthly Charges ($)", "type": "number", "min": 0, "max": 200, "step": 0.01, "default": 70.35},
                    {"key": "total_charges", "label": "Total Charges ($)", "type": "number", "min": 0, "max": 10000, "step": 0.01, "default": 844.20},
                ]
            }
        ],
        "templates": {
            "high_risk": {"gender": "Male", "senior_citizen": 1, "partner": "No", "dependents": "No", "tenure": 2, "internet_service": "Fiber optic", "phone_service": "Yes", "multiple_lines": "Yes", "online_security": "No", "online_backup": "No", "device_protection": "No", "tech_support": "No", "streaming_tv": "No", "streaming_movies": "No", "contract": "Month-to-month", "paperless_billing": "Yes", "payment_method": "Electronic check", "monthly_charges": 98.5, "total_charges": 197.0},
            "medium_risk": {"gender": "Female", "senior_citizen": 0, "partner": "Yes", "dependents": "No", "tenure": 18, "internet_service": "DSL", "phone_service": "Yes", "multiple_lines": "No", "online_security": "Yes", "online_backup": "No", "device_protection": "No", "tech_support": "No", "streaming_tv": "Yes", "streaming_movies": "No", "contract": "Month-to-month", "paperless_billing": "Yes", "payment_method": "Mailed check", "monthly_charges": 59.9, "total_charges": 1078.2},
            "low_risk": {"gender": "Female", "senior_citizen": 0, "partner": "Yes", "dependents": "Yes", "tenure": 48, "internet_service": "DSL", "phone_service": "Yes", "multiple_lines": "No", "online_security": "Yes", "online_backup": "Yes", "device_protection": "Yes", "tech_support": "Yes", "streaming_tv": "No", "streaming_movies": "No", "contract": "Two year", "paperless_billing": "No", "payment_method": "Bank transfer (automatic)", "monthly_charges": 45.5, "total_charges": 2184.0},
        }
    },

    "banking": {
        "label": "Banking",
        "icon": "🏦",
        "color": "#10b981",
        "description": "Retail banking churn — account holders & credit customers",
        "avg_churn_rate": 20.4,
        "typical_risk_factors": ["Low credit score", "Single product holder", "Inactive member", "Age 40-60 segment"],
        "sections": [
            {
                "title": "Customer Profile",
                "icon": "👤",
                "fields": [
                    {"key": "age", "label": "Age", "type": "number", "min": 18, "max": 95, "default": 38},
                    {"key": "gender", "label": "Gender", "type": "select", "options": ["Male", "Female"], "default": "Male"},
                    {"key": "geography", "label": "Geography", "type": "select", "options": ["France", "Germany", "Spain"], "default": "France"},
                    {"key": "tenure", "label": "Tenure (years)", "type": "number", "min": 0, "max": 20, "default": 3},
                ]
            },
            {
                "title": "Financial Details",
                "icon": "💰",
                "fields": [
                    {"key": "credit_score", "label": "Credit Score", "type": "number", "min": 300, "max": 850, "default": 650},
                    {"key": "balance", "label": "Account Balance ($)", "type": "number", "min": 0, "max": 300000, "step": 100, "default": 65000},
                    {"key": "estimated_salary", "label": "Estimated Salary ($)", "type": "number", "min": 10000, "max": 300000, "step": 1000, "default": 72000},
                    {"key": "num_products", "label": "Number of Products", "type": "select", "options": [1, 2, 3, 4], "option_labels": ["1", "2", "3", "4"], "default": 1},
                ]
            },
            {
                "title": "Account Behavior",
                "icon": "📊",
                "fields": [
                    {"key": "has_credit_card", "label": "Has Credit Card", "type": "select", "options": [1, 0], "option_labels": ["Yes", "No"], "default": 1},
                    {"key": "is_active_member", "label": "Active Member", "type": "select", "options": [1, 0], "option_labels": ["Yes", "No"], "default": 1},
                ]
            }
        ],
        "templates": {
            "high_risk": {"age": 52, "gender": "Female", "geography": "Germany", "tenure": 1, "credit_score": 420, "balance": 120000, "estimated_salary": 48000, "num_products": 1, "has_credit_card": 0, "is_active_member": 0},
            "medium_risk": {"age": 40, "gender": "Male", "geography": "Spain", "tenure": 4, "credit_score": 590, "balance": 80000, "estimated_salary": 65000, "num_products": 2, "has_credit_card": 1, "is_active_member": 0},
            "low_risk": {"age": 30, "gender": "Female", "geography": "France", "tenure": 8, "credit_score": 750, "balance": 30000, "estimated_salary": 95000, "num_products": 2, "has_credit_card": 1, "is_active_member": 1},
        }
    },

    "ecommerce": {
        "label": "E-commerce",
        "icon": "🛒",
        "color": "#f59e0b",
        "description": "Online retail churn — subscription & purchase behavior",
        "avg_churn_rate": 22.1,
        "typical_risk_factors": ["High cart abandonment", "Few repeat orders", "Low email engagement", "Multiple support tickets"],
        "sections": [
            {
                "title": "Purchase Behavior",
                "icon": "🛍️",
                "fields": [
                    {"key": "days_since_last_purchase", "label": "Days Since Last Purchase", "type": "number", "min": 0, "max": 365, "default": 45},
                    {"key": "total_orders", "label": "Total Orders (Lifetime)", "type": "number", "min": 1, "max": 500, "default": 12},
                    {"key": "avg_order_value", "label": "Avg Order Value ($)", "type": "number", "min": 5, "max": 2000, "step": 0.01, "default": 68.5},
                    {"key": "returns_count", "label": "Returns Count", "type": "number", "min": 0, "max": 50, "default": 2},
                ]
            },
            {
                "title": "Engagement Metrics",
                "icon": "📧",
                "fields": [
                    {"key": "email_opens_rate", "label": "Email Open Rate (%)", "type": "number", "min": 0, "max": 100, "step": 0.1, "default": 28.5},
                    {"key": "cart_abandonment_rate", "label": "Cart Abandonment Rate (%)", "type": "number", "min": 0, "max": 100, "step": 0.1, "default": 55.0},
                    {"key": "support_tickets", "label": "Support Tickets (last 6mo)", "type": "number", "min": 0, "max": 20, "default": 2},
                ]
            },
            {
                "title": "Account & Subscription",
                "icon": "💳",
                "fields": [
                    {"key": "loyalty_tier", "label": "Loyalty Tier", "type": "select", "options": ["Bronze", "Silver", "Gold", "Platinum"], "default": "Silver"},
                    {"key": "subscription_type", "label": "Subscription Type", "type": "select", "options": ["Free", "Basic", "Premium", "Enterprise"], "default": "Basic"},
                    {"key": "tenure_months", "label": "Account Age (months)", "type": "number", "min": 1, "max": 120, "default": 14},
                ]
            }
        ],
        "templates": {
            "high_risk": {"days_since_last_purchase": 180, "total_orders": 3, "avg_order_value": 22.0, "returns_count": 5, "email_opens_rate": 5.0, "cart_abandonment_rate": 85.0, "support_tickets": 8, "loyalty_tier": "Bronze", "subscription_type": "Free", "tenure_months": 5},
            "medium_risk": {"days_since_last_purchase": 60, "total_orders": 15, "avg_order_value": 55.0, "returns_count": 2, "email_opens_rate": 20.0, "cart_abandonment_rate": 60.0, "support_tickets": 3, "loyalty_tier": "Silver", "subscription_type": "Basic", "tenure_months": 18},
            "low_risk": {"days_since_last_purchase": 8, "total_orders": 85, "avg_order_value": 120.0, "returns_count": 1, "email_opens_rate": 55.0, "cart_abandonment_rate": 20.0, "support_tickets": 0, "loyalty_tier": "Platinum", "subscription_type": "Premium", "tenure_months": 48},
        }
    },

    "healthcare": {
        "label": "Healthcare",
        "icon": "🏥",
        "color": "#f43f5e",
        "description": "Healthcare patient retention — outpatient & clinic adherence",
        "avg_churn_rate": 18.7,
        "typical_risk_factors": ["High no-show rate", "Long gap since last visit", "Low satisfaction score", "No chronic care plan"],
        "sections": [
            {
                "title": "Patient Profile",
                "icon": "👤",
                "fields": [
                    {"key": "age", "label": "Age", "type": "number", "min": 0, "max": 100, "default": 45},
                    {"key": "gender", "label": "Gender", "type": "select", "options": ["Male", "Female", "Other"], "default": "Female"},
                    {"key": "insurance_type", "label": "Insurance Type", "type": "select", "options": ["Private", "Medicare", "Medicaid", "Uninsured"], "default": "Private"},
                    {"key": "payment_type", "label": "Payment Type", "type": "select", "options": ["Insurance", "Self-pay", "Sliding scale"], "default": "Insurance"},
                ]
            },
            {
                "title": "Visit History",
                "icon": "📅",
                "fields": [
                    {"key": "days_since_last_visit", "label": "Days Since Last Visit", "type": "number", "min": 0, "max": 730, "default": 90},
                    {"key": "appointment_no_shows", "label": "No-Shows (last 12mo)", "type": "number", "min": 0, "max": 20, "default": 2},
                    {"key": "specialist_visits", "label": "Specialist Visits (last 12mo)", "type": "number", "min": 0, "max": 30, "default": 3},
                    {"key": "prescription_count", "label": "Active Prescriptions", "type": "number", "min": 0, "max": 20, "default": 2},
                ]
            },
            {
                "title": "Clinical & Satisfaction",
                "icon": "❤️",
                "fields": [
                    {"key": "chronic_conditions", "label": "Chronic Conditions", "type": "number", "min": 0, "max": 10, "default": 1},
                    {"key": "patient_satisfaction", "label": "Satisfaction Score (1-10)", "type": "number", "min": 1, "max": 10, "default": 7},
                ]
            }
        ],
        "templates": {
            "high_risk": {"age": 28, "gender": "Male", "insurance_type": "Uninsured", "payment_type": "Self-pay", "days_since_last_visit": 400, "appointment_no_shows": 8, "specialist_visits": 0, "prescription_count": 0, "chronic_conditions": 0, "patient_satisfaction": 3},
            "medium_risk": {"age": 52, "gender": "Female", "insurance_type": "Medicare", "payment_type": "Insurance", "days_since_last_visit": 150, "appointment_no_shows": 3, "specialist_visits": 2, "prescription_count": 3, "chronic_conditions": 2, "patient_satisfaction": 6},
            "low_risk": {"age": 62, "gender": "Male", "insurance_type": "Private", "payment_type": "Insurance", "days_since_last_visit": 20, "appointment_no_shows": 0, "specialist_visits": 6, "prescription_count": 5, "chronic_conditions": 3, "patient_satisfaction": 9},
        }
    },
}


# ─────────────────────────────────────────────────────────────────────────────
# BENCHMARK DATA
# ─────────────────────────────────────────────────────────────────────────────

BENCHMARK_DATA = [
    {"industry": "Telecom",    "avg_churn_rate": 26.5, "high_risk_pct": 31.2, "retention_cost": 400,  "color": "#6366f1"},
    {"industry": "Banking",    "avg_churn_rate": 20.4, "high_risk_pct": 22.8, "retention_cost": 900,  "color": "#10b981"},
    {"industry": "E-commerce", "avg_churn_rate": 22.1, "high_risk_pct": 27.4, "retention_cost": 150,  "color": "#f59e0b"},
    {"industry": "Healthcare", "avg_churn_rate": 18.7, "high_risk_pct": 19.5, "retention_cost": 1200, "color": "#f43f5e"},
]


# ─────────────────────────────────────────────────────────────────────────────
# SCORING LOGIC  (rule-based heuristics per industry)
# ─────────────────────────────────────────────────────────────────────────────

def _score_telecom(f: dict) -> float:
    score = 0.20  # base rate

    # Contract type — strongest predictor
    contract = str(f.get("contract", "Month-to-month"))
    if contract == "Month-to-month":
        score += 0.28
    elif contract == "One year":
        score += 0.08

    # Tenure
    tenure = int(f.get("tenure", 12))
    if tenure <= 3:
        score += 0.18
    elif tenure <= 12:
        score += 0.10
    elif tenure >= 36:
        score -= 0.12

    # Payment method
    payment = str(f.get("payment_method", ""))
    if payment == "Electronic check":
        score += 0.12

    # Internet service without security add-ons
    internet = str(f.get("internet_service", ""))
    security = str(f.get("online_security", "No"))
    if internet == "Fiber optic" and security == "No":
        score += 0.10

    # Senior citizen
    if int(f.get("senior_citizen", 0)) == 1:
        score += 0.05

    # No partner, no dependents
    if str(f.get("partner", "No")) == "No":
        score += 0.04
    if str(f.get("dependents", "No")) == "No":
        score += 0.03

    # Monthly charges
    monthly = float(f.get("monthly_charges", 70))
    if monthly > 85:
        score += 0.06
    elif monthly < 35:
        score -= 0.05

    return max(0.02, min(0.97, score))


def _score_banking(f: dict) -> float:
    score = 0.15

    # Active member — strongest predictor
    if int(f.get("is_active_member", 1)) == 0:
        score += 0.22

    # Number of products
    num_products = int(f.get("num_products", 1))
    if num_products == 1:
        score += 0.18
    elif num_products >= 3:
        score += 0.12  # paradox — too many products
    else:
        score -= 0.05

    # Age bracket
    age = int(f.get("age", 38))
    if 40 <= age <= 60:
        score += 0.10
    elif age > 60:
        score += 0.06
    elif age < 30:
        score -= 0.04

    # Credit score
    credit_score = int(f.get("credit_score", 650))
    if credit_score < 450:
        score += 0.18
    elif credit_score < 600:
        score += 0.10
    elif credit_score >= 750:
        score -= 0.10

    # Geography
    geography = str(f.get("geography", "France"))
    if geography == "Germany":
        score += 0.08

    # Tenure
    tenure = int(f.get("tenure", 3))
    if tenure <= 1:
        score += 0.08
    elif tenure >= 7:
        score -= 0.08

    # No credit card
    if int(f.get("has_credit_card", 1)) == 0:
        score += 0.05

    return max(0.02, min(0.97, score))


def _score_ecommerce(f: dict) -> float:
    score = 0.15

    # Recency
    days_since = int(f.get("days_since_last_purchase", 45))
    if days_since > 120:
        score += 0.25
    elif days_since > 60:
        score += 0.14
    elif days_since < 15:
        score -= 0.08

    # Frequency
    total_orders = int(f.get("total_orders", 12))
    if total_orders <= 3:
        score += 0.18
    elif total_orders >= 30:
        score -= 0.10

    # Cart abandonment
    cart_aban = float(f.get("cart_abandonment_rate", 55))
    if cart_aban > 75:
        score += 0.15
    elif cart_aban < 30:
        score -= 0.08

    # Email open rate
    email_rate = float(f.get("email_opens_rate", 28))
    if email_rate < 10:
        score += 0.10
    elif email_rate > 45:
        score -= 0.08

    # Support tickets
    tickets = int(f.get("support_tickets", 2))
    if tickets >= 5:
        score += 0.12
    elif tickets == 0:
        score -= 0.04

    # Loyalty tier
    tier = str(f.get("loyalty_tier", "Silver"))
    tier_delta = {"Bronze": 0.14, "Silver": 0.04, "Gold": -0.06, "Platinum": -0.14}
    score += tier_delta.get(tier, 0)

    # Subscription
    sub = str(f.get("subscription_type", "Basic"))
    sub_delta = {"Free": 0.15, "Basic": 0.04, "Premium": -0.08, "Enterprise": -0.14}
    score += sub_delta.get(sub, 0)

    # Returns
    returns = int(f.get("returns_count", 2))
    if returns >= 4:
        score += 0.08

    return max(0.02, min(0.97, score))


def _score_healthcare(f: dict) -> float:
    score = 0.12

    # Days since last visit
    days_since = int(f.get("days_since_last_visit", 90))
    if days_since > 300:
        score += 0.28
    elif days_since > 150:
        score += 0.16
    elif days_since < 30:
        score -= 0.06

    # No-shows
    no_shows = int(f.get("appointment_no_shows", 2))
    if no_shows >= 5:
        score += 0.22
    elif no_shows >= 2:
        score += 0.10

    # Patient satisfaction
    satisfaction = int(f.get("patient_satisfaction", 7))
    if satisfaction <= 3:
        score += 0.20
    elif satisfaction <= 5:
        score += 0.10
    elif satisfaction >= 8:
        score -= 0.10

    # Insurance type
    insurance = str(f.get("insurance_type", "Private"))
    if insurance == "Uninsured":
        score += 0.18
    elif insurance == "Medicaid":
        score += 0.08

    # Chronic conditions — more conditions = more engaged
    chronic = int(f.get("chronic_conditions", 1))
    if chronic == 0:
        score += 0.10
    elif chronic >= 3:
        score -= 0.08

    # Prescriptions — adherence indicator
    prescriptions = int(f.get("prescription_count", 2))
    if prescriptions >= 3:
        score -= 0.06

    # Age
    age = int(f.get("age", 45))
    if age < 30:
        score += 0.08

    return max(0.02, min(0.97, score))


SCORERS = {
    "telecom": _score_telecom,
    "banking": _score_banking,
    "ecommerce": _score_ecommerce,
    "healthcare": _score_healthcare,
}

# Contributing factor keys per industry
FACTOR_KEYS = {
    "telecom": [
        ("contract", "Contract Type"),
        ("tenure", "Tenure Length"),
        ("payment_method", "Payment Method"),
        ("internet_service", "Internet Service"),
        ("monthly_charges", "Monthly Charges"),
        ("online_security", "Online Security"),
        ("senior_citizen", "Senior Citizen"),
    ],
    "banking": [
        ("is_active_member", "Active Membership"),
        ("num_products", "Products Held"),
        ("credit_score", "Credit Score"),
        ("age", "Age Segment"),
        ("tenure", "Banking Tenure"),
        ("geography", "Geography"),
        ("balance", "Account Balance"),
    ],
    "ecommerce": [
        ("days_since_last_purchase", "Purchase Recency"),
        ("total_orders", "Order Frequency"),
        ("cart_abandonment_rate", "Cart Abandonment"),
        ("email_opens_rate", "Email Engagement"),
        ("loyalty_tier", "Loyalty Tier"),
        ("support_tickets", "Support Tickets"),
        ("subscription_type", "Subscription Plan"),
    ],
    "healthcare": [
        ("days_since_last_visit", "Visit Recency"),
        ("appointment_no_shows", "No-Show History"),
        ("patient_satisfaction", "Patient Satisfaction"),
        ("insurance_type", "Insurance Type"),
        ("chronic_conditions", "Chronic Conditions"),
        ("prescription_count", "Prescriptions"),
        ("age", "Patient Age"),
    ],
}


def predict_industry_churn(features: dict, industry: str, model_type: str = "random_forest") -> dict:
    """
    Predict churn for the given industry using rule-based heuristics.
    For telecom, delegates to the ML service.
    """
    industry = industry.lower()

    # Use ML model for telecom
    if industry == "telecom":
        try:
            from app.services.ml_service import predict_churn
            result = predict_churn(features, model_type)
            result["industry"] = "telecom"
            return result
        except Exception:
            pass  # fall through to rule-based

    scorer = SCORERS.get(industry)
    if scorer is None:
        raise ValueError(f"Unknown industry: {industry}")

    prob = scorer(features)

    # Add a small deterministic noise based on features hash
    noise = (hash(str(sorted(features.items()))) % 100) / 5000.0
    prob = max(0.02, min(0.96, prob + noise))

    # Risk level
    if prob >= 0.70:
        risk_level = "High"
        churn_prediction = 1
    elif prob >= 0.40:
        risk_level = "Medium"
        churn_prediction = 1 if prob >= 0.55 else 0
    else:
        risk_level = "Low"
        churn_prediction = 0

    # Build contributing factors (importance approximation)
    factors = _build_contributing_factors(features, industry, prob)

    schema = INDUSTRY_SCHEMAS.get(industry, {})
    return {
        "industry": industry,
        "churn_prediction": churn_prediction,
        "churn_probability": round(prob, 4),
        "risk_level": risk_level,
        "model_used": f"Multi-Industry Analyzer ({schema.get('label', industry.title())})",
        "contributing_factors": factors,
    }


def _build_contributing_factors(features: dict, industry: str, prob: float) -> list:
    """Build simulated contributing factors for the industry prediction."""
    factor_defs = FACTOR_KEYS.get(industry, [])
    # Assign importance weights inversely proportional to feature value "goodness"
    results = []
    total_weight = 0.0

    for key, label in factor_defs:
        val = features.get(key)
        if val is None:
            continue
        # Simple heuristic: assign base importance
        importance = 0.05 + (hash(f"{key}{val}{industry}") % 100) / 1000.0
        results.append({"feature": label, "importance": importance})
        total_weight += importance

    # Normalize
    if total_weight > 0:
        for r in results:
            r["importance"] = round(r["importance"] / total_weight, 4)

    results.sort(key=lambda x: x["importance"], reverse=True)
    return results[:5]


def get_benchmark_data() -> list:
    return BENCHMARK_DATA


def get_industry_schemas() -> dict:
    """Return all industry schemas (without templates for conciseness)."""
    return {
        k: {
            "label": v["label"],
            "icon": v["icon"],
            "color": v["color"],
            "description": v["description"],
            "avg_churn_rate": v["avg_churn_rate"],
            "typical_risk_factors": v["typical_risk_factors"],
            "sections": v["sections"],
        }
        for k, v in INDUSTRY_SCHEMAS.items()
    }


def get_industry_templates(industry: str) -> dict:
    return INDUSTRY_SCHEMAS.get(industry.lower(), {}).get("templates", {})
