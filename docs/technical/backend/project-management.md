# Project Management

Project storage and loading in ADKFlow.

## Overview

Projects are stored as directories containing:
- Manifest file (metadata)
- Workflow tabs (JSON files)
- Content files (prompts, contexts, tools)

## Project Structure

```
my-project/
├── manifest.json          # Project metadata
├── pages/                 # Workflow tabs
│   ├── main.json
│   └── helpers.json
├── prompts/               # Prompt files
│   └── analyze.prompt.md
├── static/                # Context files
│   └── config.json
├── tools/                 # Python tools
│   └── custom_tool.py
└── adkflow_extensions/    # Project extensions
    └── my_nodes/
```

## Manifest

**Location**: `manifest.json`

```json
{
  "version": "1.0",
  "name": "my-project",
  "tabs": [
    {"id": "main", "name": "Main", "order": 0},
    {"id": "helpers", "name": "Helpers", "order": 1}
  ]
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | Manifest format version |
| `name` | string | Project name |
| `tabs` | array | Tab metadata |

### Tab Metadata

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique tab identifier |
| `name` | string | Display name |
| `order` | number | Sort order |

## Loading Projects

**Location**: `routes/project_routes.py`

```python
@router.get("/project/load")
async def load_project(path: str) -> ProjectResponse:
    project_path = Path(path)

    # Check existence
    if not project_path.exists():
        raise HTTPException(404, "Project not found")

    # Load or create manifest
    manifest_path = project_path / "manifest.json"
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text())
    else:
        manifest = migrate_legacy_project(project_path)

    return ProjectResponse(
        name=manifest["name"],
        path=str(project_path),
        tabs=manifest["tabs"],
    )
```

## Legacy Migration

Older projects used a single `flow.json` file. Migration converts to multi-tab:

```python
def migrate_legacy_project(project_path: Path) -> dict:
    flow_path = project_path / "flow.json"

    if flow_path.exists():
        # Create pages directory
        pages_dir = project_path / "pages"
        pages_dir.mkdir(exist_ok=True)

        # Move flow.json to pages/main.json
        shutil.move(flow_path, pages_dir / "main.json")

    # Create manifest
    manifest = {
        "version": "1.0",
        "name": project_path.name,
        "tabs": [{"id": "main", "name": "Main", "order": 0}],
    }

    (project_path / "manifest.json").write_text(json.dumps(manifest))
    return manifest
```

## Creating Projects

Projects are created by:
1. Creating the project directory
2. Creating subdirectories (pages, prompts, static, tools)
3. Creating manifest.json
4. Creating initial main.json tab

```python
async def create_project(parent_path: str, name: str) -> ProjectResponse:
    project_path = Path(parent_path) / name

    # Create structure
    project_path.mkdir()
    (project_path / "pages").mkdir()
    (project_path / "prompts").mkdir()
    (project_path / "static").mkdir()
    (project_path / "tools").mkdir()

    # Create manifest
    manifest = {
        "version": "1.0",
        "name": name,
        "tabs": [{"id": "main", "name": "Main", "order": 0}],
    }
    (project_path / "manifest.json").write_text(json.dumps(manifest))

    # Create empty main tab
    empty_workflow = {"nodes": [], "edges": [], "viewport": {"x": 0, "y": 0, "zoom": 1}}
    (project_path / "pages" / "main.json").write_text(json.dumps(empty_workflow))

    return ProjectResponse(...)
```

## Saving Workflows

Workflows are saved per-tab:

```python
@router.put("/project/tabs/{tab_id}")
async def save_tab(
    tab_id: str,
    request: SaveTabRequest,
) -> None:
    project_path = Path(request.project_path)
    tab_path = project_path / "pages" / f"{tab_id}.json"

    workflow_json = request.workflow.model_dump()
    tab_path.write_text(json.dumps(workflow_json, indent=2))
```

## Workflow Format

**Location**: `pages/{tab_id}.json`

```json
{
  "nodes": [
    {
      "id": "node_1",
      "type": "customNode",
      "position": {"x": 100, "y": 100},
      "data": {
        "label": "My Agent",
        "type": "LlmAgent",
        "config": {
          "model": "gemini-2.0-flash-exp"
        }
      }
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "source": "node_1",
      "sourceHandle": "output",
      "target": "node_2",
      "targetHandle": "input"
    }
  ],
  "viewport": {
    "x": 0,
    "y": 0,
    "zoom": 1
  }
}
```

## Models

**Location**: `models/workflow.py`

```python
class ReactFlowNode(BaseModel):
    id: str
    type: str
    position: Position
    data: dict
    width: int | None = None
    height: int | None = None
    selected: bool = False
    dragging: bool = False

class ReactFlowEdge(BaseModel):
    id: str
    source: str
    sourceHandle: str | None = None
    target: str
    targetHandle: str | None = None

class Viewport(BaseModel):
    x: float
    y: float
    zoom: float

class ReactFlowJSON(BaseModel):
    nodes: list[ReactFlowNode]
    edges: list[ReactFlowEdge]
    viewport: Viewport
```

## See Also

- [Tab System](./tab-system.md) - Tab management
- [File Operations](./file-operations.md) - Content files
- [API Reference](./api-reference.md) - Endpoints
