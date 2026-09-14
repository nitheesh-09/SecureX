"""Analysis API route handlers for Step 4."""

from fastapi import APIRouter, Depends, status

from app.core.errors import SecureXAPIException
from app.models.metadata import AnalysisResult
from app.services.analysis_service import AnalysisService, get_analysis_service
from app.services.storage_service import FileStorageService, get_storage_service

router = APIRouter(tags=["Analysis"])


@router.post(
    "/analyze/{file_id}",
    response_model=AnalysisResult,
    status_code=status.HTTP_200_OK,
    summary="Trigger metadata extraction and AI privacy analysis on an uploaded file",
)
@router.post(
    "/files/{file_id}/analyze",
    response_model=AnalysisResult,
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
@router.post(
    "/analysis/{file_id}",
    response_model=AnalysisResult,
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
async def analyze_file(
    file_id: str,
    storage_service: FileStorageService = Depends(get_storage_service),
    analysis_service: AnalysisService = Depends(get_analysis_service),
) -> AnalysisResult:
    """Retrieve uploaded file from storage and perform verified metadata privacy analysis.

    Flow:
    1. Retrieve file binary from storage service.
    2. Check if file exists; return 404 if not found or expired.
    3. Pass file facts to AnalysisService (verified extraction + AI classification).
    4. Return validated structured privacy findings and summary.
    """
    file_data = await storage_service.get_file(file_id)
    if not file_data:
        raise SecureXAPIException(
            status_code=404,
            code="FILE_NOT_FOUND",
            message=f"File with ID '{file_id}' was not found or has expired.",
        )

    file_bytes, filename, mime_type = file_data

    # Perform analysis
    result = await analysis_service.analyze_file(
        file_id=file_id,
        file_bytes=file_bytes,
        filename=filename,
        mime_type=mime_type,
    )

    # Persist verified analysis facts in storage metadata for deterministic scoring
    await storage_service.update_metadata(
        file_id=file_id,
        updates={
            "status": "analyzed",
            "analysis": result.model_dump(),
        },
    )

    return result

