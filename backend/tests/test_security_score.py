"""Unit and integration tests for SecurityScoreService, scoring API, and final privacy result."""

import io
import pytest
from fastapi.testclient import TestClient
from PIL import Image
from PIL.ExifTags import TAGS
from pypdf import PdfWriter

from app.main import app
from app.models.metadata import (
    FinalResult,
    PrivacyCategory,
    PrivacyFinding,
    ScoreComparison,
    SecurityScore,
    SeverityLevel,
)
from app.services.security_score_service import SecurityScoreService

client = TestClient(app)


# Helper function to generate mock findings
def _make_finding(field: str, severity: SeverityLevel, cat: PrivacyCategory = PrivacyCategory.OTHER) -> PrivacyFinding:
    return PrivacyFinding(
        id=f"find-{field}",
        field=field,
        category=cat,
        value="test-val",
        severity=severity,
        title=f"Exposed {field}",
        explanation=f"Testing {field}",
        removable=True,
    )


# Helper to generate JPEG with specific EXIF metadata
def _create_jpeg_with_exif(metadata: dict = None) -> bytes:
    img = Image.new("RGB", (60, 60), color=(100, 150, 200))
    exif = img.getexif()

    inv_tags = {v: k for k, v in TAGS.items()}

    if metadata:
        for k, v in metadata.items():
            if k == "GPSInfo":
                gps_ifd = exif.get_ifd(0x8825)
                gps_ifd[1] = "N"
                gps_ifd[2] = (37.0, 46.0, 29.8)
                gps_ifd[3] = "W"
                gps_ifd[4] = (122.0, 25.0, 9.8)
            elif k in inv_tags:
                exif[inv_tags[k]] = v

    buf = io.BytesIO()
    img.save(buf, format="JPEG", exif=exif)
    return buf.getvalue()



# Helper to generate minimal clean JPEG
def _create_clean_jpeg() -> bytes:
    img = Image.new("RGB", (50, 50), color=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


# =============================================================================
# 1. Unit Tests for SecurityScoreService
# =============================================================================

def test_no_findings_returns_100_safe():
    """Scenario 1 & 15: Clean / No findings returns 100 SAFE."""
    service = SecurityScoreService()
    result = service.calculate_score([])
    assert result.score == 100
    assert result.risk_level == "SAFE"
    assert result.risk_points == 0
    assert result.total_remaining_findings == 0
    assert result.critical_findings == 0
    assert result.high_findings == 0
    assert result.medium_findings == 0
    assert result.low_findings == 0
    assert "no detected privacy-sensitive metadata" in result.recommendation


def test_single_low_finding_score_95():
    """Scenario 2: One LOW finding (5 pts) -> 95 SAFE."""
    service = SecurityScoreService()
    findings = [_make_finding("Software", SeverityLevel.LOW)]
    result = service.calculate_score(findings)
    assert result.score == 95
    assert result.risk_level == "SAFE"
    assert result.risk_points == 5
    assert result.total_remaining_findings == 1
    assert result.low_findings == 1
    assert "minimal privacy-sensitive metadata" in result.recommendation


def test_single_medium_finding_score_90():
    """Scenario 3: One MEDIUM finding (10 pts) -> 90 SAFE."""
    service = SecurityScoreService()
    findings = [_make_finding("Camera_Make", SeverityLevel.MEDIUM)]
    result = service.calculate_score(findings)
    assert result.score == 90
    assert result.risk_level == "SAFE"
    assert result.risk_points == 10
    assert result.total_remaining_findings == 1
    assert result.medium_findings == 1
    assert "minimal privacy-sensitive metadata" in result.recommendation


def test_single_high_finding_score_80():
    """Scenario 4: One HIGH finding (20 pts) -> 80 LOW RISK."""
    service = SecurityScoreService()
    findings = [_make_finding("Author", SeverityLevel.HIGH)]
    result = service.calculate_score(findings)
    assert result.score == 80
    assert result.risk_level == "LOW RISK"
    assert result.risk_points == 20
    assert result.total_remaining_findings == 1
    assert result.high_findings == 1
    assert "remaining privacy metadata" in result.recommendation


def test_single_critical_finding_score_70():
    """Scenario 5: One CRITICAL finding (30 pts) -> 70 LOW RISK."""
    service = SecurityScoreService()
    findings = [_make_finding("GPSLatitude", SeverityLevel.CRITICAL)]
    result = service.calculate_score(findings)
    assert result.score == 70
    assert result.risk_level == "LOW RISK"
    assert result.risk_points == 30
    assert result.total_remaining_findings == 1
    assert result.critical_findings == 1
    assert "remaining privacy metadata" in result.recommendation


def test_multiple_findings_calculation():
    """Scenario 6: Multiple findings combine deterministically."""
    service = SecurityScoreService()
    # GPS (30) + Author (20) + Camera (10) = 60 risk points -> score = 40 (MEDIUM RISK)
    findings = [
        _make_finding("GPS", SeverityLevel.CRITICAL),
        _make_finding("Author", SeverityLevel.HIGH),
        _make_finding("Camera", SeverityLevel.MEDIUM),
    ]
    result = service.calculate_score(findings)
    assert result.risk_points == 60
    assert result.score == 40
    assert result.risk_level == "MEDIUM RISK"
    assert result.total_remaining_findings == 3
    assert result.critical_findings == 1
    assert result.high_findings == 1
    assert result.medium_findings == 1
    assert result.low_findings == 0
    assert "privacy-sensitive metadata" in result.recommendation


def test_score_cannot_go_below_zero():
    """Scenario 7: Extreme risk points floor score strictly at 0."""
    service = SecurityScoreService()
    # 4 CRITICAL = 120 risk points -> score = max(0, 100 - 120) = 0
    findings = [
        _make_finding("GPS1", SeverityLevel.CRITICAL),
        _make_finding("GPS2", SeverityLevel.CRITICAL),
        _make_finding("GPS3", SeverityLevel.CRITICAL),
        _make_finding("GPS4", SeverityLevel.CRITICAL),
    ]
    result = service.calculate_score(findings)
    assert result.risk_points == 120
    assert result.score == 0
    assert result.risk_level == "HIGH RISK"
    assert "significant privacy-sensitive metadata" in result.recommendation


@pytest.mark.parametrize(
    "score_val,expected_level",
    [
        (100, "SAFE"),
        (90, "SAFE"),
        (89, "LOW RISK"),
        (70, "LOW RISK"),
        (69, "MEDIUM RISK"),
        (40, "MEDIUM RISK"),
        (39, "HIGH RISK"),
        (0, "HIGH RISK"),
    ],
)
def test_risk_level_boundaries(score_val: int, expected_level: str):
    """Scenario 8: Exact verification of all boundary values (100, 90, 89, 70, 69, 40, 39, 0)."""
    assert SecurityScoreService.get_risk_level(score_val) == expected_level


def test_before_and_after_score_and_improvement():
    """Scenarios 9, 10, 11: Correct before score, after score, and improvement calculation."""
    service = SecurityScoreService()
    # Before: GPS (30) + Author (20) + DateTime (10) = 60 risk points -> before_score = 40
    before_findings = [
        _make_finding("GPS", SeverityLevel.CRITICAL),
        _make_finding("Author", SeverityLevel.HIGH),
        _make_finding("DateTime", SeverityLevel.MEDIUM),
    ]
    # After: Only DateTime (10) remains -> after_score = 90
    after_findings = [
        _make_finding("DateTime", SeverityLevel.MEDIUM),
    ]

    comp = service.calculate_comparison(before_findings, after_findings)
    assert comp.before_score == 40
    assert comp.after_score == 90
    assert comp.improvement == 50


def test_improvement_zero_when_score_does_not_increase():
    """Improvement is floored at 0 if no change occurs."""
    service = SecurityScoreService()
    comp = service.calculate_comparison_from_scores(90, 90)
    assert comp.improvement == 0


def test_pydantic_schema_validation():
    """Scenario 17: Pydantic response models strictly validate types and constraints."""
    score_model = SecurityScore(
        score=95,
        risk_level="SAFE",
        risk_points=5,
        total_remaining_findings=1,
        critical_findings=0,
        high_findings=0,
        medium_findings=0,
        low_findings=1,
        recommendation="Your file contains minimal privacy-sensitive metadata and is generally safe to share.",
        is_sanitized=True,
    )
    assert score_model.score == 95
    assert score_model.is_sanitized is True

    comparison_model = ScoreComparison(
        before_score=42,
        after_score=95,
        improvement=53,
    )
    assert comparison_model.improvement == 53

    result_model = FinalResult(
        file_id="orig-123",
        sanitized_file_id="san-456",
        filename="test.jpg",
        status="complete",
        score=comparison_model,
        security=score_model,
        removed_fields=["GPS"],
        remaining_fields=["Software"],
        download={"sanitized_file_id": "san-456"},
    )
    assert result_model.sanitized_file_id == "san-456"
    assert result_model.score.improvement == 53


# =============================================================================
# 2. Integration Tests: Scoring API & Lifecycle
# =============================================================================

def test_missing_analysis_returns_400_analysis_required():
    """Scenario 16: Requesting score on uploaded file without analysis returns 400 ANALYSIS_REQUIRED."""
    jpeg_bytes = _create_jpeg_with_exif({"Make": "Nikon"})
    upload_res = client.post(
        "/api/v1/upload",
        files={"file": ("photo.jpg", io.BytesIO(jpeg_bytes), "image/jpeg")},
    )
    assert upload_res.status_code == 201
    file_id = upload_res.json()["file_id"]

    # Request score BEFORE analyzing
    score_res = client.post(f"/api/v1/score/{file_id}")
    assert score_res.status_code == 400
    err_body = score_res.json()
    assert err_body["error"]["code"] == "ANALYSIS_REQUIRED"


def test_nonexistent_file_score_returns_404():
    """Requesting score on non-existent file returns 404 FILE_NOT_FOUND."""
    res = client.post("/api/v1/score/non-existent-id")
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "FILE_NOT_FOUND"


def test_nonexistent_file_result_returns_404():
    """Requesting final result on non-existent file returns 404 RESULT_NOT_FOUND."""
    res = client.get("/api/v1/result/non-existent-id")
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "RESULT_NOT_FOUND"


def test_unsanitized_file_result_returns_400_sanitization_required():
    """Requesting final result on an analyzed but unsanitized file returns 400 SANITIZATION_REQUIRED."""
    jpeg_bytes = _create_clean_jpeg()
    upload_res = client.post(
        "/api/v1/upload",
        files={"file": ("clean.jpg", io.BytesIO(jpeg_bytes), "image/jpeg")},
    )
    file_id = upload_res.json()["file_id"]

    client.post(f"/api/v1/analyze/{file_id}")

    res = client.get(f"/api/v1/result/{file_id}")
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "SANITIZATION_REQUIRED"


def test_score_endpoint_after_analysis():
    """Score endpoint returns calculated score based on analyzed findings."""
    jpeg_bytes = _create_jpeg_with_exif({"Make": "Canon", "Model": "EOS R5"})
    upload_res = client.post(
        "/api/v1/upload",
        files={"file": ("camera.jpg", io.BytesIO(jpeg_bytes), "image/jpeg")},
    )
    file_id = upload_res.json()["file_id"]

    # 1. Analyze
    analyze_res = client.post(f"/api/v1/analyze/{file_id}")
    assert analyze_res.status_code == 200

    # 2. Get Score
    score_res = client.post(f"/api/v1/score/{file_id}")
    assert score_res.status_code == 200
    data = score_res.json()
    assert data["is_sanitized"] is False
    assert data["score"] < 100
    assert data["total_remaining_findings"] > 0


def test_full_sanitization_scoring_and_final_result_lifecycle():
    """Scenarios 12, 13: Removed metadata not counted; remaining metadata counted in final result."""
    # JPEG with GPS and Make (Camera)
    jpeg_bytes = _create_jpeg_with_exif({"GPSInfo": True, "Make": "Sony"})
    upload_res = client.post(
        "/api/v1/upload",
        files={"file": ("sony_gps.jpg", io.BytesIO(jpeg_bytes), "image/jpeg")},
    )
    file_id = upload_res.json()["file_id"]

    # 1. Analyze
    analyze_res = client.post(f"/api/v1/analyze/{file_id}")
    assert analyze_res.status_code == 200
    orig_findings = analyze_res.json()["findings"]
    has_gps_orig = any("gps" in f["field"].lower() for f in orig_findings)
    has_make_orig = any("make" in f["field"].lower() for f in orig_findings)
    assert has_gps_orig
    assert has_make_orig

    # Initial Score before sanitization
    init_score_res = client.post(f"/api/v1/score/{file_id}")
    assert init_score_res.status_code == 200
    before_score_val = init_score_res.json()["score"]

    # 2. Sanitize: remove ONLY GPS, leave Make (Camera)
    sanitize_res = client.post(
        f"/api/v1/sanitize/{file_id}",
        json={"fields_to_remove": ["GPS"]},
    )
    assert sanitize_res.status_code == 200
    sanitized_id = sanitize_res.json()["sanitized_file_id"]
    removed_fields = sanitize_res.json()["removed_fields"]
    assert "GPS" in removed_fields

    # 3. Request Final Result
    result_res = client.get(f"/api/v1/result/{sanitized_id}")
    assert result_res.status_code == 200
    res_data = result_res.json()

    assert res_data["file_id"] == file_id
    assert res_data["sanitized_file_id"] == sanitized_id
    assert res_data["status"] == "complete"
    assert "GPS" in res_data["removed_fields"]

    # Check Score Comparison
    comp = res_data["score"]
    assert comp["before_score"] == before_score_val
    assert comp["after_score"] > comp["before_score"]
    assert comp["improvement"] == comp["after_score"] - comp["before_score"]

    # Check Security object: GPS (CRITICAL 30pts) removed, but Make (MEDIUM 10pts) remains
    security = res_data["security"]
    assert security["critical_findings"] == 0  # GPS removed!
    assert security["medium_findings"] >= 1    # Make still present!
    assert security["score"] == 100 - security["risk_points"]

    # Download link verification
    assert res_data["download"]["sanitized_file_id"] == sanitized_id

    # Verify download works
    dl_res = client.get(f"/api/v1/download/{sanitized_id}")
    assert dl_res.status_code == 200
    assert len(dl_res.content) > 0


def test_failed_sanitization_keeps_risk():
    """Scenario 14: If metadata is not removed, it remains verified and score does not falsely increase."""
    # Create JPEG with GPS
    jpeg_bytes = _create_jpeg_with_exif({"GPSInfo": True})
    upload_res = client.post(
        "/api/v1/upload",
        files={"file": ("gps.jpg", io.BytesIO(jpeg_bytes), "image/jpeg")},
    )
    file_id = upload_res.json()["file_id"]

    client.post(f"/api/v1/analyze/{file_id}")
    before_score = client.post(f"/api/v1/score/{file_id}").json()["score"]

    # Request removal of non-GPS field that does not remove GPS (e.g. Artist/Author which isn't present)
    # The sanitization route will verify absence, GPS is untouched, so post-sanitization GPS remains
    sanitize_res = client.post(
        f"/api/v1/sanitize/{file_id}",
        json={"fields_to_remove": ["Artist"]},
    )
    sanitized_id = sanitize_res.json()["sanitized_file_id"]

    result_res = client.get(f"/api/v1/result/{sanitized_id}")
    assert result_res.status_code == 200
    res_data = result_res.json()

    # GPS was NOT removed, so after_score should still reflect the GPS penalty
    after_score = res_data["score"]["after_score"]
    assert after_score == before_score
    assert res_data["score"]["improvement"] == 0
    assert res_data["security"]["critical_findings"] >= 1



def test_clean_file_end_to_end_100_safe():
    """Scenario 15: Clean file through full flow maintains 100 SAFE score."""
    clean_bytes = _create_clean_jpeg()
    upload_res = client.post(
        "/api/v1/upload",
        files={"file": ("clean_sample.jpg", io.BytesIO(clean_bytes), "image/jpeg")},
    )
    file_id = upload_res.json()["file_id"]

    # Analyze
    analyze_res = client.post(f"/api/v1/analyze/{file_id}")
    assert analyze_res.status_code == 200
    assert analyze_res.json()["summary"]["total_findings"] == 0

    # Score before
    score_res = client.post(f"/api/v1/score/{file_id}")
    assert score_res.status_code == 200
    assert score_res.json()["score"] == 100
    assert score_res.json()["risk_level"] == "SAFE"
    assert "no detected privacy-sensitive metadata" in score_res.json()["recommendation"]
