"""AI Chatbot API routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.prediction import ChatMessage, ChatResponse, ChatHistoryItem, ChatHistoryResponse
from app.services.chatbot_service import get_chat_response
from app.utils.security import get_current_user
from app.models.user import User, ChatMessage as ChatMessageModel, Prediction
from typing import Optional

router = APIRouter(prefix="/api/chat", tags=["Chatbot"])


@router.post("/", response_model=ChatResponse)
async def chat(
    message: ChatMessage,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send a message to the AI chatbot with optional prediction context."""
    # Build prediction context if prediction_id is provided
    prediction_context = message.context
    if message.prediction_id:
        prediction = (
            db.query(Prediction)
            .filter(Prediction.id == message.prediction_id, Prediction.user_id == current_user.id)
            .first()
        )
        if prediction:
            prediction_context = prediction_context or {}
            prediction_context.update({
                "churn_probability": prediction.churn_probability,
                "risk_level": prediction.risk_level,
                "tenure": prediction.tenure,
                "monthly_charges": prediction.monthly_charges,
                "contract": prediction.contract,
                "internet_service": prediction.internet_service,
                "tech_support": prediction.tech_support,
                "online_security": prediction.online_security,
                "payment_method": prediction.payment_method,
                "model_used": prediction.model_used,
            })

    result = await get_chat_response(message.message, prediction_context)

    # Persist chat message to database
    chat_record = ChatMessageModel(
        user_id=current_user.id,
        prediction_id=message.prediction_id,
        user_message=message.message,
        ai_response=result["response"],
        model_used=result.get("model_used", "gemini-1.5-flash"),
    )
    db.add(chat_record)
    db.commit()
    db.refresh(chat_record)

    return ChatResponse(
        response=result["response"],
        suggestions=result["suggestions"],
        message_id=chat_record.id,
        model_used=result.get("model_used", "gemini-1.5-flash"),
    )


@router.get("/history", response_model=ChatHistoryResponse)
def get_chat_history(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get the current user's chat history."""
    total = db.query(ChatMessageModel).filter(ChatMessageModel.user_id == current_user.id).count()
    messages = (
        db.query(ChatMessageModel)
        .filter(ChatMessageModel.user_id == current_user.id)
        .order_by(ChatMessageModel.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return ChatHistoryResponse(messages=messages, total=total)


@router.delete("/history")
def clear_chat_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Clear the current user's chat history."""
    db.query(ChatMessageModel).filter(ChatMessageModel.user_id == current_user.id).delete()
    db.commit()
    return {"message": "Chat history cleared successfully"}
