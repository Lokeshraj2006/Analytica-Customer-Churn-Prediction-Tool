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
) -> dict:
    """
    Run prediction for base and modified feature set, return delta analysis.

    Args:
        base_features:   Original customer features (snake_case API keys)
        modifications:   Dict of feature → new value to override
        model_type:      ML model key to use

    Returns:
        {
            original: {...},    # original prediction + CLV
            modified: {...},    # modified prediction + CLV
            delta: {...},       # probability delta, risk change, CLV impact
            modifications: [...] # list of what changed
        }
    """
    modified_features = _merge_features(base_features, modifications)

    # Run both predictions
    orig_result = predict_churn(base_features, model_type)
    mod_result = predict_churn(modified_features, model_type)

    # CLV for both scenarios
    orig_clv = compute_clv(
        monthly_charges=base_features.get("monthly_charges", 0),
        tenure=base_features.get("tenure", 0),
        churn_probability=orig_result["churn_probability"],
    )
    mod_clv = compute_clv(
        monthly_charges=modified_features.get("monthly_charges", 0),
        tenure=modified_features.get("tenure", 0),
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
) -> list[dict]:
    """
    Run multiple what-if scenarios against the same base customer.

    Args:
        base_features: Original customer features
        scenarios: list of { name: str, modifications: dict }
        model_type: ML model key

    Returns:
        list of { name, ...compare_scenarios() result }
    """
    results = []
    for scenario in scenarios:
        name = scenario.get("name", "Unnamed")
        mods = scenario.get("modifications", {})
        try:
            result = compare_scenarios(base_features, mods, model_type)
            results.append({"scenario_name": name, **result})
        except Exception as e:
            results.append({"scenario_name": name, "error": str(e)})
    return results


def get_preset_scenarios(base_features: dict) -> list[dict]:
    """
    Generate common retention intervention scenarios automatically.
    Used by the frontend to auto-populate the simulator with smart defaults.
    """
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
