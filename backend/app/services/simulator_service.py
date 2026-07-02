"""What-If Simulator service — compare original vs modified predictions."""

import copy
from typing import Optional
from app.services.ml_service import predict_churn, preprocess_input, FEATURE_COLUMNS
from app.services.clv_service import compute_clv


def _merge_features(base_features: dict, modifications: dict) -> dict:
    """Apply modifications on top of base features (shallow merge)."""
    merged = copy.deepcopy(base_features)
    merged.update(modifications)
    return merged


def compare_scenarios(
    base_features: dict,
    modifications: dict,
    model_type: str = "random_forest",
    industry: str = "telecom",
) -> dict:
    """
    Run prediction for base and modified feature set, return delta analysis.
    """
    modified_features = _merge_features(base_features, modifications)
    industry = industry.lower()

    # Run both predictions
    if industry == "telecom":
        orig_result = predict_churn(base_features, model_type)
        mod_result = predict_churn(modified_features, model_type)
    else:
        from app.services.industry_service import predict_industry_churn
        orig_result = predict_industry_churn(base_features, industry, model_type)
        mod_result = predict_industry_churn(modified_features, industry, model_type)

    # CLV for both scenarios
    monthly_key = "monthly_charges" if "monthly_charges" in base_features else "avg_order_value" if "avg_order_value" in base_features else "balance"
    tenure_key = "tenure" if "tenure" in base_features else "tenure_months" if "tenure_months" in base_features else "age"

    orig_monthly = float(base_features.get(monthly_key, 0))
    mod_monthly = float(modified_features.get(monthly_key, 0))
    if monthly_key == "balance":
        orig_monthly = orig_monthly / 1000.0  # scale down balance for CLV estimation
        mod_monthly = mod_monthly / 1000.0

    orig_tenure = int(base_features.get(tenure_key, 0))
    mod_tenure = int(modified_features.get(tenure_key, 0))

    orig_clv = compute_clv(
        monthly_charges=orig_monthly,
        tenure=orig_tenure,
        churn_probability=orig_result["churn_probability"],
    )
    mod_clv = compute_clv(
        monthly_charges=mod_monthly,
        tenure=mod_tenure,
        churn_probability=mod_result["churn_probability"],
    )

    # Probability delta
    prob_delta = mod_result["churn_probability"] - orig_result["churn_probability"]
    clv_delta = mod_clv["risk_adjusted_clv"] - orig_clv["risk_adjusted_clv"]
    rar_delta = mod_clv["revenue_at_risk"] - orig_clv["revenue_at_risk"]

    # Summarize changes
    changes = []
    for key, new_val in modifications.items():
        old_val = base_features.get(key)
        if old_val != new_val:
            changes.append({
                "feature": key,
                "from": old_val,
                "to": new_val,
            })

    return {
        "original": {
            **orig_result,
            "clv": orig_clv,
            "features": base_features,
        },
        "modified": {
            **mod_result,
            "clv": mod_clv,
            "features": modified_features,
        },
        "delta": {
            "probability_change": round(prob_delta, 4),
            "probability_change_pct": round(prob_delta * 100, 2),
            "risk_level_changed": orig_result["risk_level"] != mod_result["risk_level"],
            "original_risk": orig_result["risk_level"],
            "modified_risk": mod_result["risk_level"],
            "clv_impact": round(clv_delta, 2),
            "revenue_at_risk_saved": round(-rar_delta, 2),  # positive = savings
        },
        "modifications": changes,
        "model_used": orig_result["model_used"],
    }


def batch_scenarios(
    base_features: dict,
    scenarios: list[dict],
    model_type: str = "random_forest",
    industry: str = "telecom",
) -> list[dict]:
    """
    Run multiple what-if scenarios against the same base customer.
    """
    results = []
    for scenario in scenarios:
        name = scenario.get("name", "Unnamed")
        mods = scenario.get("modifications", {})
        try:
            result = compare_scenarios(base_features, mods, model_type, industry)
            results.append({"scenario_name": name, **result})
        except Exception as e:
            results.append({"scenario_name": name, "error": str(e)})
    return results


def get_preset_scenarios(base_features: dict, industry: str = "telecom") -> list[dict]:
    """
    Generate common retention intervention scenarios automatically by industry.
    """
    industry = industry.lower()
    
    if industry == "banking":
        return [
            {
                "name": "Activate Member",
                "modifications": {"is_active_member": 1},
                "description": "Increase engagement and member activity",
                "icon": "⚡",
            },
            {
                "name": "Cross-sell Product",
                "modifications": {"num_products": min(4, int(base_features.get("num_products", 1)) + 1)},
                "description": "Cross-sell an additional financial product",
                "icon": "💎",
            },
            {
                "name": "Acquire Credit Card",
                "modifications": {"has_credit_card": 1},
                "description": "Cross-sell standard credit card product",
                "icon": "💳",
            },
            {
                "name": "Increase Balance (+30%)",
                "modifications": {"balance": round(float(base_features.get("balance", 50000)) * 1.3, 2)},
                "description": "Incentivize balance growth via promotion",
                "icon": "📈",
            },
        ]
    elif industry == "ecommerce":
        return [
            {
                "name": "Remarketing Campaign",
                "modifications": {"days_since_last_purchase": max(1, int(base_features.get("days_since_last_purchase", 30) - 20))},
                "description": "Run coupon/remarketing campaign",
                "icon": "🛍️",
            },
            {
                "name": "Checkout Optimization",
                "modifications": {"cart_abandonment_rate": max(5.0, float(base_features.get("cart_abandonment_rate", 50.0)) * 0.5)},
                "description": "Implement checkout optimization to reduce abandonment",
                "icon": "🛒",
            },
            {
                "name": "Resolve Support Tickets",
                "modifications": {"support_tickets": 0},
                "description": "Resolve all outstanding support tickets",
                "icon": "🛠️",
            },
            {
                "name": "Upgrade Loyalty Tier",
                "modifications": {"loyalty_tier": "Gold" if base_features.get("loyalty_tier") != "Gold" else "Platinum"},
                "description": "Promote customer to the next loyalty status level",
                "icon": "👑",
            },
        ]
    elif industry == "healthcare":
        return [
            {
                "name": "Wellness Follow-Up",
                "modifications": {"days_since_last_visit": min(30, int(base_features.get("days_since_last_visit", 90)))},
                "description": "Schedule a routine wellness check-in visit",
                "icon": "🩺",
            },
            {
                "name": "SMS Appointment Reminders",
                "modifications": {"appointment_no_shows": 0},
                "description": "Set up automated reminders to eliminate no-shows",
                "icon": "📱",
            },
            {
                "name": "Improve Patient Satisfaction",
                "modifications": {"patient_satisfaction": max(8, int(base_features.get("patient_satisfaction", 5)) + 2)},
                "description": "Address complaints to improve experience rating",
                "icon": "⭐",
            },
        ]
        
    # Default (telecom)
    return [
        {
            "name": "Upgrade to Annual Contract",
            "modifications": {"contract": "One year"},
            "description": "Switch from month-to-month to one-year contract",
            "icon": "📋",
        },
        {
            "name": "Upgrade to 2-Year Contract",
            "modifications": {"contract": "Two year"},
            "description": "Switch to two-year commitment",
            "icon": "🔒",
        },
        {
            "name": "Add Tech Support",
            "modifications": {"tech_support": "Yes", "online_security": "Yes"},
            "description": "Bundle tech support + online security",
            "icon": "🛡️",
        },
        {
            "name": "Switch to Auto-Pay",
            "modifications": {"payment_method": "Bank transfer (automatic)", "paperless_billing": "Yes"},
            "description": "Enable automatic payment to reduce friction",
            "icon": "💳",
        },
        {
            "name": "Reduce Monthly Charges (-15%)",
            "modifications": {
                "monthly_charges": round(base_features.get("monthly_charges", 70) * 0.85, 2),
            },
            "description": "Offer a 15% discount to retain the customer",
            "icon": "💰",
        },
    ]
