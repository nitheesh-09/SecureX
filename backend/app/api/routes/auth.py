"""Authentication routes for SecureX.
Endpoints:
- POST /api/v1/auth/register : Register a new user account into SQLite DB
- POST /api/v1/auth/login    : Verify registered credentials in SQLite DB
- GET  /api/v1/auth/me       : Return authenticated current user
"""

from typing import Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field

from app.services.auth_service import get_auth_service
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

EMAIL_REGEX = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., pattern=EMAIL_REGEX)
    password: str = Field(..., min_length=6, max_length=128)


class LoginRequest(BaseModel):
    email: str = Field(..., pattern=EMAIL_REGEX)
    password: str = Field(..., min_length=1)


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    key_fingerprint: str
    token: str
    created_at: str


class CurrentUserResponse(BaseModel):
    id: str
    name: str
    email: str
    key_fingerprint: str
    created_at: str


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(req: RegisterRequest) -> UserResponse:
    """Register a new user in the SQLite database."""
    auth_service = get_auth_service()
    try:
        user_data = auth_service.register_user(
            name=req.name,
            email=req.email,
            password=req.password
        )
        return UserResponse(**user_data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register user in database."
        )


@router.post("/login", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def login(req: LoginRequest) -> UserResponse:
    """Authenticate an existing user against the SQLite database.
    Strictly fails if email is not registered!
    """
    auth_service = get_auth_service()
    try:
        user_data = auth_service.authenticate_user(
            email=req.email,
            password=req.password
        )
        return UserResponse(**user_data)
    except LookupError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication failed due to an internal error."
        )


@router.get("/me", response_model=CurrentUserResponse, status_code=status.HTTP_200_OK)
async def get_me(current_user: Dict[str, Any] = Depends(get_current_user)) -> CurrentUserResponse:
    """Return the profile of the currently authenticated user from JWT token."""
    return CurrentUserResponse(
        id=current_user["id"],
        name=current_user["name"],
        email=current_user["email"],
        key_fingerprint=current_user["key_fingerprint"],
        created_at=current_user["created_at"],
    )
