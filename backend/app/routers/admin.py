"""Admin API routes — user management (Admin role only)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/admin", tags=["Admin"])


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency: only allow users with role='admin'."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


@router.get("/users", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Return all registered users (admin only)."""
    return db.query(User).order_by(User.created_at.desc()).all()


@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Change a user's role (admin only)."""
    new_role = payload.get("role", "").lower()
    if new_role not in {"analyst", "viewer", "admin"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be analyst, viewer, or admin."
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Prevent demoting yourself
    if user.id == admin.id and new_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own admin role."
        )

    user.role = new_role
    db.commit()
    db.refresh(user)
    return {"message": f"Role updated to '{new_role}'", "user": UserResponse.model_validate(user)}


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Delete a user account (admin only). Cannot delete yourself."""
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account from the admin panel."
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    db.delete(user)
    db.commit()
    return {"message": f"User '{user.username}' deleted successfully"}


@router.get("/stats")
def get_admin_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Get platform-wide statistics (admin only)."""
    from app.models.user import Prediction
    users = db.query(User).all()
    predictions = db.query(Prediction).all()

    return {
        "total_users": len(users),
        "admins": sum(1 for u in users if u.role == "admin"),
        "analysts": sum(1 for u in users if u.role == "analyst"),
        "viewers": sum(1 for u in users if u.role == "viewer"),
        "total_predictions": len(predictions),
        "churn_predictions": sum(1 for p in predictions if p.churn_prediction == 1),
        "high_risk": sum(1 for p in predictions if p.risk_level == "High"),
        "medium_risk": sum(1 for p in predictions if p.risk_level == "Medium"),
        "low_risk": sum(1 for p in predictions if p.risk_level == "Low"),
    }
