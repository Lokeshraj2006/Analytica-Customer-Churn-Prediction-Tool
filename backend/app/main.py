"""FastAPI application entry point — Analytica V1.0."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db
from app.services.ml_service import load_models
from app.services.chatbot_service import initialize_chatbot

# ── Existing routers ──────────────────────────────────────────────────────────
from app.routers import auth, predictions, customers, chatbot, admin, eda

# ── V1.0 new routers ──────────────────────────────────────────────────────────
from app.routers import shap_router, clv_router, simulator, segments, executive, tuning

# ── V5.0 Multi-Industry ────────────────────────────────────────────────────────
from app.routers import industry


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — startup and shutdown events."""
    print("=" * 55)
    print("  Starting Analytica V1.0 API")
    print("=" * 55)
    init_db()
    print("[OK] Database initialized")
    load_models()
    initialize_chatbot()
    print("[OK] Analytica V1.0 API ready!")
    print("=" * 55)
    yield
    print("[STOP] Shutting down Analytica V1.0 API...")


app = FastAPI(
    title="Analytica V1.0 API",
    description="AI-Powered Multi-Industry Predictive Analytics Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
allowed_origins = [settings.FRONTEND_URL, "http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]
if settings.EXTRA_CORS_ORIGINS:
    allowed_origins += [o.strip() for o in settings.EXTRA_CORS_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(set(allowed_origins)),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Existing routers ──────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(predictions.router)
app.include_router(customers.router)
app.include_router(chatbot.router)
app.include_router(admin.router)
app.include_router(eda.router)

# ── V1.0 new routers ──────────────────────────────────────────────────────────
app.include_router(shap_router.router)
app.include_router(clv_router.router)
app.include_router(simulator.router)
app.include_router(segments.router)
app.include_router(executive.router)
app.include_router(tuning.router)
app.include_router(industry.router)


@app.get("/")
def root():
    """API health check."""
    return {
        "name": "Analytica API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "features": [
            "SHAP Explainability",
            "Customer Lifetime Value",
            "What-If Simulator",
            "Customer Segmentation",
            "Executive Insights",
            "Data Quality Dashboard",
            "Hyperparameter Tuning",
            "Multi-Industry Analytics",
        ],
    }


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": "1.0.0"}
