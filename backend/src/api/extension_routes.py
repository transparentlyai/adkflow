"""API routes for custom node extensions."""

from pathlib import Path
from typing import Any, Literal

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel

# Import will be available after the extension module is created
try:
    from adkflow_runner.extensions import (
        get_registry,
        init_registry,
        init_global_extensions,
        init_project_extensions,
        clear_project_extensions,
    )
except ImportError:
    # Fallback for when module isn't installed yet
    get_registry = None
    init_registry = None
    init_global_extensions = None
    init_project_extensions = None
    clear_project_extensions = None


router = APIRouter(prefix="/api/extensions", tags=["extensions"])


class PortSchema(BaseModel):
    id: str
    label: str
    source_type: str
    data_type: str
    accepted_sources: list[str] | None = None
    accepted_types: list[str] | None = None
    required: bool = True
    multiple: bool = False
    tab: str | None = None
    section: str | None = None
    handle_color: str | None = None
    connection_only: bool = True
    widget: str | None = None
    default: Any = None
    placeholder: str | None = None
    options: list[dict[str, str]] | None = None


class FieldSchema(BaseModel):
    id: str
    label: str
    widget: str
    default: Any = None
    options: list[dict[str, str]] | None = None
    min_value: float | None = None
    max_value: float | None = None
    step: float | None = None
    placeholder: str | None = None
    help_text: str | None = None
    show_if: dict[str, Any] | None = None
    tab: str | None = None
    section: str | None = None


class UISchemaResponse(BaseModel):
    inputs: list[PortSchema]
    outputs: list[PortSchema]
    fields: list[FieldSchema]
    color: str
    icon: str | None
    expandable: bool
    default_width: int
    default_height: int


class NodeSchemaResponse(BaseModel):
    unit_id: str
    label: str
    menu_location: str
    description: str
    version: str
    scope: Literal["global", "project"] = "project"
    source_file: str | None = None
    ui: UISchemaResponse


class NodesListResponse(BaseModel):
    nodes: list[NodeSchemaResponse]
    menu_tree: dict[str, Any]
    count: int


class ReloadResponse(BaseModel):
    success: bool
    message: str
    count: int


def get_extensions_path(request: Request) -> Path | None:
    """Get extensions path from request state or default location."""
    # Check if project path is set in request state
    if hasattr(request.state, "project_path") and request.state.project_path:
        return Path(request.state.project_path) / "adkflow_extensions"
    return None


@router.get("/nodes", response_model=NodesListResponse)
async def list_custom_nodes(request: Request):
    """List all available custom node types with schemas and menu tree."""
    if get_registry is None:
        return NodesListResponse(nodes=[], menu_tree={}, count=0)

    registry = get_registry()

    # Initialize if we have a project path and registry is empty
    extensions_path = get_extensions_path(request)
    if extensions_path and extensions_path.exists():
        # Check if we need to discover
        if not registry.get_all_schemas():
            registry.discover(extensions_path)

    schemas = registry.get_all_schemas()
    menu_tree = registry.get_menu_tree()

    return NodesListResponse(
        nodes=schemas,  # type: ignore[arg-type]
        menu_tree=menu_tree,
        count=len(schemas),
    )


@router.get("/nodes/{unit_id}", response_model=NodeSchemaResponse)
async def get_custom_node_schema(unit_id: str):
    """Get schema for a specific custom node type."""
    if get_registry is None:
        raise HTTPException(status_code=503, detail="Extension system not available")

    registry = get_registry()
    schema = registry.get_schema(unit_id)

    if not schema:
        raise HTTPException(status_code=404, detail=f"Node type not found: {unit_id}")

    return schema


@router.post("/reload", response_model=ReloadResponse)
async def reload_extensions(
    request: Request,
    scope: Literal["all", "global", "project"] = Query(default="all"),
):
    """Force reload extensions.

    Args:
        scope: Which extensions to reload - 'all', 'global', or 'project'
    """
    if get_registry is None:
        return ReloadResponse(
            success=False, message="Extension system not available", count=0
        )

    registry = get_registry()

    if scope == "global":
        count = registry.reload_global()
        message = f"Reloaded {count} global extension(s)"
    elif scope == "project":
        count = registry.reload_project()
        message = f"Reloaded {count} project extension(s)"
    else:  # "all"
        count = registry.reload_all()
        message = f"Reloaded {count} extension(s) from all locations"

    return ReloadResponse(success=True, message=message, count=count)


@router.post("/init")
async def init_extensions(request: Request):
    """Initialize extensions from a project path (legacy endpoint)."""
    if init_registry is None:
        raise HTTPException(status_code=503, detail="Extension system not available")

    extensions_path = get_extensions_path(request)

    if not extensions_path:
        raise HTTPException(status_code=400, detail="No project path available")

    if not extensions_path.exists():
        # Create the directory
        extensions_path.mkdir(parents=True, exist_ok=True)

    registry = init_registry(extensions_path, watch=True)

    return {
        "success": True,
        "message": f"Initialized extensions from {extensions_path}",
        "count": len(registry.get_all_schemas()),
        "watching": True,
    }


class InitProjectRequest(BaseModel):
    project_path: str


@router.post("/init-project")
async def init_project(body: InitProjectRequest):
    """Initialize project-level extensions.

    Call this when opening a project to load its custom nodes.
    Project extensions take precedence over global extensions with the same UNIT_ID.
    """
    if init_project_extensions is None:
        raise HTTPException(status_code=503, detail="Extension system not available")

    project_path = Path(body.project_path)
    if not project_path.exists():
        raise HTTPException(
            status_code=404, detail=f"Project path not found: {project_path}"
        )

    extensions_path = project_path / "adkflow_extensions"

    # Create directory if it doesn't exist
    extensions_path.mkdir(parents=True, exist_ok=True)

    registry = init_project_extensions(project_path, watch=True)

    return {
        "success": True,
        "message": f"Initialized project extensions from {extensions_path}",
        "count": len(
            [s for s in registry.get_all_schemas() if s.get("scope") == "project"]
        ),
        "watching": True,
    }


@router.delete("/project")
async def clear_project():
    """Clear project-level extensions.

    Call this when closing a project or switching to a different project.
    This removes project-specific nodes while keeping global nodes.
    """
    if clear_project_extensions is None:
        raise HTTPException(status_code=503, detail="Extension system not available")

    clear_project_extensions()

    return {"success": True, "message": "Cleared project extensions"}
