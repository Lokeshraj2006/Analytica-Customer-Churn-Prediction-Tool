"""
Train 7 churn prediction models with SMOTE and dual dataset support.

Models:
  1. Random Forest       — Ensemble of 150 trees
  2. Decision Tree       — Single tree (max_depth 8)
  3. XGBoost             — Gradient-boosted trees (GPU-optional)
  4. Gradient Boosting   — sklearn GBM
  5. Logistic Regression — Linear baseline
  6. K-Nearest Neighbors — Distance-based
  7. Support Vector Machine — RBF kernel

Dataset priority:
  1. Real Kaggle Telco CSV at app/ml/data/WA_Fn-UseC_-Telco-Customer-Churn.csv
  2. Synthetic data (mirrors real distribution) — auto-generated if real data absent

Run:  python -m app.ml.train_model
"""

import os
import sys
import numpy as np

# Force UTF-8 output on Windows to support emoji characters
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

import pandas as pd
import joblib

from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC
from sklearn.metrics import (
    accuracy_score, f1_score, classification_report,
    confusion_matrix, roc_auc_score
)

try:
    from xgboost import XGBClassifier
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False
    print("[WARN] XGBoost not installed — will skip XGBoost model. pip install xgboost")

try:
    from imblearn.over_sampling import SMOTE
    SMOTE_AVAILABLE = True
except ImportError:
    SMOTE_AVAILABLE = False
    print("[WARN] imbalanced-learn not installed — will use class_weight='balanced'. pip install imbalanced-learn")

# Directory for saving artifacts
ML_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(ML_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

REAL_CSV_PATH = os.path.join(DATA_DIR, "WA_Fn-UseC_-Telco-Customer-Churn.csv")

# Feature columns (order matters for model inference)
FEATURE_COLUMNS = [
    "gender", "SeniorCitizen", "Partner", "Dependents", "tenure",
    "PhoneService", "MultipleLines", "InternetService", "OnlineSecurity",
    "OnlineBackup", "DeviceProtection", "TechSupport", "StreamingTV",
    "StreamingMovies", "Contract", "PaperlessBilling", "PaymentMethod",
    "MonthlyCharges", "TotalCharges"
]

CATEGORICAL_COLUMNS = [
    "gender", "Partner", "Dependents", "PhoneService", "MultipleLines",
    "InternetService", "OnlineSecurity", "OnlineBackup", "DeviceProtection",
    "TechSupport", "StreamingTV", "StreamingMovies", "Contract",
    "PaperlessBilling", "PaymentMethod"
]

NUMERICAL_COLUMNS = ["SeniorCitizen", "tenure", "MonthlyCharges", "TotalCharges"]


# ─────────────────────────────────────────────────────────
# DATA LOADING
# ─────────────────────────────────────────────────────────

def load_real_data() -> pd.DataFrame | None:
    """Try loading the real Kaggle Telco dataset."""
    if not os.path.exists(REAL_CSV_PATH):
        return None
    try:
        df = pd.read_csv(REAL_CSV_PATH)
        # Standardise column names
        df.columns = [c.strip() for c in df.columns]
        # TotalCharges may be a string with spaces
        df["TotalCharges"] = pd.to_numeric(df["TotalCharges"], errors="coerce")
        df["TotalCharges"].fillna(df["tenure"] * df["MonthlyCharges"], inplace=True)
        # Churn: "Yes"/"No" → 1/0
        if df["Churn"].dtype == object:
            df["Churn"] = (df["Churn"].str.strip() == "Yes").astype(int)
        # Drop customerID if present
        if "customerID" in df.columns:
            df = df.drop(columns=["customerID"])
        print(f"📂 Loaded REAL dataset: {len(df):,} rows  |  Churn rate: {df['Churn'].mean()*100:.1f}%")
        return df
    except Exception as e:
        print(f"[WARN] Could not load real data: {e}")
        return None


def generate_synthetic_data(n_samples: int = 7043, random_state: int = 42) -> pd.DataFrame:
    """Generate synthetic Telco Customer Churn dataset mirroring real distributions."""
    np.random.seed(random_state)

    data = {
        "gender": np.random.choice(["Male", "Female"], n_samples),
        "SeniorCitizen": np.random.choice([0, 1], n_samples, p=[0.84, 0.16]),
        "Partner": np.random.choice(["Yes", "No"], n_samples, p=[0.48, 0.52]),
        "Dependents": np.random.choice(["Yes", "No"], n_samples, p=[0.30, 0.70]),
        "tenure": np.random.randint(0, 73, n_samples),
        "PhoneService": np.random.choice(["Yes", "No"], n_samples, p=[0.90, 0.10]),
        "InternetService": np.random.choice(
            ["DSL", "Fiber optic", "No"], n_samples, p=[0.34, 0.44, 0.22]
        ),
        "Contract": np.random.choice(
            ["Month-to-month", "One year", "Two year"], n_samples, p=[0.55, 0.21, 0.24]
        ),
        "PaperlessBilling": np.random.choice(["Yes", "No"], n_samples, p=[0.59, 0.41]),
        "PaymentMethod": np.random.choice(
            ["Electronic check", "Mailed check", "Bank transfer (automatic)", "Credit card (automatic)"],
            n_samples, p=[0.34, 0.23, 0.22, 0.21]
        ),
        "MonthlyCharges": np.round(np.random.uniform(18.25, 118.75, n_samples), 2),
        "TotalCharges": np.zeros(n_samples),
    }

    for i in range(n_samples):
        if data["PhoneService"][i] == "No":
            data.setdefault("MultipleLines", []).append("No phone service")
        else:
            data.setdefault("MultipleLines", []).append(
                np.random.choice(["Yes", "No"], p=[0.42, 0.58])
            )
        if data["InternetService"][i] == "No":
            for svc in ["OnlineSecurity", "OnlineBackup", "DeviceProtection",
                        "TechSupport", "StreamingTV", "StreamingMovies"]:
                data.setdefault(svc, []).append("No internet service")
        else:
            for svc in ["OnlineSecurity", "OnlineBackup", "DeviceProtection",
                        "TechSupport", "StreamingTV", "StreamingMovies"]:
                data.setdefault(svc, []).append(np.random.choice(["Yes", "No"], p=[0.40, 0.60]))
        data["TotalCharges"][i] = round(
            data["tenure"][i] * data["MonthlyCharges"][i] * np.random.uniform(0.8, 1.2), 2
        )

    df = pd.DataFrame(data)

    # Realistic churn labels
    churn_proba = np.zeros(n_samples)
    churn_proba += (df["Contract"] == "Month-to-month").astype(float) * 0.25
    churn_proba += (df["tenure"] < 12).astype(float) * 0.15
    churn_proba += (df["MonthlyCharges"] > 70).astype(float) * 0.12
    churn_proba += (df["InternetService"] == "Fiber optic").astype(float) * 0.10
    churn_proba += (df["PaymentMethod"] == "Electronic check").astype(float) * 0.10
    churn_proba += (df["TechSupport"] == "No").astype(float) * 0.08
    churn_proba += (df["OnlineSecurity"] == "No").astype(float) * 0.05
    churn_proba += df["SeniorCitizen"].astype(float) * 0.05
    churn_proba -= (df["tenure"] > 48).astype(float) * 0.20
    churn_proba -= (df["Contract"] == "Two year").astype(float) * 0.20
    churn_proba += (df["PaperlessBilling"] == "Yes").astype(float) * 0.03
    churn_proba += np.random.normal(0, 0.08, n_samples)
    churn_proba = np.clip(churn_proba, 0.02, 0.95)
    df["Churn"] = (np.random.random(n_samples) < churn_proba).astype(int)

    # Adjust to target 26.5% churn rate
    current_rate = df["Churn"].mean()
    target_rate = 0.265
    if current_rate > target_rate:
        ones_idx = df[df["Churn"] == 1].index.tolist()
        n_flip = int((current_rate - target_rate) * n_samples)
        flip_idx = np.random.choice(ones_idx, min(n_flip, len(ones_idx)), replace=False)
        df.loc[flip_idx, "Churn"] = 0
    elif current_rate < target_rate:
        zeros_idx = df[df["Churn"] == 0].index.tolist()
        n_flip = int((target_rate - current_rate) * n_samples)
        flip_idx = np.random.choice(zeros_idx, min(n_flip, len(zeros_idx)), replace=False)
        df.loc[flip_idx, "Churn"] = 1

    print(f"🔧 Generated SYNTHETIC dataset: {len(df):,} rows  |  Churn rate: {df['Churn'].mean()*100:.1f}%")
    return df


# ─────────────────────────────────────────────────────────
# EDA STATS
# ─────────────────────────────────────────────────────────

def compute_eda_stats(df: pd.DataFrame, label_encoders: dict, dataset_source: str) -> dict:
    """Compute EDA statistics for the frontend EDA page."""

    # ── Churn distribution ──
    churn_counts = df["Churn"].value_counts().to_dict()
    total = len(df)

    # ── Numeric-only correlation (encode categoricals first) ──
    df_enc = df[FEATURE_COLUMNS + ["Churn"]].copy()
    for col in CATEGORICAL_COLUMNS:
        if col in df_enc.columns:
            le = label_encoders.get(col)
            if le:
                try:
                    df_enc[col] = le.transform(df_enc[col].astype(str))
                except Exception:
                    df_enc[col] = 0
    corr_matrix = df_enc.corr().round(3)
    corr_cols = list(corr_matrix.columns)
    corr_data = []
    for row_feat in corr_cols:
        for col_feat in corr_cols:
            corr_data.append({
                "row": row_feat,
                "col": col_feat,
                "value": float(corr_matrix.loc[row_feat, col_feat])
            })

    # ── Churn vs. top categorical features ──
    def cat_churn(col):
        grp = df.groupby(col)["Churn"].agg(["mean", "count"]).reset_index()
        grp.columns = [col, "churnRate", "count"]
        grp["churnRate"] = (grp["churnRate"] * 100).round(1)
        return grp.to_dict(orient="records")

    # ── Churn vs. contract ──
    contract_churn = []
    for contract_val, group in df.groupby("Contract"):
        contract_churn.append({
            "contract": contract_val,
            "total": int(len(group)),
            "churned": int(group["Churn"].sum()),
            "churnRate": round(group["Churn"].mean() * 100, 1)
        })

    # ── Churn vs. internet service ──
    internet_churn = []
    for val, group in df.groupby("InternetService"):
        internet_churn.append({
            "service": val,
            "total": int(len(group)),
            "churned": int(group["Churn"].sum()),
            "churnRate": round(group["Churn"].mean() * 100, 1)
        })

    # ── Churn vs. payment method ──
    payment_churn = []
    for val, group in df.groupby("PaymentMethod"):
        payment_churn.append({
            "method": val,
            "total": int(len(group)),
            "churned": int(group["Churn"].sum()),
            "churnRate": round(group["Churn"].mean() * 100, 1)
        })

    # ── Tenure distribution by churn ──
    bins = [0, 12, 24, 36, 48, 60, 72]
    labels = ["0-12", "13-24", "25-36", "37-48", "49-60", "61-72"]
    df_copy = df.copy()
    df_copy["tenure_bin"] = pd.cut(df_copy["tenure"], bins=bins, labels=labels, right=True)
    tenure_dist = []
    for label in labels:
        subset = df_copy[df_copy["tenure_bin"] == label]
        tenure_dist.append({
            "range": label,
            "total": int(len(subset)),
            "churned": int(subset["Churn"].sum()),
            "churnRate": round(subset["Churn"].mean() * 100, 1) if len(subset) > 0 else 0
        })

    # ── Monthly charges distribution ──
    charge_bins = [0, 30, 50, 70, 90, 120]
    charge_labels = ["<$30", "$30-50", "$50-70", "$70-90", "$90+"]
    df_copy["charge_bin"] = pd.cut(df_copy["MonthlyCharges"], bins=charge_bins, labels=charge_labels)
    charges_dist = []
    for label in charge_labels:
        subset = df_copy[df_copy["charge_bin"] == label]
        charges_dist.append({
            "range": label,
            "total": int(len(subset)),
            "churned": int(subset["Churn"].sum()),
            "churnRate": round(subset["Churn"].mean() * 100, 1) if len(subset) > 0 else 0
        })

    # ── Senior citizen churn ──
    senior_churn = []
    for val, group in df.groupby("SeniorCitizen"):
        senior_churn.append({
            "label": "Senior" if val == 1 else "Non-Senior",
            "churnRate": round(group["Churn"].mean() * 100, 1),
            "count": int(len(group))
        })

    # ── Feature correlations with Churn only ──
    churn_corr = corr_matrix["Churn"].drop("Churn").sort_values(key=abs, ascending=False)
    churn_correlations = [
        {"feature": feat, "correlation": float(val)}
        for feat, val in churn_corr.items()
    ]

    return {
        "dataset_source": dataset_source,
        "total_records": total,
        "churn_rate": round(df["Churn"].mean() * 100, 1),
        "churn_distribution": {
            "churned": int(churn_counts.get(1, 0)),
            "not_churned": int(churn_counts.get(0, 0))
        },
        "correlation_matrix": {
            "columns": corr_cols,
            "data": corr_data
        },
        "churn_correlations": churn_correlations,
        "contract_churn": contract_churn,
        "internet_churn": internet_churn,
        "payment_churn": payment_churn,
        "tenure_distribution": tenure_dist,
        "charges_distribution": charges_dist,
        "senior_churn": senior_churn,
    }


# ─────────────────────────────────────────────────────────
# MAIN TRAINING PIPELINE
# ─────────────────────────────────────────────────────────

def train_models():
    """Train all 7 churn prediction models."""
    print("=" * 65)
    print("🚀 ANALYTICA — 7-Model Training Pipeline  (v2.0)")
    print("=" * 65)

    # ── 1. Load data (real preferred, synthetic fallback) ──
    df = load_real_data()
    dataset_source = "real"
    if df is None:
        df = generate_synthetic_data()
        dataset_source = "synthetic"
        df.to_csv(os.path.join(DATA_DIR, "telco_churn_synthetic.csv"), index=False)
    else:
        # Merge with synthetic to enrich training data
        df_syn = generate_synthetic_data(n_samples=3000)
        df = pd.concat([df, df_syn], ignore_index=True)
        dataset_source = "real+synthetic"
        print(f"🔀 Merged datasets → {len(df):,} total rows  |  Churn rate: {df['Churn'].mean()*100:.1f}%")

    # ── 2. Prepare features ──
    X = df[FEATURE_COLUMNS].copy()
    y = df["Churn"]

    # ── 3. Encode categoricals ──
    label_encoders = {}
    for col in CATEGORICAL_COLUMNS:
        le = LabelEncoder()
        X[col] = le.fit_transform(X[col].astype(str))
        label_encoders[col] = le

    # ── 4. Save EDA stats (before SMOTE, using original distribution) ──
    print("\n📊 Computing EDA statistics...")
    eda_stats = compute_eda_stats(df, label_encoders, dataset_source)
    joblib.dump(eda_stats, os.path.join(ML_DIR, "eda_stats.pkl"))
    print("   ✅ EDA stats saved → eda_stats.pkl")

    # ── 5. Train/test split ──
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # ── 6. Scale features ──
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # ── 7. Apply SMOTE to training set ──
    if SMOTE_AVAILABLE:
        smote = SMOTE(random_state=42, k_neighbors=5)
        X_train_res, y_train_res = smote.fit_resample(X_train_scaled, y_train)
        print(f"\n🧪 SMOTE applied: {len(y_train)} → {len(y_train_res)} samples")
        print(f"   Churn balance after SMOTE: {y_train_res.mean()*100:.1f}%")
    else:
        X_train_res, y_train_res = X_train_scaled, y_train
        print("\n⚠️  SMOTE unavailable — using class_weight='balanced' where supported")

    # ── 8. Define all 7 models ──
    models_cfg = [
        ("random_forest", RandomForestClassifier(
            n_estimators=150, max_depth=12, min_samples_split=5,
            min_samples_leaf=2, class_weight="balanced", random_state=42, n_jobs=-1
        )),
        ("decision_tree", DecisionTreeClassifier(
            max_depth=8, min_samples_split=10, min_samples_leaf=5,
            class_weight="balanced", random_state=42
        )),
        ("gradient_boosting", GradientBoostingClassifier(
            n_estimators=150, max_depth=4, learning_rate=0.1,
            subsample=0.8, random_state=42
        )),
        ("logistic_regression", LogisticRegression(
            max_iter=1000, C=1.0, class_weight="balanced",
            solver="lbfgs", random_state=42
        )),
        ("knn", KNeighborsClassifier(
            n_neighbors=7, weights="distance", metric="euclidean", n_jobs=-1
        )),
        ("svm", SVC(
            kernel="rbf", C=1.0, gamma="scale", probability=True,
            class_weight="balanced", random_state=42
        )),
    ]

    # XGBoost (optional)
    if XGBOOST_AVAILABLE:
        scale_pos_weight = (y_train_res == 0).sum() / max((y_train_res == 1).sum(), 1)
        models_cfg.append(("xgboost", XGBClassifier(
            n_estimators=150, max_depth=5, learning_rate=0.1,
            subsample=0.8, colsample_bytree=0.8,
            scale_pos_weight=scale_pos_weight,
            eval_metric="logloss",
            random_state=42, n_jobs=-1
        )))

    # ── 9. Train & evaluate ──
    results = {}
    trained_models = {}
    feature_importances = {}

    print("\n" + "─" * 65)
    print(f"{'Model':<25} {'Accuracy':>9} {'F1-Score':>9} {'ROC-AUC':>9}")
    print("─" * 65)

    for name, model in models_cfg:
        # SVM is slow on large datasets — use a sample
        if name == "svm" and len(X_train_res) > 8000:
            idx = np.random.choice(len(X_train_res), 8000, replace=False)
            X_fit, y_fit = X_train_res[idx], y_train_res.iloc[idx] if hasattr(y_train_res, "iloc") else y_train_res[idx]
        else:
            X_fit, y_fit = X_train_res, y_train_res

        model.fit(X_fit, y_fit)
        preds = model.predict(X_test_scaled)
        proba = model.predict_proba(X_test_scaled)[:, 1] if hasattr(model, "predict_proba") else preds

        acc = accuracy_score(y_test, preds)
        f1 = f1_score(y_test, preds, average="binary")
        try:
            auc = roc_auc_score(y_test, proba)
        except Exception:
            auc = 0.0

        results[name] = {"accuracy": round(acc, 4), "f1_score": round(f1, 4), "roc_auc": round(auc, 4)}
        trained_models[name] = model

        # Feature importance
        if hasattr(model, "feature_importances_"):
            feature_importances[name] = {
                feat: float(imp)
                for feat, imp in zip(FEATURE_COLUMNS, model.feature_importances_)
            }
        elif hasattr(model, "coef_"):
            coef = np.abs(model.coef_[0])
            feature_importances[name] = {
                feat: float(imp)
                for feat, imp in zip(FEATURE_COLUMNS, coef / coef.sum())
            }

        icon = "🌲" if "forest" in name else "🌳" if "tree" in name else "⚡" if "xgb" in name else "📈" if "grad" in name else "🔵" if "logistic" in name else "👥" if "knn" in name else "🔶"
        print(f"  {icon} {name:<23} {acc:>8.4f} {f1:>9.4f} {auc:>9.4f}")

    print("─" * 65)

    # ── 10. Save all artifacts ──
    print("\n💾 Saving model artifacts...")
    for name, model in trained_models.items():
        joblib.dump(model, os.path.join(ML_DIR, f"{name}_model.pkl"))
        print(f"   ✅ {name}_model.pkl")

    joblib.dump(scaler, os.path.join(ML_DIR, "scaler.pkl"))
    joblib.dump(label_encoders, os.path.join(ML_DIR, "label_encoders.pkl"))
    joblib.dump(list(X.columns), os.path.join(ML_DIR, "feature_names.pkl"))
    joblib.dump(results, os.path.join(ML_DIR, "model_accuracy.pkl"))
    joblib.dump(feature_importances, os.path.join(ML_DIR, "feature_importances.pkl"))
    print("   ✅ scaler.pkl, label_encoders.pkl, feature_names.pkl")
    print("   ✅ model_accuracy.pkl  (all 7 models)")
    print("   ✅ feature_importances.pkl")

    # ── 11. Top feature importances (Random Forest) ──
    if "random_forest" in feature_importances:
        print("\n📊 Top 10 Feature Importances (Random Forest):")
        fi = sorted(feature_importances["random_forest"].items(), key=lambda x: x[1], reverse=True)
        for feat, imp in fi[:10]:
            bar = "█" * int(imp * 80)
            print(f"  {feat:<22} {imp:.4f} {bar}")

    # ── 12. Summary ──
    print("\n" + "=" * 65)
    print("✅ Training complete!  All 7 models saved.")
    print(f"   Dataset: {dataset_source}  ({len(df):,} records)")
    best_model = max(results.items(), key=lambda x: x[1]["accuracy"])
    print(f"   🏆 Best accuracy: {best_model[0]} → {best_model[1]['accuracy']:.4f}")
    print("=" * 65)


if __name__ == "__main__":
    train_models()
