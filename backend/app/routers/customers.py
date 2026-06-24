"""Customer data API routes."""

import os
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query
from app.utils.security import get_current_user
from app.models.user import User
from typing import List, Optional

router = APIRouter(prefix="/api/customers", tags=["Customers"])


def _safe_float(value, default=0.0):
    """Safely convert a value to float, returning default on failure."""
    try:
        if value is None or (isinstance(value, str) and value.strip() == ""):
            return default
        return float(value)
    except (ValueError, TypeError):
        return default

# Load customer data from CSV
_customers_df = None


def get_customers_data():
    """Load customer data from the dataset."""
    global _customers_df
    if _customers_df is None:
        data_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "ml", "data", "telco_churn.csv"
        )
        if os.path.exists(data_path):
            _customers_df = pd.read_csv(data_path)
        else:
            _customers_df = pd.DataFrame()
    return _customers_df


@router.get("/")
def list_customers(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    risk_filter: Optional[str] = None,
    contract_filter: Optional[str] = None,
    sort_by: Optional[str] = "customerID",
    sort_order: Optional[str] = "asc",
    current_user: User = Depends(get_current_user)
):
    """Get paginated customer list with churn risk data."""
    df = get_customers_data()
    if df.empty:
        return {"customers": [], "total": 0, "page": page, "per_page": per_page}

    # Apply search filter
    if search:
        mask = df["customerID"].str.contains(search, case=False, na=False)
        df = df[mask]

    # Apply contract filter
    if contract_filter and contract_filter != "all":
        df = df[df["Contract"] == contract_filter]

    # Apply risk filter based on churn column
    if risk_filter and risk_filter != "all":
        if risk_filter == "High":
            df = df[df["Churn"] == 1]
        elif risk_filter == "Low":
            df = df[df["Churn"] == 0]

    # Sort
    if sort_by in df.columns:
        ascending = sort_order == "asc"
        df = df.sort_values(by=sort_by, ascending=ascending)

    total = len(df)
    start = (page - 1) * per_page
    end = start + per_page
    page_data = df.iloc[start:end]

    customers = []
    for _, row in page_data.iterrows():
        customers.append({
            "id": row.get("customerID", ""),
            "gender": row.get("gender", ""),
            "seniorCitizen": int(row.get("SeniorCitizen", 0)),
            "partner": row.get("Partner", ""),
            "dependents": row.get("Dependents", ""),
            "tenure": int(row.get("tenure", 0)),
            "phoneService": row.get("PhoneService", ""),
            "internetService": row.get("InternetService", ""),
            "contract": row.get("Contract", ""),
            "monthlyCharges": float(row.get("MonthlyCharges", 0)),
            "totalCharges": _safe_float(row.get("TotalCharges", 0)),
            "churn": int(row.get("Churn", 0)),
            "riskLevel": "High" if row.get("Churn", 0) == 1 else "Low",
            "paymentMethod": row.get("PaymentMethod", ""),
        })

    return {
        "customers": customers,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page
    }


@router.get("/analytics")
def get_customer_analytics(current_user: User = Depends(get_current_user)):
    """Get aggregate analytics on customer churn."""
    df = get_customers_data()
    if df.empty:
        return {"error": "No data available"}

    # Churn by contract type
    churn_by_contract = []
    for contract in df["Contract"].unique():
        subset = df[df["Contract"] == contract]
        churn_by_contract.append({
            "contract": contract,
            "total": len(subset),
            "churned": int(subset["Churn"].sum()),
            "churnRate": round(subset["Churn"].mean() * 100, 1)
        })

    # Churn by internet service
    churn_by_internet = []
    for service in df["InternetService"].unique():
        subset = df[df["InternetService"] == service]
        churn_by_internet.append({
            "service": service,
            "total": len(subset),
            "churned": int(subset["Churn"].sum()),
            "churnRate": round(subset["Churn"].mean() * 100, 1)
        })

    # Churn by payment method
    churn_by_payment = []
    for method in df["PaymentMethod"].unique():
        subset = df[df["PaymentMethod"] == method]
        churn_by_payment.append({
            "method": method,
            "total": len(subset),
            "churned": int(subset["Churn"].sum()),
            "churnRate": round(subset["Churn"].mean() * 100, 1)
        })

    # Tenure distribution
    tenure_bins = [(0, 12), (13, 24), (25, 36), (37, 48), (49, 60), (61, 72)]
    tenure_distribution = []
    for low, high in tenure_bins:
        subset = df[(df["tenure"] >= low) & (df["tenure"] <= high)]
        tenure_distribution.append({
            "range": f"{low}-{high}",
            "total": len(subset),
            "churned": int(subset["Churn"].sum()),
            "churnRate": round(subset["Churn"].mean() * 100, 1) if len(subset) > 0 else 0
        })

    # Monthly charges distribution
    charges_bins = [(0, 30), (30, 50), (50, 70), (70, 90), (90, 120)]
    charges_distribution = []
    for low, high in charges_bins:
        subset = df[(df["MonthlyCharges"] >= low) & (df["MonthlyCharges"] < high)]
        charges_distribution.append({
            "range": f"${low}-${high}",
            "total": len(subset),
            "churned": int(subset["Churn"].sum()),
            "churnRate": round(subset["Churn"].mean() * 100, 1) if len(subset) > 0 else 0
        })

    # Overall stats
    overall = {
        "totalCustomers": len(df),
        "totalChurned": int(df["Churn"].sum()),
        "overallChurnRate": round(df["Churn"].mean() * 100, 1),
        "avgMonthlyCharges": round(df["MonthlyCharges"].mean(), 2),
        "avgTenure": round(df["tenure"].mean(), 1),
        "avgTotalCharges": round(df["TotalCharges"].mean(), 2),
    }

    return {
        "overall": overall,
        "churnByContract": churn_by_contract,
        "churnByInternet": churn_by_internet,
        "churnByPayment": churn_by_payment,
        "tenureDistribution": tenure_distribution,
        "chargesDistribution": charges_distribution,
    }
