"""API routes sub-package."""

from app.api.routes.health import router as health_router
from app.api.routes.upload import router as upload_router
from app.api.routes.analysis import router as analysis_router
from app.api.routes.sanitization import router as sanitization_router
from app.api.routes.scoring import router as scoring_router

__all__ = [
    "health_router",
    "upload_router",
    "analysis_router",
    "sanitization_router",
    "scoring_router",
]

