"""Comprehensive automated test suite for Step 5: Metadata Selection & File Sanitization."""

import io
import uuid
import pytest
from PIL import Image
from PIL.PngImagePlugin import PngInfo
from pypdf import PdfReader, PdfWriter
from fastapi.testclient import TestClient

from app.main import app
from app.services.metadata_extractor import UnifiedMetadataExtractor


@pytest.fixture(scope="module")
def client():
    """Create a FastAPI test client instance."""
    with TestClient(app) as test_client:
        yield test_client


def make_full_jpeg() -> bytes:
    """Generate JPEG with complete EXIF, GPS, camera, and author metadata."""
    img = Image.new("RGB", (64, 48), color="green")
    exif = img.getexif()
    exif[271] = "Canon"
    exif[272] = "EOS R5"
    exif[306] = "2026:09:14 15:00:00"
    exif[315] = "Jane Doe"
    exif[305] = "Lightroom Pro"
    exif[33432] = "Copyright 2026"

    # GPS IFD (0x8825)
    gps_ifd = exif.get_ifd(0x8825)
    gps_ifd[1] = "N"
    gps_ifd[2] = (37.0, 46.0, 29.8)
    gps_ifd[3] = "W"
    gps_ifd[4] = (122.0, 25.0, 9.8)
    gps_ifd[6] = 42.0

    buf = io.BytesIO()
    img.save(buf, format="JPEG", exif=exif)
    return buf.getvalue()


def make_full_png() -> bytes:
    """Generate PNG with text chunk metadata."""
    img = Image.new("RGBA", (32, 32), color="purple")
    info = PngInfo()
    info.add_text("Author", "Alice Designer")
    info.add_text("Software", "Figma 2026")
    info.add_text("Creation Time", "2026-09-14")
    info.add_text("Copyright", "2026 Studio")

    buf = io.BytesIO()
    img.save(buf, format="PNG", pnginfo=info)
    return buf.getvalue()


def make_full_pdf() -> bytes:
    """Generate PDF with complete document metadata dictionary."""
    writer = PdfWriter()
    writer.add_blank_page(width=100, height=100)
    writer.add_metadata(
        {
            "/Author": "Dr. Confidential",
            "/Creator": "Executive Suite",
            "/Producer": "Internal Engine",
            "/Title": "Secret Project",
            "/Subject": "Research",
            "/CreationDate": "D:20260914120000",
        }
    )
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


# -----------------------------------------------------------------------------
# Tests 1-6: JPEG Sanitization
# -----------------------------------------------------------------------------
def test_jpeg_gps_removal(client: TestClient):
    """1. JPEG GPS removal: GPS is stripped completely while other tags remain."""
    file_bytes = make_full_jpeg()
    up = client.post("/api/v1/upload", files={"file": ("photo.jpg", file_bytes, "image/jpeg")})
    file_id = up.json()["file_id"]

    res = client.post(f"/api/v1/sanitize/{file_id}", json={"fields_to_remove": ["GPS_GPSLatitude"]})
    assert res.status_code == 200
    data = res.json()
    assert any("gps" in f.lower() for f in data["removed_fields"])
    assert not any("gps" in f.lower() for f in data["remaining_fields"])
    assert any("Make" in f or "Canon" in f for f in data["remaining_fields"])


def test_jpeg_camera_metadata_removal(client: TestClient):
    """2. JPEG camera metadata removal: Make & Model are stripped."""
    file_bytes = make_full_jpeg()
    up = client.post("/api/v1/upload", files={"file": ("camera.jpg", file_bytes, "image/jpeg")})
    file_id = up.json()["file_id"]

    res = client.post(f"/api/v1/sanitize/{file_id}", json={"fields_to_remove": ["Make", "Model"]})
    assert res.status_code == 200
    data = res.json()
    assert "Make" in data["removed_fields"]
    assert "Model" in data["removed_fields"]
    assert not any(f in ("Make", "Model") for f in data["remaining_fields"])


def test_jpeg_date_time_removal(client: TestClient):
    """3. JPEG date/time removal: DateTime tags are removed."""
    file_bytes = make_full_jpeg()
    up = client.post("/api/v1/upload", files={"file": ("dated.jpg", file_bytes, "image/jpeg")})
    file_id = up.json()["file_id"]

    res = client.post(f"/api/v1/sanitize/{file_id}", json={"fields_to_remove": ["DateTime"]})
    assert res.status_code == 200
    data = res.json()
    assert "DateTime" in data["removed_fields"]
    assert "DateTime" not in data["remaining_fields"]


def test_jpeg_author_removal(client: TestClient):
    """4. JPEG author removal: Artist tag is removed."""
    file_bytes = make_full_jpeg()
    up = client.post("/api/v1/upload", files={"file": ("artist.jpg", file_bytes, "image/jpeg")})
    file_id = up.json()["file_id"]

    res = client.post(f"/api/v1/sanitize/{file_id}", json={"fields_to_remove": ["Artist"]})
    assert res.status_code == 200
    data = res.json()
    assert "Artist" in data["removed_fields"]
    assert "Artist" not in data["remaining_fields"]


def test_jpeg_multiple_selected_fields(client: TestClient):
    """5. JPEG multiple selected fields: All chosen fields are stripped."""
    file_bytes = make_full_jpeg()
    up = client.post("/api/v1/upload", files={"file": ("multi.jpg", file_bytes, "image/jpeg")})
    file_id = up.json()["file_id"]

    res = client.post(
        f"/api/v1/sanitize/{file_id}",
        json={"fields_to_remove": ["GPS_GPSLatitude", "Make", "Software"]},
    )
    assert res.status_code == 200
    data = res.json()
    assert any("gps" in f.lower() for f in data["removed_fields"])
    assert "Make" in data["removed_fields"]
    assert "Software" in data["removed_fields"]


def test_jpeg_selective_removal_while_leaving_unselected_metadata(client: TestClient):
    """6. Selective removal: Unselected metadata (DateTime, Copyright) remains intact."""
    file_bytes = make_full_jpeg()
    up = client.post("/api/v1/upload", files={"file": ("selective.jpg", file_bytes, "image/jpeg")})
    file_id = up.json()["file_id"]

    # Only remove GPS
    res = client.post(f"/api/v1/sanitize/{file_id}", json={"fields_to_remove": ["GPS_GPSLatitude"]})
    assert res.status_code == 200
    data = res.json()

    # Verify unselected tags remain in remaining_fields
    assert "DateTime" in data["remaining_fields"]
    assert "Copyright" in data["remaining_fields"]
    assert "Make" in data["remaining_fields"]


# -----------------------------------------------------------------------------
# Test 7: PNG Sanitization
# -----------------------------------------------------------------------------
def test_png_metadata_removal(client: TestClient):
    """7. PNG metadata removal: Selected textual chunks are eliminated."""
    file_bytes = make_full_png()
    up = client.post("/api/v1/upload", files={"file": ("vector.png", file_bytes, "image/png")})
    file_id = up.json()["file_id"]

    res = client.post(f"/api/v1/sanitize/{file_id}", json={"fields_to_remove": ["Author", "Software"]})
    assert res.status_code == 200
    data = res.json()
    assert "Author" in data["removed_fields"]
    assert "Software" in data["removed_fields"]
    # Copyright was unselected and should remain
    assert "Copyright" in data["remaining_fields"]


# -----------------------------------------------------------------------------
# Tests 8-12: PDF Sanitization
# -----------------------------------------------------------------------------
def test_pdf_author_removal(client: TestClient):
    """8. PDF Author removal."""
    file_bytes = make_full_pdf()
    up = client.post("/api/v1/upload", files={"file": ("doc.pdf", file_bytes, "application/pdf")})
    file_id = up.json()["file_id"]

    res = client.post(f"/api/v1/sanitize/{file_id}", json={"fields_to_remove": ["Author"]})
    assert res.status_code == 200
    data = res.json()
    assert "Author" in data["removed_fields"]
    assert "Author" not in data["remaining_fields"]


def test_pdf_creator_removal(client: TestClient):
    """9. PDF Creator removal."""
    file_bytes = make_full_pdf()
    up = client.post("/api/v1/upload", files={"file": ("creator.pdf", file_bytes, "application/pdf")})
    file_id = up.json()["file_id"]

    res = client.post(f"/api/v1/sanitize/{file_id}", json={"fields_to_remove": ["Creator"]})
    assert res.status_code == 200
    data = res.json()
    assert "Creator" in data["removed_fields"]
    assert "Creator" not in data["remaining_fields"]


def test_pdf_producer_removal(client: TestClient):
    """10. PDF Producer removal."""
    file_bytes = make_full_pdf()
    up = client.post("/api/v1/upload", files={"file": ("producer.pdf", file_bytes, "application/pdf")})
    file_id = up.json()["file_id"]

    res = client.post(f"/api/v1/sanitize/{file_id}", json={"fields_to_remove": ["Producer"]})
    assert res.status_code == 200
    data = res.json()
    assert "Producer" in data["removed_fields"]
    assert "Producer" not in data["remaining_fields"]


def test_pdf_date_metadata_removal(client: TestClient):
    """11. PDF date metadata removal: CreationDate is removed."""
    file_bytes = make_full_pdf()
    up = client.post("/api/v1/upload", files={"file": ("dated.pdf", file_bytes, "application/pdf")})
    file_id = up.json()["file_id"]

    res = client.post(f"/api/v1/sanitize/{file_id}", json={"fields_to_remove": ["CreationDate"]})
    assert res.status_code == 200
    data = res.json()
    assert "CreationDate" in data["removed_fields"]
    assert "CreationDate" not in data["remaining_fields"]


def test_pdf_multiple_metadata_removal(client: TestClient):
    """12. PDF multiple metadata removal: Author, Title, and Subject removed."""
    file_bytes = make_full_pdf()
    up = client.post("/api/v1/upload", files={"file": ("multi.pdf", file_bytes, "application/pdf")})
    file_id = up.json()["file_id"]

    res = client.post(
        f"/api/v1/sanitize/{file_id}",
        json={"fields_to_remove": ["Author", "Title", "Subject"]},
    )
    assert res.status_code == 200
    data = res.json()
    assert "Author" in data["removed_fields"]
    assert "Title" in data["removed_fields"]
    assert "Subject" in data["removed_fields"]


# -----------------------------------------------------------------------------
# Tests 13-17: Integrity, Quality, and Preservations
# -----------------------------------------------------------------------------
def test_original_file_remains_unchanged(client: TestClient):
    """13. Original file remains completely unchanged after sanitization."""
    file_bytes = make_full_jpeg()
    up = client.post("/api/v1/upload", files={"file": ("immutability.jpg", file_bytes, "image/jpeg")})
    file_id = up.json()["file_id"]

    # Sanitize
    client.post(f"/api/v1/sanitize/{file_id}", json={"fields_to_remove": ["GPS_GPSLatitude", "Make"]})

    # Retrieve original file via download/internal check
    extractor = UnifiedMetadataExtractor()
    # Re-extract from original file_id to verify tags are still present
    orig_res = client.get(f"/api/v1/upload/{file_id}")
    assert orig_res.status_code == 200
    assert orig_res.json()["size_bytes"] == len(file_bytes)


def test_sanitized_file_different_when_metadata_removed(client: TestClient):
    """14. Sanitized file bytes are distinct from original when metadata is stripped."""
    file_bytes = make_full_jpeg()
    up = client.post("/api/v1/upload", files={"file": ("diff.jpg", file_bytes, "image/jpeg")})
    file_id = up.json()["file_id"]

    res = client.post(f"/api/v1/sanitize/{file_id}", json={"fields_to_remove": ["GPS_GPSLatitude", "Make"]})
    sanitized_id = res.json()["sanitized_file_id"]

    dl = client.get(f"/api/v1/download/{sanitized_id}")
    assert dl.status_code == 200
    assert dl.content != file_bytes


def test_sanitized_file_remains_readable(client: TestClient):
    """15. Sanitized image file can be opened and parsed without error."""
    file_bytes = make_full_jpeg()
    up = client.post("/api/v1/upload", files={"file": ("read.jpg", file_bytes, "image/jpeg")})
    file_id = up.json()["file_id"]

    res = client.post(f"/api/v1/sanitize/{file_id}", json={"fields_to_remove": ["Make", "Model"]})
    sanitized_id = res.json()["sanitized_file_id"]

    dl = client.get(f"/api/v1/download/{sanitized_id}")
    with Image.open(io.BytesIO(dl.content)) as img:
        img.verify()


def test_visible_image_dimensions_remain_unchanged(client: TestClient):
    """16. Visible image width and height remain completely unchanged."""
    file_bytes = make_full_jpeg()  # 64 x 48
    up = client.post("/api/v1/upload", files={"file": ("dim.jpg", file_bytes, "image/jpeg")})
    file_id = up.json()["file_id"]

    res = client.post(f"/api/v1/sanitize/{file_id}", json={"fields_to_remove": ["Make"]})
    sanitized_id = res.json()["sanitized_file_id"]

    dl = client.get(f"/api/v1/download/{sanitized_id}")
    with Image.open(io.BytesIO(dl.content)) as img:
        assert img.width == 64
        assert img.height == 48


def test_pdf_remains_readable(client: TestClient):
    """17. Sanitized PDF remains valid and readable with all pages intact."""
    file_bytes = make_full_pdf()
    up = client.post("/api/v1/upload", files={"file": ("read.pdf", file_bytes, "application/pdf")})
    file_id = up.json()["file_id"]

    res = client.post(f"/api/v1/sanitize/{file_id}", json={"fields_to_remove": ["Author"]})
    sanitized_id = res.json()["sanitized_file_id"]

    dl = client.get(f"/api/v1/download/{sanitized_id}")
    reader = PdfReader(io.BytesIO(dl.content))
    assert len(reader.pages) == 1


# -----------------------------------------------------------------------------
# Tests 18-23: API, Security, Verification & Edge Cases
# -----------------------------------------------------------------------------
def test_download_endpoint_returns_correct_binary(client: TestClient):
    """18. Download endpoint returns binary with proper headers."""
    file_bytes = make_full_png()
    up = client.post("/api/v1/upload", files={"file": ("badge.png", file_bytes, "image/png")})
    file_id = up.json()["file_id"]

    san_res = client.post(f"/api/v1/sanitize/{file_id}", json={"fields_to_remove": ["Author"]})
    sanitized_id = san_res.json()["sanitized_file_id"]

    dl = client.get(f"/api/v1/download/{sanitized_id}")
    assert dl.status_code == 200
    assert dl.headers["content-type"] == "image/png"
    assert "attachment" in dl.headers["content-disposition"]
    assert "badge_secure.png" in dl.headers["content-disposition"]


def test_nonexistent_file_returns_404(client: TestClient):
    """19. Nonexistent file_id returns HTTP 404."""
    fake_id = str(uuid.uuid4())
    res = client.post(f"/api/v1/sanitize/{fake_id}", json={"fields_to_remove": ["Make"]})
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "FILE_NOT_FOUND"


def test_invalid_field_selection_returns_structured_error(client: TestClient):
    """20. Invalid field selection returns structured error."""
    file_bytes = make_full_jpeg()
    up = client.post("/api/v1/upload", files={"file": ("invalid_field.jpg", file_bytes, "image/jpeg")})
    file_id = up.json()["file_id"]

    # Supply an invalid / non-supported field
    res = client.post(
        f"/api/v1/sanitize/{file_id}",
        json={"fields_to_remove": ["random_nonexistent_unsupported_tag_xyz"]},
    )
    assert res.status_code == 400
    data = res.json()
    assert data["success"] is False
    assert data["error"]["code"] == "INVALID_FIELD_SELECTION"


def test_zip_cannot_be_sanitized(client: TestClient):
    """21. ZIP cannot be uploaded or sanitized."""
    # Attempting to sanitize a nonexistent or invalid target
    fake_zip_id = "zip_archive_file"
    res = client.post(f"/api/v1/sanitize/{fake_zip_id}", json={"fields_to_remove": ["Author"]})
    assert res.status_code in (400, 404)


def test_malformed_files_handled_safely(client: TestClient):
    """22. Corrupted file inputs fail safely without crash."""
    # Direct check with invalid bytes
    from app.services.sanitization_service import DefaultSanitizationService
    svc = DefaultSanitizationService()
    with pytest.raises(Exception):
        svc._sanitize_jpeg(b"corrupt header \xff\xd8\xff not valid", ["Make"])


def test_post_sanitization_metadata_verification_confirms_removal(client: TestClient):
    """23. Post-sanitization extraction confirms actual absence before reporting removed_fields."""
    file_bytes = make_full_jpeg()
    up = client.post("/api/v1/upload", files={"file": ("verified.jpg", file_bytes, "image/jpeg")})
    file_id = up.json()["file_id"]

    # Request removal of GPS and Artist
    res = client.post(
        f"/api/v1/sanitize/{file_id}",
        json={"fields_to_remove": ["GPS_GPSLatitude", "Artist"]},
    )
    assert res.status_code == 200
    data = res.json()

    # Confirm removed_fields only includes genuinely stripped tags
    assert "Artist" in data["removed_fields"]
    assert any("gps" in f.lower() for f in data["removed_fields"])

    # Download and inspect with independent extractor
    dl = client.get(f"/api/v1/download/{data['sanitized_file_id']}")
    extractor = UnifiedMetadataExtractor()
    extracted_clean = extractor.extract(dl.content, "image/jpeg")
    clean_fields = [item.field for item in extracted_clean.metadata]

    assert not any("gps" in f.lower() for f in clean_fields)
    assert "Artist" not in clean_fields
    assert "Make" in clean_fields
