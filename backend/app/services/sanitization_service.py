"""SanitizationService abstraction and selective metadata scrubbing implementation."""

import io
import os
import uuid
from abc import ABC, abstractmethod
from typing import List, Optional, Tuple
from PIL import Image
from PIL.ExifTags import TAGS
from PIL.PngImagePlugin import PngInfo
from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject

from app.core.errors import SecureXAPIException
from app.models.metadata import SanitizationResult
from app.services.metadata_extractor import UnifiedMetadataExtractor


class SanitizationService(ABC):
    """Abstract interface for metadata sanitization and file scrubbing."""

    @abstractmethod
    async def sanitize_file(
        self,
        file_id: str,
        file_bytes: bytes,
        filename: str,
        mime_type: str,
        fields_to_remove: List[str],
        sanitized_file_id: Optional[str] = None,
    ) -> Tuple[bytes, SanitizationResult]:
        """Strip user-selected metadata while strictly preserving visible content."""
        pass


class DefaultSanitizationService(SanitizationService):
    """Prototype metadata sanitization engine supporting JPEG, PNG, and PDF."""

    def __init__(self):
        self.extractor = UnifiedMetadataExtractor()

    def _sanitize_jpeg(self, file_bytes: bytes, fields_to_remove: List[str]) -> bytes:
        """Selectively strip EXIF and GPS tags from a JPEG image without modifying visible pixels."""
        try:
            with Image.open(io.BytesIO(file_bytes)) as img:
                exif = img.getexif()
                if not exif:
                    return file_bytes

                fields_lower = [f.lower() for f in fields_to_remove]
                remove_all_gps = any("gps" in f for f in fields_lower)

                # 1. Complete GPS IFD removal if requested
                if remove_all_gps:
                    if 0x8825 in exif:
                        del exif[0x8825]
                    if 34853 in exif:  # GPSInfo tag
                        del exif[34853]

                # 2. Main EXIF tags removal
                tags_to_delete = []
                for tag_id, _ in list(exif.items()):
                    tag_name = TAGS.get(tag_id, f"tag_{tag_id}").lower()
                    for f in fields_lower:
                        # Direct match, suffix match, or finding ID match
                        if f == tag_name or f.endswith(f"_{tag_name}") or tag_name.endswith(f"_{f}"):
                            tags_to_delete.append(tag_id)
                            break
                        if f in ("make", "camera_make") and tag_name == "make":
                            tags_to_delete.append(tag_id)
                        elif f in ("model", "camera_model") and tag_name == "model":
                            tags_to_delete.append(tag_id)
                        elif f in ("datetime", "timestamp") and tag_name == "datetime":
                            tags_to_delete.append(tag_id)
                        elif f in ("artist", "author") and tag_name == "artist":
                            tags_to_delete.append(tag_id)
                        elif f in ("software", "tool") and tag_name == "software":
                            tags_to_delete.append(tag_id)
                        elif f in ("copyright",) and tag_name == "copyright":
                            tags_to_delete.append(tag_id)

                for tid in set(tags_to_delete):
                    if tid in exif:
                        del exif[tid]

                # 3. Exif Sub-IFD tags removal (e.g., DateTimeOriginal, DateTimeDigitized)
                try:
                    exif_ifd = exif.get_ifd(0x8769)
                    sub_to_delete = []
                    for sub_id, _ in list(exif_ifd.items()):
                        sub_name = TAGS.get(sub_id, f"exif_{sub_id}").lower()
                        for f in fields_lower:
                            if f == sub_name or sub_name.endswith(f"_{f}"):
                                sub_to_delete.append(sub_id)
                                break
                            if "original" in f and "original" in sub_name:
                                sub_to_delete.append(sub_id)
                            elif "digitized" in f and "digitized" in sub_name:
                                sub_to_delete.append(sub_id)
                            elif f in ("datetime", "date", "timestamp"):
                                sub_to_delete.append(sub_id)

                    for sid in set(sub_to_delete):
                        if sid in exif_ifd:
                            del exif_ifd[sid]
                except Exception:
                    pass

                buf = io.BytesIO()
                # Save without pixel recompression alteration
                img.save(buf, format="JPEG", exif=exif, quality=95)
                return buf.getvalue()

        except Exception as e:
            raise SecureXAPIException(
                status_code=500,
                code="SANITIZATION_FAILED",
                message=f"Failed to sanitize JPEG metadata: {str(e)}",
            ) from e

    def _sanitize_png(self, file_bytes: bytes, fields_to_remove: List[str]) -> bytes:
        """Selectively strip PNG text chunks (tEXt, zTXt, iTXt) and EXIF without altering visible pixels."""
        try:
            with Image.open(io.BytesIO(file_bytes)) as img:
                fields_lower = [f.lower() for f in fields_to_remove]
                new_pnginfo = PngInfo()

                # Filter textual chunk metadata
                if hasattr(img, "text") and img.text:
                    for k, v in img.text.items():
                        k_lower = k.lower()
                        should_remove = any(
                            k_lower == f or f in k_lower or k_lower in f for f in fields_lower
                        )
                        if not should_remove:
                            new_pnginfo.add_text(k, v)

                # Filter EXIF if present
                exif = img.getexif()
                if exif and any("exif" in f or "gps" in f for f in fields_lower):
                    exif = None

                buf = io.BytesIO()
                if exif:
                    img.save(buf, format="PNG", pnginfo=new_pnginfo, exif=exif)
                else:
                    img.save(buf, format="PNG", pnginfo=new_pnginfo)
                return buf.getvalue()

        except Exception as e:
            raise SecureXAPIException(
                status_code=500,
                code="SANITIZATION_FAILED",
                message=f"Failed to sanitize PNG metadata: {str(e)}",
            ) from e

    def _sanitize_pdf(self, file_bytes: bytes, fields_to_remove: List[str]) -> bytes:
        """Selectively remove PDF document dictionary metadata without altering page content."""
        try:
            reader = PdfReader(io.BytesIO(file_bytes))
            writer = PdfWriter()

            # Copy all pages untouched
            for page in reader.pages:
                writer.add_page(page)

            fields_lower = [f.lower() for f in fields_to_remove]
            pdf_key_map = {
                "author": "/Author",
                "creator": "/Creator",
                "producer": "/Producer",
                "title": "/Title",
                "subject": "/Subject",
                "keywords": "/Keywords",
                "creationdate": "/CreationDate",
                "date": "/CreationDate",
                "modificationdate": "/ModDate",
                "moddate": "/ModDate",
            }

            clean_meta = {}
            doc_info = reader.metadata or {}

            for k, v in doc_info.items():
                k_clean = k.lstrip("/").lower()
                should_remove = False
                for f in fields_lower:
                    f_clean = f.lstrip("/").lower()
                    if f_clean == k_clean or pdf_key_map.get(f_clean) == k or f_clean in k_clean:
                        should_remove = True
                        break
                if not should_remove:
                    clean_meta[k] = v

            writer.add_metadata(clean_meta)

            # Extra cleanup: If Producer was requested to be removed, ensure pypdf does not auto-reinject it
            if any("producer" in f for f in fields_lower):
                if hasattr(writer, "_info") and writer._info:
                    info_obj = writer._info.get_object()
                    if NameObject("/Producer") in info_obj:
                        del info_obj[NameObject("/Producer")]

            buf = io.BytesIO()
            writer.write(buf)
            return buf.getvalue()

        except Exception as e:
            raise SecureXAPIException(
                status_code=500,
                code="SANITIZATION_FAILED",
                message=f"Failed to sanitize PDF metadata: {str(e)}",
            ) from e

    async def sanitize_file(
        self,
        file_id: str,
        file_bytes: bytes,
        filename: str,
        mime_type: str,
        fields_to_remove: List[str],
        sanitized_file_id: Optional[str] = None,
    ) -> Tuple[bytes, SanitizationResult]:
        # 1. Extract BEFORE metadata (original facts)
        orig_extracted = self.extractor.extract(file_bytes, mime_type)
        orig_fields = [item.field for item in orig_extracted.metadata]

        # 2. Perform format-specific sanitization
        if mime_type == "image/jpeg":
            sanitized_bytes = self._sanitize_jpeg(file_bytes, fields_to_remove)
        elif mime_type == "image/png":
            sanitized_bytes = self._sanitize_png(file_bytes, fields_to_remove)
        elif mime_type == "application/pdf":
            sanitized_bytes = self._sanitize_pdf(file_bytes, fields_to_remove)
        else:
            raise SecureXAPIException(
                status_code=400,
                code="UNSUPPORTED_FORMAT",
                message=f"Sanitization is not supported for MIME type: {mime_type}",
            )

        # 3. Post-Sanitization Verification: Re-extract metadata on SANITIZED file
        sanitized_extracted = self.extractor.extract(sanitized_bytes, mime_type)
        remaining_fields = [item.field for item in sanitized_extracted.metadata]

        # 4. Strict verification: Only report as removed if actually absent now
        removed_fields = []
        for field in fields_to_remove:
            field_lower = field.lower()
            if "gps" in field_lower:
                had_gps = any("gps" in f.lower() for f in orig_fields)
                has_gps_now = any("gps" in f.lower() for f in remaining_fields)
                if had_gps and not has_gps_now:
                    if field not in removed_fields:
                        removed_fields.append(field)
            else:
                was_present = any(
                    field_lower == f.lower() or field_lower.endswith(f.lower()) or f.lower().endswith(field_lower)
                    for f in orig_fields
                )
                is_present_now = any(
                    field_lower == f.lower() or field_lower.endswith(f.lower()) or f.lower().endswith(field_lower)
                    for f in remaining_fields
                )
                if was_present and not is_present_now:
                    if field not in removed_fields:
                        removed_fields.append(field)

        # Generate secure filename
        name_part, ext = os.path.splitext(filename)
        sanitized_filename = f"{name_part}_secure{ext}"
        out_id = sanitized_file_id or str(uuid.uuid4())

        result = SanitizationResult(
            file_id=file_id,
            sanitized_file_id=out_id,
            original_filename=filename,
            sanitized_filename=sanitized_filename,
            removed_fields=removed_fields,
            remaining_fields=remaining_fields,
            status="sanitized",
        )

        return sanitized_bytes, result


# Dependency injection provider
_sanitization_service_instance: Optional[SanitizationService] = None


def get_sanitization_service() -> SanitizationService:
    """Dependency injection provider for SanitizationService."""
    global _sanitization_service_instance
    if _sanitization_service_instance is None:
        _sanitization_service_instance = DefaultSanitizationService()
    return _sanitization_service_instance
