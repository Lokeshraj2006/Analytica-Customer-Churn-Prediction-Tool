"""Customer Segmentation Service — K-Means clustering with rule-based labeling."""

import json
import numpy as np
from typing import Optional
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler


# ─────────────────────────────────────────────────────────────────────────────
# Segment label rules (applied post-clustering via centroid analysis)
# ─────────────────────────────────────────────────────────────────────────────

SEGMENT_DEFINITIONS = [
    {
        "label": "Loyal Champions",
        "color": "#10b981",
        "icon": "👑",
        "description": "Long tenure, low churn risk, high CLV — your most valuable retained customers",
        "rule": lambda c: c["churn_probability"] < 0.3 and c["tenure"] > 30,
    },
    {
        "label": "High Value Customers",
        "color": "#8b5cf6",
        "icon": "💎",
        "description": "High monthly charges, moderate risk — revenue engines to protect",
        "rule": lambda c: c["monthly_charges"] > 70 and c["churn_probability"] < 0.5,
    },
    {
        "label": "Price Sensitive",
        "color": "#f59e0b",
        "icon": "💰",
        "description": "Low charges, high churn risk — offer bundle deals and loyalty discounts",
        "rule": lambda c: c["monthly_charges"] < 50 and c["churn_probability"] >= 0.4,
    },
    {
        "label": "High Risk Churners",
        "color": "#f43f5e",
        "icon": "⚠️",
        "description": "High churn probability — immediate retention action required",
        "rule": lambda c: c["churn_probability"] >= 0.6,
    },
    {
        "label": "Growing Accounts",
        "color": "#06b6d4",
        "icon": "📈",
        "description": "New customers with high charges — onboarding support recommended",
        "rule": lambda c: c["tenure"] <= 12 and c["monthly_charges"] >= 60,
    },
]

DEFAULT_SEGMENT = {
    "label": "Standard Customers",
    "color": "#64748b",
    "icon": "👤",
    "description": "Mid-tier customers with average risk profile",
}


def _assign_label(centroid: dict) -> dict:
    """Assign a segment label based on centroid characteristics."""
    for defn in SEGMENT_DEFINITIONS:
        try:
            if defn["rule"](centroid):
                return {"label": defn["label"], "color": defn["color"], "icon": defn["icon"], "description": defn["description"]}
        except Exception:
            continue
    return DEFAULT_SEGMENT


# ─────────────────────────────────────────────────────────────────────────────
# Core segmentation function
# ─────────────────────────────────────────────────────────────────────────────

def run_segmentation(predictions: list, n_clusters: int = 4) -> dict:
    """
    Perform K-Means segmentation on a list of Prediction ORM objects.

    Features used for clustering:
        [churn_probability, monthly_charges, tenure, total_charges]

    Returns a dict with:
        segments: list of segment summaries
        assignments: list of { prediction_id, segment_label, segment_index }
    """
    if not predictions:
        return {"error": "No predictions to segment", "segments": [], "assignments": []}

    if len(predictions) < n_clusters:
        n_clusters = max(2, len(predictions))

    # Build feature matrix
    records = []
    for p in predictions:
        records.append({
            "prediction_id": p.id,
            "churn_probability": float(p.churn_probability or 0),
            "monthly_charges": float(p.monthly_charges or 0),
            "tenure": float(p.tenure or 0),
            "total_charges": float(p.total_charges or 0),
            "churn_prediction": int(p.churn_prediction or 0),
            "risk_level": p.risk_level or "Low",
            "contract": p.contract or "Unknown",
        })

    X = np.array([[r["churn_probability"], r["monthly_charges"], r["tenure"], r["total_charges"]] for r in records])

    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Fit K-Means
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    cluster_labels = kmeans.fit_predict(X_scaled)

    # Compute centroid stats in original feature space
    centroids_scaled = kmeans.cluster_centers_
    centroids_orig = scaler.inverse_transform(centroids_scaled)

    # Build segment summaries
    segment_info = {}
    for cluster_idx in range(n_clusters):
        mask = cluster_labels == cluster_idx
        cluster_records = [r for r, m in zip(records, mask) if m]

        centroid_dict = {
            "churn_probability": float(centroids_orig[cluster_idx][0]),
            "monthly_charges": float(centroids_orig[cluster_idx][1]),
            "tenure": float(centroids_orig[cluster_idx][2]),
        }

        label_info = _assign_label(centroid_dict)

        churned_in_cluster = sum(1 for r in cluster_records if r["churn_prediction"] == 1)
        avg_charges = np.mean([r["monthly_charges"] for r in cluster_records]) if cluster_records else 0

        segment_info[cluster_idx] = {
            "index": cluster_idx,
            **label_info,
            "size": len(cluster_records),
            "size_pct": round(len(cluster_records) / len(records) * 100, 1),
            "avg_churn_probability": round(float(np.mean([r["churn_probability"] for r in cluster_records])), 3),
            "avg_monthly_charges": round(float(avg_charges), 2),
            "avg_tenure": round(float(np.mean([r["tenure"] for r in cluster_records])), 1),
            "churn_count": churned_in_cluster,
            "churn_rate": round(churned_in_cluster / len(cluster_records) * 100, 1) if cluster_records else 0,
            "estimated_monthly_revenue": round(float(sum(r["monthly_charges"] for r in cluster_records)), 2),
            "centroid": {
                "churn_probability": round(centroid_dict["churn_probability"], 3),
                "monthly_charges": round(centroid_dict["monthly_charges"], 2),
                "tenure": round(centroid_dict["tenure"], 1),
            },
        }

    # Per-prediction assignments
    assignments = []
    for i, (record, cluster_idx) in enumerate(zip(records, cluster_labels)):
        seg = segment_info[int(cluster_idx)]
        assignments.append({
            "prediction_id": record["prediction_id"],
            "segment_index": int(cluster_idx),
            "segment_label": seg["label"],
            "segment_color": seg["color"],
            "churn_probability": record["churn_probability"],
            "monthly_charges": record["monthly_charges"],
            "tenure": record["tenure"],
        })

    # Sort segments by avg churn probability descending (highest risk first)
    segments = sorted(segment_info.values(), key=lambda s: s["avg_churn_probability"], reverse=True)

    return {
        "n_clusters": n_clusters,
        "total_customers": len(records),
        "segments": segments,
        "assignments": assignments,
        "inertia": round(float(kmeans.inertia_), 2),
    }
