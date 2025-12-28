# Extension System

Custom node discovery and loading in ADKFlow.

## Overview

The extension system enables custom nodes via:
- Global extensions (`~/.adkflow/adkflow_extensions/`)
- Project extensions (`{project}/adkflow_extensions/`)
- Dynamic schema discovery
- Hot-reload support

## Architecture

```
Extension Locations
├── ~/.adkflow/adkflow_extensions/     (global)
│   └── my_extension/
│       ├── __init__.py
│       └── nodes.py
└── {project}/adkflow_extensions/      (project)
    └── project_nodes/
        ├── __init__.py
        └── nodes.py

                    ↓

ExtensionRegistry
├── discover() → Find FlowUnit classes
├── generate_schema() → Create UI schemas
└── get_nodes() → Return node definitions

                    ↓

Frontend (via API)
└── Render nodes based on schemas
```

## Extension Registry

**Location**: `adkflow_runner/extensions/discovery.py`

```python
class ExtensionRegistry:
    def __init__(self):
        self.global_nodes: dict[str, NodeSchema] = {}
        self.project_nodes: dict[str, NodeSchema] = {}

    def init_global(self) -> None:
        """Load global extensions on startup."""
        self.global_nodes = self._discover(GLOBAL_EXTENSIONS_PATH, "global")

    def init_project(self, project_path: Path) -> None:
        """Load project extensions when project opens."""
        ext_path = project_path / "adkflow_extensions"
        self.project_nodes = self._discover(ext_path, "project")

    def clear_project(self) -> None:
        """Clear project extensions when closing."""
        self.project_nodes = {}

    def get_all_nodes(self) -> list[NodeSchema]:
        """Get all nodes, project overrides global."""
        merged = {**self.global_nodes, **self.project_nodes}
        return list(merged.values())
```

## Discovery Process

```python
def _discover(self, path: Path, scope: str) -> dict[str, NodeSchema]:
    if not path.exists():
        return {}

    nodes = {}

    # Find all packages
    for package_dir in path.iterdir():
        if not package_dir.is_dir():
            continue
        if not (package_dir / "__init__.py").exists():
            continue

        # Import package
        spec = importlib.util.spec_from_file_location(
            package_dir.name,
            package_dir / "__init__.py",
        )
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

        # Find FlowUnit subclasses
        for name in dir(module):
            obj = getattr(module, name)
            if (
                isinstance(obj, type)
                and issubclass(obj, FlowUnit)
                and obj is not FlowUnit
            ):
                schema = self._generate_schema(obj, scope)
                nodes[schema.unit_id] = schema

    return nodes
```

## Schema Generation

```python
def _generate_schema(self, cls: type[FlowUnit], scope: str) -> NodeSchema:
    ui_schema = cls.setup_interface()

    return NodeSchema(
        unit_id=cls.UNIT_ID,
        label=cls.UI_LABEL,
        description=cls.DESCRIPTION,
        version=cls.VERSION,
        menu_location=cls.MENU_LOCATION,
        scope=scope,
        ui_schema=UISchemaDict(
            inputs=[port.to_dict() for port in ui_schema.inputs],
            outputs=[port.to_dict() for port in ui_schema.outputs],
            fields=[field.to_dict() for field in ui_schema.fields],
            color=ui_schema.color,
            icon=ui_schema.icon,
            layout=ui_schema.layout.value if ui_schema.layout else None,
            expandable=ui_schema.expandable,
            default_width=ui_schema.default_width,
            default_height=ui_schema.default_height,
            theme_key=ui_schema.theme_key,
            collapsed_display=ui_schema.collapsed_display,
            handle_layout=ui_schema.handle_layout,
        ),
    )
```

## API Endpoints

**Location**: `api/routes/extension_routes.py`

### List Nodes

```python
@router.get("/extensions/nodes")
async def list_nodes(project_path: str | None = None) -> NodeListResponse:
    if project_path:
        registry.init_project(Path(project_path))

    return NodeListResponse(nodes=registry.get_all_nodes())
```

### Get Node Schema

```python
@router.get("/extensions/nodes/{unit_id}")
async def get_node(unit_id: str) -> NodeSchema:
    nodes = registry.get_all_nodes()
    for node in nodes:
        if node.unit_id == unit_id:
            return node
    raise HTTPException(404, "Node not found")
```

### Reload Extensions

```python
@router.post("/extensions/reload")
async def reload_extensions(
    scope: str = "all",
    project_path: str | None = None,
) -> None:
    if scope in ("all", "global"):
        registry.init_global()

    if scope in ("all", "project") and project_path:
        registry.init_project(Path(project_path))
```

### Initialize Project

```python
@router.post("/extensions/init-project")
async def init_project(request: InitProjectRequest) -> None:
    registry.init_project(Path(request.project_path))
```

### Clear Project

```python
@router.delete("/extensions/project")
async def clear_project() -> None:
    registry.clear_project()
```

## Menu Tree Generation

Extensions specify menu location:

```python
class MyNode(FlowUnit):
    MENU_LOCATION = "Custom/Category/Subcategory"
```

The frontend builds a menu tree:

```json
{
  "Custom": {
    "Category": {
      "Subcategory": {
        "nodes": ["my_node"]
      }
    }
  }
}
```

## Scope Precedence

When the same `UNIT_ID` exists in both scopes:

1. Project scope takes precedence
2. Global node is hidden
3. Allows project-specific overrides

## Hot Reload

### File Watching

The registry can watch for file changes:

```python
class FileWatcher:
    def __init__(self, registry: ExtensionRegistry):
        self.registry = registry
        self.observer = Observer()

    def watch_global(self) -> None:
        self.observer.schedule(
            ReloadHandler(self.registry, "global"),
            str(GLOBAL_EXTENSIONS_PATH),
            recursive=True,
        )
        self.observer.start()

class ReloadHandler(FileSystemEventHandler):
    def on_modified(self, event):
        if event.src_path.endswith(".py"):
            self.registry.reload(self.scope)
```

### Manual Reload

Extensions can be reloaded via API:

```bash
curl -X POST "http://localhost:8000/api/extensions/reload?scope=all"
```

## Error Handling

### Import Errors

```python
try:
    spec.loader.exec_module(module)
except Exception as e:
    logger.error(f"Failed to load extension {package_dir.name}: {e}")
    continue  # Skip this extension
```

### Missing Attributes

```python
if not hasattr(cls, "UNIT_ID"):
    logger.warning(f"FlowUnit {cls.__name__} missing UNIT_ID")
    continue
```

## See Also

- [Extensions Overview](../extensions/README.md) - Creating extensions
- [FlowUnit API](../extensions/flowunit-api.md) - Base class
- [API Reference](./api-reference.md) - Extension endpoints
