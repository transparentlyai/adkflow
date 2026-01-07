"""Context Aggregator Preview Models.

Pydantic models for the context preview API request and response.
"""

from typing import Literal

from pydantic import BaseModel

# Maximum content size for preview (10KB default)
DEFAULT_MAX_CONTENT_SIZE = 10 * 1024


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
