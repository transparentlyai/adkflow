# Tab System

Multi-tab workflow support in ADKFlow.

## Overview

The tab system allows multiple workflows within a single project:
- Each tab has its own canvas and workflow
- Tabs share project resources (prompts, contexts, tools)
- Tab metadata is stored in manifest.json
- Tab workflows are stored in pages/

## Architecture

```
Project
├── manifest.json (tab metadata)
└── pages/
    ├── {tab_id_1}.json (workflow)
    ├── {tab_id_2}.json (workflow)
    └── {tab_id_3}.json (workflow)
```

## Tab Operations

**Location**: `routes/tab_routes.py`

### List Tabs

```python
@router.get("/project/tabs")
async def list_tabs(project_path: str) -> TabListResponse:
    manifest = load_manifest(project_path)
    return TabListResponse(tabs=manifest["tabs"])
```

### Create Tab

```python
@router.post("/project/tabs")
async def create_tab(request: CreateTabRequest) -> TabMetadata:
    project_path = Path(request.project_path)

    # Generate unique ID
    tab_id = str(uuid.uuid4())[:8]

    # Determine order
    manifest = load_manifest(project_path)
    order = max((t["order"] for t in manifest["tabs"]), default=-1) + 1

    # Add to manifest
    new_tab = {
        "id": tab_id,
        "name": request.name or f"Tab {order + 1}",
        "order": order,
    }
    manifest["tabs"].append(new_tab)
    save_manifest(project_path, manifest)

    # Create empty workflow
    empty_workflow = {"nodes": [], "edges": [], "viewport": {"x": 0, "y": 0, "zoom": 1}}
    (project_path / "pages" / f"{tab_id}.json").write_text(
        json.dumps(empty_workflow)
    )

    return TabMetadata(**new_tab)
```

### Load Tab

```python
@router.get("/project/tabs/{tab_id}")
async def load_tab(tab_id: str, project_path: str) -> ReactFlowJSON:
    tab_path = Path(project_path) / "pages" / f"{tab_id}.json"

    if not tab_path.exists():
        raise HTTPException(404, "Tab not found")

    workflow = json.loads(tab_path.read_text())
    return ReactFlowJSON(**workflow)
```

### Save Tab

```python
@router.put("/project/tabs/{tab_id}")
async def save_tab(tab_id: str, request: SaveTabRequest) -> None:
    project_path = Path(request.project_path)
    tab_path = project_path / "pages" / f"{tab_id}.json"

    workflow_json = request.workflow.model_dump()
    tab_path.write_text(json.dumps(workflow_json, indent=2))
```

### Delete Tab

```python
@router.delete("/project/tabs/{tab_id}")
async def delete_tab(tab_id: str, project_path: str) -> None:
    project_path = Path(project_path)

    # Remove from manifest
    manifest = load_manifest(project_path)
    manifest["tabs"] = [t for t in manifest["tabs"] if t["id"] != tab_id]

    # Prevent deleting last tab
    if len(manifest["tabs"]) == 0:
        raise HTTPException(400, "Cannot delete last tab")

    save_manifest(project_path, manifest)

    # Delete workflow file
    tab_path = project_path / "pages" / f"{tab_id}.json"
    if tab_path.exists():
        tab_path.unlink()
```

### Rename Tab

```python
@router.patch("/project/tabs/{tab_id}/rename")
async def rename_tab(tab_id: str, request: RenameTabRequest) -> None:
    project_path = Path(request.project_path)
    manifest = load_manifest(project_path)

    for tab in manifest["tabs"]:
        if tab["id"] == tab_id:
            tab["name"] = request.name
            break
    else:
        raise HTTPException(404, "Tab not found")

    save_manifest(project_path, manifest)
```

### Duplicate Tab

```python
@router.post("/project/tabs/{tab_id}/duplicate")
async def duplicate_tab(tab_id: str, request: DuplicateTabRequest) -> TabMetadata:
    project_path = Path(request.project_path)

    # Load source tab
    source_path = project_path / "pages" / f"{tab_id}.json"
    workflow = json.loads(source_path.read_text())

    # Find source name
    manifest = load_manifest(project_path)
    source_tab = next((t for t in manifest["tabs"] if t["id"] == tab_id), None)
    source_name = source_tab["name"] if source_tab else "Tab"

    # Create new tab with copied workflow
    new_id = str(uuid.uuid4())[:8]
    new_name = f"{source_name} (Copy)"
    order = max((t["order"] for t in manifest["tabs"]), default=-1) + 1

    new_tab = {"id": new_id, "name": new_name, "order": order}
    manifest["tabs"].append(new_tab)
    save_manifest(project_path, manifest)

    # Copy workflow
    (project_path / "pages" / f"{new_id}.json").write_text(
        json.dumps(workflow, indent=2)
    )

    return TabMetadata(**new_tab)
```

### Reorder Tabs

```python
@router.put("/project/tabs/reorder")
async def reorder_tabs(request: ReorderTabsRequest) -> None:
    project_path = Path(request.project_path)
    manifest = load_manifest(project_path)

    # Create order mapping
    order_map = {tab_id: idx for idx, tab_id in enumerate(request.tab_ids)}

    # Update orders
    for tab in manifest["tabs"]:
        if tab["id"] in order_map:
            tab["order"] = order_map[tab["id"]]

    # Sort by order
    manifest["tabs"].sort(key=lambda t: t["order"])

    save_manifest(project_path, manifest)
```

## Tab ID Generation

Tab IDs are short UUIDs for filesystem compatibility:

```python
def generate_tab_id() -> str:
    return str(uuid.uuid4())[:8]  # e.g., "a1b2c3d4"
```

## Legacy Support

Projects with only `flow.json` are automatically migrated:

```python
def ensure_tabs_structure(project_path: Path) -> dict:
    manifest_path = project_path / "manifest.json"
    flow_path = project_path / "flow.json"
    pages_dir = project_path / "pages"

    if manifest_path.exists():
        return json.loads(manifest_path.read_text())

    # Migrate legacy
    pages_dir.mkdir(exist_ok=True)

    if flow_path.exists():
        shutil.move(flow_path, pages_dir / "main.json")

    manifest = {
        "version": "1.0",
        "name": project_path.name,
        "tabs": [{"id": "main", "name": "Main", "order": 0}],
    }

    manifest_path.write_text(json.dumps(manifest, indent=2))
    return manifest
```

## See Also

- [Project Management](./project-management.md) - Project structure
- [API Reference](./api-reference.md) - Tab endpoints
- [File Operations](./file-operations.md) - Content files
