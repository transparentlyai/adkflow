"""Project and tools API routes."""

import json
from pathlib import Path

from fastapi import APIRouter, HTTPException, status, Query
from pydantic import ValidationError

from backend.src.models.workflow import ReactFlowJSON
from backend.src.api.routes.models import (
    ToolInfo,
    ToolsResponse,
    ProjectLoadResponse,
    ProjectSaveRequest,
    ProjectSaveResponse,
)

router = APIRouter()


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
