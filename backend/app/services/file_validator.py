"""Safe file validation and type inspection for Review 1."""

import io
import zipfile
from typing import Optional
from PIL import Image
from pypdf import PdfReader

from app.core.config import settings
from app.core.errors import SecureXAPIException


class FileValidator:
    """Validator ensuring only valid, non-corrupt JPEG, PNG, and PDF files are accepted."""

    @classmethod
    def validate_and_detect_type(cls, content: bytes, filename: Optional[str] = None) -> str:
        """Inspect file content, enforce size and format boundaries, and return verified MIME type.

        Args:
            content: Raw file bytes.
            filename: Client-provided filename (for hint/logging only, not trusted for validation).

        Returns:
            str: Verified MIME type ('image/jpeg', 'image/png', or 'application/pdf').

        Raises:
            SecureXAPIException: If file is empty, oversized, a ZIP archive, unsupported, or corrupt.
        """
        # 1. Empty file check
        if not content or len(content) == 0:
            raise SecureXAPIException(
                status_code=400,
                code="EMPTY_FILE",
                message="Uploaded file is empty. Please select a valid file.",
            )

        # 2. File size ceiling check
        if len(content) > settings.MAX_FILE_SIZE_BYTES:
            max_mb = settings.MAX_FILE_SIZE_BYTES // (1024 * 1024)
            raise SecureXAPIException(
                status_code=413,
                code="FILE_TOO_LARGE",
                message=f"File exceeds the maximum allowed limit of {max_mb} MB.",
                details={"max_size_bytes": settings.MAX_FILE_SIZE_BYTES, "provided_bytes": len(content)},
            )

        # 3. Explicit ZIP input rejection
        is_zip = False
        if content.startswith((b"PK\x03\x04", b"PK\x05\x06", b"PK\x07\x08")):
            is_zip = True
        elif filename and filename.lower().endswith(".zip"):
            is_zip = True
        else:
            try:
                if zipfile.is_zipfile(io.BytesIO(content)):
                    is_zip = True
            except Exception:
                pass

        if is_zip:
            raise SecureXAPIException(
                status_code=400,
                code="ZIP_INPUT_NOT_SUPPORTED",
                message="ZIP input is not supported in Review 1. Please upload an individual JPEG, PNG, or PDF file.",
                details={
                    "provided_format": "zip",
                    "allowed_formats": ["JPEG", "PNG", "PDF"],
                },
            )

        # 4. Check for JPEG (magic bytes: \xFF\xD8\xFF)
        if content.startswith(b"\xff\xd8\xff"):
            try:
                with Image.open(io.BytesIO(content)) as img:
                    if img.format != "JPEG":
                        raise ValueError(f"Image format {img.format} is not JPEG")
                    img.verify()
                return "image/jpeg"
            except Exception:
                raise SecureXAPIException(
                    status_code=422,
                    code="CORRUPT_FILE",
                    message="The uploaded file appears to be a JPEG but cannot be parsed or is corrupted.",
                )

        # 5. Check for PNG (magic bytes: \x89PNG\r\n\x1a\n)
        if content.startswith(b"\x89PNG\r\n\x1a\n"):
            try:
                with Image.open(io.BytesIO(content)) as img:
                    if img.format != "PNG":
                        raise ValueError(f"Image format {img.format} is not PNG")
                    img.verify()
                return "image/png"
            except Exception:
                raise SecureXAPIException(
                    status_code=422,
                    code="CORRUPT_FILE",
                    message="The uploaded file appears to be a PNG but cannot be parsed or is corrupted.",
                )

        # 6. Check for PDF (magic bytes: %PDF- in header)
        if b"%PDF-" in content[:1024]:
            try:
                reader = PdfReader(io.BytesIO(content))
                # Validate that the reader can inspect page list without crash
                _ = len(reader.pages)
                return "application/pdf"
            except Exception:
                raise SecureXAPIException(
                    status_code=422,
                    code="CORRUPT_FILE",
                    message="The uploaded file appears to be a PDF but cannot be parsed or is corrupted.",
                )

        # 7. Unsupported file format
        raise SecureXAPIException(
            status_code=400,
            code="FILE_TYPE_NOT_SUPPORTED",
            message="Only JPEG, PNG, and PDF files are supported in Review 1.",
            details={
                "allowed_mime_types": [
                    "image/jpeg",
                    "image/png",
                    "application/pdf",
                ],
            },
        )
