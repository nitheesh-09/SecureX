"""Sanitization and secure download API route handlers."""

import uuid
from fastapi import APIRouter, Depends, Response, status

from app.core.errors import SecureXAPIException
from app.models.metadata import (
    PrivacyFinding,
    SanitizationRequest,
    SanitizationResult,
)
from app.services.analysis_service import AnalysisService, get_analysis_service
from app.services.metadata_extractor import UnifiedMetadataExtractor
from app.services.sanitization_service import SanitizationService, get_sanitization_service
from app.services.security_score_service import (
    SecurityScoreService,
    get_security_score_service,
)
from app.services.storage_service import FileStorageService, get_storage_service

router = APIRouter(tags=["Sanitization"])


# Recognized supported metadata field patterns
SUPPORTED_METADATA_TERMS = {
    "gps",
    "gpslatitude",
    "gpslongitude",
    "gpsaltitude",
    "gpsinfo",
    "make",
    "model",
    "datetime",
    "datetimeoriginal",
    "datetimedigitized",
    "artist",
    "author",
    "creator",
    "producer",
    "title",
    "subject",
    "keywords",
    "creationdate",
    "moddate",
    "modificationdate",
    "software",
    "copyright",
    "attachment",
    "embeddedattachment",
}


@router.post(
    "/sanitize/{file_id}",
    response_model=SanitizationResult,
    status_code=status.HTTP_200_OK,
    summary="Sanitize an uploaded file by removing selected metadata fields",
)
@router.post(
    "/files/{file_id}/sanitize",
    response_model=SanitizationResult,
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
async def sanitize_file(
    file_id: str,
    payload: SanitizationRequest,
    storage_service: FileStorageService = Depends(get_storage_service),
    sanitization_service: SanitizationService = Depends(get_sanitization_service),
    analysis_service: AnalysisService = Depends(get_analysis_service),
    score_service: SecurityScoreService = Depends(get_security_score_service),
) -> SanitizationResult:
    """Selectively strip metadata from an uploaded file and generate a sanitized copy."""
    # 1. Validate file_id & retrieve original
    file_data = await storage_service.get_file(file_id)
    if not file_data:
        raise SecureXAPIException(
            status_code=404,
            code="FILE_NOT_FOUND",
            message=f"Original file with ID '{file_id}' was not found or has expired.",
        )

    file_bytes, filename, mime_type = file_data

    # 2. Validate fields_to_remove
    if not payload.fields_to_remove:
        raise SecureXAPIException(
            status_code=400,
            code="INVALID_FIELD_SELECTION",
            message="At least one metadata field must be selected for sanitization.",
        )

    # Check that requested fields are either known supported fields or present in file
    extractor = UnifiedMetadataExtractor()
    extracted = extractor.extract(file_bytes, mime_type)
    present_fields_lower = {item.field.lower() for item in extracted.metadata}

    for requested_field in payload.fields_to_remove:
        req_clean = requested_field.lower().replace("finding-", "").replace("meta_", "")
        # Remove trailing/leading tags if finding ID format
        parts = req_clean.split("-")
        clean_target = parts[-1] if parts else req_clean

        is_supported = any(term in clean_target for term in SUPPORTED_METADATA_TERMS)
        is_present = any(clean_target in pf or pf in clean_target for pf in present_fields_lower)

        if not is_supported and not is_present:
            raise SecureXAPIException(
                status_code=400,
                code="INVALID_FIELD_SELECTION",
                message=f"Field '{requested_field}' is not a valid supported metadata field for sanitization.",
                details={"invalid_field": requested_field},
            )

    # 3. Perform sanitization
    sanitized_file_id = str(uuid.uuid4())
    sanitized_bytes, result = await sanitization_service.sanitize_file(
        file_id=file_id,
        file_bytes=file_bytes,
        filename=filename,
        mime_type=mime_type,
        fields_to_remove=payload.fields_to_remove,
        sanitized_file_id=sanitized_file_id,
    )

    # 4. Save sanitized file to storage
    await storage_service.save_file(
        file_id=sanitized_file_id,
        filename=result.sanitized_filename,
        content=sanitized_bytes,
        mime_type=mime_type,
    )

    # 5. Compute verified Before and After security scores
    # Get original findings: either from saved metadata or analyze original file facts
    orig_meta = await storage_service.get_metadata(file_id)
    if orig_meta and "analysis" in orig_meta and "findings" in orig_meta["analysis"]:
        orig_findings = [PrivacyFinding(**f) for f in orig_meta["analysis"]["findings"]]
    else:
        orig_analysis = await analysis_service.analyze_file(
            file_id=file_id,
            file_bytes=file_bytes,
            filename=filename,
            mime_type=mime_type,
        )
        orig_findings = orig_analysis.findings

    # Analyze verified sanitized bytes (ensures failed removals keep risk points)
    sanitized_analysis = await analysis_service.analyze_file(
        file_id=sanitized_file_id,
        file_bytes=sanitized_bytes,
        filename=result.sanitized_filename,
        mime_type=mime_type,
    )
    remaining_findings = sanitized_analysis.findings

    before_score = score_service.calculate_score(orig_findings, is_sanitized=False)
    after_score = score_service.calculate_score(remaining_findings, is_sanitized=True)
    comparison = score_service.calculate_comparison_from_scores(before_score.score, after_score.score)

    # 6. Persist final result state in sanitized file metadata
    await storage_service.update_metadata(
        file_id=sanitized_file_id,
        updates={
            "original_file_id": file_id,
            "original_filename": filename,
            "sanitized_filename": result.sanitized_filename,
            "removed_fields": result.removed_fields,
            "remaining_fields": result.remaining_fields,
            "score": comparison.model_dump(),
            "security": after_score.model_dump(),
            "status": "complete",
            "download": {"sanitized_file_id": sanitized_file_id},
            "analysis": sanitized_analysis.model_dump(),
            "is_sanitized": True,
        },
    )

    # Record sanitized reference in original file metadata
    await storage_service.update_metadata(
        file_id=file_id,
        updates={"sanitized_file_id": sanitized_file_id},
    )

    return result



@router.get(
    "/download/{sanitized_file_id}",
    summary="Download the actual sanitized binary file",
    response_class=Response,
)
@router.get(
    "/files/{sanitized_file_id}/download",
    response_class=Response,
    include_in_schema=False,
)
async def download_file(
    sanitized_file_id: str,
    storage_service: FileStorageService = Depends(get_storage_service),
) -> Response:
    """Stream sanitized file binary for download with proper Content-Disposition header."""
    file_data = await storage_service.get_file(sanitized_file_id)
    if not file_data:
        raise SecureXAPIException(
            status_code=404,
            code="FILE_NOT_FOUND",
            message=f"Sanitized file with ID '{sanitized_file_id}' was not found or has expired.",
        )

    file_bytes, filename, mime_type = file_data

    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Content-Length": str(len(file_bytes)),
        "Cache-Control": "no-store, no-cache, must-revalidate",
    }

    return Response(
        content=file_bytes,
        media_type=mime_type,
        headers=headers,
    )
