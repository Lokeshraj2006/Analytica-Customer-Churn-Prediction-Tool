"""Pydantic schemas for churn prediction."""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class PredictionRequest(BaseModel):
    """Schema for churn prediction input."""
    gender: str = Field(..., description="Male or Female")
    senior_citizen: int = Field(..., ge=0, le=1, description="0 or 1")
    partner: str = Field(..., description="Yes or No")
    dependents: str = Field(..., description="Yes or No")
    tenure: int = Field(..., ge=0, le=72, description="Months with company")
    phone_service: str = Field(..., description="Yes or No")
    multiple_lines: str = Field(..., description="Yes, No, or No phone service")
    internet_service: str = Field(..., description="DSL, Fiber optic, or No")
    online_security: str = Field(..., description="Yes, No, or No internet service")
    online_backup: str = Field(..., description="Yes, No, or No internet service")
    device_protection: str = Field(..., description="Yes, No, or No internet service")
    tech_support: str = Field(..., description="Yes, No, or No internet service")
    streaming_tv: str = Field(..., description="Yes, No, or No internet service")
    streaming_movies: str = Field(..., description="Yes, No, or No internet service")
    contract: str = Field(..., description="Month-to-month, One year, or Two year")
    paperless_billing: str = Field(..., description="Yes or No")
    payment_method: str = Field(..., description="Electronic check, Mailed check, Bank transfer (automatic), or Credit card (automatic)")
    monthly_charges: float = Field(..., ge=0, description="Monthly charge amount")
    total_charges: float = Field(..., ge=0, description="Total charges to date")
    model_type: str = Field(default="random_forest", description="random_forest or decision_tree")


class ContributingFactor(BaseModel):
    """Schema for a contributing factor in prediction."""
    feature: str
    importance: float
    value: Optional[Any] = None
    direction: Optional[str] = None  # 'increases_churn' or 'decreases_churn'


class PredictionResponse(BaseModel):
    """Schema for churn prediction result."""
    id: int
    churn_prediction: int
    churn_probability: float
    risk_level: str
    model_used: str
    contributing_factors: List[ContributingFactor]
    confidence: float = 1.0
    predicted_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PredictionHistory(BaseModel):
    """Schema for prediction history item."""
    id: int
    gender: str
    tenure: int
    contract: str
    monthly_charges: float
    total_charges: float
    churn_prediction: int
    churn_probability: float
    risk_level: str
    model_used: str
    created_at: datetime

    class Config:
        from_attributes = True


class PredictionDetail(BaseModel):
    """Schema for detailed single prediction view."""
    id: int
    gender: str
    senior_citizen: int
    partner: str
    dependents: str
    tenure: int
    phone_service: str
    multiple_lines: str
    internet_service: str
    online_security: str
    online_backup: str
    device_protection: str
    tech_support: str
    streaming_tv: str
    streaming_movies: str
    contract: str
    paperless_billing: str
    payment_method: str
    monthly_charges: float
    total_charges: float
    churn_prediction: int
    churn_probability: float
    risk_level: str
    model_used: str
    confidence: Optional[float] = 1.0
    created_at: datetime

    class Config:
        from_attributes = True


class DashboardStats(BaseModel):
    """Schema for dashboard statistics."""
    total_predictions: int
    churn_count: int
    no_churn_count: int
    churn_rate: float
    avg_probability: float
    high_risk_count: int
    medium_risk_count: int
    low_risk_count: int
    model_accuracy: float
    total_customers: int
    revenue_at_risk: float


class FeatureImportance(BaseModel):
    """Schema for feature importance data."""
    feature: str
    importance: float


class ChatMessage(BaseModel):
    """Schema for chatbot message."""
    message: str = Field(..., min_length=1, max_length=2000)
    prediction_id: Optional[int] = None
    context: Optional[Dict[str, Any]] = None


class ChatResponse(BaseModel):
    """Schema for chatbot response."""
    response: str
    suggestions: List[str] = []
    message_id: Optional[int] = None
    model_used: str = "gemini-3.5-flash"


class ChatHistoryItem(BaseModel):
    """Schema for a single chat history item."""
    id: int
    user_message: str
    ai_response: str
    prediction_id: Optional[int] = None
    model_used: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChatHistoryResponse(BaseModel):
    """Schema for chat history response."""
    messages: List[ChatHistoryItem]
    total: int
