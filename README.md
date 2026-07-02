# 🔮 Analytica: Enterprise AI-Powered Churn Prediction Dashboard

> **Predict customer churn, calculate risk-adjusted lifetime value, and simulate retention strategies on a unified financial-first dashboard.**

---

## 📋 Table of Contents
1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture & System Design](#3-architecture--system-design)
4. [Core Features](#4-core-features)
5. [Roles & Permissions](#5-roles--permissions)
6. [Setup & Installation](#6-setup--installation)
7. [API Reference](#7-api-reference)
8. [Screenshots & Demo Walkthrough](#8-screenshots--demo-walkthrough)
9. [Roadmap & Future Work](#9-roadmap--future-work)
10. [License, Authors & Contact](#10-license-authors--contact)

---

## 1. Project Overview

### The Problem
Traditional customer churn prediction operates as a statistical "black box." Machine learning models output abstract probabilities (e.g., *74.2% chance of churn*), but leave business leaders with two major gaps:
1. **No Financial Context**: There is no direct dollar value mapped to the churn risk. Leaders cannot easily determine whether losing a client is a minor setback or a major revenue crisis.
2. **Unexplainable Decisions**: Front-line account managers cannot explain *why* a customer is likely to leave, making it impossible to apply targeted, cost-effective counter-measures.

### The Solution & Business Value
Analytica bridges the gap between data science and financial operations. By shifting focus from generic accuracy percentages to **Annualized Revenue at Risk** and **Risk-Adjusted Customer Lifetime Value (CLV)**, Analytica quantifies the direct financial impact of customer attrition. 

This enables companies to:
- Identify high-value, high-risk customer accounts instantly.
- Optimize retention budgets by focusing spend where it saves the most contract revenue.
- Use explainable AI metrics (SHAP values) to design tailored, vertical-specific save-strategies.

---

## 2. Tech Stack

- **Backend**: FastAPI (Python 3.10+), SQLAlchemy (ORM), Pydantic v2 (Data Validation).
- **Database**: SQLite (default local development database) / PostgreSQL support.
- **Machine Learning**: Scikit-Learn (Random Forest, Decision Tree, Logistic Regression, KNN, SVM), XGBoost, imbalanced-learn (SMOTE class balancing).
- **Explainability Engine**: SHAP (SHapley Additive exPlanations) for local feature contribution calculations.
- **Frontend**: React 18, Vite, Recharts (responsive data visualizations), Framer Motion (micro-animations), TailwindCSS & Custom Vanilla CSS (glassmorphic dark-theme design system).
- **AI Integration**: Gemini 2.5 Flash (`gemini-2.5-flash`) via the Google GenAI SDK for the context-aware chatbot co-pilot and automated narrative generation (falls back to rule-based logic if API key is missing).

---

## 3. Architecture & System Design

### System Architecture Diagram
```mermaid
graph TD
    subgraph Frontend [React SPA Client]
        A[Dashboard / KPI View]
        B[Multi-Industry Sandbox Form]
        C[What-If Simulator]
        D[AI Co-Pilot Chat UI]
    end

    subgraph Backend [FastAPI Server]
        E[Auth & RBAC Middleware]
        F[Prediction Router]
        G[Explainability Engine (SHAP)]
        H[Chatbot Service]
        I[Tuning & Health Service]
    end

    subgraph Storage_ML [Data & Models]
        J[(SQLite/Postgres Database)]
        K[ML Classifier Pipeline]
        L[SHAP Explainer Engine]
    end

    subgraph AI_Provider [LLM API]
        M[Gemini 2.5 Flash]
    end

    A & B & C & D <-->|REST API + JWT Bearer Token| E
    E --> F & G & H & I
    F --> K
    G --> L
    H --> M
    I --> J
    F & G & H --> J
```

### Data Flow Walkthrough
1. **Request Intake**: The user submits customer features (e.g. tenure, billing type, services) via the React sandbox form.
2. **Middleware Check**: The FastAPI backend validates the JWT token and ensures the user's role (Analyst or Admin) is authorized.
3. **ML Preprocessing & Inference**: Features are scaled and encoded through the saved model pipelines, and the target classifier (e.g., XGBoost, Random Forest) computes the churn probability.
4. **SHAP Generation**: The explainability router runs Shapley value calculations to determine feature attribution (risk drivers vs. retention drivers).
5. **Persistence**: The prediction record, computed probability score, and SHAP vectors are saved to the database.
6. **Co-pilot Context Retrieval**: When the user opens the Co-pilot chat panel, the system injects the active page context and prediction data into the prompt context to generate targeted retention recommendations using the Gemini API.

---

## 4. Core Features

### 1. Multi-Industry Sandbox
Tailored churn engines for **Telecom, Banking, E-commerce, and Healthcare**. Input fields, labels, metrics, and risk-evaluation heuristics dynamically adapt to target the KPIs of each specific sector.

### 2. Multi-Currency Scaling
Toggle all financial metrics across **USD ($), EUR (€), GBP (£), INR (₹), and JPY (¥)**. The system performs currency conversions on-the-fly for inputs, validation boundaries, charts, and chatbot responses.

### 3. SHAP Explainer
Exposes the "why" behind the numbers. Renders waterfall charts detailing positive (red/risk-inducing) and negative (green/retention-driving) feature weights for every prediction.

### 4. What-If Simulator
Clone a baseline customer profile and tweak parameters (such as changing contract length or upgrading support level) to instantly compare simulated churn probability delta.

### 5. Risk-Adjusted Customer Lifetime Value (CLV)
Calculates each customer's lifetime value and assigns them to segments (Platinum, Gold, Silver, Bronze) while computing the annualized **Revenue at Risk** (annual charges weighted by churn probability).

### 6. Customer Segmentation
Applies unsupervised K-Means clustering to partition the customer registry into distinct, actionable customer profiles (*Loyal Champions, High Value, Price Sensitive, and High Risk*).

### 7. AI Assistant Co-pilot
A context-aware helper powered by Gemini 2.5 Flash that reads current screen variables, active prediction values, and active currencies to answer strategic questions.

### 8. Data Quality & Tuning
ML engineering cockpit that checks dataset health (outliers, missing ratios, class balance) and triggers background hyperparameter grid/random searches with metrics comparison.

---

## 5. Roles & Permissions

The system implements strict Role-Based Access Control (RBAC) to separate duties:

| Feature / Page | Path | Viewer (👁️) | Analyst (🧠) | Admin (👑) |
| :--- | :--- | :---: | :---: | :---: |
| **KPI Dashboard** | `/dashboard` | ✅ | ✅ | ✅ |
| **Customer Explorer** | `/customers` | ✅ | ✅ | ✅ |
| **Analytics & CLV** | `/clv` | ✅ | ✅ | ✅ |
| **Data Explorer (EDA)** | `/eda` | ✅ | ✅ | ✅ |
| **Settings & Currency** | `/settings` | ✅ | ✅ | ✅ |
| **Churn Prediction** | `/predict` | 🚫 | ✅ | ✅ |
| **SHAP Explainer** | `/explainability`| 🚫 | ✅ | ✅ |
| **What-If Simulator** | `/simulator` | 🚫 | ✅ | ✅ |
| **Hyperparameter Tuning**| `/tuning` | 🚫 | ✅ | ✅ |
| **Admin User Management**| `/admin` | 🚫 | 🚫 | ✅ |

---

## 6. Setup & Installation

### Prerequisites
- **Node.js** v18+ and **npm**
- **Python** 3.10+
- **Google Gemini API Key** (optional; chatbot falls back to rule-based responses if missing)

### Environment Variables
Create a `.env` file in the root and `backend/` directories:
```env
JWT_SECRET_KEY=your-super-secret-jwt-key
GEMINI_API_KEY=AIzaSyYourGeminiAPIKeyHere
AI_PROVIDER=gemini
GEMINI_MODEL=gemini-2.5-flash
FRONTEND_URL=http://localhost:5173
DATABASE_URL=sqlite:///./analytica.db
```

> [!NOTE]
> Ensure `GEMINI_API_KEY` is set to utilize the AI Co-pilot chatbot. If not configured, the system uses rule-based responses.

### Run Locally

#### 1. Setup and Run Backend API
```bash
cd backend
# Create python virtual environment if not exists
python -m venv venv
# Activate virtual environment (Windows)
.\venv\Scripts\activate
# Install requirements
pip install -r requirements.txt
# Run migrations/seed database
python seed_data.py
# Start API Server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

#### 2. Setup and Run Frontend Client
```bash
cd frontend
# Install dependencies
npm install
# Start local Vite development server
# Note: On Windows, use npm.cmd if script execution is blocked
npm.cmd run dev
```

Visit `http://localhost:5173` in your browser.

---

## 7. API Reference

### 1. Predict Churn
- **Endpoint**: `POST /api/predict/`
- **Authentication**: JWT Bearer Token required.
- **Request Body**:
```json
{
  "gender": "Female",
  "senior_citizen": 0,
  "partner": "Yes",
  "dependents": "No",
  "tenure": 12,
  "phone_service": "Yes",
  "multiple_lines": "No",
  "internet_service": "Fiber optic",
  "online_security": "No",
  "online_backup": "Yes",
  "device_protection": "No",
  "tech_support": "No",
  "streaming_tv": "Yes",
  "streaming_movies": "No",
  "contract": "Month-to-month",
  "paperless_billing": "Yes",
  "payment_method": "Electronic check",
  "monthly_charges": 85.0,
  "total_charges": 1020.0,
  "model_type": "random_forest"
}
```
- **Response**:
```json
{
  "prediction_id": 42,
  "churn_prediction": 1,
  "churn_probability": 0.742,
  "risk_level": "High",
  "model_used": "random_forest",
  "confidence": 0.742,
  "contributing_factors": [
    {
      "feature": "Contract",
      "importance": 0.28,
      "value": "Month-to-month",
      "direction": "increases_churn"
    }
  ]
}
```

### 2. Get SHAP Explainer Waterfall
- **Endpoint**: `GET /api/shap/{prediction_id}`
- **Response**:
```json
{
  "prediction_id": 42,
  "base_value": 0.265,
  "prediction_value": 0.742,
  "features": [
    { "name": "Contract = Month-to-month", "shap_value": 0.28 },
    { "name": "PaymentMethod = Electronic check", "shap_value": 0.12 },
    { "name": "Tenure", "shap_value": 0.08 }
  ],
  "cached": true
}
```

---

## 8. Screenshots & Demo Walkthrough

The project's key screens have been saved in the root `ordered_screenshots/` directory for full flow verification:

1. **Industry Selection & Dynamic Form**: [01-industry-selector.png](ordered_screenshots/01-industry-selector.png)
   * Displays the sandbox industry vertical selection (e.g. Telecom) adapting form sliders.
2. **Dynamic UI Form Elements**: [02-form-tactile-ui.png](ordered_screenshots/02-form-tactile-ui.png)
   * The active sandbox form showing various numeric ranges and categorical values filled in.
3. **Template Quick-Fill Selector**: [03-quick-fill-template.png](ordered_screenshots/03-quick-fill-template.png)
   * Applies segment cards (High/Medium/Low Risk) to populate values in the workspace.
4. **Prediction Result & Action Card**: [04-prediction-result.png](ordered_screenshots/04-prediction-result.png)
   * Renders the calculated churn probability, risk level, and triggers the AI conversational analysis.
5. **Dashboard (USD Currency)**: [05a-currency-usd.png](ordered_screenshots/05a-currency-usd.png)
   * Core executive dashboard showing all customer financial metrics in US Dollars ($).
6. **Dashboard (INR Currency)**: [05b-currency-inr.png](ordered_screenshots/05b-currency-inr.png)
   * Identical view scaled dynamically to Indian Rupees (₹) showing automatic currency adjustments.
7. **SHAP Waterfall Explanation**: [06-shap-waterfall.png](ordered_screenshots/06-shap-waterfall.png)
   * Displays Shapley values highlighting positive risk variables (red) vs. negative drivers (green).
8. **What-If Strategy Simulator**: [07-what-if-comparison.png](ordered_screenshots/07-what-if-comparison.png)
   * Displays original vs. adjusted customer profiles side-by-side with risk-saving results.
9. **CLV Tiers & Revenue Risk**: [08-clv-tiers.png](ordered_screenshots/08-clv-tiers.png)
   * Segments customer bases into tier rankings and highlights total annualized revenue at risk.
10. **K-Means Clustering Scatter**: [09-kmeans-segmentation.png](ordered_screenshots/09-kmeans-segmentation.png)
    * Displays unsupervised cluster distribution of client metrics for localized target marketing.
11. **Contextual AI Chatbot**: [10-chatbot-context.png](ordered_screenshots/10-chatbot-context.png)
    * Chat assistant referencing specific page parameters, calculations, and active currency formats.
12. **Data Health Score Card**: [11-data-health-score.png](ordered_screenshots/11-data-health-score.png)
    * System diagnostics tracking class imbalance, outlier indicators, and dataset metrics.
13. **Hyperparameter Optimization**: [12-hyperparameter-tuning.png](ordered_screenshots/12-hyperparameter-tuning.png)
    * Dashboard comparing model performance statistics before and after optimization tuning.
14. **Admin User Management Panel**: [13-admin-panel.png](ordered_screenshots/13-admin-panel.png)
    * Admin panel showing dashboard user registrations, role updates, and audit trails.
15. **Viewer Restricted State View**: [14-viewer-dashboard.png](ordered_screenshots/14-viewer-dashboard.png)
    * Restricts non-analyst paths showing view-only features and disabled/hidden buttons.

---

## 9. Roadmap & Future Work

- [ ] **Multi-Tenant Support**: Establish partition parameters for company account isolation.
- [ ] **Model Drift Tracking**: Set up active threshold indicators monitoring data shifts.
- [ ] **Continuous Retraining Pipelines**: Trigger model retraining cycles upon new batch CSV imports.
- [ ] **Export to PDF/JSON**: Export customer summaries and SHAP graphs for C-level reporting.

---

## 10. License, Authors & Contact

- **License**: MIT License. See LICENSE for details.
- **Author**: Built with ❤️ by **Bytes & Clouds Club**.
- **Contact**: Reach out on GitHub or via email for questions or contributions.
