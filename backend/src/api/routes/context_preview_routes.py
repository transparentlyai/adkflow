"""Context Aggregator Preview API routes.

Provides preview functionality for context aggregation without running the full workflow.
"""

from pathlib import Path

from fastapi import APIRouter, HTTPException, status

from backend.src.api.routes.context_preview_models import (
    DEFAULT_MAX_CONTENT_SIZE,
    ContextPreviewRequest,
    ContextPreviewResponse,
    PreviewResult,
)
from backend.src.api.routes.context_preview_service import (
    compute_aggregated_output,
    preview_directory,
    preview_file,
    preview_url,
)

router = APIRouter()


@router.post("/context-aggregator/preview", response_model=ContextPreviewResponse)
async def preview_context_aggregation(
    request: ContextPreviewRequest,
) -> ContextPreviewResponse:
    """
    Preview context aggregation results without running the full workflow.

    This endpoint reads files, directories, and URLs to show what content
    would be aggregated. Node inputs show a placeholder since they're
    only available at runtime.

    Args:
        request: Preview request with inputs configuration

    Returns:
        ContextPreviewResponse with preview results for each input
    """
    try:
        project_path = Path(request.projectPath).resolve()
        max_size = request.maxContentSize or DEFAULT_MAX_CONTENT_SIZE

        results: dict[str, PreviewResult] = {}
        errors: list[str] = []

        for di in request.dynamicInputs:
            input_type = di.inputType
            var_name = di.variableName or di.id

            if input_type == "file":
                result = await preview_file(
                    di.filePath or "",
                    project_path,
                    request.includeMetadata,
                    max_size,
                )
                result.variableName = var_name
                results[di.id] = result

            elif input_type == "directory":
                result = await preview_directory(
                    di.directoryPath or "",
                    di.globPattern or "*",
                    project_path,
                    request.includeMetadata,
                    max_size,
                    recursive=di.recursive or False,
                    exclude_patterns=di.excludePatterns,
                    max_files=di.maxFiles or 100,
                    max_file_size=di.maxFileSize or 1048576,
                )
                result.variableName = var_name
                results[di.id] = result

            elif input_type == "url":
                result = await preview_url(
                    di.url or "",
                    request.includeMetadata,
                    max_size,
                )
                result.variableName = var_name
                results[di.id] = result

            elif input_type == "node":
                # Node inputs are resolved at runtime - show placeholder
                results[di.id] = PreviewResult(
                    variableName=var_name,
                    content=f"--- {di.label} Value Resolved at Runtime ---",
                    metadata=None,
                )

        # Compute aggregated output based on mode
        computed_output = await compute_aggregated_output(
            results=results,
            aggregation_mode=request.aggregationMode,
            separator=request.separator,
            output_variable_name=request.outputVariableName,
            include_metadata=request.includeMetadata,
            project_path=project_path,
        )

        return ContextPreviewResponse(
            results=results,
            computedOutput=computed_output,
            errors=errors,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to preview context aggregation: {str(e)}",
        )
