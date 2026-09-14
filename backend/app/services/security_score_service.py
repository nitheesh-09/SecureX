"""Deterministic privacy and security scoring service for SecureX."""

from typing import List, Optional, Union
from app.models.metadata import (
    PrivacyFinding,
    ScoreComparison,
    SecurityScore,
    SeverityLevel,
)

# Severity Risk Point Weights
SEVERITY_WEIGHTS = {
    SeverityLevel.CRITICAL: 30,
    SeverityLevel.HIGH: 20,
    SeverityLevel.MEDIUM: 10,
    SeverityLevel.LOW: 5,
}

# String fallback mapping
STRING_SEVERITY_WEIGHTS = {
    "CRITICAL": 30,
    "HIGH": 20,
    "MEDIUM": 10,
    "LOW": 5,
}


class SecurityScoreService:
    """Calculates deterministic privacy risk points, scores, and sharing recommendations.
    
    Formula:
      risk_points = sum(weight for each remaining privacy finding)
      security_score = max(0, 100 - risk_points)
      
    Risk Level Thresholds:
      90–100: SAFE
      70–89:  LOW RISK
      40–69:  MEDIUM RISK
      0–39:   HIGH RISK
    """

    @staticmethod
    def get_risk_level(score: int) -> str:
        """Map numeric score (0-100) to deterministic risk category."""
        if score >= 90:
            return "SAFE"
        elif score >= 70:
            return "LOW RISK"
        elif score >= 40:
            return "MEDIUM RISK"
        else:
            return "HIGH RISK"

    @staticmethod
    def get_recommendation(risk_level: str, total_findings: int) -> str:
        """Generate deterministic user guidance based on risk level and findings count."""
        if total_findings == 0:
            return "Your file contains no detected privacy-sensitive metadata and is generally safe to share."
        elif risk_level == "SAFE":
            return "Your file contains minimal privacy-sensitive metadata and is generally safe to share."
        elif risk_level == "LOW RISK":
            return "Your file has some remaining privacy metadata. Review the remaining findings before sharing."
        elif risk_level == "MEDIUM RISK":
            return "Your file still contains privacy-sensitive metadata. Consider removing additional information before sharing."
        else:
            return "Your file contains significant privacy-sensitive metadata. Remove high-risk metadata before sharing."

    def calculate_score(
        self,
        findings: List[Union[PrivacyFinding, dict]],
        is_sanitized: Optional[bool] = None,
    ) -> SecurityScore:
        """Calculate deterministic security score from verified metadata findings.
        
        Args:
            findings: List of verified privacy findings (or dict equivalents).
            is_sanitized: Optional indicator whether this score represents a post-sanitization state.
            
        Returns:
            SecurityScore: Validated Pydantic model containing score, risk level, and statistics.
        """
        critical_count = 0
        high_count = 0
        medium_count = 0
        low_count = 0
        total_risk_points = 0

        for item in findings:
            if isinstance(item, PrivacyFinding):
                sev_val = item.severity.value if hasattr(item.severity, "value") else str(item.severity).upper()
            elif isinstance(item, dict):
                sev_val = str(item.get("severity", "LOW")).upper()
            else:
                sev_val = "LOW"

            weight = STRING_SEVERITY_WEIGHTS.get(sev_val, 5)
            total_risk_points += weight

            if sev_val == "CRITICAL":
                critical_count += 1
            elif sev_val == "HIGH":
                high_count += 1
            elif sev_val == "MEDIUM":
                medium_count += 1
            elif sev_val == "LOW":
                low_count += 1

        total_findings = len(findings)
        score = max(0, 100 - total_risk_points)
        risk_level = self.get_risk_level(score)
        recommendation = self.get_recommendation(risk_level, total_findings)

        return SecurityScore(
            score=score,
            risk_level=risk_level,
            risk_points=total_risk_points,
            total_remaining_findings=total_findings,
            critical_findings=critical_count,
            high_findings=high_count,
            medium_findings=medium_count,
            low_findings=low_count,
            recommendation=recommendation,
            is_sanitized=is_sanitized,
        )

    def calculate_comparison_from_scores(
        self,
        before_score: int,
        after_score: int,
    ) -> ScoreComparison:
        """Compare two scores and return improvement metrics."""
        improvement = max(0, after_score - before_score)
        return ScoreComparison(
            before_score=before_score,
            after_score=after_score,
            improvement=improvement,
        )

    def calculate_comparison(
        self,
        before_findings: List[Union[PrivacyFinding, dict]],
        after_findings: List[Union[PrivacyFinding, dict]],
    ) -> ScoreComparison:
        """Calculate before vs after scores directly from finding collections."""
        before = self.calculate_score(before_findings, is_sanitized=False)
        after = self.calculate_score(after_findings, is_sanitized=True)
        return self.calculate_comparison_from_scores(before.score, after.score)


# Dependency injection provider
_security_score_service_instance: Optional[SecurityScoreService] = None


def get_security_score_service() -> SecurityScoreService:
    """Dependency injection provider for SecurityScoreService."""
    global _security_score_service_instance
    if _security_score_service_instance is None:
        _security_score_service_instance = SecurityScoreService()
    return _security_score_service_instance
