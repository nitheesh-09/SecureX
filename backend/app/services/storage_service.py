"""FileStorageService abstraction and LocalStorageService implementation.

In Review 1: LocalStorageService manages ephemeral files with TTL eviction.
In Future: Can be replaced with S3/GCS cloud object storage without changing
API controllers or consuming services.
"""

import json
import re
from abc import ABC, abstractmethod
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

from app.core.config import settings
from app.core.errors import SecureXAPIException

SAFE_FILE_ID_REGEX = re.compile(r"^[a-zA-Z0-9_-]+$")


class FileStorageService(ABC):
    """Abstract interface for temporary file storage and lifecycle management."""

    @abstractmethod
    async def save_file(
        self,
        file_id: str,
        filename: str,
        content: bytes,
        mime_type: str,
    ) -> str:
        """Persist a file and return its storage locator.

        Args:
            file_id: Unique UUID identifier.
            filename: Original client filename (stored as metadata only).
            content: Binary file payload.
            mime_type: MIME type string.

        Returns:
            str: Identifier for the stored asset (NOT a sensitive server filesystem path).
        """
        pass

    @abstractmethod
    async def get_file(
        self,
        file_id: str,
    ) -> Optional[Tuple[bytes, str, str]]:
        """Retrieve stored file content, original filename, and MIME type.

        Args:
            file_id: Unique identifier of the requested file.

        Returns:
            Optional[Tuple[bytes, str, str]]: (file_bytes, filename, mime_type) if found, else None.
        """
        pass

    @abstractmethod
    async def get_metadata(
        self,
        file_id: str,
    ) -> Optional[Dict[str, Any]]:
        """Retrieve stored metadata for a file without loading raw bytes.

        Args:
            file_id: Unique identifier of the requested file.

        Returns:
            Optional[Dict[str, Any]]: Metadata dictionary if found, else None.
        """
        pass

    @abstractmethod
    async def update_metadata(
        self,
        file_id: str,
        updates: Dict[str, Any],
    ) -> bool:
        """Update or merge metadata dictionary for a stored file.

        Args:
            file_id: Unique identifier of the file.
            updates: Dictionary of key-value pairs to merge into metadata.

        Returns:
            bool: True if updated successfully, False if file metadata not found.
        """
        pass

    @abstractmethod
    async def delete_file(self, file_id: str) -> bool:
        """Explicitly purge a file from storage.

        Args:
            file_id: Unique identifier of the file to remove.

        Returns:
            bool: True if deleted, False if not found.
        """
        pass

    @abstractmethod
    async def cleanup_expired(self, ttl_minutes: int) -> int:
        """Evict files that exceed the Time-to-Live (TTL) threshold.

        Args:
            ttl_minutes: Age limit in minutes.

        Returns:
            int: Number of purged files.
        """
        pass


class LocalStorageService(FileStorageService):
    """Local filesystem storage implementation for Review 1."""

    def __init__(self, base_dir: Optional[Path] = None):
        if base_dir is None:
            self.base_dir = Path(settings.TEMP_STORAGE_DIR).resolve()
        else:
            self.base_dir = Path(base_dir).resolve()
        
        # Ensure base storage directory exists
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _validate_safe_id(self, file_id: str) -> str:
        """Enforce strict identifier format to prevent path traversal."""
        if not file_id or not SAFE_FILE_ID_REGEX.match(file_id):
            raise SecureXAPIException(
                status_code=400,
                code="INVALID_FILE_ID",
                message="File ID contains illegal characters or path traversal sequences.",
            )
        return file_id

    def _get_file_path(self, safe_id: str) -> Path:
        """Resolve safe binary file path."""
        target = (self.base_dir / f"{safe_id}.bin").resolve()
        if not target.is_relative_to(self.base_dir):
            raise SecureXAPIException(
                status_code=400,
                code="PATH_TRAVERSAL_DETECTED",
                message="Access denied: Path traversal detected.",
            )
        return target

    def _get_meta_path(self, safe_id: str) -> Path:
        """Resolve safe metadata file path."""
        target = (self.base_dir / f"{safe_id}.meta.json").resolve()
        if not target.is_relative_to(self.base_dir):
            raise SecureXAPIException(
                status_code=400,
                code="PATH_TRAVERSAL_DETECTED",
                message="Access denied: Path traversal detected.",
            )
        return target

    async def save_file(
        self,
        file_id: str,
        filename: str,
        content: bytes,
        mime_type: str,
    ) -> str:
        safe_id = self._validate_safe_id(file_id)
        file_path = self._get_file_path(safe_id)
        meta_path = self._get_meta_path(safe_id)

        now = datetime.now(timezone.utc)
        expires = now + timedelta(minutes=settings.FILE_TTL_MINUTES)

        metadata = {
            "file_id": safe_id,
            "filename": Path(filename).name if filename else f"{safe_id}.bin",
            "mime_type": mime_type,
            "size_bytes": len(content),
            "created_at": now.isoformat(),
            "expires_at": expires.isoformat(),
            "status": "uploaded",
        }

        try:
            file_path.write_bytes(content)
            meta_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
            return safe_id
        except Exception as e:
            # Clean up on failure
            if file_path.exists():
                file_path.unlink()
            if meta_path.exists():
                meta_path.unlink()
            raise SecureXAPIException(
                status_code=500,
                code="STORAGE_ERROR",
                message="Failed to persist file in temporary storage.",
            ) from e

    async def get_file(
        self,
        file_id: str,
    ) -> Optional[Tuple[bytes, str, str]]:
        safe_id = self._validate_safe_id(file_id)
        file_path = self._get_file_path(safe_id)
        meta_path = self._get_meta_path(safe_id)

        if not file_path.exists() or not meta_path.exists():
            return None

        try:
            content = file_path.read_bytes()
            meta_data = json.loads(meta_path.read_text(encoding="utf-8"))
            return content, meta_data.get("filename", safe_id), meta_data.get("mime_type", "application/octet-stream")
        except Exception:
            return None

    async def get_metadata(
        self,
        file_id: str,
    ) -> Optional[Dict[str, Any]]:
        safe_id = self._validate_safe_id(file_id)
        meta_path = self._get_meta_path(safe_id)

        if not meta_path.exists():
            return None

        try:
            return json.loads(meta_path.read_text(encoding="utf-8"))
        except Exception:
            return None

    async def update_metadata(
        self,
        file_id: str,
        updates: Dict[str, Any],
    ) -> bool:
        safe_id = self._validate_safe_id(file_id)
        meta_path = self._get_meta_path(safe_id)

        if not meta_path.exists():
            return False

        try:
            data = json.loads(meta_path.read_text(encoding="utf-8"))
            data.update(updates)
            meta_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
            return True
        except Exception as e:
            raise SecureXAPIException(
                status_code=500,
                code="STORAGE_ERROR",
                message="Failed to update file metadata.",
            ) from e

    async def delete_file(self, file_id: str) -> bool:
        safe_id = self._validate_safe_id(file_id)
        file_path = self._get_file_path(safe_id)
        meta_path = self._get_meta_path(safe_id)

        deleted = False
        if file_path.exists():
            file_path.unlink()
            deleted = True
        if meta_path.exists():
            meta_path.unlink()
            deleted = True
        return deleted

    async def cleanup_expired(self, ttl_minutes: int) -> int:
        now = datetime.now(timezone.utc)
        purged = 0

        for meta_file in self.base_dir.glob("*.meta.json"):
            try:
                meta = json.loads(meta_file.read_text(encoding="utf-8"))
                created_at = datetime.fromisoformat(meta["created_at"])
                if (now - created_at).total_seconds() > (ttl_minutes * 60):
                    safe_id = meta.get("file_id")
                    if safe_id:
                        await self.delete_file(safe_id)
                        purged += 1
            except Exception:
                continue
        return purged


# Default singleton instance provider
_storage_instance: Optional[FileStorageService] = None


def get_storage_service() -> FileStorageService:
    """Dependency injection provider for FileStorageService."""
    global _storage_instance
    if _storage_instance is None:
        _storage_instance = LocalStorageService()
    return _storage_instance
