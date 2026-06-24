"""Database models for User, Prediction, ChatMessage, Session, TuningJob, SegmentResult."""

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base


class User(Base):
    """User account model."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=True)
    role = Column(String(20), default="analyst", nullable=False)  # analyst | viewer | admin
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    last_login = Column(DateTime, nullable=True)

    # Relationships
    predictions = relationship("Prediction", back_populates="user", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    tuning_jobs = relationship("TuningJob", back_populates="user", cascade="all, delete-orphan")


class Prediction(Base):
    """Churn prediction record model — supports multi-industry via input_features_json."""
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # ── Industry identifier (default: telecom) ─────────────────────────────
    industry = Column(String(50), default="telecom", nullable=False, index=True)

    # ── Telecom-specific columns (kept for backward compatibility) ──────────
    gender = Column(String(10))
    senior_citizen = Column(Integer)
    partner = Column(String(5))
    dependents = Column(String(5))
    tenure = Column(Integer)
    phone_service = Column(String(5))
    multiple_lines = Column(String(20))
    internet_service = Column(String(20))
    online_security = Column(String(25))
    online_backup = Column(String(25))
    device_protection = Column(String(25))
    tech_support = Column(String(25))
    streaming_tv = Column(String(25))
    streaming_movies = Column(String(25))
    contract = Column(String(20))
    paperless_billing = Column(String(5))
    payment_method = Column(String(30))
    monthly_charges = Column(Float)
    total_charges = Column(Float)

    # ── Prediction results ─────────────────────────────────────────────────
    churn_prediction = Column(Integer)        # 0 or 1
    churn_probability = Column(Float)         # 0.0 to 1.0
    risk_level = Column(String(10))           # Low, Medium, High
    model_used = Column(String(20))           # display name
    confidence = Column(Float, default=1.0)
    input_features_json = Column(Text, nullable=True)   # full input snapshot
    top_features_json = Column(Text, nullable=True)     # global feature importance

    # ── V4.0 extended fields ───────────────────────────────────────────────
    shap_values_json = Column(Text, nullable=True)      # per-prediction SHAP values
    clv_score = Column(Float, nullable=True)            # Customer Lifetime Value
    risk_adjusted_clv = Column(Float, nullable=True)    # CLV × (1 - churn_prob)
    revenue_at_risk = Column(Float, nullable=True)      # monthly_charges × 12 × churn_prob
    segment_label = Column(String(50), nullable=True)   # assigned segment name

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="predictions")
    chat_messages = relationship("ChatMessage", back_populates="prediction")


class ChatMessage(Base):
    """Chat message record model."""
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    prediction_id = Column(Integer, ForeignKey("predictions.id", ondelete="SET NULL"), nullable=True)
    user_message = Column(Text, nullable=False)
    ai_response = Column(Text, nullable=False)
    model_used = Column(String(50), default="gemini-1.5-flash")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="chat_messages")
    prediction = relationship("Prediction", back_populates="chat_messages")


class Session(Base):
    """Session model for token blacklisting."""
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_jti = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="sessions")


class TuningJob(Base):
    """Hyperparameter tuning job record."""
    __tablename__ = "tuning_jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    model_key = Column(String(50), nullable=False)          # e.g. "random_forest"
    search_method = Column(String(20), nullable=False)      # "grid" | "random"
    cv_folds = Column(Integer, default=3)
    status = Column(String(20), default="pending")          # pending | running | completed | failed
    progress = Column(Float, default=0.0)                   # 0.0 – 1.0
    best_params_json = Column(Text, nullable=True)          # JSON of best hyperparams
    results_json = Column(Text, nullable=True)              # full CV results
    baseline_accuracy = Column(Float, nullable=True)
    best_accuracy = Column(Float, nullable=True)
    baseline_f1 = Column(Float, nullable=True)
    best_f1 = Column(Float, nullable=True)
    baseline_roc_auc = Column(Float, nullable=True)
    best_roc_auc = Column(Float, nullable=True)
    baseline_precision = Column(Float, nullable=True)
    best_precision = Column(Float, nullable=True)
    baseline_recall = Column(Float, nullable=True)
    best_recall = Column(Float, nullable=True)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="tuning_jobs")


class SegmentRun(Base):
    """Customer segmentation run record."""
    __tablename__ = "segment_runs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    n_clusters = Column(Integer, default=4)
    results_json = Column(Text, nullable=True)     # segment summary JSON
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
