"""Central API router configuration."""

from fastapi import APIRouter
from app.api.routes.health import router as health_router
from app.api.routes.upload import router as upload_router
from app.api.routes.analysis import router as analysis_router
from app.api.routes.sanitization import router as sanitization_router
from app.api.routes.scoring import router as scoring_router

api_router = APIRouter()

# Register sub-routers
api_router.include_router(health_router)
api_router.include_router(upload_router)
api_router.include_router(analysis_router)
api_router.include_router(sanitization_router)
api_router.include_router(scoring_router)

