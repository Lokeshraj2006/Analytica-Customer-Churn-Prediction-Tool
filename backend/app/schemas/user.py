"""Pydantic schemas for user authentication."""

import re
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional, Literal


class UserRegister(BaseModel):
    """Schema for user registration."""
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., min_length=5, max_length=100)
    password: str = Field(..., min_length=6, max_length=100)
    full_name: Optional[str] = Field(None, max_length=100)
    role: Literal["analyst", "viewer", "admin"] = "analyst"

    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        """Validate email format using regex."""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, v):
            raise ValueError('Invalid email format')
        return v.lower()

    @field_validator('role')
    @classmethod
    def validate_role(cls, v):
        """Normalize role to lowercase."""
        allowed = {"analyst", "viewer", "admin"}
        v = v.lower()
        if v not in allowed:
            raise ValueError(f"Role must be one of: {', '.join(allowed)}")
        return v


class UserLogin(BaseModel):
    """Schema for user login."""
    email: str
    password: str


class UserResponse(BaseModel):
    """Schema for user response (no password)."""
    id: int
    username: str
    email: str
    full_name: Optional[str] = None
    role: str = "analyst"
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """Schema for JWT token response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenRefresh(BaseModel):
    """Schema for token refresh request."""
    refresh_token: str


class LogoutResponse(BaseModel):
    """Schema for logout response."""
    message: str = "Logged out successfully"


class PasswordResetRequest(BaseModel):
    """Schema for password reset (direct reset by email)."""
    email: str
    new_password: str = Field(..., min_length=6, max_length=100)
