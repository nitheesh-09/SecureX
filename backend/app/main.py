"""SecureX FastAPI Application Entry Point.

Review 1 Foundation:
- CORS enabled for Next.js frontend on localhost:3000
- Direct health endpoint at /health
- API router mounted under /api and /api/v1
- Uniform error handling envelopes
"""

from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api import api_router
from app.core.config import settings
from app.core.errors import SecureXAPIException
from app.models.health import HealthResponse

# -----------------------------------------------------------------------------
# Application Factory
# -----------------------------------------------------------------------------
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
    docs_url="/docs",
    redoc_url="/redoc",
)

# -----------------------------------------------------------------------------
# CORS Configuration (allows Next.js frontend on localhost:3000)
# -----------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------------------------------------------------------
# Direct Health Check Endpoint
# -----------------------------------------------------------------------------
@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def root_health() -> HealthResponse:
    """Root health check endpoint returning status and service name."""
    return HealthResponse(status="ok", service="SecureX API")


# -----------------------------------------------------------------------------
# API Route Registration
# -----------------------------------------------------------------------------
# Routes organized under /api/v1 as well as /api alias
app.include_router(api_router, prefix=settings.API_V1_PREFIX)
app.include_router(api_router, prefix="/api")


# -----------------------------------------------------------------------------
# Global Error Handlers (API Contract Compliant)
# -----------------------------------------------------------------------------
@app.exception_handler(SecureXAPIException)
async def securex_exception_handler(request: Request, exc: SecureXAPIException):
    """Uniform error response for domain-specific SecureX exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.code,
                "message": exc.detail,
                "details": exc.details,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        },
    )


@app.exception_handler(StarletteHTTPException)
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: Exception):
    """Uniform error response for HTTP exceptions."""
    status_code = getattr(exc, "status_code", 500)
    detail = getattr(exc, "detail", str(exc))
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "error": {
                "code": f"HTTP_{status_code}",
                "message": str(detail),
                "details": None,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Uniform error response for request validation errors."""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid request parameters or payload.",
                "details": {"errors": exc.errors()},
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Fallback handler for unhandled server exceptions."""
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred while processing your request.",
                "details": None,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        },
    )
