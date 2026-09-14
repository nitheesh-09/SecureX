import os
from typing import List
from pydantic import BaseModel, Field


class Settings(BaseModel):
    """Application settings and environment configuration."""

    PROJECT_NAME: str = "SecureX API"
    VERSION: str = "0.1.0"
    DESCRIPTION: str = "AI-powered Metadata Privacy Scanner & Sanitization API"
    API_V1_PREFIX: str = "/api/v1"
    
    # CORS Configuration
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ]
    
    # JWT Configuration
    JWT_SECRET: str = Field(default_factory=lambda: os.getenv("JWT_SECRET", "securex-super-secret-key-for-jwt-signing-2026-e2ee"))
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 72

    # Temporary file storage directory
    TEMP_STORAGE_DIR: str = Field(default_factory=lambda: os.getenv("TEMP_STORAGE_DIR", "./temp_storage"))
    FILE_TTL_MINUTES: int = 15
    MAX_FILE_SIZE_BYTES: int = 25 * 1024 * 1024  # 25 MB

    # AI Provider Configuration (default: mock, works offline without API key)
    AI_PROVIDER: str = Field(default_factory=lambda: os.getenv("AI_PROVIDER", "mock"))
    ANTHROPIC_API_KEY: str = Field(default_factory=lambda: os.getenv("ANTHROPIC_API_KEY", ""))
    OPENAI_API_KEY: str = Field(default_factory=lambda: os.getenv("OPENAI_API_KEY", ""))


settings = Settings()
