# Backend Overview

FastAPI backend architecture for ADKFlow.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **FastAPI** | Async web framework |
| **Python 3.11+** | Runtime |
| **Pydantic v2** | Data validation |
| **uvicorn** | ASGI server |
| **sse_starlette** | Server-Sent Events |
| **adkflow-runner** | Workflow execution |

## Directory Structure

```
backend/
├── src/
│   ├── main.py              # FastAPI app entry
│   ├── api/
│   │   ├── routes/
│   │   │   ├── project_routes.py
│   │   │   ├── tab_routes.py
│   │   │   ├── file_routes.py
│   │   │   ├── filesystem_routes.py
│   │   │   └── extension_routes.py
│   │   └── execution_routes.py
│   └── models/
│       └── workflow.py      # Pydantic models
└── pyproject.toml           # Package configuration
```

## Key Modules

| Module | Description | Documentation |
|--------|-------------|---------------|
| **API Routes** | HTTP endpoints | [api-reference.md](./api-reference.md) |
| **Project Management** | Project storage | [project-management.md](./project-management.md) |
| **Tab System** | Multi-tab support | [tab-system.md](./tab-system.md) |
| **File Operations** | File management | [file-operations.md](./file-operations.md) |
| **Execution Engine** | Workflow execution | [execution-engine.md](./execution-engine.md) |
| **Extension System** | Custom nodes | [extension-system.md](./extension-system.md) |

## Application Entry

**Location**: `src/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="ADKFlow API", lifespan=lifespan)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(project_router, prefix="/api")
app.include_router(tab_router, prefix="/api")
app.include_router(file_router, prefix="/api")
app.include_router(filesystem_router, prefix="/api")
app.include_router(extension_router, prefix="/api")
app.include_router(execution_router, prefix="/api")
```

## Lifespan Events

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_global_extensions()
    yield
    # Shutdown
    cleanup()
```

## Request/Response Flow

```
HTTP Request
    ↓
FastAPI Router (matching route)
    ↓
Route Handler (validation via Pydantic)
    ↓
Business Logic (file ops, execution, etc.)
    ↓
Response (JSON or SSE stream)
```

## Running the Backend

### Development

```bash
cd backend
python -m backend.src.main
```

### With uvicorn

```bash
uvicorn backend.src.main:app --reload --host 0.0.0.0 --port 8000
```

### API Documentation

FastAPI auto-generates:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

## Key Patterns

### Async Handlers

All route handlers are async:

```python
@router.get("/project/load")
async def load_project(path: str) -> ProjectResponse:
    # Async file operations
    project = await load_project_from_path(path)
    return ProjectResponse(...)
```

### Pydantic Models

Request/response validation:

```python
class ReactFlowJSON(BaseModel):
    nodes: list[ReactFlowNode]
    edges: list[ReactFlowEdge]
    viewport: Viewport

@router.post("/project/tabs/{tab_id}")
async def save_tab(tab_id: str, workflow: ReactFlowJSON):
    # workflow is validated automatically
    ...
```

### Error Handling

```python
from fastapi import HTTPException

@router.get("/project/load")
async def load_project(path: str):
    if not Path(path).exists():
        raise HTTPException(404, detail="Project not found")
    ...
```

## Dependencies

### adkflow-runner

The execution engine is a separate package:

```
packages/adkflow-runner/
├── src/adkflow_runner/
│   ├── compiler/       # Workflow compilation
│   ├── runner/         # Execution engine
│   ├── extensions/     # FlowUnit API
│   └── callbacks/      # Event callbacks
```

### Installing

```bash
cd backend
uv pip install -e ../packages/adkflow-runner
```

## Security

### Local Development Only

The backend is designed for local development:
- No authentication
- CORS allows all origins
- File access limited to user directories

### Production Considerations

For production deployment:
- Add authentication
- Restrict CORS origins
- Run behind reverse proxy
- Limit file access

## See Also

- [API Reference](./api-reference.md) - All endpoints
- [Execution Engine](./execution-engine.md) - Workflow execution
- [Architecture](../architecture.md) - System overview
