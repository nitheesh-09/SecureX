"""Tests for File Upload system and storage abstraction."""

import io
import uuid
import zipfile
import pytest
from PIL import Image
from pypdf import PdfWriter
from fastapi.testclient import TestClient

from app.main import app
from app.services.storage_service import LocalStorageService
from app.core.config import settings
from app.core.errors import SecureXAPIException


# -----------------------------------------------------------------------------
# Fixtures & Helpers
# -----------------------------------------------------------------------------
@pytest.fixture(scope="module")
def client():
    """Create a FastAPI test client instance."""
    with TestClient(app) as test_client:
        yield test_client


def make_jpeg() -> bytes:
    """Programmatically generate a minimal valid JPEG image."""
    img = Image.new("RGB", (10, 10), color="blue")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def make_png() -> bytes:
    """Programmatically generate a minimal valid PNG image."""
    img = Image.new("RGBA", (10, 10), color=(255, 0, 0, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def make_pdf() -> bytes:
    """Programmatically generate a minimal valid PDF document."""
    writer = PdfWriter()
    writer.add_blank_page(width=72, height=72)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def make_zip() -> bytes:
    """Programmatically generate a valid ZIP archive."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("inner.txt", "some sample text")
    return buf.getvalue()


# -----------------------------------------------------------------------------
# Tests
# -----------------------------------------------------------------------------
def test_upload_valid_jpeg(client: TestClient):
    """Verify that a valid JPEG uploads successfully and returns expected schema."""
    content = make_jpeg()
    files = {"file": ("vacation.jpg", content, "image/jpeg")}
    response = client.post("/api/v1/upload", files=files)

    assert response.status_code == 201
    data = response.json()
    assert "file_id" in data
    # Ensure file_id is a valid UUID
    uuid_obj = uuid.UUID(data["file_id"])
    assert str(uuid_obj) == data["file_id"]

    assert data["filename"] == "vacation.jpg"
    assert data["mime_type"] == "image/jpeg"
    assert data["size_bytes"] == len(content)
    assert data["status"] == "uploaded"

    # Ensure no internal filesystem paths are leaked
    res_str = response.text.lower()
    assert "f:\\" not in res_str
    assert "c:\\" not in res_str
    assert "temp_storage" not in res_str
    assert ".bin" not in res_str


def test_upload_valid_png(client: TestClient):
    """Verify that a valid PNG uploads successfully."""
    content = make_png()
    files = {"file": ("diagram.png", content, "image/png")}
    response = client.post("/api/v1/upload", files=files)

    assert response.status_code == 201
    data = response.json()
    assert data["mime_type"] == "image/png"
    assert data["filename"] == "diagram.png"
    assert data["size_bytes"] == len(content)


def test_upload_valid_pdf(client: TestClient):
    """Verify that a valid PDF uploads successfully."""
    content = make_pdf()
    files = {"file": ("contract.pdf", content, "application/pdf")}
    response = client.post("/api/v1/upload", files=files)

    assert response.status_code == 201
    data = response.json()
    assert data["mime_type"] == "application/pdf"
    assert data["filename"] == "contract.pdf"
    assert data["size_bytes"] == len(content)


def test_upload_zip_explicitly_rejected(client: TestClient):
    """Verify that ZIP files are explicitly rejected with 400 Bad Request."""
    content = make_zip()
    files = {"file": ("archive.zip", content, "application/zip")}
    response = client.post("/api/v1/upload", files=files)

    assert response.status_code == 400
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "ZIP_INPUT_NOT_SUPPORTED"
    assert "zip input is not supported" in data["error"]["message"].lower()


def test_upload_fake_extension_zip_rejected(client: TestClient):
    """Verify that a ZIP disguised with a .jpg extension is caught by magic bytes and rejected."""
    content = make_zip()
    files = {"file": ("sneaky.jpg", content, "image/jpeg")}
    response = client.post("/api/v1/upload", files=files)

    assert response.status_code == 400
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "ZIP_INPUT_NOT_SUPPORTED"


def test_upload_unsupported_file_rejected(client: TestClient):
    """Verify that unsupported file formats (e.g., text, executable) are rejected."""
    content = b"This is a plain text file."
    files = {"file": ("notes.txt", content, "text/plain")}
    response = client.post("/api/v1/upload", files=files)

    assert response.status_code == 400
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "FILE_TYPE_NOT_SUPPORTED"


def test_upload_empty_file_rejected(client: TestClient):
    """Verify that empty files (0 bytes) are rejected."""
    files = {"file": ("empty.jpg", b"", "image/jpeg")}
    response = client.post("/api/v1/upload", files=files)

    assert response.status_code == 400
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "EMPTY_FILE"


def test_upload_oversized_file_rejected(client: TestClient, monkeypatch):
    """Verify that files exceeding the size limit return 413 FILE_TOO_LARGE."""
    # Set limit temporarily to 50 bytes for fast testing
    monkeypatch.setattr(settings, "MAX_FILE_SIZE_BYTES", 50)
    content = make_jpeg()  # JPEG is ~600+ bytes
    files = {"file": ("large.jpg", content, "image/jpeg")}
    response = client.post("/api/v1/upload", files=files)

    assert response.status_code == 413
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "FILE_TOO_LARGE"


def test_upload_corrupted_image_rejected(client: TestClient):
    """Verify that corrupted image bytes with valid magic headers return 422 CORRUPT_FILE."""
    # Start with valid JPEG header \xff\xd8\xff followed by random garbage
    content = b"\xff\xd8\xff" + b"\x00" * 30
    files = {"file": ("corrupt.jpg", content, "image/jpeg")}
    response = client.post("/api/v1/upload", files=files)

    assert response.status_code == 422
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "CORRUPT_FILE"


def test_retrieve_file_info_by_file_id(client: TestClient):
    """Verify that file info can be retrieved by file_id without exposing server paths."""
    content = make_png()
    files = {"file": ("my_screenshot.png", content, "image/png")}
    upload_res = client.post("/api/v1/upload", files=files)
    assert upload_res.status_code == 201
    file_id = upload_res.json()["file_id"]

    # Retrieve info via GET /api/v1/upload/{file_id}
    get_res = client.get(f"/api/v1/upload/{file_id}")
    assert get_res.status_code == 200
    info = get_res.json()
    assert info["file_id"] == file_id
    assert info["filename"] == "my_screenshot.png"
    assert info["mime_type"] == "image/png"
    assert info["size_bytes"] == len(content)
    assert info["status"] == "uploaded"

    # Confirm no raw filesystem paths are in the response
    assert "f:\\" not in get_res.text.lower()
    assert "temp_storage" not in get_res.text.lower()


def test_retrieve_nonexistent_file_returns_404(client: TestClient):
    """Verify that requesting an unknown file_id returns 404 FILE_NOT_FOUND."""
    random_id = str(uuid.uuid4())
    response = client.get(f"/api/v1/upload/{random_id}")
    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "FILE_NOT_FOUND"


def test_path_traversal_protection(client: TestClient):
    """Verify that directory traversal attempts are rejected."""
    # Attempt directory traversal in file_id
    traversal_id = "../../etc/passwd"
    response = client.get(f"/api/v1/upload/{traversal_id}")
    assert response.status_code in [400, 404]

    # Verify unit-level path traversal protection on LocalStorageService
    storage = LocalStorageService()
    with pytest.raises(SecureXAPIException) as exc_info:
        storage._validate_safe_id("../../sensitive.txt")
    assert exc_info.value.code == "INVALID_FILE_ID"
