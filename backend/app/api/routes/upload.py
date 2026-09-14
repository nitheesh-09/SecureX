"""File upload route handlers for Review 1."""

import uuid
from fastapi import APIRouter, Depends, File, UploadFile, status

from app.core.errors import SecureXAPIException
from app.models.metadata import UploadResponse
from app.services.file_validator import FileValidator
from app.services.storage_service import FileStorageService, get_storage_service

router = APIRouter(tags=["Upload"])


@router.post(
    "/upload",
    response_model=UploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a single JPEG, PNG, or PDF file",
)
@router.post(
    "/files/upload",
    response_model=UploadResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
async def upload_file(
    file: UploadFile = File(..., description="Single JPEG, PNG, or PDF file"),
    storage_service: FileStorageService = Depends(get_storage_service),
) -> UploadResponse:
    """Accept and validate a single individual file upload.

    Enforces:
    - Non-empty content
    - Size limits (max 25MB)
    - Magic byte and parser validation (JPEG, PNG, PDF only)
    - Explicit rejection of ZIP archives
    - Generation of unique server-side file_id
    """
    if not file:
        raise SecureXAPIException(
            status_code=400,
            code="NO_FILE_PROVIDED",
            message="No file was provided in the upload request.",
        )

    # Read binary content
    try:
        content = await file.read()
    except Exception as e:
        raise SecureXAPIException(
            status_code=400,
            code="READ_ERROR",
            message="Failed to read the uploaded file stream.",
        ) from e

    # Validate content and detect true MIME type
    mime_type = FileValidator.validate_and_detect_type(content, file.filename)

    # Generate isolated server-side identifier
    file_id = str(uuid.uuid4())
    filename = file.filename or f"{file_id}"

    # Persist file via abstracted storage service
    await storage_service.save_file(
        file_id=file_id,
        filename=filename,
        content=content,
        mime_type=mime_type,
    )

    return UploadResponse(
        file_id=file_id,
        filename=filename,
        mime_type=mime_type,
        size_bytes=len(content),
        status="uploaded",
    )


@router.get(
    "/upload/{file_id}",
    response_model=UploadResponse,
    summary="Retrieve file metadata by file_id",
)
@router.get(
    "/files/{file_id}",
    response_model=UploadResponse,
    include_in_schema=False,
)
async def get_file_info(
    file_id: str,
    storage_service: FileStorageService = Depends(get_storage_service),
) -> UploadResponse:
    """Retrieve metadata for an uploaded file without exposing server filesystem paths."""
    meta = await storage_service.get_metadata(file_id)
    if not meta:
        raise SecureXAPIException(
            status_code=404,
            code="FILE_NOT_FOUND",
            message=f"File with ID '{file_id}' was not found or has expired.",
        )

    return UploadResponse(
        file_id=meta["file_id"],
        filename=meta.get("filename", file_id),
        mime_type=meta.get("mime_type", "application/octet-stream"),
        size_bytes=meta.get("size_bytes", 0),
        status=meta.get("status", "uploaded"),
    )
