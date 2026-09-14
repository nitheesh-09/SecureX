"""User directory and search routes for SecureX.
Allows authenticated users to search and discover real registered peers.
"""

from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.api.dependencies import get_current_user
from app.services.chat_service import get_chat_service

router = APIRouter(prefix="/users", tags=["Users"])


class UserDirectoryItem(BaseModel):
    id: str
    name: str
    email: str
    key_fingerprint: str
    created_at: str


@router.get("/search", response_model=List[UserDirectoryItem])
async def search_users(
    q: str = Query("", min_length=1, max_length=100),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> List[UserDirectoryItem]:
    """Search registered users in SQLite database by name or email, excluding current caller."""
    chat_service = get_chat_service()
    results = chat_service.search_users(query=q, exclude_user_id=current_user["id"])
    return [UserDirectoryItem(**r) for r in results]


@router.get("", response_model=List[UserDirectoryItem])
async def list_peers(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> List[UserDirectoryItem]:
    """List all registered peers available in SQLite database, excluding current caller."""
    chat_service = get_chat_service()
    results = chat_service.list_peers(exclude_user_id=current_user["id"])
    return [UserDirectoryItem(**r) for r in results]
