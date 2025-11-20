"""API routes for ADKFlow backend."""

import os
from pathlib import Path
from fastapi import APIRouter, HTTPException, status, Query
from pydantic import BaseModel, ValidationError

from backend.src.models.workflow import ReactFlowJSON


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
            category="execution"
        ),
        ToolInfo(
            name="google_search",
            description="Search the web using Google Search",
            category="search"
        ),
        ToolInfo(
            name="web_browser",
            description="Browse and extract content from web pages",
            category="web"
        ),
        ToolInfo(
            name="file_reader",
            description="Read and analyze file contents",
            category="file"
        ),
        ToolInfo(
            name="file_writer",
            description="Write content to files",
            category="file"
        ),
        ToolInfo(
            name="calculator",
            description="Perform mathematical calculations",
            category="utility"
        ),
        ToolInfo(
            name="datetime",
            description="Get current date and time information",
            category="utility"
        ),
        ToolInfo(
            name="vertex_ai_search",
            description="Search using Vertex AI Search",
            category="search"
        ),
        ToolInfo(
            name="bigquery",
            description="Query data from BigQuery",
            category="data"
        ),
        ToolInfo(
            name="cloud_storage",
            description="Interact with Google Cloud Storage",
            category="storage"
        ),
    ]

    return ToolsResponse(tools=tools)


@router.get("/project/load", response_model=ProjectLoadResponse)
async def load_project(path: str = Query(..., description="Full path to project directory")) -> ProjectLoadResponse:
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
            return ProjectLoadResponse(
                exists=False,
                flow=None,
                path=str(project_path)
            )

        # Read and parse React Flow JSON
        try:
            with open(flow_file, 'r', encoding='utf-8') as f:
                import json
                flow_data = json.load(f)

            flow = ReactFlowJSON(**flow_data)

            return ProjectLoadResponse(
                exists=True,
                flow=flow,
                path=str(project_path)
            )

        except json.JSONDecodeError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid JSON in flow file: {str(e)}"
            )
        except ValidationError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid flow format: {str(e)}"
            )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load project: {str(e)}"
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
        import json
        flow_json = request.flow.model_dump(exclude_none=True)

        # Write to file
        flow_file = project_path / "flow.json"
        with open(flow_file, 'w', encoding='utf-8') as f:
            json.dump(flow_json, f, indent=2)

        return ProjectSaveResponse(
            success=True,
            path=str(project_path),
            message=f"Project saved successfully to {flow_file}"
        )

    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save project: {str(e)}"
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
        safe_name = re.sub(r'[^\w\-]', '-', request.prompt_name.lower())
        safe_name = re.sub(r'-+', '-', safe_name).strip('-')

        if not safe_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid prompt name"
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
                detail=f"Prompt file '{filename}' already exists"
            )

        # Create empty file
        prompt_file.touch()

        # Return relative path from project root
        relative_path = f"prompts/{filename}"

        return PromptCreateResponse(
            success=True,
            file_path=relative_path,
            absolute_path=str(prompt_file),
            message=f"Prompt file created: {filename}"
        )

    except HTTPException:
        raise
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create prompt file: {str(e)}"
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
        safe_name = re.sub(r'[^\w\-]', '-', request.context_name.lower())
        safe_name = re.sub(r'-+', '-', safe_name).strip('-')

        if not safe_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid context name"
            )

        # Create contexts directory
        contexts_dir = project_path / "contexts"
        contexts_dir.mkdir(parents=True, exist_ok=True)

        # Create context file
        filename = f"{safe_name}.context.md"
        context_file = contexts_dir / filename

        # Check if file already exists
        if context_file.exists():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Context file '{filename}' already exists"
            )

        # Create empty file
        context_file.touch()

        # Return relative path from project root
        relative_path = f"contexts/{filename}"

        return PromptCreateResponse(
            success=True,
            file_path=relative_path,
            absolute_path=str(context_file),
            message=f"Context file created: {filename}"
        )

    except HTTPException:
        raise
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create context file: {str(e)}"
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
        # Validate and normalize project path
        project_path = Path(request.project_path).resolve()

        # Construct full file path
        prompt_file = project_path / request.file_path

        # Validate file exists
        if not prompt_file.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Prompt file not found: {request.file_path}"
            )

        # Read file content
        with open(prompt_file, 'r', encoding='utf-8') as f:
            content = f.read()

        return PromptReadResponse(
            success=True,
            content=content,
            file_path=request.file_path
        )

    except HTTPException:
        raise
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read prompt file: {str(e)}"
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
        # Validate and normalize project path
        project_path = Path(request.project_path).resolve()

        # Construct full file path
        prompt_file = project_path / request.file_path

        # Validate file exists
        if not prompt_file.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Prompt file not found: {request.file_path}"
            )

        # Write content to file
        with open(prompt_file, 'w', encoding='utf-8') as f:
            f.write(request.content)

        return PromptSaveResponse(
            success=True,
            file_path=request.file_path,
            message=f"Prompt file saved: {request.file_path}"
        )

    except HTTPException:
        raise
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save prompt file: {str(e)}"
        )


@router.get("/filesystem/list", response_model=DirectoryListResponse)
async def list_directory(path: str = Query("/", description="Directory path to list")) -> DirectoryListResponse:
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
                detail=f"Path does not exist: {path}"
            )

        if not current_path.is_dir():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Path is not a directory: {path}"
            )

        # Get parent path
        parent_path = str(current_path.parent) if current_path != current_path.parent else None

        # List directory contents
        entries = []
        try:
            for item in sorted(current_path.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower())):
                # Skip hidden files/directories (starting with .)
                if item.name.startswith("."):
                    continue

                entries.append(DirectoryEntry(
                    name=item.name,
                    path=str(item),
                    is_directory=item.is_dir()
                ))
        except PermissionError:
            # If we can't read the directory, return empty list
            pass

        return DirectoryListResponse(
            current_path=str(current_path),
            parent_path=parent_path,
            entries=entries
        )

    except HTTPException:
        raise
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list directory: {str(e)}"
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
                detail=f"Parent directory does not exist: {request.path}"
            )

        if not parent_dir.is_dir():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Path is not a directory: {request.path}"
            )

        # Sanitize directory name to prevent path traversal
        import re
        safe_name = request.name.strip()

        # Check for invalid characters and path traversal attempts
        if not safe_name or safe_name in [".", ".."]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid directory name"
            )

        if "/" in safe_name or "\\" in safe_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Directory name cannot contain path separators"
            )

        # Create the new directory
        new_dir = parent_dir / safe_name

        if new_dir.exists():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Directory '{safe_name}' already exists"
            )

        new_dir.mkdir(parents=False, exist_ok=False)

        return DirectoryCreateResponse(
            success=True,
            created_path=str(new_dir),
            message=f"Directory '{safe_name}' created successfully"
        )

    except HTTPException:
        raise
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create directory: {str(e)}"
        )
