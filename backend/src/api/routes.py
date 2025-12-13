"""API routes for ADKFlow backend."""

import json
import os
import random
import string
import time
from pathlib import Path
from fastapi import APIRouter, HTTPException, status, Query
from pydantic import BaseModel, ValidationError

from backend.src.models.workflow import (
    ReactFlowJSON,
    TabMetadata,
    ProjectManifest,
    Viewport,
)


router = APIRouter(prefix="/api")


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


# Helper Functions


def generate_tab_id() -> str:
    """Generate a unique tab ID with timestamp and random string."""
    timestamp = int(time.time() * 1000)
    random_str = "".join(random.choices(string.ascii_lowercase + string.digits, k=9))
    return f"page_{timestamp}_{random_str}"


def get_default_flow() -> ReactFlowJSON:
    """Return a default empty ReactFlow JSON structure."""
    return ReactFlowJSON(nodes=[], edges=[], viewport=Viewport(x=0, y=0, zoom=1))


@router.get("/tools", response_model=ToolsResponse)
async def get_available_tools() -> ToolsResponse:
    """
    Get list of available ADK tools.

    Returns:
        ToolsResponse with list of available tools
    """
    # This is a curated list of common ADK tools
    # In production, this could be dynamically loaded from ADK
    tools = [
        ToolInfo(
            name="code_execution",
            description="Execute Python code in a sandboxed environment",
            category="execution",
        ),
        ToolInfo(
            name="google_search",
            description="Search the web using Google Search",
            category="search",
        ),
        ToolInfo(
            name="web_browser",
            description="Browse and extract content from web pages",
            category="web",
        ),
        ToolInfo(
            name="file_reader",
            description="Read and analyze file contents",
            category="file",
        ),
        ToolInfo(
            name="file_writer", description="Write content to files", category="file"
        ),
        ToolInfo(
            name="calculator",
            description="Perform mathematical calculations",
            category="utility",
        ),
        ToolInfo(
            name="datetime",
            description="Get current date and time information",
            category="utility",
        ),
        ToolInfo(
            name="vertex_ai_search",
            description="Search using Vertex AI Search",
            category="search",
        ),
        ToolInfo(
            name="bigquery", description="Query data from BigQuery", category="data"
        ),
        ToolInfo(
            name="cloud_storage",
            description="Interact with Google Cloud Storage",
            category="storage",
        ),
    ]

    return ToolsResponse(tools=tools)


@router.get("/project/load", response_model=ProjectLoadResponse)
async def load_project(
    path: str = Query(..., description="Full path to project directory"),
) -> ProjectLoadResponse:
    """
    Load a project from the filesystem.

    Args:
        path: Full path to the project directory

    Returns:
        ProjectLoadResponse with React Flow data if exists

    Raises:
        HTTPException: If path is invalid or read fails
    """
    try:
        # Validate and normalize path
        project_path = Path(path).resolve()
        flow_file = project_path / "flow.json"

        # Check if flow file exists
        if not flow_file.exists():
            return ProjectLoadResponse(exists=False, flow=None, path=str(project_path))

        # Read and parse React Flow JSON
        try:
            with open(flow_file, "r", encoding="utf-8") as f:
                flow_data = json.load(f)

            flow = ReactFlowJSON(**flow_data)

            return ProjectLoadResponse(exists=True, flow=flow, path=str(project_path))

        except json.JSONDecodeError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid JSON in flow file: {str(e)}",
            )
        except ValidationError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid flow format: {str(e)}",
            )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load project: {str(e)}",
        )


@router.post("/project/save", response_model=ProjectSaveResponse)
async def save_project(request: ProjectSaveRequest) -> ProjectSaveResponse:
    """
    Save a project to the filesystem.

    Args:
        request: Project save request with path and React Flow data

    Returns:
        ProjectSaveResponse with success status

    Raises:
        HTTPException: If save fails
    """
    try:
        # Validate and normalize path
        project_path = Path(request.path).resolve()

        # Create directory if it doesn't exist
        project_path.mkdir(parents=True, exist_ok=True)

        # Convert React Flow to JSON
        flow_json = request.flow.model_dump(exclude_none=True)

        # Write to file
        flow_file = project_path / "flow.json"
        with open(flow_file, "w", encoding="utf-8") as f:
            json.dump(flow_json, f, indent=2)

        return ProjectSaveResponse(
            success=True,
            path=str(project_path),
            message=f"Project saved successfully to {flow_file}",
        )

    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=f"Permission denied: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save project: {str(e)}",
        )


@router.post("/project/prompt/create", response_model=PromptCreateResponse)
async def create_prompt_file(request: PromptCreateRequest) -> PromptCreateResponse:
    """
    Create a new prompt markdown file in the project.

    Args:
        request: Prompt creation request with project path and prompt name

    Returns:
        PromptCreateResponse with file path

    Raises:
        HTTPException: If file creation fails
    """
    try:
        # Validate and normalize project path
        project_path = Path(request.project_path).resolve()

        # Sanitize prompt name for filesystem
        import re

        safe_name = re.sub(r"[^\w\-]", "-", request.prompt_name.lower())
        safe_name = re.sub(r"-+", "-", safe_name).strip("-")

        if not safe_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid prompt name"
            )

        # Create prompts directory
        prompts_dir = project_path / "prompts"
        prompts_dir.mkdir(parents=True, exist_ok=True)

        # Create prompt file
        filename = f"{safe_name}.prompt.md"
        prompt_file = prompts_dir / filename

        # Check if file already exists
        if prompt_file.exists():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Prompt file '{filename}' already exists",
            )

        # Create empty file
        prompt_file.touch()

        # Return relative path from project root
        relative_path = f"prompts/{filename}"

        return PromptCreateResponse(
            success=True,
            file_path=relative_path,
            absolute_path=str(prompt_file),
            message=f"Prompt file created: {filename}",
        )

    except HTTPException:
        raise
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=f"Permission denied: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create prompt file: {str(e)}",
        )


@router.post("/project/context/create", response_model=PromptCreateResponse)
async def create_context_file(request: ContextCreateRequest) -> PromptCreateResponse:
    """
    Create a new context markdown file in the project.

    Args:
        request: Context creation request with project path and context name

    Returns:
        PromptCreateResponse with file path

    Raises:
        HTTPException: If file creation fails
    """
    try:
        # Validate and normalize project path
        project_path = Path(request.project_path).resolve()

        # Sanitize context name for filesystem
        import re

        safe_name = re.sub(r"[^\w\-]", "-", request.context_name.lower())
        safe_name = re.sub(r"-+", "-", safe_name).strip("-")

        if not safe_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid context name"
            )

        # Create static directory
        static_dir = project_path / "static"
        static_dir.mkdir(parents=True, exist_ok=True)

        # Create context file
        filename = f"{safe_name}.context.md"
        context_file = static_dir / filename

        # Check if file already exists
        if context_file.exists():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Context file '{filename}' already exists",
            )

        # Create empty file
        context_file.touch()

        # Return relative path from project root
        relative_path = f"static/{filename}"

        return PromptCreateResponse(
            success=True,
            file_path=relative_path,
            absolute_path=str(context_file),
            message=f"Context file created: {filename}",
        )

    except HTTPException:
        raise
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=f"Permission denied: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create context file: {str(e)}",
        )


@router.post("/project/tool/create", response_model=PromptCreateResponse)
async def create_tool_file(request: ToolCreateRequest) -> PromptCreateResponse:
    """
    Create a new Python tool file in the project.

    Args:
        request: Tool creation request with project path and tool name

    Returns:
        PromptCreateResponse with file path

    Raises:
        HTTPException: If file creation fails
    """
    try:
        # Validate and normalize project path
        project_path = Path(request.project_path).resolve()

        # Sanitize tool name for filesystem
        import re

        safe_name = re.sub(r"[^\w\-]", "_", request.tool_name.lower())
        safe_name = re.sub(r"_+", "_", safe_name).strip("_")

        if not safe_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid tool name"
            )

        # Create tools directory
        tools_dir = project_path / "tools"
        tools_dir.mkdir(parents=True, exist_ok=True)

        # Create tool file
        filename = f"{safe_name}.py"
        tool_file = tools_dir / filename

        # Check if file already exists
        if tool_file.exists():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Tool file '{filename}' already exists",
            )

        # Create file with default Python tool template
        default_code = f'''def {safe_name}(input_data: dict) -> dict:
    """
    {request.tool_name} - Tool function that processes input and returns output.

    Args:
        input_data: Dictionary containing input parameters

    Returns:
        Dictionary with tool output
    """
    # Your tool logic here
    result = input_data

    return result
'''
        with open(tool_file, "w", encoding="utf-8") as f:
            f.write(default_code)

        # Return relative path from project root
        relative_path = f"tools/{filename}"

        return PromptCreateResponse(
            success=True,
            file_path=relative_path,
            absolute_path=str(tool_file),
            message=f"Tool file created: {filename}",
        )

    except HTTPException:
        raise
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=f"Permission denied: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create tool file: {str(e)}",
        )


@router.post("/project/prompt/read", response_model=PromptReadResponse)
async def read_prompt_file(request: PromptReadRequest) -> PromptReadResponse:
    """
    Read the content of a prompt markdown file.

    Args:
        request: Prompt read request with project path and file path

    Returns:
        PromptReadResponse with file content

    Raises:
        HTTPException: If file read fails
    """
    try:
        # Check if file_path is absolute
        file_path = Path(request.file_path)
        if file_path.is_absolute():
            prompt_file = file_path
        else:
            # Relative path - construct from project path
            project_path = Path(request.project_path).resolve()
            prompt_file = project_path / request.file_path

        # Validate file exists
        if not prompt_file.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Prompt file not found: {request.file_path}",
            )

        # Read file content
        with open(prompt_file, "r", encoding="utf-8") as f:
            content = f.read()

        return PromptReadResponse(
            success=True, content=content, file_path=request.file_path
        )

    except HTTPException:
        raise
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=f"Permission denied: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read prompt file: {str(e)}",
        )


@router.post("/project/file/chunk", response_model=FileChunkResponse)
async def read_file_chunk(request: FileChunkRequest) -> FileChunkResponse:
    """
    Read a chunk of a file for paginated loading (optimized for large files).

    Args:
        request: File chunk request with project path, file path, offset, limit, and reverse flag

    Returns:
        FileChunkResponse with chunk content and pagination info

    Raises:
        HTTPException: If file read fails
    """
    try:
        # Validate and normalize project path
        project_path = Path(request.project_path).resolve()

        # Construct full file path
        file_path = project_path / request.file_path

        # Validate file exists
        if not file_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"File not found: {request.file_path}",
            )

        # Read all lines (we need total count anyway)
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            all_lines = f.readlines()

        total_lines = len(all_lines)

        if request.reverse:
            # Reverse mode: read from end of file
            # offset 0 means "last N lines", offset 500 means "500 lines before the last chunk"
            # Calculate which lines to return (from end)
            end_idx = total_lines - request.offset
            start_idx = max(0, end_idx - request.limit)

            if end_idx <= 0:
                # No more lines to read
                return FileChunkResponse(
                    success=True,
                    content="",
                    file_path=request.file_path,
                    total_lines=total_lines,
                    offset=request.offset,
                    has_more=False,
                )

            chunk_lines = all_lines[start_idx:end_idx]
            # Reverse the lines so newest appears first
            chunk_lines = list(reversed(chunk_lines))
            has_more = start_idx > 0
        else:
            # Normal mode: read from start
            start_idx = request.offset
            end_idx = min(total_lines, start_idx + request.limit)

            if start_idx >= total_lines:
                return FileChunkResponse(
                    success=True,
                    content="",
                    file_path=request.file_path,
                    total_lines=total_lines,
                    offset=request.offset,
                    has_more=False,
                )

            chunk_lines = all_lines[start_idx:end_idx]
            has_more = end_idx < total_lines

        # Join lines (they already have newlines)
        content = "".join(chunk_lines)
        # Remove trailing newline for cleaner display
        content = content.rstrip("\n")

        return FileChunkResponse(
            success=True,
            content=content,
            file_path=request.file_path,
            total_lines=total_lines,
            offset=request.offset,
            has_more=has_more,
        )

    except HTTPException:
        raise
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=f"Permission denied: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read file chunk: {str(e)}",
        )


@router.post("/project/prompt/save", response_model=PromptSaveResponse)
async def save_prompt_file(request: PromptSaveRequest) -> PromptSaveResponse:
    """
    Save content to a prompt markdown file.

    Args:
        request: Prompt save request with project path, file path, and content

    Returns:
        PromptSaveResponse with success status

    Raises:
        HTTPException: If file save fails
    """
    try:
        # Check if file_path is absolute
        file_path = Path(request.file_path)
        if file_path.is_absolute():
            prompt_file = file_path
        else:
            # Relative path - construct from project path
            project_path = Path(request.project_path).resolve()
            prompt_file = project_path / request.file_path

        # Validate file exists
        if not prompt_file.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Prompt file not found: {request.file_path}",
            )

        # Write content to file
        with open(prompt_file, "w", encoding="utf-8") as f:
            f.write(request.content)

        return PromptSaveResponse(
            success=True,
            file_path=request.file_path,
            message=f"Prompt file saved: {request.file_path}",
        )

    except HTTPException:
        raise
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=f"Permission denied: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save prompt file: {str(e)}",
        )


@router.get("/filesystem/list", response_model=DirectoryListResponse)
async def list_directory(
    path: str = Query("/", description="Directory path to list"),
) -> DirectoryListResponse:
    """
    List contents of a directory on the server filesystem.

    Args:
        path: Directory path to list (default: root)

    Returns:
        DirectoryListResponse with directory contents

    Raises:
        HTTPException: If path is invalid or inaccessible
    """
    try:
        # Expand user home directory
        if path.startswith("~"):
            path = os.path.expanduser(path)

        # Resolve to absolute path
        current_path = Path(path).resolve()

        # Security: Prevent access outside allowed directories
        # For now, we'll allow any path but you may want to restrict this
        if not current_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Path does not exist: {path}",
            )

        if not current_path.is_dir():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Path is not a directory: {path}",
            )

        # Get parent path
        parent_path = (
            str(current_path.parent) if current_path != current_path.parent else None
        )

        # List directory contents
        entries = []
        try:
            for item in sorted(
                current_path.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower())
            ):
                # Skip hidden files/directories (starting with .)
                if item.name.startswith("."):
                    continue

                entries.append(
                    DirectoryEntry(
                        name=item.name, path=str(item), is_directory=item.is_dir()
                    )
                )
        except PermissionError:
            # If we can't read the directory, return empty list
            pass

        return DirectoryListResponse(
            current_path=str(current_path), parent_path=parent_path, entries=entries
        )

    except HTTPException:
        raise
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=f"Permission denied: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list directory: {str(e)}",
        )


@router.post("/filesystem/mkdir", response_model=DirectoryCreateResponse)
async def create_directory(request: DirectoryCreateRequest) -> DirectoryCreateResponse:
    """
    Create a new directory on the server filesystem.

    Args:
        request: Directory creation request with parent path and directory name

    Returns:
        DirectoryCreateResponse with created directory path

    Raises:
        HTTPException: If creation fails or directory already exists
    """
    try:
        # Expand user home directory if needed
        parent_path = request.path
        if parent_path.startswith("~"):
            parent_path = os.path.expanduser(parent_path)

        # Resolve to absolute path
        parent_dir = Path(parent_path).resolve()

        # Validate parent directory exists
        if not parent_dir.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Parent directory does not exist: {request.path}",
            )

        if not parent_dir.is_dir():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Path is not a directory: {request.path}",
            )

        # Sanitize directory name to prevent path traversal
        safe_name = request.name.strip()

        # Check for invalid characters and path traversal attempts
        if not safe_name or safe_name in [".", ".."]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid directory name"
            )

        if "/" in safe_name or "\\" in safe_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Directory name cannot contain path separators",
            )

        # Create the new directory
        new_dir = parent_dir / safe_name

        if new_dir.exists():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Directory '{safe_name}' already exists",
            )

        new_dir.mkdir(parents=False, exist_ok=False)

        return DirectoryCreateResponse(
            success=True,
            created_path=str(new_dir),
            message=f"Directory '{safe_name}' created successfully",
        )

    except HTTPException:
        raise
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=f"Permission denied: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create directory: {str(e)}",
        )


# Tab/Page CRUD Endpoints


@router.get("/project/tabs", response_model=TabListResponse)
async def list_tabs(
    path: str = Query(..., description="Project directory path"),
) -> TabListResponse:
    """
    List all tabs in a project.

    Args:
        path: Project directory path

    Returns:
        TabListResponse with list of tabs

    Raises:
        HTTPException: If read fails
    """
    try:
        project_path = Path(path).resolve()
        manifest_file = project_path / "manifest.json"

        # Check if manifest.json exists
        if manifest_file.exists():
            # Load manifest
            with open(manifest_file, "r", encoding="utf-8") as f:
                manifest_data = json.load(f)
            manifest = ProjectManifest(**manifest_data)
            return TabListResponse(tabs=manifest.tabs, name=manifest.name)

        # Check for legacy flow.json and migrate
        legacy_flow_file = project_path / "flow.json"
        if legacy_flow_file.exists():
            # Perform migration
            # 1. Generate a tab ID for the legacy flow
            tab_id = generate_tab_id()

            # 2. Create pages directory
            pages_dir = project_path / "pages"
            pages_dir.mkdir(exist_ok=True)

            # 3. Move flow.json to pages/page-{id}.json
            new_flow_file = pages_dir / f"{tab_id}.json"
            with open(legacy_flow_file, "r", encoding="utf-8") as f:
                flow_data = f.read()
            with open(new_flow_file, "w", encoding="utf-8") as f:
                f.write(flow_data)

            # 4. Delete old flow.json
            legacy_flow_file.unlink()

            # 5. Create manifest.json
            tab = TabMetadata(id=tab_id, name="Flow 1", order=0)
            manifest = ProjectManifest(version="2.0", tabs=[tab])
            with open(manifest_file, "w", encoding="utf-8") as f:
                json.dump(manifest.model_dump(exclude_none=True), f, indent=2)

            return TabListResponse(tabs=manifest.tabs)

        # No manifest or legacy flow - return empty list
        return TabListResponse(tabs=[])

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list tabs: {str(e)}",
        )


@router.post("/project/tabs", response_model=TabCreateResponse)
async def create_tab(request: TabCreateRequest) -> TabCreateResponse:
    """
    Create a new tab in the project.

    Args:
        request: Tab creation request with project path and name

    Returns:
        TabCreateResponse with new tab metadata

    Raises:
        HTTPException: If creation fails
    """
    try:
        project_path = Path(request.project_path).resolve()
        manifest_file = project_path / "manifest.json"
        pages_dir = project_path / "pages"

        # Create pages directory if it doesn't exist
        pages_dir.mkdir(parents=True, exist_ok=True)

        # Generate new tab ID
        tab_id = generate_tab_id()

        # Load or create manifest
        if manifest_file.exists():
            with open(manifest_file, "r", encoding="utf-8") as f:
                manifest_data = json.load(f)
            manifest = ProjectManifest(**manifest_data)
        else:
            manifest = ProjectManifest(version="2.0", tabs=[])

        # Create new tab metadata
        order = len(manifest.tabs)
        new_tab = TabMetadata(id=tab_id, name=request.name, order=order)

        # Create empty flow file for the tab
        tab_file = pages_dir / f"{tab_id}.json"
        default_flow = get_default_flow()
        with open(tab_file, "w", encoding="utf-8") as f:
            json.dump(default_flow.model_dump(exclude_none=True), f, indent=2)

        # Add tab to manifest
        manifest.tabs.append(new_tab)

        # Save manifest
        with open(manifest_file, "w", encoding="utf-8") as f:
            json.dump(manifest.model_dump(exclude_none=True), f, indent=2)

        return TabCreateResponse(tab=new_tab)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create tab: {str(e)}",
        )


@router.put("/project/tabs/reorder")
async def reorder_tabs(request: TabReorderRequest) -> dict:
    """
    Reorder tabs in the project.

    Args:
        request: Tab reorder request with ordered list of tab IDs

    Returns:
        Success response

    Raises:
        HTTPException: If reorder fails
    """
    try:
        project_path = Path(request.project_path).resolve()
        manifest_file = project_path / "manifest.json"

        if not manifest_file.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project manifest not found",
            )

        # Load manifest
        with open(manifest_file, "r", encoding="utf-8") as f:
            manifest_data = json.load(f)
        manifest = ProjectManifest(**manifest_data)

        # Validate all tab IDs exist
        existing_ids = {tab.id for tab in manifest.tabs}
        request_ids = set(request.tab_ids)

        if existing_ids != request_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tab ID mismatch: provided IDs don't match existing tabs",
            )

        # Create a mapping of tab ID to tab
        tab_map = {tab.id: tab for tab in manifest.tabs}

        # Reorder tabs based on the provided order
        manifest.tabs = [tab_map[tab_id] for tab_id in request.tab_ids]

        # Update order field
        for i, tab in enumerate(manifest.tabs):
            tab.order = i

        # Save manifest
        with open(manifest_file, "w", encoding="utf-8") as f:
            json.dump(manifest.model_dump(exclude_none=True), f, indent=2)

        return {"success": True, "message": "Tabs reordered successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reorder tabs: {str(e)}",
        )


@router.get("/project/tabs/{tab_id}", response_model=TabLoadResponse)
async def load_tab(
    tab_id: str,
    path: str = Query(..., description="Project directory path"),
) -> TabLoadResponse:
    """
    Load a tab's flow data.

    Args:
        tab_id: Tab identifier
        path: Project directory path

    Returns:
        TabLoadResponse with flow data

    Raises:
        HTTPException: If tab not found or read fails
    """
    try:
        project_path = Path(path).resolve()
        tab_file = project_path / "pages" / f"{tab_id}.json"

        if not tab_file.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tab file not found: {tab_id}",
            )

        # Read flow data
        with open(tab_file, "r", encoding="utf-8") as f:
            flow_data = json.load(f)

        flow = ReactFlowJSON(**flow_data)

        return TabLoadResponse(flow=flow)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load tab: {str(e)}",
        )


@router.put("/project/tabs/{tab_id}")
async def save_tab(
    tab_id: str,
    request: TabSaveRequest,
) -> dict:
    """
    Save a tab's flow data.

    Args:
        tab_id: Tab identifier
        request: Tab save request with flow data

    Returns:
        Success response

    Raises:
        HTTPException: If save fails
    """
    try:
        project_path = Path(request.project_path).resolve()
        pages_dir = project_path / "pages"

        # Create pages directory if it doesn't exist
        pages_dir.mkdir(parents=True, exist_ok=True)

        tab_file = pages_dir / f"{tab_id}.json"

        # Write flow data
        flow_json = request.flow.model_dump(exclude_none=True)
        with open(tab_file, "w", encoding="utf-8") as f:
            json.dump(flow_json, f, indent=2)

        # Update project name in manifest if provided
        if request.project_name is not None:
            manifest_file = project_path / "manifest.json"
            if manifest_file.exists():
                with open(manifest_file, "r", encoding="utf-8") as f:
                    manifest_data = json.load(f)
                manifest = ProjectManifest(**manifest_data)
                manifest.name = request.project_name
                with open(manifest_file, "w", encoding="utf-8") as f:
                    json.dump(manifest.model_dump(exclude_none=True), f, indent=2)

        return {"success": True, "message": f"Tab {tab_id} saved successfully"}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save tab: {str(e)}",
        )


@router.delete("/project/tabs/{tab_id}")
async def delete_tab(
    tab_id: str,
    path: str = Query(..., description="Project directory path"),
) -> dict:
    """
    Delete a tab from the project.

    Args:
        tab_id: Tab identifier
        path: Project directory path

    Returns:
        Success response

    Raises:
        HTTPException: If tab not found, is last tab, or delete fails
    """
    try:
        project_path = Path(path).resolve()
        manifest_file = project_path / "manifest.json"

        if not manifest_file.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project manifest not found",
            )

        # Load manifest
        with open(manifest_file, "r", encoding="utf-8") as f:
            manifest_data = json.load(f)
        manifest = ProjectManifest(**manifest_data)

        # Check if this is the only tab
        if len(manifest.tabs) <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete the last remaining tab",
            )

        # Find and remove the tab
        tab_index = next(
            (i for i, t in enumerate(manifest.tabs) if t.id == tab_id), None
        )
        if tab_index is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tab not found: {tab_id}",
            )

        manifest.tabs.pop(tab_index)

        # Reorder remaining tabs
        for i, tab in enumerate(manifest.tabs):
            tab.order = i

        # Save manifest
        with open(manifest_file, "w", encoding="utf-8") as f:
            json.dump(manifest.model_dump(exclude_none=True), f, indent=2)

        # Delete tab file
        tab_file = project_path / "pages" / f"{tab_id}.json"
        if tab_file.exists():
            tab_file.unlink()

        return {"success": True, "message": f"Tab {tab_id} deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete tab: {str(e)}",
        )


@router.patch("/project/tabs/{tab_id}/rename")
async def rename_tab(
    tab_id: str,
    request: TabRenameRequest,
) -> dict:
    """
    Rename a tab.

    Args:
        tab_id: Tab identifier
        request: Tab rename request with new name

    Returns:
        Success response

    Raises:
        HTTPException: If tab not found or rename fails
    """
    try:
        project_path = Path(request.project_path).resolve()
        manifest_file = project_path / "manifest.json"

        if not manifest_file.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project manifest not found",
            )

        # Load manifest
        with open(manifest_file, "r", encoding="utf-8") as f:
            manifest_data = json.load(f)
        manifest = ProjectManifest(**manifest_data)

        # Find and rename the tab
        tab = next((t for t in manifest.tabs if t.id == tab_id), None)
        if tab is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tab not found: {tab_id}",
            )

        tab.name = request.name

        # Save manifest
        with open(manifest_file, "w", encoding="utf-8") as f:
            json.dump(manifest.model_dump(exclude_none=True), f, indent=2)

        return {"success": True, "message": f"Tab {tab_id} renamed to '{request.name}'"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to rename tab: {str(e)}",
        )


@router.post("/project/tabs/{tab_id}/duplicate", response_model=TabCreateResponse)
async def duplicate_tab(
    tab_id: str,
    path: str = Query(..., description="Project directory path"),
) -> TabCreateResponse:
    """
    Duplicate an existing tab.

    Args:
        tab_id: Tab identifier to duplicate
        path: Project directory path

    Returns:
        TabCreateResponse with new tab metadata

    Raises:
        HTTPException: If tab not found or duplication fails
    """
    try:
        project_path = Path(path).resolve()
        manifest_file = project_path / "manifest.json"
        pages_dir = project_path / "pages"

        if not manifest_file.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project manifest not found",
            )

        # Load manifest
        with open(manifest_file, "r", encoding="utf-8") as f:
            manifest_data = json.load(f)
        manifest = ProjectManifest(**manifest_data)

        # Find the source tab
        source_tab = next((t for t in manifest.tabs if t.id == tab_id), None)
        if source_tab is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tab not found: {tab_id}",
            )

        # Read source tab flow
        source_file = pages_dir / f"{tab_id}.json"
        if not source_file.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tab file not found: {tab_id}",
            )

        with open(source_file, "r", encoding="utf-8") as f:
            flow_data = f.read()

        # Generate new tab ID
        new_tab_id = generate_tab_id()

        # Create new tab metadata
        order = len(manifest.tabs)
        new_tab = TabMetadata(
            id=new_tab_id, name=f"{source_tab.name} (Copy)", order=order
        )

        # Copy flow file
        new_file = pages_dir / f"{new_tab_id}.json"
        with open(new_file, "w", encoding="utf-8") as f:
            f.write(flow_data)

        # Add tab to manifest
        manifest.tabs.append(new_tab)

        # Save manifest
        with open(manifest_file, "w", encoding="utf-8") as f:
            json.dump(manifest.model_dump(exclude_none=True), f, indent=2)

        return TabCreateResponse(tab=new_tab)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to duplicate tab: {str(e)}",
        )
