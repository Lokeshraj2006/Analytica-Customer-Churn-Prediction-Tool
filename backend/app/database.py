"""Database setup using SQLAlchemy."""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import settings


class Base(DeclarativeBase):
    """Base class for SQLAlchemy models."""
    pass


# Create engine with appropriate settings for SQLite vs PostgreSQL
connect_args = {}
engine_kwargs = {}

if "sqlite" in settings.DATABASE_URL:
    connect_args = {"check_same_thread": False}
else:
    # PostgreSQL connection pool settings
    engine_kwargs = {
        "pool_size": 10,
        "max_overflow": 20,
        "pool_pre_ping": True,
    }

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    **engine_kwargs
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables."""
    Base.metadata.create_all(bind=engine)
