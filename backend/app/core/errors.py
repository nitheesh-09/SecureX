"""Custom exception classes for SecureX API errors."""

from typing import Any, Dict, Optional
from fastapi import HTTPException


class SecureXAPIException(HTTPException):
    """Base API exception supporting uniform error envelopes."""

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(status_code=status_code, detail=message)
        self.code = code
        self.details = details
