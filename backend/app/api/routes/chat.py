"""Conversations and messaging routes for SecureX.
Endpoints:
- POST /api/v1/conversations                      : Get or create canonical conversation with recipient
- GET  /api/v1/conversations                      : List conversations for authenticated user
- GET  /api/v1/conversations/{id}/messages        : Retrieve messages in conversation (Strict authorization)
- POST /api/v1/conversations/{id}/messages        : Send message in conversation (Strict authorization)
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.dependencies import get_current_user
from app.services.chat_service import get_chat_service

router = APIRouter(prefix="/conversations", tags=["Conversations & Messaging"])


class CreateConversationRequest(BaseModel):
    recipient_id: str = Field(..., min_length=3)


class PeerInfo(BaseModel):
    id: str
    name: str
    email: str
    key_fingerprint: str


class LastMessageInfo(BaseModel):
    id: str
    sender_id: str
    receiver_id: str
    text: Optional[str] = None
    attachment_json: Optional[str] = None
    created_at: str


class ConversationResponse(BaseModel):
    id: str
    created_at: str
    updated_at: str
    peer: Optional[PeerInfo] = None
    last_message: Optional[LastMessageInfo] = None


class SendMessageRequest(BaseModel):
    text: Optional[str] = None
    attachment_json: Optional[str] = None


class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    receiver_id: str
    text: Optional[str] = None
    attachment_json: Optional[str] = None
    created_at: str


@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_or_get_conversation(
    req: CreateConversationRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> ConversationResponse:
    """Create or get the canonical shared conversation between caller and recipient."""
    chat_service = get_chat_service()
    try:
        conv = chat_service.get_or_create_conversation(
            user_a_id=current_user["id"],
            user_b_id=req.recipient_id
        )
        return ConversationResponse(**conv)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to create conversation: {str(e)}")


@router.get("", response_model=List[ConversationResponse], status_code=status.HTTP_200_OK)
async def list_conversations(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> List[ConversationResponse]:
    """List all active conversations for the authenticated caller."""
    chat_service = get_chat_service()
    try:
        convs = chat_service.get_user_conversations(user_id=current_user["id"])
        return [ConversationResponse(**c) for c in convs]
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to fetch conversations: {str(e)}")


@router.get("/{conversation_id}/messages", response_model=List[MessageResponse], status_code=status.HTTP_200_OK)
async def get_messages(
    conversation_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> List[MessageResponse]:
    """Retrieve all messages in a conversation. STRICTLY verifies participant authorization."""
    chat_service = get_chat_service()
    try:
        msgs = chat_service.get_conversation_messages(
            conversation_id=conversation_id,
            user_id=current_user["id"]
        )
        return [MessageResponse(**m) for m in msgs]
    except PermissionError as e:
        # Authorization failure
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to retrieve messages: {str(e)}")


@router.post("/{conversation_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    conversation_id: str,
    req: SendMessageRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> MessageResponse:
    """Send a message or secure file in conversation. Sender is securely derived from JWT."""
    chat_service = get_chat_service()
    try:
        msg = chat_service.create_message(
            conversation_id=conversation_id,
            sender_id=current_user["id"],
            text=req.text,
            attachment_json=req.attachment_json
        )
        return MessageResponse(**msg)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to send message: {str(e)}")


class UpdateAttachmentRequest(BaseModel):
    attachment_json: str


@router.patch("/{conversation_id}/messages/{message_id}", response_model=MessageResponse, status_code=status.HTTP_200_OK)
async def update_message_attachment(
    conversation_id: str,
    message_id: str,
    req: UpdateAttachmentRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> MessageResponse:
    """Update message attachment (e.g. after sanitization). Verifies participant authorization."""
    chat_service = get_chat_service()
    try:
        updated = chat_service.update_message_attachment(
            conversation_id=conversation_id,
            message_id=message_id,
            user_id=current_user["id"],
            attachment_json=req.attachment_json
        )
        return MessageResponse(**updated)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to update attachment: {str(e)}")
