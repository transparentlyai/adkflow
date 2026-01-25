# Architecture Overview

High-level system design of ADKFlow.

## System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Next.js Frontend (React)                   ││
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌──────────┐   ││
│  │  │ Canvas  │  │ Nodes   │  │ Dialogs │  │ Run Panel│   ││
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬─────┘   ││
│  │       │            │            │            │          ││
│  │  ┌────┴────────────┴────────────┴────────────┴─────┐   ││
│  │  │           State Management (Contexts)            │   ││
│  │  └──────────────────────┬───────────────────────────┘   ││
│  │                         │                                ││
│  │  ┌──────────────────────┴───────────────────────────┐   ││
│  │  │              API Client (axios)                   │   ││
│  │  └──────────────────────┬───────────────────────────┘   ││
│  └─────────────────────────┼───────────────────────────────┘│
└─────────────────────────────┼───────────────────────────────┘
                              │ HTTP/SSE
┌─────────────────────────────┼───────────────────────────────┐
│  ┌──────────────────────────┴───────────────────────────┐   │
│  │              FastAPI Backend (Python)                 │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌──────────┐ │   │
│  │  │ Project │  │  File   │  │ Execute │  │Extension │ │   │
│  │  │ Routes  │  │ Routes  │  │ Routes  │  │ Routes   │ │   │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬─────┘ │   │
│  │       │            │            │            │        │   │
│  │  ┌────┴────────────┴────────────┴────────────┴─────┐ │   │
│  │  │              adkflow-runner Package              │ │   │
│  │  └──────────────────────┬───────────────────────────┘ │   │
│  └─────────────────────────┼────────────────────────────────┘│
└─────────────────────────────┼───────────────────────────────┘
                              │
┌─────────────────────────────┼───────────────────────────────┐
│  ┌──────────────────────────┴───────────────────────────┐   │
│  │                    File System                        │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────────────────┐   │   │
│  │  │ Project │  │ Global  │  │ Extensions          │   │   │
│  │  │ Files   │  │ Config  │  │ (~/.adkflow/)       │   │   │
│  │  └─────────┘  └─────────┘  └─────────────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. User Interaction

```
User Action → React Component → Context Update → Re-render
```

### 2. API Communication

```
Frontend State → API Client → HTTP Request → Backend Route → Response → State Update
```

### 3. Workflow Execution

```
Run Command → Compile Workflow → Execute Nodes → SSE Events → Update UI
```

## Key Patterns

### Schema-Driven UI

The frontend dynamically renders nodes based on schemas from the backend:

1. **Backend** defines node schemas (inputs, outputs, fields)
2. **Extension system** loads custom nodes with their schemas
3. **Frontend** requests schemas via API
4. **Node components** render based on schema configuration

This allows custom nodes to have full UI support without frontend code changes.

### Hook Composition

Complex state logic is split into specialized hooks:

```
useHomeState (orchestrator)
├── useProjectManagement
├── useTabHandlers
├── useDialogHandlers
└── useRunWorkflow

useCanvasSetup (orchestrator)
├── useCanvasState (core state)
├── useCanvasHistory
├── useConnectionHandlers
├── useDeleteHandlers
├── useClipboardOperations
├── useNodeCreation
├── useContextMenu
└── useValidation
```

### SSE Streaming

Real-time execution updates use Server-Sent Events:

1. Frontend initiates execution
2. Backend returns a run ID
3. Frontend opens SSE connection to event stream
4. Backend emits events as nodes execute
5. Frontend updates node states in real-time

## Component Relationships

### Frontend Layers

| Layer | Purpose | Location |
|-------|---------|----------|
| **Pages** | Entry points, layout | `/app/` |
| **Components** | UI elements, nodes | `/components/` |
| **Contexts** | Global state | `/contexts/` |
| **Hooks** | Reusable logic | `/hooks/` |
| **Lib** | Utilities, API | `/lib/` |

### Backend Layers

| Layer | Purpose | Location |
|-------|---------|----------|
| **Routes** | HTTP endpoints | `/api/routes/` |
| **Models** | Data structures | `/models/` |
| **Runner** | Execution engine | `/packages/adkflow-runner/` |
| **Extensions** | Custom nodes | `/extensions/` |

## Key Files

### Frontend Entry Points

| File | Purpose |
|------|---------|
| `app/page.tsx` | Main page component |
| `app/layout.tsx` | Root layout with providers |
| `components/ReactFlowCanvas.tsx` | Canvas component |

### Backend Entry Points

| File | Purpose |
|------|---------|
| `main.py` | FastAPI app initialization |
| `api/routes/*.py` | API endpoint definitions |
| `api/execution_routes.py` | Workflow execution endpoints |
| `api/run_manager.py` | Run lifecycle management |

### Shared Types

| File | Purpose |
|------|---------|
| `frontend/lib/types.ts` | TypeScript types |
| `backend/models/workflow.py` | Pydantic models |

## Extension Points

### Custom Nodes

Extensions are loaded from:
- `~/.adkflow/adkflow_extensions/` (global)
- `{project}/adkflow_extensions/` (project)

### Theming

Themes are loaded from:
- Built-in themes in `/lib/themes/`
- Custom themes (planned)

### Tools

Agent tools can be added via:
- Python files in project `tools/` folder
- Built-in ADK tools

## Security Model

### Frontend

- Runs in browser sandbox
- No direct file system access
- Communicates only with local backend

### Backend

- Runs on localhost only (dev mode)
- File access limited to project directories
- No authentication (local development tool)

## Performance Considerations

### Frontend

- React virtualization for large node counts
- Collapsed nodes reduce render complexity
- Debounced state updates

### Backend

- Async request handling (FastAPI)
- Streaming responses for execution
- Extension caching

## See Also

- [Frontend Overview](./frontend/README.md) - Frontend architecture details
- [Backend Overview](./backend/README.md) - Backend architecture details
- [Extensions](./extensions/README.md) - Extension system
