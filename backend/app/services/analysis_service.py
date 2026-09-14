"""AnalysisService implementation orchestrating verified extraction and AI privacy analysis."""

from typing import Optional
from app.models.metadata import (
    AnalysisResult,
    AnalysisSummary,
    PrivacyFinding,
    SeverityLevel,
)
from app.services.ai.base import AIAnalysisProvider
from app.services.ai.provider import get_ai_provider
from app.services.metadata_extractor import UnifiedMetadataExtractor


class AnalysisService:
    """Service that coordinates local metadata extraction and pluggable AI privacy classification."""

    def __init__(self, ai_provider: Optional[AIAnalysisProvider] = None):
        self.extractor = UnifiedMetadataExtractor()
        self.ai_provider = ai_provider or get_ai_provider()

    async def analyze_file(
        self,
        file_id: str,
        file_bytes: bytes,
        filename: str,
        mime_type: str,
    ) -> AnalysisResult:
        """Inspect file bytes, extract factual metadata, classify risks via AI provider, and return validated findings.

        Args:
            file_id: Unique file identifier.
            file_bytes: Binary content of uploaded file.
            filename: Client-provided filename.
            mime_type: Validated MIME type ('image/jpeg', 'image/png', 'application/pdf').

        Returns:
            AnalysisResult: Validated privacy findings with summary metrics.
        """
        # 1. Verified local metadata extraction (guarantees factual values, no AI hallucination)
        extracted = self.extractor.extract(file_bytes=file_bytes, mime_type=mime_type)

        # 2. Pass structured facts to pluggable AI analysis provider
        raw_findings = await self.ai_provider.analyze_metadata(
            file_id=file_id,
            filename=filename,
            extracted=extracted,
        )

        # 3. Validate findings through Pydantic schema
        validated_findings = []
        for item in raw_findings:
            if isinstance(item, PrivacyFinding):
                validated_findings.append(item)
            elif isinstance(item, dict):
                try:
                    validated_findings.append(PrivacyFinding(**item))
                except Exception:
                    continue

        # 4. Compute privacy risk summary metrics
        total = len(validated_findings)
        high_risk = sum(
            1 for f in validated_findings if f.severity in (SeverityLevel.HIGH, SeverityLevel.CRITICAL)
        )
        removable = sum(1 for f in validated_findings if f.removable)

        summary = AnalysisSummary(
            total_findings=total,
            high_risk_findings=high_risk,
            removable_findings=removable,
        )

        return AnalysisResult(
            file_id=file_id,
            filename=filename,
            status="analyzed",
            findings=validated_findings,
            summary=summary,
        )


# Singleton instance provider for dependency injection
_analysis_service_instance: Optional[AnalysisService] = None


def get_analysis_service() -> AnalysisService:
    """Dependency injection provider for AnalysisService."""
    global _analysis_service_instance
    if _analysis_service_instance is None:
        _analysis_service_instance = AnalysisService()
    return _analysis_service_instance
