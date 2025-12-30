"""Tab/Page CRUD API routes.

Tabs are stored as metadata in manifest.json with nodes/edges at the root level.
Each node has data.tabId to indicate which tab it belongs to.
"""

import json
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException, status, Query

from backend.src.models.workflow import (
    ReactFlowEdge,
    ReactFlowNode,
    TabMetadata,
    ProjectManifest,
    Viewport,
)
from backend.src.api.routes.models import (
    TabListResponse,
    TabCreateRequest,
    TabCreateResponse,
    TabLoadResponse,
    TabSaveRequest,
    TabRenameRequest,
    TabReorderRequest,
)
from backend.src.api.routes.helpers import generate_tab_id

router = APIRouter()


# Content fields to strip when file_path is set
# Maps node types to their content field names
FILE_CONTENT_FIELDS = {
    "prompt": "content",
    "context": "content",
    "tool": "code",
    "process": "code",
}


def load_manifest(
    project_path: Path, create_if_missing: bool = False
) -> ProjectManifest:
    """Load manifest.json from project path.

    Args:
        project_path: Path to project directory
        create_if_missing: If True, create an empty manifest if it doesn't exist

    Returns:
        ProjectManifest
    """
    manifest_file = project_path / "manifest.json"

    if not manifest_file.exists():
        if create_if_missing:
            # Create project directory if needed
            project_path.mkdir(parents=True, exist_ok=True)
            # Return empty manifest (will be saved by caller)
            return ProjectManifest(
                name=project_path.name,
                tabs=[],
                nodes=[],
                edges=[],
            )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project manifest not found: {manifest_file}",
        )

    with open(manifest_file, "r", encoding="utf-8") as f:
        manifest_data = json.load(f)

    return ProjectManifest(**manifest_data)


def save_manifest(project_path: Path, manifest: ProjectManifest) -> None:
    """Save manifest.json to project path."""
    manifest_file = project_path / "manifest.json"
    with open(manifest_file, "w", encoding="utf-8") as f:
        json.dump(manifest.model_dump(exclude_none=True), f, indent=2)


def strip_file_content_from_nodes(nodes: list[ReactFlowNode]) -> list[ReactFlowNode]:
    """Strip content/code fields from nodes that have file_path set.

    When a node has a file_path configured, the content should be loaded
    from the file at runtime rather than stored in the project JSON.
    """
    for node in nodes:
        node_type = node.type
        content_field = FILE_CONTENT_FIELDS.get(node_type)

        if not content_field:
            continue

        config = node.data.get("config", {})
        file_path = config.get("file_path", "")
        if file_path and content_field in config:
            del config[content_field]

    return nodes


def populate_file_content_in_nodes(
    nodes: list[ReactFlowNode], project_path: Path
) -> list[ReactFlowNode]:
    """Populate content/code fields from files for nodes that have file_path set."""
    for node in nodes:
        node_type = node.type
        content_field = FILE_CONTENT_FIELDS.get(node_type)

        if not content_field:
            continue

        config = node.data.get("config", {})
        file_path = config.get("file_path", "")
        if not file_path:
            continue

        # Try path as-is first, then with directory prefix
        absolute_path = (project_path / file_path).resolve()

        if not absolute_path.exists():
            if node_type in ("prompt", "context"):
                absolute_path = (project_path / "prompts" / file_path).resolve()
                if not absolute_path.exists():
                    absolute_path = (project_path / "static" / file_path).resolve()
            elif node_type in ("tool", "process"):
                absolute_path = (project_path / "tools" / file_path).resolve()

        if absolute_path.exists():
            try:
                content = absolute_path.read_text(encoding="utf-8")
                config[content_field] = content
            except Exception:
                pass

    return nodes


@router.get("/project/tabs", response_model=TabListResponse)
async def list_tabs(
    path: str = Query(..., description="Project directory path"),
) -> TabListResponse:
    """List all tabs in a project.

    If the project doesn't have a manifest.json yet, returns empty list.
    """
    project_path = Path(path).resolve()
    manifest_file = project_path / "manifest.json"

    if not manifest_file.exists():
        # Return empty list for new projects - caller should create first tab
        return TabListResponse(tabs=[], name=project_path.name)

    manifest = load_manifest(project_path)
    return TabListResponse(tabs=manifest.tabs, name=manifest.name)


@router.post("/project/tabs", response_model=TabCreateResponse)
async def create_tab(request: TabCreateRequest) -> TabCreateResponse:
    """Create a new tab in the project.

    If the project doesn't have a manifest.json yet, one will be created.
    """
    project_path = Path(request.project_path).resolve()
    manifest = load_manifest(project_path, create_if_missing=True)

    # Generate new tab ID
    tab_id = generate_tab_id()

    # Create new tab metadata with default viewport
    order = len(manifest.tabs)
    new_tab = TabMetadata(
        id=tab_id,
        name=request.name,
        order=order,
        viewport=Viewport(),
    )

    # Add tab to manifest
    manifest.tabs.append(new_tab)

    # Save manifest
    save_manifest(project_path, manifest)

    return TabCreateResponse(tab=new_tab)


@router.put("/project/tabs/reorder")
async def reorder_tabs(request: TabReorderRequest) -> dict:
    """Reorder tabs in the project."""
    project_path = Path(request.project_path).resolve()
    manifest = load_manifest(project_path)

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
    save_manifest(project_path, manifest)

    return {"success": True, "message": "Tabs reordered successfully"}


@router.get("/project/tabs/{tab_id}", response_model=TabLoadResponse)
async def load_tab(
    tab_id: str,
    path: str = Query(..., description="Project directory path"),
) -> TabLoadResponse:
    """Load a tab's flow data."""
    project_path = Path(path).resolve()
    manifest = load_manifest(project_path)

    # Check if tab exists
    tab = manifest.get_tab(tab_id)
    if not tab:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tab not found: {tab_id}",
        )

    # Get flow for this tab
    flow = manifest.get_flow_for_tab(tab_id)

    # Populate file content for nodes with file_path
    flow.nodes = populate_file_content_in_nodes(flow.nodes, project_path)

    return TabLoadResponse(flow=flow)


@router.put("/project/tabs/{tab_id}")
async def save_tab(
    tab_id: str,
    request: TabSaveRequest,
) -> dict:
    """Save a tab's flow data."""
    project_path = Path(request.project_path).resolve()
    manifest = load_manifest(project_path)

    # Check if tab exists
    tab = manifest.get_tab(tab_id)
    if not tab:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tab not found: {tab_id}",
        )

    # Strip file content from nodes before saving
    strip_file_content_from_nodes(request.flow.nodes)

    # Update flow for this tab
    manifest.update_flow_for_tab(tab_id, request.flow)

    # Update project name if provided
    if request.project_name is not None:
        manifest.name = request.project_name

    # Save manifest
    save_manifest(project_path, manifest)

    return {"success": True, "message": f"Tab {tab_id} saved successfully"}


@router.delete("/project/tabs/{tab_id}")
async def delete_tab(
    tab_id: str,
    path: str = Query(..., description="Project directory path"),
) -> dict:
    """Delete a tab from the project."""
    project_path = Path(path).resolve()
    manifest = load_manifest(project_path)

    # Check if this is the only tab
    if len(manifest.tabs) <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete the last remaining tab",
        )

    # Find and remove the tab
    tab_index = next((i for i, t in enumerate(manifest.tabs) if t.id == tab_id), None)
    if tab_index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tab not found: {tab_id}",
        )

    manifest.tabs.pop(tab_index)

    # Reorder remaining tabs
    for i, tab in enumerate(manifest.tabs):
        tab.order = i

    # Remove nodes and edges for this tab
    node_ids = {n.id for n in manifest.get_nodes_for_tab(tab_id)}
    manifest.nodes = [n for n in manifest.nodes if n.data.get("tabId") != tab_id]
    manifest.edges = [
        e
        for e in manifest.edges
        if e.source not in node_ids and e.target not in node_ids
    ]

    # Save manifest
    save_manifest(project_path, manifest)

    return {"success": True, "message": f"Tab {tab_id} deleted successfully"}


@router.patch("/project/tabs/{tab_id}/rename")
async def rename_tab(
    tab_id: str,
    request: TabRenameRequest,
) -> dict:
    """Rename a tab."""
    project_path = Path(request.project_path).resolve()
    manifest = load_manifest(project_path)

    # Find and rename the tab
    tab = manifest.get_tab(tab_id)
    if tab is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tab not found: {tab_id}",
        )

    tab.name = request.name

    # Save manifest
    save_manifest(project_path, manifest)

    return {"success": True, "message": f"Tab {tab_id} renamed to '{request.name}'"}


@router.post("/project/tabs/{tab_id}/duplicate", response_model=TabCreateResponse)
async def duplicate_tab(
    tab_id: str,
    path: str = Query(..., description="Project directory path"),
) -> TabCreateResponse:
    """Duplicate an existing tab."""
    project_path = Path(path).resolve()
    manifest = load_manifest(project_path)

    # Find the source tab
    source_tab = manifest.get_tab(tab_id)
    if source_tab is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tab not found: {tab_id}",
        )

    # Generate new tab ID
    new_tab_id = generate_tab_id()

    # Create new tab metadata
    order = len(manifest.tabs)
    new_tab = TabMetadata(
        id=new_tab_id,
        name=f"{source_tab.name} (Copy)",
        order=order,
        viewport=Viewport(
            x=source_tab.viewport.x,
            y=source_tab.viewport.y,
            zoom=source_tab.viewport.zoom,
        ),
    )

    # Copy nodes with new IDs and new tabId
    source_nodes = manifest.get_nodes_for_tab(tab_id)
    source_edges = manifest.get_edges_for_tab(tab_id)

    # Create ID mapping for node duplication
    id_map: dict[str, str] = {}
    new_nodes: list[ReactFlowNode] = []

    for node in source_nodes:
        new_id = f"{node.type}_{uuid.uuid4().hex[:8]}"
        id_map[node.id] = new_id

        # Deep copy the node data and update tabId
        new_data = dict(node.data)
        new_data["tabId"] = new_tab_id

        new_node = ReactFlowNode(
            id=new_id,
            type=node.type,
            position=dict(node.position),
            data=new_data,
            parentId=id_map.get(node.parentId) if node.parentId else None,
            extent=node.extent,
            style=dict(node.style) if node.style else None,
            measured=dict(node.measured) if node.measured else None,
        )
        new_nodes.append(new_node)

    # Copy edges with updated node references
    new_edges: list[ReactFlowEdge] = []
    for edge in source_edges:
        if edge.source in id_map and edge.target in id_map:
            new_edge = ReactFlowEdge(
                id=f"e_{uuid.uuid4().hex[:8]}",
                source=id_map[edge.source],
                target=id_map[edge.target],
                sourceHandle=edge.sourceHandle,
                targetHandle=edge.targetHandle,
                animated=edge.animated,
                style=dict(edge.style) if edge.style else None,
            )
            new_edges.append(new_edge)

    # Add to manifest
    manifest.tabs.append(new_tab)
    manifest.nodes.extend(new_nodes)
    manifest.edges.extend(new_edges)

    # Save manifest
    save_manifest(project_path, manifest)

    return TabCreateResponse(tab=new_tab)
