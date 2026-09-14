"""Tests for Metadata Extraction and AI Privacy Analysis Layer (Step 4)."""

import asyncio
import io
import uuid
import pytest
from PIL import Image
from PIL.PngImagePlugin import PngInfo
from pypdf import PdfWriter
from fastapi.testclient import TestClient

from app.main import app
from app.models.metadata import (
    AnalysisResult,
    ExtractedMetadata,
    ExtractedMetadataItem,
    PrivacyCategory,
    SeverityLevel,
)
from app.services.ai.mock_provider import MockAIAnalysisProvider
from app.services.analysis_service import AnalysisService
from app.services.metadata_extractor import UnifiedMetadataExtractor


# -----------------------------------------------------------------------------
# Fixtures & Test File Generators
# -----------------------------------------------------------------------------
@pytest.fixture(scope="module")
def client():
    """Create a FastAPI test client instance."""
    with TestClient(app) as test_client:
        yield test_client


def make_jpeg_with_exif() -> bytes:
    """Generate a JPEG containing EXIF, Camera, and GPS metadata."""
    img = Image.new("RGB", (30, 30), color="orange")
    exif = img.getexif()

    # Standard EXIF Tags (Make=271, Model=272, DateTime=306, Artist=315, Software=305)
    exif[271] = "Canon"
    exif[272] = "EOS R5"
    exif[306] = "2026:09:14 14:00:00"
    exif[315] = "Photographer Jane"
    exif[305] = "Adobe Lightroom 13.0"

    # GPS IFD: tag 0x8825
    gps_ifd = exif.get_ifd(0x8825)
    gps_ifd[1] = "N"
    gps_ifd[2] = (37.0, 46.0, 29.8)
    gps_ifd[3] = "W"
    gps_ifd[4] = (122.0, 25.0, 9.8)
    gps_ifd[6] = 42.0

    buf = io.BytesIO()
    img.save(buf, format="JPEG", exif=exif)
    return buf.getvalue()


def make_jpeg_without_exif() -> bytes:
    """Generate a clean JPEG containing zero EXIF metadata."""
    img = Image.new("RGB", (10, 10), color="white")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def make_png_with_metadata() -> bytes:
    """Generate a PNG image containing chunk text metadata."""
    img = Image.new("RGBA", (15, 15), color="cyan")
    png_info = PngInfo()
    png_info.add_text("Author", "Lead Designer")
    png_info.add_text("Software", "Figma Desktop")
    png_info.add_text("Creation Time", "2026-09-14T10:00:00Z")

    buf = io.BytesIO()
    img.save(buf, format="PNG", pnginfo=png_info)
    return buf.getvalue()


def make_pdf_with_metadata() -> bytes:
    """Generate a PDF document containing document dictionary metadata."""
    writer = PdfWriter()
    writer.add_blank_page(width=72, height=72)
    writer.add_metadata(
        {
            "/Author": "Internal Team",
            "/Creator": "Executive Document Suite",
            "/Producer": "PDF Generator Engine",
            "/Title": "Quarterly Financial Overview",
            "/Subject": "Confidential Strategy",
            "/CreationDate": "D:20260914120000Z",
        }
    )
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def make_pdf_without_metadata() -> bytes:
    """Generate a clean PDF with empty metadata."""
    writer = PdfWriter()
    writer.add_blank_page(width=50, height=50)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


# -----------------------------------------------------------------------------
# Unit & Integration Tests for Step 4
# -----------------------------------------------------------------------------
def test_jpeg_with_exif_extraction_and_analysis(client: TestClient):
    """Test 1: JPEG with EXIF extracts tags and returns categorized findings."""
    jpeg_bytes = make_jpeg_with_exif()
    up_res = client.post("/api/v1/upload", files={"file": ("photo_exif.jpg", jpeg_bytes, "image/jpeg")})
    assert up_res.status_code == 201
    file_id = up_res.json()["file_id"]

    res = client.post(f"/api/v1/analyze/{file_id}")
    assert res.status_code == 200
    data = res.json()

    assert data["file_id"] == file_id
    assert data["filename"] == "photo_exif.jpg"
    assert data["status"] == "analyzed"
    assert len(data["findings"]) > 0

    fields = [f["field"] for f in data["findings"]]
    assert any("Make" in f or "Canon" in f for f in fields)
    assert any("GPS" in f for f in fields)

    # Validate high risk count includes GPS
    assert data["summary"]["total_findings"] > 0
    assert data["summary"]["high_risk_findings"] >= 1


def test_jpeg_without_exif_analysis(client: TestClient):
    """Test 2: JPEG without EXIF metadata returns minimal/dimension-only findings."""
    clean_bytes = make_jpeg_without_exif()
    up_res = client.post("/api/v1/upload", files={"file": ("clean.jpg", clean_bytes, "image/jpeg")})
    file_id = up_res.json()["file_id"]

    res = client.post(f"/api/v1/analyze/{file_id}")
    assert res.status_code == 200
    data = res.json()

    # ImageDimensions might be present, but no high risk privacy leaks
    assert data["summary"]["high_risk_findings"] == 0


def test_png_with_metadata_analysis(client: TestClient):
    """Test 3: PNG with text chunk metadata extracts and classifies authors/software."""
    png_bytes = make_png_with_metadata()
    up_res = client.post("/api/v1/upload", files={"file": ("design.png", png_bytes, "image/png")})
    file_id = up_res.json()["file_id"]

    res = client.post(f"/api/v1/analyze/{file_id}")
    assert res.status_code == 200
    data = res.json()

    findings = data["findings"]
    fields = {f["field"]: f for f in findings}

    assert "Author" in fields
    assert fields["Author"]["category"] == "AUTHOR_IDENTITY"
    assert fields["Author"]["value"] == "Lead Designer"

    assert "Software" in fields
    assert fields["Software"]["category"] == "SOFTWARE"


def test_pdf_with_metadata_analysis(client: TestClient):
    """Test 4: PDF with dictionary metadata extracts author, creator, producer, title."""
    pdf_bytes = make_pdf_with_metadata()
    up_res = client.post("/api/v1/upload", files={"file": ("report.pdf", pdf_bytes, "application/pdf")})
    file_id = up_res.json()["file_id"]

    res = client.post(f"/api/v1/analyze/{file_id}")
    assert res.status_code == 200
    data = res.json()

    fields = {f["field"]: f for f in data["findings"]}
    assert "Author" in fields
    assert fields["Author"]["value"] == "Internal Team"
    assert fields["Author"]["category"] == "AUTHOR_IDENTITY"

    assert "Creator" in fields
    assert fields["Creator"]["category"] == "AUTHOR_IDENTITY"


def test_pdf_without_metadata_analysis(client: TestClient):
    """Test 5: PDF with empty metadata produces zero high risk leaks."""
    pdf_bytes = make_pdf_without_metadata()
    up_res = client.post("/api/v1/upload", files={"file": ("empty_doc.pdf", pdf_bytes, "application/pdf")})
    file_id = up_res.json()["file_id"]

    res = client.post(f"/api/v1/analyze/{file_id}")
    assert res.status_code == 200
    data = res.json()

    # Only PageCount is extracted
    assert data["summary"]["high_risk_findings"] == 0


def test_gps_metadata_classification():
    """Test 6: GPS metadata is classified into LOCATION with CRITICAL/HIGH severity."""
    async def _run():
        mock_ai = MockAIAnalysisProvider()
        extracted = ExtractedMetadata(
            file_type="image",
            format="JPEG",
            metadata=[
                ExtractedMetadataItem(field="GPSLatitude", value="37.7749 N", source="GPS"),
                ExtractedMetadataItem(field="GPSAltitude", value="50 m", source="GPS"),
            ],
        )
        findings = await mock_ai.analyze_metadata("file1", "test.jpg", extracted)

        lat_finding = next(f for f in findings if f.field == "GPSLatitude")
        assert lat_finding.category == PrivacyCategory.LOCATION
        assert lat_finding.severity == SeverityLevel.CRITICAL

        alt_finding = next(f for f in findings if f.field == "GPSAltitude")
        assert alt_finding.category == PrivacyCategory.LOCATION
        assert alt_finding.severity == SeverityLevel.HIGH

    asyncio.run(_run())


def test_camera_metadata_classification():
    """Test 7: Camera make/model is classified into DEVICE_INFORMATION with MEDIUM severity."""
    async def _run():
        mock_ai = MockAIAnalysisProvider()
        extracted = ExtractedMetadata(
            file_type="image",
            format="JPEG",
            metadata=[
                ExtractedMetadataItem(field="Model", value="iPhone 15 Pro", source="EXIF"),
                ExtractedMetadataItem(field="SerialNumber", value="SN-9948201", source="EXIF"),
            ],
        )
        findings = await mock_ai.analyze_metadata("file1", "test.jpg", extracted)

        model_f = next(f for f in findings if f.field == "Model")
        assert model_f.category == PrivacyCategory.DEVICE_INFORMATION
        assert model_f.severity == SeverityLevel.MEDIUM

        serial_f = next(f for f in findings if f.field == "SerialNumber")
        assert serial_f.category == PrivacyCategory.DEVICE_INFORMATION
        assert serial_f.severity == SeverityLevel.HIGH

    asyncio.run(_run())


def test_author_metadata_classification():
    """Test 8: Author and artist are classified into AUTHOR_IDENTITY."""
    async def _run():
        mock_ai = MockAIAnalysisProvider()
        extracted = ExtractedMetadata(
            file_type="document",
            format="PDF",
            metadata=[
                ExtractedMetadataItem(field="Author", value="Alice Smith", source="PDF_INFO"),
            ],
        )
        findings = await mock_ai.analyze_metadata("file1", "doc.pdf", extracted)
        assert findings[0].category == PrivacyCategory.AUTHOR_IDENTITY
        assert findings[0].severity == SeverityLevel.MEDIUM

    asyncio.run(_run())


def test_date_time_classification():
    """Test 9: Timestamps are classified into DATE_TIME with MEDIUM severity."""
    async def _run():
        mock_ai = MockAIAnalysisProvider()
        extracted = ExtractedMetadata(
            file_type="image",
            format="JPEG",
            metadata=[
                ExtractedMetadataItem(field="DateTimeOriginal", value="2026:09:14 15:00:00", source="EXIF"),
            ],
        )
        findings = await mock_ai.analyze_metadata("file1", "photo.jpg", extracted)
        assert findings[0].category == PrivacyCategory.DATE_TIME
        assert findings[0].severity == SeverityLevel.MEDIUM

    asyncio.run(_run())


def test_empty_metadata_handling():
    """Test 10: Empty metadata list produces empty findings and 0 summary counts."""
    async def _run():
        service = AnalysisService()
        result = await service.analyze_file(
            file_id="empty_123",
            file_bytes=b"",
            filename="empty.jpg",
            mime_type="image/jpeg",
        )
        assert result.status == "analyzed"
        assert result.findings == []
        assert result.summary.total_findings == 0
        assert result.summary.high_risk_findings == 0

    asyncio.run(_run())


def test_missing_file_id_returns_404(client: TestClient):
    """Test 11: Requesting analysis on a non-existent file_id returns HTTP 404."""
    random_id = str(uuid.uuid4())
    res = client.post(f"/api/v1/analyze/{random_id}")
    assert res.status_code == 404
    data = res.json()
    assert data["success"] is False
    assert data["error"]["code"] == "FILE_NOT_FOUND"


def test_malformed_metadata_handling():
    """Test 12: Unusual or malformed bytes in extractor do not crash extraction."""
    extractor = UnifiedMetadataExtractor()
    # Garbage bytes
    res = extractor.extract(b"Not an image", "image/jpeg")
    assert res.metadata == []

    # Corrupt PDF header
    res_pdf = extractor.extract(b"%PDF-corrupt_data", "application/pdf")
    assert isinstance(res_pdf.metadata, list)


def test_response_schema_validation(client: TestClient):
    """Test 13: AnalysisResult conforms to Pydantic model with no filesystem paths."""
    jpeg_bytes = make_jpeg_with_exif()
    up_res = client.post("/api/v1/upload", files={"file": ("photo.jpg", jpeg_bytes, "image/jpeg")})
    file_id = up_res.json()["file_id"]

    res = client.post(f"/api/v1/analyze/{file_id}")
    assert res.status_code == 200

    # Ensure schema validates cleanly against Pydantic model
    validated = AnalysisResult(**res.json())
    assert validated.file_id == file_id

    # Confirm zero server filesystem paths or directories in response
    res_text = res.text.lower()
    assert "f:\\" not in res_text
    assert "c:\\" not in res_text
    assert "temp_storage" not in res_text


def test_mock_provider_works_without_api_key():
    """Test 14: Mock provider executes offline without any API key required."""
    async def _run():
        provider = MockAIAnalysisProvider()
        extracted = ExtractedMetadata(
            file_type="image",
            format="JPEG",
            metadata=[
                ExtractedMetadataItem(field="Copyright", value="All Rights Reserved", source="EXIF"),
            ],
        )
        findings = await provider.analyze_metadata("f_test", "sample.jpg", extracted)
        assert len(findings) == 1
        assert findings[0].category == PrivacyCategory.COPYRIGHT
        assert findings[0].severity == SeverityLevel.LOW

    asyncio.run(_run())
