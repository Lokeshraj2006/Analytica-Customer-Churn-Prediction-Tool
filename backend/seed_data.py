import os
import sys
import json
import random
from datetime import datetime, timedelta, timezone

backend_path = r"c:\Users\LOKESHRAJ M\Analytica\backend"
sys.path.insert(0, backend_path)
os.chdir(backend_path)

from app.database import SessionLocal
from app.models.user import User, Prediction
from app.services.ml_service import load_models
from app.services.industry_service import predict_industry_churn

def seed():
    print("Loading models...")
    load_models()

    db = SessionLocal()
    try:
        users = db.query(User).all()
        if not users:
            print("No users found in database. Run the app or register first.")
            return

        print(f"Found {len(users)} users in database. Seeding all of them...")

        # Telecom Templates
        telecom_templates = [
            {"gender": "Male", "senior_citizen": 1, "partner": "No", "dependents": "No", "tenure": 2, "internet_service": "Fiber optic", "phone_service": "Yes", "multiple_lines": "Yes", "online_security": "No", "online_backup": "No", "device_protection": "No", "tech_support": "No", "streaming_tv": "No", "streaming_movies": "No", "contract": "Month-to-month", "paperless_billing": "Yes", "payment_method": "Electronic check", "monthly_charges": 98.5, "total_charges": 197.0},
            {"gender": "Female", "senior_citizen": 0, "partner": "Yes", "dependents": "No", "tenure": 18, "internet_service": "DSL", "phone_service": "Yes", "multiple_lines": "No", "online_security": "Yes", "online_backup": "No", "device_protection": "No", "tech_support": "No", "streaming_tv": "Yes", "streaming_movies": "No", "contract": "Month-to-month", "paperless_billing": "Yes", "payment_method": "Mailed check", "monthly_charges": 59.9, "total_charges": 1078.2},
            {"gender": "Female", "senior_citizen": 0, "partner": "Yes", "dependents": "Yes", "tenure": 48, "internet_service": "DSL", "phone_service": "Yes", "multiple_lines": "No", "online_security": "Yes", "online_backup": "Yes", "device_protection": "Yes", "tech_support": "Yes", "streaming_tv": "No", "streaming_movies": "No", "contract": "Two year", "paperless_billing": "No", "payment_method": "Bank transfer (automatic)", "monthly_charges": 45.5, "total_charges": 2184.0},
        ]

        # Banking Templates
        banking_templates = [
            { "age": 52, "gender": "Female", "geography": "Germany", "tenure": 1, "credit_score": 420, "balance": 120000, "estimated_salary": 48000, "num_products": 1, "has_credit_card": 0, "is_active_member": 0 },
            { "age": 40, "gender": "Male", "geography": "Spain", "tenure": 4, "credit_score": 590, "balance": 80000, "estimated_salary": 65000, "num_products": 2, "has_credit_card": 1, "is_active_member": 0 },
            { "age": 30, "gender": "Female", "geography": "France", "tenure": 8, "credit_score": 750, "balance": 30000, "estimated_salary": 95000, "num_products": 2, "has_credit_card": 1, "is_active_member": 1 }
        ]

        # E-Commerce Templates
        ecommerce_templates = [
            { "days_since_last_purchase": 180, "total_orders": 3, "avg_order_value": 22.0, "returns_count": 5, "email_opens_rate": 5.0, "cart_abandonment_rate": 85.0, "support_tickets": 8, "loyalty_tier": "Bronze", "subscription_type": "Free", "tenure_months": 5 },
            { "days_since_last_purchase": 60, "total_orders": 15, "avg_order_value": 55.0, "returns_count": 2, "email_opens_rate": 20.0, "cart_abandonment_rate": 60.0, "support_tickets": 3, "loyalty_tier": "Silver", "subscription_type": "Basic", "tenure_months": 18 },
            { "days_since_last_purchase": 8, "total_orders": 85, "avg_order_value": 120.0, "returns_count": 1, "email_opens_rate": 55.0, "cart_abandonment_rate": 20.0, "support_tickets": 0, "loyalty_tier": "Platinum", "subscription_type": "Premium", "tenure_months": 48 }
        ]

        # Healthcare Templates
        healthcare_templates = [
            { "age": 28, "gender": "Male", "insurance_type": "Uninsured", "payment_type": "Self-pay", "days_since_last_visit": 400, "appointment_no_shows": 8, "specialist_visits": 0, "prescription_count": 0, "chronic_conditions": 0, "patient_satisfaction": 3 },
            { "age": 52, "gender": "Female", "insurance_type": "Medicare", "payment_type": "Insurance", "days_since_last_visit": 150, "appointment_no_shows": 3, "specialist_visits": 2, "prescription_count": 3, "chronic_conditions": 2, "patient_satisfaction": 6 },
            { "age": 62, "gender": "Male", "insurance_type": "Private", "payment_type": "Insurance", "days_since_last_visit": 20, "appointment_no_shows": 0, "specialist_visits": 6, "prescription_count": 5, "chronic_conditions": 3, "patient_satisfaction": 9 }
        ]

        industries = [
            ("telecom", telecom_templates),
            ("banking", banking_templates),
            ("ecommerce", ecommerce_templates),
            ("healthcare", healthcare_templates)
        ]

        for user in users:
            print(f"\nClearing and seeding predictions for user: {user.username} (ID: {user.id})")
            db.query(Prediction).filter(Prediction.user_id == user.id).delete()
            db.commit()

            for ind_name, templates in industries:
                print(f"  Generating predictions for {ind_name}...")
                for i in range(15): # 15 predictions per industry
                    base = random.choice(templates)
                    features = {**base}
                    
                    if ind_name == "telecom":
                        features["tenure"] = max(1, min(72, features["tenure"] + random.randint(-5, 5)))
                        features["monthly_charges"] = round(max(15.0, min(190.0, features["monthly_charges"] + random.uniform(-10, 10))), 2)
                        features["total_charges"] = round(features["monthly_charges"] * features["tenure"], 2)
                    elif ind_name == "banking":
                        features["age"] = max(18, min(85, features["age"] + random.randint(-8, 8)))
                        features["credit_score"] = max(350, min(850, features["credit_score"] + random.randint(-50, 50)))
                        features["balance"] = round(max(0.0, features["balance"] + random.uniform(-15000, 15000)), 2)
                        features["estimated_salary"] = round(max(10000.0, features["estimated_salary"] + random.uniform(-10000, 10000)), 2)
                        features["tenure"] = max(0, min(20, features["tenure"] + random.randint(-2, 2)))
                    elif ind_name == "ecommerce":
                        features["days_since_last_purchase"] = max(0, features["days_since_last_purchase"] + random.randint(-15, 15))
                        features["total_orders"] = max(1, features["total_orders"] + random.randint(-5, 10))
                        features["avg_order_value"] = round(max(5.0, features["avg_order_value"] + random.uniform(-15, 25)), 2)
                        features["tenure_months"] = max(1, features["tenure_months"] + random.randint(-4, 4))
                    elif ind_name == "healthcare":
                        features["age"] = max(18, min(90, features["age"] + random.randint(-10, 10)))
                        features["days_since_last_visit"] = max(0, features["days_since_last_visit"] + random.randint(-30, 30))
                        features["appointment_no_shows"] = max(0, features["appointment_no_shows"] + random.randint(-2, 2))
                        features["patient_satisfaction"] = max(1, min(10, features["patient_satisfaction"] + random.randint(-2, 2)))

                    model_type = random.choice(["random_forest", "xgboost", "gradient_boosting", "logistic_regression", "decision_tree", "svm", "knn"])
                    res = predict_industry_churn(features, ind_name, model_type)

                    p = Prediction(
                        user_id=user.id,
                        industry=ind_name,
                        churn_prediction=res["churn_prediction"],
                        churn_probability=res["churn_probability"],
                        risk_level=res["risk_level"],
                        model_used=res["model_used"],
                        confidence=round(max(res["churn_probability"], 1 - res["churn_probability"]), 4),
                        input_features_json=json.dumps(features),
                        top_features_json=json.dumps(res.get("contributing_factors", [])),
                        created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(0, 30), hours=random.randint(0, 23))
                    )

                    # Populate generic columns
                    if "tenure" in features:
                        p.tenure = int(features["tenure"])
                    elif "tenure_months" in features:
                        p.tenure = int(features["tenure_months"])

                    if "monthly_charges" in features:
                        p.monthly_charges = float(features["monthly_charges"])
                    elif "avg_order_value" in features:
                        p.monthly_charges = float(features["avg_order_value"])
                    elif "balance" in features:
                        p.monthly_charges = float(features["balance"]) / 1000.0

                    if "contract" in features:
                        p.contract = str(features["contract"])
                    elif "subscription_type" in features:
                        p.contract = str(features["subscription_type"])
                    elif "insurance_type" in features:
                        p.contract = str(features["insurance_type"])

                    # Telecom specific columns
                    if ind_name == "telecom":
                        for col in ["gender", "senior_citizen", "partner", "dependents", "phone_service",
                                    "multiple_lines", "internet_service", "online_security", "online_backup",
                                    "device_protection", "tech_support", "streaming_tv", "streaming_movies",
                                    "paperless_billing", "payment_method", "total_charges"]:
                            if col in features:
                                setattr(p, col, features[col])

                    # CLV calculations
                    from app.services.clv_service import compute_clv
                    clv = compute_clv(p.monthly_charges, p.tenure, p.churn_probability)
                    p.clv_score = clv["base_clv"]
                    p.risk_adjusted_clv = clv["risk_adjusted_clv"]
                    p.revenue_at_risk = clv["revenue_at_risk"]

                    # Assigned segment
                    from app.services.segment_service import _assign_label
                    seg = _assign_label({"churn_probability": p.churn_probability, "monthly_charges": p.monthly_charges, "tenure": p.tenure})
                    p.segment_label = seg["label"]

                    db.add(p)
                
                db.commit()

        print("\nAll industries seeded successfully for ALL users in database!")

    finally:
        db.close()

if __name__ == "__main__":
    seed()
