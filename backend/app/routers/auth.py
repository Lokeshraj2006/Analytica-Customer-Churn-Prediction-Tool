"""Authentication API routes."""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.user import UserRegister, UserLogin, UserResponse, TokenResponse, TokenRefresh, LogoutResponse, PasswordResetRequest
from app.services.auth_service import create_user, authenticate_user, generate_tokens
from app.utils.security import get_current_user, verify_token, create_access_token, blacklist_token
from app.models.user import User

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
security = HTTPBearer()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user account."""
    try:
        user = create_user(
            db=db,
            username=user_data.username,
            email=user_data.email,
            password=user_data.password,
            full_name=user_data.full_name,
            role=user_data.role,
        )
        tokens = generate_tokens(user)
        return TokenResponse(
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            user=UserResponse.model_validate(user)
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Login with email and password."""
    try:
        user = authenticate_user(db, credentials.email, credentials.password)
        # Update last_login timestamp
        user.last_login = datetime.now(timezone.utc)
        db.commit()
        tokens = generate_tokens(user)
        return TokenResponse(
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            user=UserResponse.model_validate(user)
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )


@router.post("/refresh", response_model=dict)
def refresh_token(token_data: TokenRefresh):
    """Refresh an access token."""
    payload = verify_token(token_data.refresh_token, token_type="refresh")
    new_access = create_access_token({"sub": payload["sub"], "email": payload["email"]})
    return {"access_token": new_access, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user info."""
    return UserResponse.model_validate(current_user)


@router.post("/logout", response_model=LogoutResponse)
def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Logout by blacklisting the current access token."""
    payload = verify_token(credentials.credentials, token_type="access")
    jti = payload.get("jti")
    user_id = payload.get("sub")
    exp = payload.get("exp")

    if jti and user_id and exp:
        expires_at = datetime.fromtimestamp(exp, tz=timezone.utc)
        blacklist_token(int(user_id), jti, expires_at, db)

    return LogoutResponse()


@router.post("/reset-password", response_model=dict)
def reset_password(data: PasswordResetRequest, db: Session = Depends(get_db)):
    """Reset password by email — directly sets a new password."""
    from app.utils.security import hash_password
    user = db.query(User).filter(User.email == data.email.lower()).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with that email address"
        )
    user.hashed_password = hash_password(data.new_password)
    db.commit()
    return {"message": "Password reset successfully"}
