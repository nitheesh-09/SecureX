"""Security scoring and final privacy result API route handlers."""

from fastapi import APIRouter, Depends, status

from app.core.errors import SecureXAPIException
from app.models.metadata import (
    FinalResult,
    PrivacyFinding,
    ScoreComparison,
    SecurityScore,
)
from app.services.security_score_service import (
    SecurityScoreService,
    get_security_score_service,
)
from app.services.storage_service import FileStorageService, get_storage_service

router = APIRouter(tags=["Scoring & Results"])


@router.post(
    "/score/{file_id}",
    response_model=SecurityScore,
    status_code=status.HTTP_200_OK,
    summary="Calculate privacy/security score based on verified analysis findings",
)
@router.post(
    "/files/{file_id}/score",
    response_model=SecurityScore,
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
@router.get(
    "/score/{file_id}",
    response_model=SecurityScore,
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
@router.get(
    "/files/{file_id}/score",
    response_model=SecurityScore,
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
async def get_file_score(
    file_id: str,
    storage_service: FileStorageService = Depends(get_storage_service),
    score_service: SecurityScoreService = Depends(get_security_score_service),
) -> SecurityScore:
    """Calculate and return the deterministic privacy score for a file.
    
    Requirements:
    - If file does not exist: returns 404 FILE_NOT_FOUND.
    - If file has not been analyzed: returns 400 ANALYSIS_REQUIRED.
    - If file has been sanitized: returns verified score of sanitized metadata (is_sanitized=True).
    - If file has not been sanitized: returns original score (is_sanitized=False).
    """
    file_data = await storage_service.get_file(file_id)
    if not file_data:
        raise SecureXAPIException(
            status_code=404,
            code="FILE_NOT_FOUND",
            message=f"File with ID '{file_id}' was not found or has expired.",
        )

    meta = await storage_service.get_metadata(file_id)
    if not meta:
        raise SecureXAPIException(
            status_code=404,
            code="FILE_NOT_FOUND",
            message=f"Metadata for file ID '{file_id}' was not found.",
        )

    # 1. If this is a sanitized file with a cached verified score
    if meta.get("is_sanitized") and "security" in meta:
        return SecurityScore(**meta["security"])

    # 2. Check if file has been analyzed
    if "analysis" not in meta or not meta["analysis"]:
        raise SecureXAPIException(
            status_code=400,
            code="ANALYSIS_REQUIRED",
            message=f"File '{file_id}' has not been analyzed yet. Run analysis before calculating security score.",
        )

    findings_raw = meta["analysis"].get("findings", [])
    findings = [PrivacyFinding(**f) for f in findings_raw]

    is_sanitized = bool(meta.get("is_sanitized", False))
    return score_service.calculate_score(findings, is_sanitized=is_sanitized)


@router.get(
    "/result/{sanitized_file_id}",
    response_model=FinalResult,
    status_code=status.HTTP_200_OK,
    summary="Get complete final privacy result and score comparison for a sanitized file",
)
@router.get(
    "/files/{sanitized_file_id}/result",
    response_model=FinalResult,
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
async def get_final_result(
    sanitized_file_id: str,
    storage_service: FileStorageService = Depends(get_storage_service),
) -> FinalResult:
    """Retrieve the complete post-sanitization result, score comparison, and download information."""
    meta = await storage_service.get_metadata(sanitized_file_id)
    if not meta:
        raise SecureXAPIException(
            status_code=404,
            code="RESULT_NOT_FOUND",
            message=f"Sanitization result for ID '{sanitized_file_id}' was not found or has expired.",
        )

    # Validate that this is indeed a sanitized file result
    if not meta.get("is_sanitized") or "original_file_id" not in meta or "score" not in meta:
        raise SecureXAPIException(
            status_code=400,
            code="SANITIZATION_REQUIRED",
            message=f"File ID '{sanitized_file_id}' has not been sanitized yet.",
        )

    return FinalResult(
        file_id=meta["original_file_id"],
        sanitized_file_id=sanitized_file_id,
        filename=meta.get("original_filename", meta.get("filename", "secure_file")),
        status=meta.get("status", "complete"),
        score=ScoreComparison(**meta["score"]),
        security=SecurityScore(**meta["security"]),
        removed_fields=meta.get("removed_fields", []),
        remaining_fields=meta.get("remaining_fields", []),
        download=meta.get("download", {"sanitized_file_id": sanitized_file_id}),
    )
