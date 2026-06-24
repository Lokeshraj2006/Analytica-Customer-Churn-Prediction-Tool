"""Application configuration using Pydantic Settings."""

from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # JWT Configuration
    JWT_SECRET_KEY: str = "analytica-super-secret-key-change-in-production-2024"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database
    DATABASE_URL: str = "sqlite:///./analytica.db"

    # AI Provider — gemini | openai | ollama
    AI_PROVIDER: str = "gemini"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"       # single source of truth
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3"

    # AI Limits
    AI_CACHE_TTL: int = 3600     # seconds — cached response lifetime
    AI_RATE_LIMIT: int = 30      # max requests per minute per user

    # CORS — comma-separated origins can be added via .env
    FRONTEND_URL: str = "http://localhost:5173"
    EXTRA_CORS_ORIGINS: str = ""  # e.g. "http://localhost:3000,https://app.example.com"

    # ML
    DEFAULT_MODEL: str = "random_forest"
    CLV_AVG_LIFETIME_MONTHS: int = 32   # Telco dataset average customer lifetime
    CLV_DISCOUNT_RATE: float = 0.10     # Annual discount rate for DCF

    # Tuning
    TUNING_CV_FOLDS: int = 3
    TUNING_RANDOM_ITER: int = 20        # n_iter for RandomizedSearchCV

    model_config = SettingsConfigDict(env_file=".env", extra="allow")


settings = Settings()
