"""Pydantic models for API routes."""

from pydantic import BaseModel

from backend.src.models.workflow import ReactFlowJSON, TabMetadata


class ToolInfo(BaseModel):
    """Information about an available tool."""

    name: str
    description: str
    category: str


class ToolsResponse(BaseModel):
    """Response model for available tools."""

    tools: list[ToolInfo]


class ProjectLoadResponse(BaseModel):
    """Response model for project load."""

    exists: bool
    flow: ReactFlowJSON | None = None
    path: str


class ProjectSaveRequest(BaseModel):
    """Request model for project save."""

    path: str
    flow: ReactFlowJSON


class ProjectSaveResponse(BaseModel):
    """Response model for project save."""

    success: bool
    path: str
    message: str


class PromptCreateRequest(BaseModel):
    """Request model for creating a prompt file."""

    project_path: str
    prompt_name: str


class ContextCreateRequest(BaseModel):
    """Request model for creating a context file."""

    project_path: str
    context_name: str


class ToolCreateRequest(BaseModel):
    """Request model for creating a tool file."""

    project_path: str
    tool_name: str


class PromptCreateResponse(BaseModel):
    """Response model for prompt file creation."""

    success: bool
    file_path: str
    absolute_path: str
    message: str


class PromptReadRequest(BaseModel):
    """Request model for reading a prompt file."""

    project_path: str
    file_path: str


class PromptReadResponse(BaseModel):
    """Response model for prompt file read."""

    success: bool
    content: str
    file_path: str


class PromptSaveRequest(BaseModel):
    """Request model for saving a prompt file."""

    project_path: str
    file_path: str
    content: str


class PromptSaveResponse(BaseModel):
    """Response model for prompt file save."""

    success: bool
    file_path: str
    message: str


class FileChunkRequest(BaseModel):
    """Request model for reading a file chunk (for large files)."""

    project_path: str
    file_path: str
    offset: int = 0  # Starting line number (0-indexed)
    limit: int = 500  # Number of lines to read
    reverse: bool = True  # If True, read from end of file (default for logs)


class FileChunkResponse(BaseModel):
    """Response model for file chunk read."""

    success: bool
    content: str  # Chunk content (lines joined)
    file_path: str
    total_lines: int  # Total lines in file
    offset: int  # Current offset (line number)
    has_more: bool  # More content available


class DirectoryEntry(BaseModel):
    """Model for a directory entry."""

    name: str
    path: str
    is_directory: bool


class DirectoryListResponse(BaseModel):
    """Response model for directory listing."""

    current_path: str
    parent_path: str | None
    entries: list[DirectoryEntry]


class DirectoryCreateRequest(BaseModel):
    """Request model for directory creation."""

    path: str
    name: str


class DirectoryCreateResponse(BaseModel):
    """Response model for directory creation."""

    success: bool
    created_path: str
    message: str


class DirectoryEnsureRequest(BaseModel):
    """Request model for ensuring a directory exists (recursive creation)."""

    path: str


# Tab/Page Request/Response Models


class TabListResponse(BaseModel):
    """Response model for listing all tabs."""

    tabs: list[TabMetadata]
    name: str = "Untitled Workflow"


class TabCreateRequest(BaseModel):
    """Request model for creating a new tab."""

    project_path: str
    name: str = "Untitled"


class TabCreateResponse(BaseModel):
    """Response model for tab creation."""

    tab: TabMetadata


class TabLoadResponse(BaseModel):
    """Response model for loading a tab's flow."""

    flow: ReactFlowJSON


class TabSaveRequest(BaseModel):
    """Request model for saving a tab's flow."""

    project_path: str
    flow: ReactFlowJSON
    project_name: str | None = None


class TabRenameRequest(BaseModel):
    """Request model for renaming a tab."""

    project_path: str
    name: str


class TabReorderRequest(BaseModel):
    """Request model for reordering tabs."""

    project_path: str
    tab_ids: list[str]
