"""Deterministic Mock AI Provider for metadata privacy intelligence.

Implements realistic, rule-based privacy classifications from verified metadata facts.
Operates completely offline without requiring an external AI API key, enabling immediate
Review 1 testing while allowing seamless future replacement by Anthropic or OpenAI.
"""

from typing import List, Optional, Tuple
from app.models.metadata import (
    ExtractedMetadata,
    PrivacyCategory,
    PrivacyFinding,
    SeverityLevel,
)


class MockAIAnalysisProvider:
    """Deterministic, rule-based privacy analyzer modeling AI classification."""

    NON_PRIVACY_ATTRIBUTES = {
        "imagedimensions",
        "pagecount",
        "jfif",
        "jfif_version",
        "jfif_unit",
        "jfif_density",
        "dpi",
    }

    def _classify_field(self, field: str, value: str) -> Optional[Tuple[PrivacyCategory, SeverityLevel, str, str]]:
        """Classify a metadata field and value into category, severity, title, and explanation."""
        field_lower = field.lower()

        # Filter out safe technical container/rendering attributes that are not privacy leaks
        if field_lower in self.NON_PRIVACY_ATTRIBUTES:
            return None

        # 1. Location / GPS
        if "gps" in field_lower or "latitude" in field_lower or "longitude" in field_lower:
            if "lat" in field_lower or "long" in field_lower or "coord" in field_lower:
                return (
                    PrivacyCategory.LOCATION,
                    SeverityLevel.CRITICAL,
                    "Exact GPS Coordinates Exposed",
                    "Contains precise latitude/longitude coordinates that reveal where this file was captured.",
                )
            return (
                PrivacyCategory.LOCATION,
                SeverityLevel.HIGH,
                "Geolocation Metadata Detected",
                "Contains satellite positioning details (altitude, timestamp, or sensor bearing).",
            )

        # 2. Hardware / Device Identifiers
        if any(term in field_lower for term in ["serial", "deviceid", "uniqueid"]):
            return (
                PrivacyCategory.DEVICE_INFORMATION,
                SeverityLevel.HIGH,
                "Hardware Serial Number Exposed",
                "Contains unique hardware identifiers that can be used to track equipment or link files to a device.",
            )
        if any(term in field_lower for term in ["make", "model", "lens", "camera", "hardware"]):
            return (
                PrivacyCategory.DEVICE_INFORMATION,
                SeverityLevel.MEDIUM,
                "Device & Camera Make/Model Exposed",
                "Discloses the specific camera, smartphone, or hardware make and model used.",
            )

        # 3. Timestamps & Activity Dates
        if any(term in field_lower for term in ["date", "time", "created", "modified"]):
            return (
                PrivacyCategory.DATE_TIME,
                SeverityLevel.MEDIUM,
                "Creation / Modification Timestamp Exposed",
                "Reveals exact timestamps of file capture or modification, exposing timelines of activity.",
            )

        # 4. Author & Personal Identity
        if any(term in field_lower for term in ["author", "artist", "creator", "owner", "user", "by"]):
            return (
                PrivacyCategory.AUTHOR_IDENTITY,
                SeverityLevel.MEDIUM,
                "Author / Creator Identity Exposed",
                "Contains personal name, account handle, or organization details disclosing who created the file.",
            )

        # 5. Software & Tooling
        if any(term in field_lower for term in ["software", "producer", "app", "tool", "editor"]):
            return (
                PrivacyCategory.SOFTWARE,
                SeverityLevel.LOW,
                "Editing Software / Tooling Exposed",
                "Discloses the software package and build version used to produce or modify this file.",
            )

        # 6. Copyright
        if "copyright" in field_lower or "rights" in field_lower:
            return (
                PrivacyCategory.COPYRIGHT,
                SeverityLevel.LOW,
                "Copyright Information",
                "Contains legal copyright declarations or intellectual property ownership strings.",
            )

        # 7. PDF Embedded Attachments
        if "attachment" in field_lower:
            return (
                PrivacyCategory.ATTACHMENT,
                SeverityLevel.HIGH,
                "Embedded File Attachment Detected",
                "Document contains embedded files or secondary payloads that may leak hidden data.",
            )

        # 8. Document Summary Information
        if any(term in field_lower for term in ["title", "subject", "keyword", "description"]):
            return (
                PrivacyCategory.DOCUMENT_INFORMATION,
                SeverityLevel.LOW,
                "Document Structure / Title Information",
                "Describes document summary headers or titles.",
            )

        # 9. Fallback Other
        return (
            PrivacyCategory.OTHER,
            SeverityLevel.LOW,
            f"Technical Attribute: {field}",
            "Technical file attribute or display parameter.",
        )

    async def analyze_metadata(
        self,
        file_id: str,
        filename: str,
        extracted: ExtractedMetadata,
    ) -> List[PrivacyFinding]:
        """Classify extracted facts into structured findings."""
        findings: List[PrivacyFinding] = []

        for index, item in enumerate(extracted.metadata, start=1):
            classification = self._classify_field(item.field, item.value)
            if classification is None:
                continue

            category, severity, title, explanation = classification
            
            finding_id = f"finding-{index}-{item.field.lower()}"
            findings.append(
                PrivacyFinding(
                    id=finding_id,
                    field=item.field,
                    category=category,
                    value=item.value,
                    severity=severity,
                    title=title,
                    explanation=explanation,
                    removable=True,
                )
            )

        return findings
