# Project Management

Project storage and loading in ADKFlow.

## Overview

Projects are stored as directories containing:
- Manifest file (all project data: tabs, nodes, edges)
- Content files (prompts, contexts, tools)
- Optional extensions

## Project Structure

```
my-project/
├── manifest.json          # All project data
├── prompts/               # Prompt files
│   └── analyze.prompt.md
├── static/                # Context files
│   └── config.json
├── tools/                 # Python tools
│   └── custom_tool.py
└── adkflow_extensions/    # Project extensions
    └── my_nodes/
```

## Manifest (v3.0)

**Location**: `manifest.json`

All project data is stored in a single manifest file:

```json
{
  "version": "3.0",
  "name": "my-project",
  "tabs": [
    { "id": "tab_abc123", "name": "Main", "order": 0, "viewport": { "x": 0, "y": 0, "zoom": 1 } },
    { "id": "tab_def456", "name": "Helpers", "order": 1, "viewport": { "x": 100, "y": 50, "zoom": 0.8 } }
  ],
  "nodes": [
    { "id": "node1", "type": "agent", "position": { "x": 100, "y": 100 }, "data": { "tabId": "tab_abc123", "config": {...} } }
  ],
  "edges": [
    { "id": "e1", "source": "node1", "target": "node2" }
  ],
  "settings": {
    "defaultModel": "gemini-2.5-flash"
  }
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | Manifest format version (3.0) |
| `name` | string | Project name |
| `tabs` | array | Tab metadata (id, name, order, viewport) |
| `nodes` | array | All workflow nodes |
| `edges` | array | All workflow connections |
| `settings` | object | Project settings |

### Tab Metadata

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique tab identifier |
| `name` | string | Display name |
| `order` | number | Sort order (0-based) |
| `viewport` | object | Canvas position and zoom |

### Node TabId

Each node has `data.tabId` indicating which tab it belongs to:

```json
{
  "id": "agent_abc123",
  "type": "agent",
  "position": { "x": 100, "y": 100 },
  "data": {
    "tabId": "tab_def456",
    "config": {
      "name": "My Agent",
      "model": "gemini-2.5-flash"
    }
  }
}
```

## Loading Projects

**Location**: `routes/tab_routes.py`

```python
@router.get("/project/tabs")
async def list_tabs(path: str) -> TabListResponse:
    project_path = Path(path)
    manifest = load_manifest(project_path)
    return TabListResponse(tabs=manifest.tabs, name=manifest.name)

@router.get("/project/tabs/{tab_id}")
async def load_tab(tab_id: str, path: str) -> TabLoadResponse:
    manifest = load_manifest(project_path)
    flow = manifest.get_flow_for_tab(tab_id)  # Filter nodes/edges by tabId
    return TabLoadResponse(flow=flow)
```

## Creating Projects

Projects are created on-demand when the first tab is created:

```python
@router.post("/project/tabs")
async def create_tab(request: TabCreateRequest) -> TabCreateResponse:
    project_path = Path(request.project_path)
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

## Saving Workflows

Workflows are saved by updating nodes with matching tabId:

```python
@router.put("/project/tabs/{tab_id}")
async def save_tab(tab_id: str, request: SaveTabRequest) -> dict:
    manifest = load_manifest(project_path)
    manifest.update_flow_for_tab(tab_id, request.flow)
    save_manifest(project_path, manifest)
```

The `update_flow_for_tab` method:
1. Removes old nodes/edges for this tabId
2. Sets tabId on all new nodes
3. Adds new nodes/edges to manifest
4. Updates tab viewport

## Models

**Location**: `models/workflow.py`

```python
class TabMetadata(BaseModel):
    id: str
    name: str
    order: int
    viewport: Viewport

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

## See Also

- [Tab System](./tab-system.md) - Tab management details
- [File Operations](./file-operations.md) - Content files
- [API Reference](./api-reference.md) - Endpoints
