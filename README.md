<div align="center">

# 🔮 Analytica

### AI-Powered Customer Churn Prediction Dashboard

[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white)](https://scikit-learn.org)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)
[![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)](https://jwt.io)

**Predict customer churn before it happens. Make data-driven retention decisions.**

*Built by [Bytes & Clouds Club](https://github.com/bytes-and-clouds)*

---

</div>

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Docker Deployment](#-docker-deployment)
- [API Documentation](#-api-documentation)
- [ML Model Details](#-ml-model-details)
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

| Feature | Description |
|:---|:---|
| 🔐 **JWT Authentication** | Secure login/register with access & refresh token rotation |
| 📊 **Interactive Dashboard** | Real-time KPIs, trend charts, risk distribution, and feature importance |
| 🤖 **ML Churn Prediction** | Random Forest & Decision Tree models trained on Telco Churn data |
| 💬 **AI Chatbot** | Gemini-powered assistant for churn analysis and retention strategies |
| 👥 **Customer Explorer** | Search, filter, sort, and export 7,000+ customer records |
| 📈 **Advanced Analytics** | Churn breakdowns by contract, payment, tenure, and model comparison |
| 🐳 **Dockerized** | One-command deployment with Docker Compose |
| 📱 **Responsive UI** | Glassmorphic dark theme with animations, works on all devices |

---

## 🛠 Tech Stack

### Frontend
- **React 18** + **Vite** — Fast, modern SPA
- **Recharts** — Interactive data visualizations
- **Axios** — HTTP client with JWT interceptor
- **React Router v6** — Client-side routing
- **Vanilla CSS** — Custom dark glassmorphic design system

### Backend
- **FastAPI** — High-performance async Python API
- **SQLAlchemy** — ORM with SQLite/PostgreSQL support
- **scikit-learn** — Random Forest & Decision Tree classifiers
- **Passlib + python-jose** — Bcrypt hashing & JWT tokens
- **Google Gemini** — AI chatbot integration

### DevOps
- **Docker** + **Docker Compose** — Containerized deployment
- **Vercel** (Frontend) + **Render** (Backend) — Cloud hosting

---

## 🏗 Architecture

```
┌─────────────┐     HTTP/REST      ┌──────────────┐
│   React SPA  │ ◄──────────────► │  FastAPI API   │
│   (Vite)     │    JWT Auth       │  (Uvicorn)     │
└──────┬───────┘                   └──────┬────────┘
       │                                  │
       │                          ┌───────┴────────┐
       │                          │                │
       │                   ┌──────▼──────┐  ┌──────▼──────┐
       │                   │  SQLAlchemy  │  │  ML Models  │
       │                   │  (SQLite)    │  │  (sklearn)  │
       │                   └─────────────┘  └─────────────┘
       │
       └──── AI Chatbot ──► Google Gemini API
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ and **npm**
- **Python** 3.10+
- **Git**

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/analytica.git
cd analytica
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp ../.env.example .env
# Edit .env with your GEMINI_API_KEY (optional)

# Train ML models
python -m app.ml.train_model

# Start backend server
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### 4. Open the App

Visit **http://localhost:5173** in your browser. Register an account and start exploring!

---

## 🐳 Docker Deployment

```bash
# Build and start all services
docker-compose up --build

# Access:
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
# API Docs: http://localhost:8000/docs
```

---

## 📖 API Documentation

Once the backend is running, visit **http://localhost:8000/docs** for the interactive Swagger UI.

### Key Endpoints

| Method | Endpoint | Description |
|:---|:---|:---|
| POST | `/api/auth/register` | Create new account |
| POST | `/api/auth/login` | Login and get JWT tokens |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/me` | Get current user profile |
| POST | `/api/predict/` | Make churn prediction |
| GET | `/api/predict/history` | Get prediction history |
| GET | `/api/predict/stats` | Dashboard statistics |
| GET | `/api/predict/feature-importance` | Model feature importances |
| GET | `/api/customers/` | Paginated customer list |
| GET | `/api/customers/analytics` | Aggregate analytics |
| POST | `/api/chat/` | Chat with AI assistant |

---

## 🧠 ML Model Details

### Dataset
- **IBM Telco Customer Churn** — 7,043 customers, 19 features
- Target: Binary classification (Churn: Yes/No)

### Models

| Model | Accuracy | Type |
|:---|:---|:---|
| **Random Forest** | ~85% | Ensemble (150 trees) |
| **Decision Tree** | ~79% | Single tree (max depth 8) |

### Top Churn Predictors
1. **Contract Type** — Month-to-month contracts have ~42% churn rate
2. **Tenure** — New customers (0-12 months) are highest risk
3. **Monthly Charges** — Higher charges correlate with churn
4. **Internet Service** — Fiber optic users churn more
5. **Payment Method** — Electronic check has highest churn

---

## 📁 Project Structure

```
analytica/
├── frontend/                  # React + Vite
│   ├── public/logo.png        # Bytes & Clouds logo
│   ├── src/
│   │   ├── components/        # Navbar, Sidebar, ChatBot, etc.
│   │   ├── pages/             # Dashboard, Predict, Customers, etc.
│   │   ├── context/           # Auth state management
│   │   ├── services/          # API client
│   │   └── styles/            # CSS design system
│   ├── Dockerfile
│   └── package.json
│
├── backend/                   # FastAPI
│   ├── app/
│   │   ├── routers/           # API route handlers
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic validation
│   │   ├── services/          # Business logic + ML
│   │   ├── ml/                # Model training + artifacts
│   │   └── utils/             # JWT & security
│   ├── Dockerfile
│   └── requirements.txt
│
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

<div align="center">

**Built with ❤️ by Bytes & Clouds Club**

</div>
