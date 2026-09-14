"""Domain schemas for file processing, metadata analysis, and sanitization."""

from enum import Enum
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class RiskLevel(str, Enum):
    """General privacy risk severity levels."""

    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    SAFE = "SAFE"


class SeverityLevel(str, Enum):
    """Privacy finding severity ratings."""

    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class PrivacyCategory(str, Enum):
    """Controlled set of privacy metadata categories."""

    LOCATION = "LOCATION"
    DEVICE_INFORMATION = "DEVICE_INFORMATION"
    DATE_TIME = "DATE_TIME"
    AUTHOR_IDENTITY = "AUTHOR_IDENTITY"
    SOFTWARE = "SOFTWARE"
    COPYRIGHT = "COPYRIGHT"
    DOCUMENT_INFORMATION = "DOCUMENT_INFORMATION"
    ATTACHMENT = "ATTACHMENT"
    OTHER = "OTHER"


class CategoryType(str, Enum):
    """Metadata categorization taxonomy alias."""

    LOCATION = "location"
    DEVICE_HARDWARE = "device_hardware"
    AUTHOR_IDENTITY = "author_identity"
    SOFTWARE_HISTORY = "software_history"


# -----------------------------------------------------------------------------
# Upload Models
# -----------------------------------------------------------------------------
class FileUploadResponse(BaseModel):
    """Response returned upon successful file upload."""

    file_id: str
    original_filename: str
    file_size_bytes: int
    mime_type: str
    uploaded_at: str
    expires_at: str


class UploadResponse(BaseModel):
    """Clean upload response schema for Review 1."""

    file_id: str
    filename: str
    mime_type: str
    size_bytes: int
    status: str = "uploaded"


# -----------------------------------------------------------------------------
# Local Extraction Models (Verified Facts)
# -----------------------------------------------------------------------------
class ExtractedMetadataItem(BaseModel):
    """Factual metadata key/value pair extracted locally from file."""

    field: str
    value: str
    source: str = "EXIF"


class ExtractedMetadata(BaseModel):
    """Container of structured metadata facts extracted from a file."""

    file_type: str
    format: str
    metadata: List[ExtractedMetadataItem] = Field(default_factory=list)


# -----------------------------------------------------------------------------
# Privacy Analysis Models (AI & Findings)
# -----------------------------------------------------------------------------
class PrivacyFinding(BaseModel):
    """Individual privacy risk finding based on verified metadata."""

    id: str
    field: str
    category: PrivacyCategory
    value: str
    severity: SeverityLevel
    title: str
    explanation: str
    removable: bool = True


class AnalysisSummary(BaseModel):
    """Aggregated summary of privacy findings."""

    total_findings: int = 0
    high_risk_findings: int = 0
    removable_findings: int = 0


class AnalysisResult(BaseModel):
    """Structured response for file privacy analysis."""

    file_id: str
    filename: str
    status: str = "analyzed"
    findings: List[PrivacyFinding] = Field(default_factory=list)
    summary: AnalysisSummary = Field(default_factory=AnalysisSummary)


# -----------------------------------------------------------------------------
# Metadata Tag Items (Future / Legacy Compatibility)
# -----------------------------------------------------------------------------
class MetadataItem(BaseModel):
    """Individual detected metadata tag with privacy context."""

    id: str
    category: str
    tag_name: str
    raw_value: str
    display_value: str
    risk_level: RiskLevel
    description: str
    recommendation: str = "REMOVE"


class CategorySummary(BaseModel):
    """Aggregated risk summary for a metadata category."""

    detected_count: int
    risk_level: RiskLevel


# -----------------------------------------------------------------------------
# Sanitization Models
# -----------------------------------------------------------------------------
class SanitizationRequest(BaseModel):
    """Payload specifying fields for sanitization."""

    fields_to_remove: List[str] = Field(..., min_length=1, description="List of metadata field names or IDs to remove")


class SanitizationResult(BaseModel):
    """Result returned by SanitizationService after scrubbing."""

    file_id: str
    sanitized_file_id: str
    original_filename: str
    sanitized_filename: str
    removed_fields: List[str]
    remaining_fields: List[str] = Field(default_factory=list)
    status: str = "sanitized"


# -----------------------------------------------------------------------------
# Security Scoring & Final Result Models
# -----------------------------------------------------------------------------
class SecurityScore(BaseModel):
    """Deterministic security/privacy score calculation result."""

    score: int = Field(..., ge=0, le=100, description="Privacy score from 0 (high risk) to 100 (safe)")
    risk_level: str = Field(..., description="Risk category: SAFE, LOW RISK, MEDIUM RISK, HIGH RISK")
    risk_points: int = Field(..., ge=0, description="Sum of weighted risk points for remaining findings")
    total_remaining_findings: int = Field(..., ge=0, description="Total number of remaining privacy findings")
    critical_findings: int = Field(default=0, ge=0, description="Number of critical severity findings remaining")
    high_findings: int = Field(default=0, ge=0, description="Number of high severity findings remaining")
    medium_findings: int = Field(default=0, ge=0, description="Number of medium severity findings remaining")
    low_findings: int = Field(default=0, ge=0, description="Number of low severity findings remaining")
    recommendation: str = Field(..., description="Deterministic guidance for file sharing")
    is_sanitized: Optional[bool] = Field(default=None, description="Whether this score reflects a post-sanitization state")


class ScoreComparison(BaseModel):
    """Comparison of privacy score before and after sanitization."""

    before_score: int = Field(..., ge=0, le=100, description="Score calculated from original verified findings")
    after_score: int = Field(..., ge=0, le=100, description="Score calculated from verified remaining metadata")
    improvement: int = Field(..., ge=0, description="Score improvement (after_score - before_score, minimum 0)")


class FinalResult(BaseModel):
    """Comprehensive final result payload for frontend consumption."""

    file_id: str = Field(..., description="Original file ID")
    sanitized_file_id: str = Field(..., description="Sanitized file ID")
    filename: str = Field(..., description="Filename")
    status: str = Field(default="complete", description="Final processing state")
    score: ScoreComparison = Field(..., description="Before vs after score comparison")
    security: SecurityScore = Field(..., description="Detailed security score")
    removed_fields: List[str] = Field(default_factory=list, description="Verified removed metadata fields")
    remaining_fields: List[str] = Field(default_factory=list, description="Verified remaining metadata fields")
    download: Dict[str, str] = Field(default_factory=dict, description="Download information")

