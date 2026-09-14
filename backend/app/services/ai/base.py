"""Base abstract interface for AI privacy analysis providers."""

from abc import ABC, abstractmethod
from typing import List
from app.models.metadata import ExtractedMetadata, PrivacyFinding


class AIAnalysisProvider(ABC):
    """Abstract interface for metadata privacy analysis providers."""

    @abstractmethod
    async def analyze_metadata(
        self,
        file_id: str,
        filename: str,
        extracted: ExtractedMetadata,
    ) -> List[PrivacyFinding]:
        """Analyze extracted metadata facts and return categorized privacy findings.

        Args:
            file_id: Unique file identifier.
            filename: Client-provided filename.
            extracted: Structured factual metadata extracted locally.

        Returns:
            List[PrivacyFinding]: Validated privacy findings with severity ratings and explanations.
        """
        pass
