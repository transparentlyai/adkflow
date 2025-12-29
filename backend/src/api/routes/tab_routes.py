"""Tab/Page CRUD API routes."""

import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, status, Query

from backend.src.models.workflow import (
    ReactFlowJSON,
    TabMetadata,
    ProjectManifest,
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
from backend.src.api.routes.helpers import generate_tab_id, get_default_flow

router = APIRouter()


# Content fields to strip when file_path is set
# Maps node types to their content field names
FILE_CONTENT_FIELDS = {
    "prompt": "content",
    "context": "content",
    "tool": "code",
    "process": "code",
}


def strip_file_content_from_nodes(flow_data: dict[str, Any]) -> dict[str, Any]:
    """
    Strip content/code fields from nodes that have file_path set.

    When a node has a file_path configured, the content should be loaded
    from the file at runtime rather than stored in the project JSON.
    This prevents data duplication and ensures the file is the source of truth.

    Args:
        flow_data: The flow data dictionary containing nodes and edges.

    Returns:
        Modified flow data with content stripped from file-associated nodes.
    """
    if "nodes" not in flow_data:
        return flow_data

    for node in flow_data["nodes"]:
        node_type = node.get("type", "")
        content_field = FILE_CONTENT_FIELDS.get(node_type)

        if not content_field:
            continue

        # Get config from node data
        data = node.get("data", {})
        config = data.get("config", {})

        # If file_path is set and non-empty, remove the content field
        file_path = config.get("file_path", "")
        if file_path and content_field in config:
            del config[content_field]

    return flow_data


def populate_file_content_in_nodes(
    flow_data: dict[str, Any], project_path: Path
) -> dict[str, Any]:
    """
    Populate content/code fields from files for nodes that have file_path set.

    When loading a tab, nodes with file_path need their content loaded from disk
    so that the UI can display function signatures and other content-dependent features.

    Args:
        flow_data: The flow data dictionary containing nodes and edges.
        project_path: The project root directory path.

    Returns:
        Modified flow data with content populated from files.
    """
    if "nodes" not in flow_data:
        return flow_data

    for node in flow_data["nodes"]:
        node_type = node.get("type", "")
        content_field = FILE_CONTENT_FIELDS.get(node_type)

        if not content_field:
            continue

        # Get config from node data
        data = node.get("data", {})
        config = data.get("config", {})

        # If file_path is set, load content from file
        file_path = config.get("file_path", "")
        if not file_path:
            continue

        # file_path may already include the directory (e.g., "prompts/file.prompt.md")
        # or just the filename. Try the path as-is first, then with directory prefix.
        full_path = (project_path / file_path).resolve()

        if not full_path.exists():
            # Try with directory prefix based on node type
            if node_type in ("prompt", "context"):
                # Try prompts/ first, then static/
                full_path = (project_path / "prompts" / file_path).resolve()
                if not full_path.exists():
                    full_path = (project_path / "static" / file_path).resolve()
            elif node_type in ("tool", "process"):
                full_path = (project_path / "tools" / file_path).resolve()

        # Read content from file if it exists
        if full_path.exists():
            try:
                content = full_path.read_text(encoding="utf-8")
                config[content_field] = content
            except Exception:
                # If file can't be read, leave content empty
                pass

    return flow_data


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

        # Populate file content for nodes with file_path
        flow_data = populate_file_content_in_nodes(flow_data, project_path)

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

        # Write flow data, stripping file content from nodes with file_path
        flow_json = request.flow.model_dump(exclude_none=True)
        flow_json = strip_file_content_from_nodes(flow_json)
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
