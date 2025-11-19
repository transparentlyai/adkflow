"""API routes for ADKFlow backend."""

import os
from pathlib import Path
from fastapi import APIRouter, HTTPException, status, Query
from pydantic import BaseModel, ValidationError
import yaml

from backend.src.models.workflow import WorkflowModel
from backend.src.services.yaml_converter import to_yaml, from_yaml


router = APIRouter(prefix="/api")


class ValidationResponse(BaseModel):
    """Response model for workflow validation."""

    valid: bool
    errors: list[str] = []


class ExportRequest(BaseModel):
    """Request model for workflow export."""

    workflow: WorkflowModel


class ExportResponse(BaseModel):
    """Response model for workflow export."""

    yaml: str


class ImportRequest(BaseModel):
    """Request model for workflow import."""

    yaml: str


class ImportResponse(BaseModel):
    """Response model for workflow import."""

    workflow: WorkflowModel


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
    workflow: WorkflowModel | None = None
    path: str


class ProjectSaveRequest(BaseModel):
    """Request model for project save."""

    path: str
    workflow: WorkflowModel


class ProjectSaveResponse(BaseModel):
    """Response model for project save."""

    success: bool
    path: str
    message: str


@router.post("/workflows/validate", response_model=ValidationResponse)
async def validate_workflow(workflow: WorkflowModel) -> ValidationResponse:
    """
    Validate a workflow configuration.

    Args:
        workflow: Workflow model to validate

    Returns:
        ValidationResponse with validation results
    """
    try:
        # Pydantic validation happens automatically
        # Additional custom validation can be added here
        errors = []

        # Validate prompt references in subagents
        prompt_ids = {prompt.id for prompt in workflow.prompts}
        for agent in workflow.agents:
            for subagent in agent.subagents:
                if subagent.prompt_ref not in prompt_ids:
                    errors.append(
                        f"Subagent '{subagent.id}' references non-existent prompt '{subagent.prompt_ref}'"
                    )

        # Validate connections reference valid agents
        agent_ids = {agent.id for agent in workflow.agents}
        for conn in workflow.connections:
            from_agent = conn.from_path.split(".")[0]
            to_agent = conn.to_path.split(".")[0]

            if from_agent not in agent_ids:
                errors.append(f"Connection references non-existent source agent '{from_agent}'")
            if to_agent not in agent_ids:
                errors.append(f"Connection references non-existent target agent '{to_agent}'")

        return ValidationResponse(valid=len(errors) == 0, errors=errors)

    except ValidationError as e:
        return ValidationResponse(
            valid=False,
            errors=[str(err) for err in e.errors()]
        )


@router.post("/workflows/export", response_model=ExportResponse)
async def export_workflow(request: ExportRequest) -> ExportResponse:
    """
    Convert workflow to YAML format.

    Args:
        request: Export request containing workflow

    Returns:
        ExportResponse with YAML string

    Raises:
        HTTPException: If conversion fails
    """
    try:
        yaml_str = to_yaml(request.workflow)
        return ExportResponse(yaml=yaml_str)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export workflow: {str(e)}"
        )


@router.post("/workflows/import", response_model=ImportResponse)
async def import_workflow(request: ImportRequest) -> ImportResponse:
    """
    Parse YAML into workflow model.

    Args:
        request: Import request containing YAML string

    Returns:
        ImportResponse with parsed workflow

    Raises:
        HTTPException: If parsing or validation fails
    """
    try:
        workflow = from_yaml(request.yaml)
        return ImportResponse(workflow=workflow)
    except yaml.YAMLError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid YAML format: {str(e)}"
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Validation failed: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to import workflow: {str(e)}"
        )


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
        ProjectLoadResponse with workflow if exists

    Raises:
        HTTPException: If path is invalid or read fails
    """
    try:
        # Validate and normalize path
        project_path = Path(path).resolve()
        workflow_file = project_path / "workflow.yaml"

        # Check if workflow file exists
        if not workflow_file.exists():
            return ProjectLoadResponse(
                exists=False,
                workflow=None,
                path=str(project_path)
            )

        # Read and parse workflow
        try:
            with open(workflow_file, 'r', encoding='utf-8') as f:
                yaml_content = f.read()

            workflow = from_yaml(yaml_content)

            return ProjectLoadResponse(
                exists=True,
                workflow=workflow,
                path=str(project_path)
            )

        except yaml.YAMLError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid YAML in workflow file: {str(e)}"
            )
        except ValidationError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid workflow format: {str(e)}"
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
        request: Project save request with path and workflow

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

        # Convert workflow to YAML
        yaml_content = to_yaml(request.workflow)

        # Write to file
        workflow_file = project_path / "workflow.yaml"
        with open(workflow_file, 'w', encoding='utf-8') as f:
            f.write(yaml_content)

        return ProjectSaveResponse(
            success=True,
            path=str(project_path),
            message=f"Project saved successfully to {workflow_file}"
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
