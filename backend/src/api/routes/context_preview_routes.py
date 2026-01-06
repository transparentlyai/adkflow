"""Context Aggregator Preview API routes.

Provides preview functionality for context aggregation without running the full workflow.
"""

import glob as glob_module
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Literal

import httpx
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from backend.src.api.routes.manifest import load_manifest_raw

router = APIRouter()

# Try to import gemtoken for token counting
try:
    from gemtoken import TokenCounter as _TokenCounter

    GEMTOKEN_AVAILABLE = True
except ImportError:
    GEMTOKEN_AVAILABLE = False
    _TokenCounter = None  # type: ignore

# Maximum content size for preview (10KB default)
DEFAULT_MAX_CONTENT_SIZE = 10 * 1024


def _parse_env_file(env_path: Path) -> dict[str, str]:
    """Parse a .env file into a dictionary."""
    env_vars: dict[str, str] = {}
    if not env_path.exists():
        return env_vars

    with open(env_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            match = re.match(r"^([A-Za-z_][A-Za-z0-9_]*)=(.*)$", line)
            if match:
                key, value = match.groups()
                value = value.strip()
                if (value.startswith('"') and value.endswith('"')) or (
                    value.startswith("'") and value.endswith("'")
                ):
                    value = value[1:-1]
                env_vars[key] = value

    return env_vars


def _get_default_model(project_path: Path) -> str:
    """Get default model from project manifest.

    Returns the defaultModel from settings, or falls back to gemini-2.5-flash.
    """
    try:
        manifest = load_manifest_raw(project_path)
        settings = manifest.get("settings", {})
        return settings.get("defaultModel", "gemini-2.5-flash")
    except Exception:
        return "gemini-2.5-flash"


async def _count_tokens(
    content: str, project_path: Path
) -> tuple[int | None, str | None]:
    """Count tokens using project's Google API configuration and default model.

    Returns:
        Tuple of (token_count, error_message). If successful, error is None.
        If failed, token_count is None and error contains the reason.
    """
    if not GEMTOKEN_AVAILABLE or _TokenCounter is None:
        return None, "gemtoken not installed"

    env_path = project_path / ".env"
    env_vars = _parse_env_file(env_path)

    # Get model from project settings
    model_name = _get_default_model(project_path)

    # Check auth mode
    use_vertex = env_vars.get("GOOGLE_GENAI_USE_VERTEXAI", "").lower() == "true"

    try:
        # Temporarily set environment variables for gemtoken
        old_env: dict[str, str | None] = {}

        if use_vertex:
            gcp_project = env_vars.get("GOOGLE_CLOUD_PROJECT")
            gcp_location = env_vars.get("GOOGLE_CLOUD_LOCATION", "us-central1")

            if not gcp_project:
                return None, "GOOGLE_CLOUD_PROJECT not configured"

            # Set env vars temporarily
            old_env["GOOGLE_CLOUD_PROJECT"] = os.environ.get("GOOGLE_CLOUD_PROJECT")
            old_env["GOOGLE_CLOUD_LOCATION"] = os.environ.get("GOOGLE_CLOUD_LOCATION")
            os.environ["GOOGLE_CLOUD_PROJECT"] = gcp_project
            os.environ["GOOGLE_CLOUD_LOCATION"] = gcp_location

            counter = _TokenCounter(
                model_name=model_name,
                gcp_project=gcp_project,
                gcp_location=gcp_location,
            )
        else:
            api_key = env_vars.get("GOOGLE_API_KEY")
            if not api_key:
                return None, "GOOGLE_API_KEY not configured"

            # Set env var temporarily
            old_env["GOOGLE_GENAI_API_KEY"] = os.environ.get("GOOGLE_GENAI_API_KEY")
            os.environ["GOOGLE_GENAI_API_KEY"] = api_key

            counter = _TokenCounter(model_name=model_name)

        try:
            token_count = await counter.count_tokens_async(content)
            return token_count, None
        finally:
            # Restore original environment
            for key, value in old_env.items():
                if value is None:
                    os.environ.pop(key, None)
                else:
                    os.environ[key] = value

    except Exception as e:
        return None, str(e)


class DynamicInputConfig(BaseModel):
    """Configuration for a single dynamic input."""

    id: str
    label: str
    variableName: str
    inputType: Literal["file", "directory", "url", "node"]

    # File type
    filePath: str | None = None

    # Directory type
    directoryPath: str | None = None
    globPattern: str | None = "*"
    directoryAggregation: Literal["pass", "concatenate"] | None = "concatenate"
    namingPattern: Literal["file_name", "number", "custom"] | None = "file_name"
    customPattern: str | None = "{base}_{file_name}"
    directorySeparator: str | None = "\n\n---"
    recursive: bool | None = False
    excludePatterns: list[str] | None = None
    maxFiles: int | None = 100
    maxFileSize: int | None = 1048576

    # URL type
    url: str | None = None


class ContextPreviewRequest(BaseModel):
    """Request model for context preview."""

    projectPath: str
    dynamicInputs: list[DynamicInputConfig]
    aggregationMode: Literal["pass", "concatenate"] = "pass"
    separator: str = "\n\n---"
    outputVariableName: str = "context"
    includeMetadata: bool = False
    maxContentSize: int | None = DEFAULT_MAX_CONTENT_SIZE


class FileInfo(BaseModel):
    """File info for directory previews."""

    path: str
    content: str
    size: int
    error: str | None = None


class PreviewResult(BaseModel):
    """Result for a single input preview."""

    variableName: str
    content: str
    metadata: dict[str, str] | None = None
    error: str | None = None
    truncated: bool = False
    totalSize: int | None = None

    # Directory-specific fields
    files: list[FileInfo] | None = None
    totalFiles: int | None = None
    matchedPattern: str | None = None
    warnings: list[str] | None = None


class ComputedOutput(BaseModel):
    """Computed aggregation output."""

    # For pass mode: Python dict representation
    # For concatenate mode: Full rendered text
    content: str
    # "pass" or "concatenate"
    mode: str
    # Variable name (for concatenate mode)
    outputVariableName: str | None = None
    # Approximate token count (None if counting failed or unavailable)
    tokenCount: int | None = None
    # Error message if token counting failed
    tokenCountError: str | None = None


class ContextPreviewResponse(BaseModel):
    """Response model for context preview."""

    results: dict[str, PreviewResult]
    computedOutput: ComputedOutput
    errors: list[str]


def _truncate_content(content: str, max_size: int) -> tuple[str, bool, int]:
    """Truncate content if it exceeds max size.

    Returns:
        Tuple of (content, was_truncated, total_size)
    """
    total_size = len(content.encode("utf-8"))
    if total_size <= max_size:
        return content, False, total_size

    # Truncate to max_size bytes, being careful with UTF-8
    truncated = content.encode("utf-8")[:max_size].decode("utf-8", errors="ignore")
    return truncated, True, total_size


def _format_frontmatter(metadata: dict[str, str]) -> str:
    """Format metadata as YAML front matter."""
    lines = ["---"]
    for key, value in metadata.items():
        if value:  # Only include non-empty values
            lines.append(f"{key}: {value}")
    lines.append("---\n")
    return "\n".join(lines)


def _format_separator_with_metadata(separator: str, metadata: dict[str, str]) -> str:
    """Format separator string with metadata variables."""
    try:
        return separator.format(**metadata)
    except KeyError:
        # If some placeholders aren't available, return separator as-is
        return separator


def _get_file_metadata(file_path: Path, relative_path: str) -> dict[str, str]:
    """Get metadata for a file."""
    stat = file_path.stat()
    return {
        "source_path": relative_path,
        "source_name": file_path.stem,
        "file_ext": file_path.suffix.lstrip("."),
        "file_size": str(stat.st_size),
        "modified_time": datetime.fromtimestamp(stat.st_mtime).isoformat(),
    }


def _get_url_metadata(url: str, response: httpx.Response) -> dict[str, str]:
    """Get metadata for a URL response."""
    retrieved_time = datetime.now().isoformat()

    url_path = url.split("?")[0].split("/")[-1] or "url"
    source_name = url_path.rsplit(".", 1)[0] if "." in url_path else url_path

    return {
        "source_path": url,
        "source_name": source_name,
        "content_type": response.headers.get("Content-Type", ""),
        "content_length": response.headers.get("Content-Length", ""),
        "status_code": str(response.status_code),
        "retrieved_time": retrieved_time,
    }


def _matches_exclude_pattern(
    file_path: Path, base_dir: Path, patterns: list[str]
) -> bool:
    """Check if a file path matches any exclusion pattern."""
    try:
        rel_path = file_path.relative_to(base_dir)
    except ValueError:
        return False

    rel_parts = rel_path.parts
    for pattern in patterns:
        if pattern in rel_parts:
            return True
        if any(Path(part).match(pattern) for part in rel_parts):
            return True
    return False


async def _preview_file(
    file_path: str,
    project_path: Path,
    include_metadata: bool,
    max_size: int,
) -> PreviewResult:
    """Preview a single file."""
    if not file_path:
        return PreviewResult(
            variableName="",
            content="",
            error="No file path specified",
        )

    full_path = project_path / file_path
    if not full_path.exists():
        full_path = Path(file_path)
        if not full_path.exists():
            return PreviewResult(
                variableName="",
                content="",
                error=f"File not found: {file_path}",
            )

    try:
        content = full_path.read_text(encoding="utf-8")
        content, truncated, total_size = _truncate_content(content, max_size)

        metadata = None
        if include_metadata:
            metadata = _get_file_metadata(full_path, file_path)

        return PreviewResult(
            variableName="",
            content=content,
            metadata=metadata,
            truncated=truncated,
            totalSize=total_size,
        )
    except Exception as e:
        return PreviewResult(
            variableName="",
            content="",
            error=f"Error reading file: {e}",
        )


async def _preview_directory(
    directory_path: str,
    glob_pattern: str,
    project_path: Path,
    include_metadata: bool,
    max_size: int,
    recursive: bool = False,
    exclude_patterns: list[str] | None = None,
    max_files: int = 100,
    max_file_size: int = 1048576,
) -> PreviewResult:
    """Preview files in a directory."""
    if not directory_path:
        return PreviewResult(
            variableName="",
            content="",
            error="No directory path specified",
        )

    full_dir = project_path / directory_path
    if not full_dir.exists():
        full_dir = Path(directory_path)
        if not full_dir.exists():
            return PreviewResult(
                variableName="",
                content="",
                error=f"Directory not found: {directory_path}",
            )

    # Handle recursive mode
    effective_pattern = glob_pattern
    if recursive and not glob_pattern.startswith("**/"):
        effective_pattern = f"**/{glob_pattern}"

    pattern = str(full_dir / effective_pattern)
    files = sorted(glob_module.glob(pattern, recursive=True))
    files = [Path(f) for f in files if Path(f).is_file()]

    # Apply exclusion patterns
    if exclude_patterns:
        files = [
            f
            for f in files
            if not _matches_exclude_pattern(f, full_dir, exclude_patterns)
        ]

    if not files:
        return PreviewResult(
            variableName="",
            content="",
            matchedPattern=glob_pattern,
            totalFiles=0,
            files=[],
            error=f"No files matched pattern: {glob_pattern}",
        )

    # Apply limits
    warnings: list[str] = []
    skipped_large = 0

    size_filtered = []
    for f in files:
        try:
            if f.stat().st_size > max_file_size:
                skipped_large += 1
            else:
                size_filtered.append(f)
        except OSError:
            continue

    if skipped_large > 0:
        warnings.append(
            f"Skipped {skipped_large} file(s) exceeding {max_file_size // 1024}KB"
        )

    original_count = len(size_filtered)
    if len(size_filtered) > max_files:
        warnings.append(f"Found {len(size_filtered)} files, showing first {max_files}")
        size_filtered = size_filtered[:max_files]

    # Read file contents
    file_infos: list[FileInfo] = []
    combined_content: list[str] = []
    per_file_max = max_size // max(
        1, len(size_filtered)
    )  # Distribute max_size across files

    for file_path in size_filtered:
        try:
            rel_path = str(file_path.relative_to(project_path))
        except ValueError:
            rel_path = str(file_path)

        try:
            content = file_path.read_text(encoding="utf-8")
            content_truncated, _, file_size = _truncate_content(content, per_file_max)

            file_infos.append(
                FileInfo(
                    path=rel_path,
                    content=content_truncated,
                    size=file_size,
                )
            )
            combined_content.append(content_truncated)
        except Exception as e:
            file_infos.append(
                FileInfo(
                    path=rel_path,
                    content="",
                    size=0,
                    error=str(e),
                )
            )

    # Combine content for preview
    separator = "\n\n---\n\n"
    full_content = separator.join(combined_content)
    full_content, truncated, total_size = _truncate_content(full_content, max_size)

    return PreviewResult(
        variableName="",
        content=full_content,
        matchedPattern=glob_pattern,
        totalFiles=original_count,
        files=file_infos,
        warnings=warnings if warnings else None,
        truncated=truncated,
        totalSize=total_size,
    )


async def _preview_url(
    url: str,
    include_metadata: bool,
    max_size: int,
) -> PreviewResult:
    """Preview content from a URL."""
    if not url:
        return PreviewResult(
            variableName="",
            content="",
            error="No URL specified",
        )

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10.0, follow_redirects=True)
            response.raise_for_status()
            content = response.text
            content, truncated, total_size = _truncate_content(content, max_size)

            metadata = None
            if include_metadata:
                metadata = _get_url_metadata(url, response)

            return PreviewResult(
                variableName="",
                content=content,
                metadata=metadata,
                truncated=truncated,
                totalSize=total_size,
            )
    except httpx.TimeoutException:
        return PreviewResult(
            variableName="",
            content="",
            error=f"Timeout fetching URL: {url}",
        )
    except httpx.HTTPStatusError as e:
        return PreviewResult(
            variableName="",
            content="",
            error=f"HTTP {e.response.status_code} from URL: {url}",
        )
    except Exception as e:
        return PreviewResult(
            variableName="",
            content="",
            error=f"Error fetching URL: {e}",
        )


def _unescape_string(s: str) -> str:
    """Unescape common escape sequences in a string.

    Converts escaped sequences like \\n, \\t, \\r to actual characters.
    """
    return (
        s.replace("\\n", "\n")
        .replace("\\t", "\t")
        .replace("\\r", "\r")
        .replace("\\\\", "\\")
    )


async def _compute_aggregated_output(
    results: dict[str, PreviewResult],
    aggregation_mode: str,
    separator: str,
    output_variable_name: str,
    include_metadata: bool,
    project_path: Path,
) -> ComputedOutput:
    """Compute the aggregated output based on mode.

    For pass mode: Returns a Python dict representation.
    For concatenate mode: Returns the full rendered text with separators.
    Also counts tokens using the project's Google API configuration.
    """
    # Unescape separator (frontend sends escaped sequences)
    actual_separator = _unescape_string(separator)

    if aggregation_mode == "pass":
        # Build Python dict representation
        # Type is complex due to nested structures for directories
        output_dict: dict[str, object] = {}
        for result in results.values():
            # Check if this is a directory result (has files list)
            if result.files is not None:
                # Directory: show individual files
                files_data: list[dict[str, object]] = []
                for file_info in result.files:
                    file_entry: dict[str, object] = {
                        "path": file_info.path,
                        "content": file_info.content,
                    }
                    if file_info.error:
                        file_entry["error"] = file_info.error
                    files_data.append(file_entry)

                dir_entry: dict[str, object] = {"files": files_data}
                if result.matchedPattern:
                    dir_entry["pattern"] = result.matchedPattern
                if result.totalFiles is not None:
                    dir_entry["total_files"] = result.totalFiles
                if result.warnings:
                    dir_entry["warnings"] = result.warnings
                output_dict[result.variableName] = dir_entry
            elif include_metadata and result.metadata:
                output_dict[result.variableName] = {
                    "content": result.content,
                    "metadata": result.metadata,
                }
            else:
                output_dict[result.variableName] = result.content

        # Format as Python dict string
        content = _format_python_dict(output_dict)

        # Count tokens
        token_count, token_error = await _count_tokens(content, project_path)

        return ComputedOutput(
            content=content,
            mode="pass",
            outputVariableName=None,
            tokenCount=token_count,
            tokenCountError=token_error,
        )
    else:
        # Concatenate mode: build full text with separators
        parts: list[str] = []

        for result in results.values():
            # Check if this is a directory result with individual files
            if result.files is not None and include_metadata:
                # Directory: iterate through individual files
                for file_info in result.files:
                    if file_info.error:
                        continue  # Skip files with errors

                    # Build metadata for this file
                    file_path = Path(file_info.path)
                    file_metadata = {
                        "source_path": file_info.path,
                        "source_name": file_path.stem,
                        "file_ext": file_path.suffix.lstrip("."),
                        "file_size": str(file_info.size),
                    }

                    if parts:  # Not the first item
                        formatted_sep = _format_separator_with_metadata(
                            actual_separator, file_metadata
                        )
                        parts.append(formatted_sep)
                    parts.append(_format_frontmatter(file_metadata))
                    parts.append(file_info.content)
            elif result.files is not None:
                # Directory without metadata: use individual file contents
                for file_info in result.files:
                    if file_info.error:
                        continue
                    if parts:
                        parts.append(actual_separator)
                    parts.append(file_info.content)
            elif include_metadata and result.metadata:
                # Non-directory with metadata
                if parts:  # Not the first item
                    formatted_sep = _format_separator_with_metadata(
                        actual_separator, result.metadata
                    )
                    parts.append(formatted_sep)
                parts.append(_format_frontmatter(result.metadata))
                parts.append(result.content)
            else:
                # Non-directory without metadata
                if parts:  # Not the first item
                    parts.append(actual_separator)
                parts.append(result.content)

        content = "".join(parts)

        # Count tokens
        token_count, token_error = await _count_tokens(content, project_path)

        return ComputedOutput(
            content=content,
            mode="concatenate",
            outputVariableName=output_variable_name,
            tokenCount=token_count,
            tokenCountError=token_error,
        )


def _format_python_value(value: object, indent: int = 0) -> str:
    """Format a Python value as a readable string."""
    base_indent = "    " + " " * indent

    if isinstance(value, dict):
        if not value:
            return "{}"
        lines = ["{"]
        items = list(value.items())
        for i, (k, v) in enumerate(items):
            comma = "," if i < len(items) - 1 else ""
            formatted_value = _format_python_value(v, indent + 4)
            lines.append(f"{base_indent}{repr(k)}: {formatted_value}{comma}")
        lines.append(f"{' ' * indent}}}")
        return "\n".join(lines)

    elif isinstance(value, list):
        if not value:
            return "[]"
        lines = ["["]
        for i, item in enumerate(value):
            comma = "," if i < len(value) - 1 else ""
            formatted_item = _format_python_value(item, indent + 4)
            lines.append(f"{base_indent}{formatted_item}{comma}")
        lines.append(f"{' ' * indent}]")
        return "\n".join(lines)

    elif isinstance(value, str):
        # Truncate long strings for display
        if len(value) > 200:
            return repr(value[:200] + "...")
        return repr(value)

    else:
        return repr(value)


def _format_python_dict(d: dict, indent: int = 0) -> str:
    """Format a Python dict as a readable string."""
    return _format_python_value(d, indent)


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
                result = await _preview_file(
                    di.filePath or "",
                    project_path,
                    request.includeMetadata,
                    max_size,
                )
                result.variableName = var_name
                results[di.id] = result

            elif input_type == "directory":
                result = await _preview_directory(
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
                result = await _preview_url(
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
        computed_output = await _compute_aggregated_output(
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
