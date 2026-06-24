"""Authentication service layer."""

from sqlalchemy.orm import Session
from app.models.user import User
from app.utils.security import hash_password, verify_password, create_access_token, create_refresh_token


def create_user(db: Session, username: str, email: str, password: str,
                full_name: str = None, role: str = "analyst") -> User:
    """Create a new user account."""
    # Check if email already exists
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise ValueError("Email already registered")

    # Check if username already exists
    existing = db.query(User).filter(User.username == username).first()
    if existing:
        raise ValueError("Username already taken")

    # Validate role
    allowed_roles = {"analyst", "viewer", "admin"}
    role = role.lower() if role else "analyst"
    if role not in allowed_roles:
        role = "analyst"

    user = User(
        username=username,
        email=email,
        hashed_password=hash_password(password),
        full_name=full_name,
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User:
    """Authenticate user by email and password."""
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        raise ValueError("Invalid email or password")
    return user


def generate_tokens(user: User) -> dict:
    """Generate access and refresh tokens for a user."""
    token_data = {"sub": str(user.id), "email": user.email, "role": user.role}
    return {
        "access_token": create_access_token(token_data),
        "refresh_token": create_refresh_token(token_data),
        "token_type": "bearer"
    }
