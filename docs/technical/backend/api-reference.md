# API Reference

Complete REST API documentation for ADKFlow backend.

## Base URL

```
http://localhost:8000/api
```

## Project Endpoints

### GET /tools

List available ADK tools.

**Response**: `200 OK`
```json
{
  "tools": [
    {
      "id": "code_execution",
      "name": "Code Execution",
      "description": "Execute Python code"
    }
  ]
}
```

### GET /project/load

Load a project by path.

**Query Parameters**:
- `path` (required): Project directory path

**Response**: `200 OK`
```json
{
  "name": "my-project",
  "path": "/path/to/project",
  "tabs": [
    {"id": "main", "name": "Main", "order": 0}
  ]
}
```

**Errors**:
- `404`: Project not found

### POST /project/save

Save project workflow (legacy single-tab).

**Request Body**:
```json
{
  "path": "/path/to/project",
  "workflow": {
    "nodes": [...],
    "edges": [...],
    "viewport": {"x": 0, "y": 0, "zoom": 1}
  }
}
```

## Tab Endpoints

### GET /project/tabs

List all tabs in a project.

**Query Parameters**:
- `project_path` (required): Project directory

**Response**: `200 OK`
```json
{
  "tabs": [
    {"id": "main", "name": "Main", "order": 0},
    {"id": "helpers", "name": "Helpers", "order": 1}
  ]
}
```

### POST /project/tabs

Create a new tab.

**Request Body**:
```json
{
  "project_path": "/path/to/project",
  "name": "New Tab"
}
```

**Response**: `201 Created`
```json
{
  "id": "abc123",
  "name": "New Tab",
  "order": 2
}
```

### GET /project/tabs/{tab_id}

Load a tab's workflow.

**Query Parameters**:
- `project_path` (required)

**Response**: `200 OK`
```json
{
  "nodes": [...],
  "edges": [...],
  "viewport": {"x": 0, "y": 0, "zoom": 1}
}
```

### PUT /project/tabs/{tab_id}

Save a tab's workflow.

**Request Body**:
```json
{
  "project_path": "/path/to/project",
  "workflow": {
    "nodes": [...],
    "edges": [...],
    "viewport": {...}
  }
}
```

### DELETE /project/tabs/{tab_id}

Delete a tab.

**Query Parameters**:
- `project_path` (required)

**Response**: `204 No Content`

### PATCH /project/tabs/{tab_id}/rename

Rename a tab.

**Request Body**:
```json
{
  "project_path": "/path/to/project",
  "name": "New Name"
}
```

### POST /project/tabs/{tab_id}/duplicate

Duplicate a tab.

**Request Body**:
```json
{
  "project_path": "/path/to/project"
}
```

**Response**: `201 Created`
```json
{
  "id": "xyz789",
  "name": "Main (Copy)",
  "order": 3
}
```

### PUT /project/tabs/reorder

Reorder tabs.

**Request Body**:
```json
{
  "project_path": "/path/to/project",
  "tab_ids": ["helpers", "main", "utils"]
}
```

## File Endpoints

### POST /project/prompt/create

Create a new prompt file.

**Request Body**:
```json
{
  "project_path": "/path/to/project",
  "filename": "analyze.prompt.md",
  "content": "# Analyze\n\nAnalyze the following: {input}"
}
```

### POST /project/prompt/read

Read a prompt file.

**Request Body**:
```json
{
  "project_path": "/path/to/project",
  "filename": "analyze.prompt.md"
}
```

**Response**: `200 OK`
```json
{
  "content": "# Analyze\n\nAnalyze the following: {input}"
}
```

### POST /project/prompt/save

Save a prompt file.

**Request Body**:
```json
{
  "project_path": "/path/to/project",
  "filename": "analyze.prompt.md",
  "content": "Updated content..."
}
```

### POST /project/context/create

Create a context file.

**Request Body**:
```json
{
  "project_path": "/path/to/project",
  "filename": "config.json",
  "content": "{\"key\": \"value\"}"
}
```

### POST /project/tool/create

Create a Python tool file.

**Request Body**:
```json
{
  "project_path": "/path/to/project",
  "filename": "my_tool.py",
  "content": "def my_tool(arg: str) -> str:\n    return arg.upper()"
}
```

### POST /project/file/chunk

Read a file in chunks (for large files).

**Request Body**:
```json
{
  "path": "/path/to/file.log",
  "offset": 0,
  "limit": 100,
  "reverse": true
}
```

**Response**: `200 OK`
```json
{
  "lines": ["line 1", "line 2", ...],
  "has_more": true,
  "total_lines": 5000
}
```

## Filesystem Endpoints

### GET /filesystem/list

List directory contents.

**Query Parameters**:
- `path` (required): Directory path

**Response**: `200 OK`
```json
{
  "path": "/home/user",
  "parent": "/home",
  "entries": [
    {"name": "projects", "type": "directory"},
    {"name": "config.json", "type": "file"}
  ]
}
```

### POST /filesystem/mkdir

Create a directory.

**Request Body**:
```json
{
  "path": "/path/to/new/directory"
}
```

### POST /filesystem/ensure-dir

Ensure a directory exists (creates if needed).

**Request Body**:
```json
{
  "path": "/path/to/directory"
}
```

## Extension Endpoints

### GET /extensions/nodes

List all custom node schemas.

**Query Parameters**:
- `project_path` (optional): Include project-specific extensions

**Response**: `200 OK`
```json
{
  "nodes": [
    {
      "unit_id": "examples.hello_world",
      "label": "Hello World",
      "scope": "global",
      "menu_location": "Examples/Basic",
      "ui_schema": {...}
    }
  ]
}
```

### GET /extensions/nodes/{unit_id}

Get a specific node schema.

### POST /extensions/reload

Reload extensions.

**Query Parameters**:
- `scope`: `all`, `global`, or `project`
- `project_path` (if scope includes project)

### POST /extensions/init-project

Initialize project extensions.

**Request Body**:
```json
{
  "project_path": "/path/to/project"
}
```

### DELETE /extensions/project

Clear project extensions.

## Execution Endpoints

### POST /execution/run

Start workflow execution.

**Request Body**:
```json
{
  "project_path": "/path/to/project",
  "workflow": {
    "nodes": [...],
    "edges": [...]
  }
}
```

**Response**: `200 OK`
```json
{
  "run_id": "run_abc123"
}
```

### GET /execution/run/{run_id}/events

Stream execution events (SSE).

**Response**: `text/event-stream`
```
data: {"type": "run_started", "run_id": "run_abc123"}

data: {"type": "node_executing", "node_id": "node_1"}

data: {"type": "node_completed", "node_id": "node_1", "output": {...}}

data: {"type": "run_completed", "result": {...}}
```

### GET /execution/run/{run_id}/status

Get run status.

**Response**: `200 OK`
```json
{
  "status": "running",
  "node_states": {
    "node_1": "completed",
    "node_2": "running"
  }
}
```

### POST /execution/run/{run_id}/cancel

Cancel a running workflow.

**Response**: `200 OK`

### POST /execution/run/{run_id}/input

Submit user input during execution.

**Request Body**:
```json
{
  "input_id": "input_xyz",
  "value": "user response"
}
```

### POST /execution/validate

Validate workflow without executing.

**Request Body**:
```json
{
  "workflow": {...}
}
```

**Response**: `200 OK`
```json
{
  "valid": false,
  "errors": [
    {"node_id": "node_1", "message": "Required input not connected"}
  ],
  "warnings": [
    {"node_id": "node_2", "message": "Using default model"}
  ]
}
```

### POST /execution/topology

Get workflow topology.

**Request Body**:
```json
{
  "workflow": {...}
}
```

**Response**: `200 OK`
```json
{
  "mermaid": "graph TD\n  A[Agent] --> B[Output]",
  "ascii": "Agent\n└── Output"
}
```

### GET /execution/runs

List recent runs.

**Response**: `200 OK`
```json
{
  "runs": [
    {"run_id": "run_abc", "status": "completed", "started_at": "..."}
  ]
}
```

## Error Responses

All errors follow this format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

**Common Status Codes**:
- `400`: Bad request (invalid input)
- `404`: Resource not found
- `422`: Validation error (Pydantic)
- `500`: Internal server error

## See Also

- [Backend Overview](./README.md) - Architecture
- [Execution Engine](./execution-engine.md) - Execution details
- [Frontend API Client](../frontend/api-client.md) - Client usage
