# Tab System

Multi-tab workflow support in ADKFlow.

## Overview

The tab system allows multiple workflows within a single project:
- Each tab has its own canvas and workflow
- Tabs share project resources (prompts, contexts, tools)
- All tabs, nodes, and edges stored in a single `manifest.json` file
- Each node references its tab via `data.tabId`

## Architecture (v3.0)

```
Project
└── manifest.json (tabs, nodes, edges, settings)
```

### manifest.json Structure

```json
{
  "version": "3.0",
  "name": "My Workflow",
  "tabs": [
    { "id": "tab_abc123", "name": "Main", "order": 0, "viewport": { "x": 0, "y": 0, "zoom": 1 } },
    { "id": "tab_def456", "name": "Helpers", "order": 1, "viewport": { "x": 100, "y": 50, "zoom": 0.8 } }
  ],
  "nodes": [
    { "id": "node1", "type": "agent", "data": { "tabId": "tab_abc123", "config": {...} }, ... },
    { "id": "node2", "type": "prompt", "data": { "tabId": "tab_abc123", "config": {...} }, ... }
  ],
  "edges": [
    { "id": "e1", "source": "node1", "target": "node2", ... }
  ],
  "settings": { "defaultModel": "gemini-2.5-flash" }
}
```

## Tab Operations

**Location**: `routes/tab_routes.py`

### List Tabs

```python
@router.get("/project/tabs")
async def list_tabs(project_path: str) -> TabListResponse:
    manifest = load_manifest(project_path)
    return TabListResponse(tabs=manifest.tabs, name=manifest.name)
```

### Create Tab

```python
@router.post("/project/tabs")
async def create_tab(request: TabCreateRequest) -> TabCreateResponse:
    manifest = load_manifest(project_path, create_if_missing=True)

    new_tab = TabMetadata(
        id=generate_tab_id(),
        name=request.name,
        order=len(manifest.tabs),
        viewport=Viewport(),
    )
    manifest.tabs.append(new_tab)
    save_manifest(project_path, manifest)

    return TabCreateResponse(tab=new_tab)
```

### Load Tab

```python
@router.get("/project/tabs/{tab_id}")
async def load_tab(tab_id: str, project_path: str) -> TabLoadResponse:
    manifest = load_manifest(project_path)
    flow = manifest.get_flow_for_tab(tab_id)  # Filters nodes/edges by tabId
    return TabLoadResponse(flow=flow)
```

### Save Tab

```python
@router.put("/project/tabs/{tab_id}")
async def save_tab(tab_id: str, request: TabSaveRequest) -> dict:
    manifest = load_manifest(project_path)
    manifest.update_flow_for_tab(tab_id, request.flow)
    save_manifest(project_path, manifest)
```

### Delete Tab

```python
@router.delete("/project/tabs/{tab_id}")
async def delete_tab(tab_id: str, project_path: str) -> dict:
    manifest = load_manifest(project_path)

    # Remove tab metadata
    manifest.tabs = [t for t in manifest.tabs if t.id != tab_id]

    # Remove nodes with this tabId
    manifest.nodes = [n for n in manifest.nodes if n.data.get("tabId") != tab_id]

    # Remove edges for deleted nodes
    node_ids = {n.id for n in manifest.get_nodes_for_tab(tab_id)}
    manifest.edges = [e for e in manifest.edges
                      if e.source not in node_ids and e.target not in node_ids]

    save_manifest(project_path, manifest)
```

### Duplicate Tab

Copies all nodes/edges with new IDs and updates tabId references.

### Reorder Tabs

Updates the `order` field on each tab metadata entry.

## ProjectManifest Model

**Location**: `models/workflow.py`

```python
class ProjectManifest(BaseModel):
    version: str = "3.0"
    name: str
    tabs: list[TabMetadata]
    nodes: list[ReactFlowNode]
    edges: list[ReactFlowEdge]
    settings: ProjectSettings

    def get_flow_for_tab(self, tab_id: str) -> ReactFlowJSON:
        """Get nodes/edges for a specific tab."""

    def update_flow_for_tab(self, tab_id: str, flow: ReactFlowJSON) -> None:
        """Replace nodes/edges for a tab."""
```

## Tab ID Generation

Tab IDs use timestamp + random suffix for uniqueness:

```python
def generate_tab_id() -> str:
    return f"page_{int(time.time())}_{uuid.uuid4().hex[:8]}"
```

## Frontend Caching

The frontend maintains an in-memory cache (`tabFlowCacheRef`) for tab flows:
- Preserves unsaved changes when switching tabs
- Avoids re-fetching already-loaded tabs
- Cleared on project close

## See Also

- [Project Management](./project-management.md) - Project structure
- [API Reference](./api-reference.md) - Tab endpoints
- [File Operations](./file-operations.md) - Content files
