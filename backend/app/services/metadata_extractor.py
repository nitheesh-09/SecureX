"""Verified local metadata extraction for JPEG, PNG, and PDF files.

Extracts factual metadata directly from file binaries using Pillow and pypdf,
ensuring zero hallucination of metadata values before AI analysis.
"""

import io
from abc import ABC, abstractmethod
from typing import Any, List
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
from pypdf import PdfReader

from app.models.metadata import ExtractedMetadata, ExtractedMetadataItem


class MetadataExtractor(ABC):
    """Abstract interface for format-specific metadata extraction."""

    @abstractmethod
    def extract(self, file_bytes: bytes, mime_type: str) -> ExtractedMetadata:
        """Extract metadata key-value facts from file content."""
        pass


def _safe_str(value: Any) -> str:
    """Format diverse metadata values (bytes, tuples, rationals) into clean strings."""
    if isinstance(value, bytes):
        try:
            return value.decode("utf-8", errors="replace").strip("\x00")
        except Exception:
            return str(value)
    if isinstance(value, tuple) and len(value) == 3:
        # Common for GPS coordinates ((d, 1), (m, 1), (s, 1))
        try:
            d = float(value[0])
            m = float(value[1])
            s = float(value[2])
            return f"{d:.0f}° {m:.0f}' {s:.2f}\""
        except Exception:
            pass
    return str(value).strip("\x00")


class ImageMetadataExtractor(MetadataExtractor):
    """Local metadata extractor for JPEG and PNG images using Pillow."""

    def extract(self, file_bytes: bytes, mime_type: str) -> ExtractedMetadata:
        items: List[ExtractedMetadataItem] = []
        fmt = "JPEG" if mime_type == "image/jpeg" else "PNG"

        try:
            with Image.open(io.BytesIO(file_bytes)) as img:
                fmt = img.format or fmt

                # Basic image dimensions
                if img.width and img.height:
                    items.append(
                        ExtractedMetadataItem(
                            field="ImageDimensions",
                            value=f"{img.width} x {img.height}",
                            source="IMAGE_HEADER",
                        )
                    )

                # 1. EXIF Metadata (JPEG and modern PNG)
                try:
                    exif = img.getexif()
                    if exif:
                        for tag_id, value in exif.items():
                            tag_name = TAGS.get(tag_id, f"Tag_{tag_id}")
                            
                            # Handle GPS IFD specially
                            if tag_name == "GPSInfo":
                                try:
                                    gps_ifd = exif.get_ifd(0x8825)
                                    for gps_id, gps_val in gps_ifd.items():
                                        gps_name = GPSTAGS.get(gps_id, f"GPS_{gps_id}")
                                        items.append(
                                            ExtractedMetadataItem(
                                                field=f"GPS_{gps_name}",
                                                value=_safe_str(gps_val),
                                                source="GPS",
                                            )
                                        )
                                except Exception:
                                    items.append(
                                        ExtractedMetadataItem(
                                            field="GPSInfo",
                                            value=_safe_str(value),
                                            source="EXIF",
                                        )
                                    )
                                continue

                            # Standard EXIF tag
                            items.append(
                                ExtractedMetadataItem(
                                    field=tag_name,
                                    value=_safe_str(value),
                                    source="EXIF",
                                )
                            )

                        # Check nested Exif IFD
                        try:
                            exif_ifd = exif.get_ifd(0x8769)
                            for sub_id, sub_val in exif_ifd.items():
                                sub_name = TAGS.get(sub_id, f"Exif_{sub_id}")
                                items.append(
                                    ExtractedMetadataItem(
                                        field=sub_name,
                                        value=_safe_str(sub_val),
                                        source="EXIF_SUB_IFD",
                                    )
                                )
                        except Exception:
                            pass
                except Exception:
                    pass

                # 2. PNG Chunk Text Metadata (tEXt, zTXt, iTXt)
                if fmt == "PNG" and hasattr(img, "text") and img.text:
                    for text_key, text_val in img.text.items():
                        items.append(
                            ExtractedMetadataItem(
                                field=str(text_key),
                                value=_safe_str(text_val),
                                source="PNG_TEXT",
                            )
                        )
                elif hasattr(img, "info") and img.info:
                    for info_key, info_val in img.info.items():
                        # Exclude internal Pillow keys and raw EXIF bytes
                        if info_key not in ("exif", "icc_profile", "photoshop"):
                            items.append(
                                ExtractedMetadataItem(
                                    field=str(info_key),
                                    value=_safe_str(info_val),
                                    source="PNG_INFO",
                                )
                            )

        except Exception:
            pass

        return ExtractedMetadata(
            file_type="image",
            format=fmt,
            metadata=items,
        )


class PDFMetadataExtractor(MetadataExtractor):
    """Local metadata extractor for PDF documents using pypdf."""

    def extract(self, file_bytes: bytes, mime_type: str) -> ExtractedMetadata:
        items: List[ExtractedMetadataItem] = []

        try:
            reader = PdfReader(io.BytesIO(file_bytes))

            # Page count
            try:
                page_count = len(reader.pages)
                items.append(
                    ExtractedMetadataItem(
                        field="PageCount",
                        value=str(page_count),
                        source="PDF_HEADER",
                    )
                )
            except Exception:
                pass

            # Standard Document Information Dictionary
            doc_info = reader.metadata
            if doc_info:
                # Key mapping for common PDF info tags
                keys = [
                    ("/Author", "Author"),
                    ("/Creator", "Creator"),
                    ("/Producer", "Producer"),
                    ("/Title", "Title"),
                    ("/Subject", "Subject"),
                    ("/Keywords", "Keywords"),
                    ("/CreationDate", "CreationDate"),
                    ("/ModDate", "ModificationDate"),
                ]
                for raw_key, clean_name in keys:
                    if raw_key in doc_info and doc_info[raw_key]:
                        items.append(
                            ExtractedMetadataItem(
                                field=clean_name,
                                value=_safe_str(doc_info[raw_key]),
                                source="PDF_INFO",
                            )
                        )

                # Any extra custom metadata entries in dictionary
                for custom_key, custom_val in doc_info.items():
                    clean_k = custom_key.lstrip("/")
                    if clean_k not in [k[1] for k in keys] and custom_val:
                        items.append(
                            ExtractedMetadataItem(
                                field=clean_k,
                                value=_safe_str(custom_val),
                                source="PDF_CUSTOM_INFO",
                            )
                        )

            # Safely check for embedded attachments
            try:
                if hasattr(reader, "attachments") and reader.attachments:
                    for att_name in reader.attachments.keys():
                        items.append(
                            ExtractedMetadataItem(
                                field="EmbeddedAttachment",
                                value=_safe_str(att_name),
                                source="PDF_ATTACHMENT",
                            )
                        )
            except Exception:
                pass

        except Exception:
            pass

        return ExtractedMetadata(
            file_type="document",
            format="PDF",
            metadata=items,
        )


class UnifiedMetadataExtractor:
    """Unified dispatcher for file metadata extraction based on MIME type."""

    def __init__(self):
        self._image_extractor = ImageMetadataExtractor()
        self._pdf_extractor = PDFMetadataExtractor()

    def extract(self, file_bytes: bytes, mime_type: str) -> ExtractedMetadata:
        """Extract metadata facts safely according to verified MIME type."""
        if mime_type in ("image/jpeg", "image/png"):
            return self._image_extractor.extract(file_bytes, mime_type)
        elif mime_type == "application/pdf":
            return self._pdf_extractor.extract(file_bytes, mime_type)
        else:
            return ExtractedMetadata(file_type="unknown", format="UNKNOWN", metadata=[])
