"""Health check route."""

from fastapi import APIRouter
from app.models.health import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Return basic health status of the SecureX API."""
    return HealthResponse(status="ok", service="SecureX API")
