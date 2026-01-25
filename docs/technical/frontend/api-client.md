# API Client

Backend communication in ADKFlow.

## Overview

The API client handles all communication with the FastAPI backend:

**Location**: `lib/api/` (modular directory structure)

The API client is split into focused modules:
- `lib/api/client.ts` - Axios configuration
- `lib/api/project.ts` - Project management APIs
- `lib/api/tabs.ts` - Tab management APIs
- `lib/api/execution.ts` - Workflow execution APIs
- `lib/api/filesystem.ts` - File system APIs
- `lib/api/settings.ts` - Settings APIs
- `lib/api/extensions.ts` - Extension APIs
- `lib/api/index.ts` - Re-exports all APIs

## API Object

```typescript
export const api = {
  // Projects
  loadProject,
  saveProject,

  // Tabs
  getTabs,
  createTab,
  loadTab,
  saveTab,
  deleteTab,
  renameTab,
  reorderTabs,
  duplicateTab,

  // Files
  createPrompt,
  readPrompt,
  savePrompt,
  readFileChunk,

  // Filesystem
  listDirectory,
  createDirectory,

  // Extensions
  getExtensionNodes,
  reloadExtensions,

  // Execution
  runWorkflow,
  cancelRun,
  validateWorkflow,
  getTopology,
  submitUserInput,

  // Tools
  getTools,
};
```

## HTTP Client

Uses Axios with base configuration:

```typescript
const client = axios.create({
  baseURL: 'http://localhost:6000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

## Endpoint Categories

### Project Endpoints

| Function | Method | Endpoint | Purpose |
|----------|--------|----------|---------|
| `loadProject` | GET | `/api/project/load` | Load project by path |
| `saveProject` | POST | `/api/project/save` | Save project workflow |
| `getTools` | GET | `/api/tools` | List available ADK tools |

### Tab Endpoints

| Function | Method | Endpoint | Purpose |
|----------|--------|----------|---------|
| `getTabs` | GET | `/api/project/tabs` | List all tabs |
| `createTab` | POST | `/api/project/tabs` | Create new tab |
| `loadTab` | GET | `/api/project/tabs/{id}` | Load tab workflow |
| `saveTab` | PUT | `/api/project/tabs/{id}` | Save tab workflow |
| `deleteTab` | DELETE | `/api/project/tabs/{id}` | Delete tab |
| `renameTab` | PATCH | `/api/project/tabs/{id}/rename` | Rename tab |
| `duplicateTab` | POST | `/api/project/tabs/{id}/duplicate` | Duplicate tab |
| `reorderTabs` | PUT | `/api/project/tabs/reorder` | Reorder tabs |

### File Endpoints

| Function | Method | Endpoint | Purpose |
|----------|--------|----------|---------|
| `createPrompt` | POST | `/api/project/prompt/create` | Create prompt file |
| `readPrompt` | POST | `/api/project/prompt/read` | Read prompt content |
| `savePrompt` | POST | `/api/project/prompt/save` | Save prompt content |
| `readFileChunk` | POST | `/api/project/file/chunk` | Read file in chunks |

### Filesystem Endpoints

| Function | Method | Endpoint | Purpose |
|----------|--------|----------|---------|
| `listDirectory` | GET | `/api/filesystem/list` | List directory contents |
| `createDirectory` | POST | `/api/filesystem/mkdir` | Create directory |

### Extension Endpoints

| Function | Method | Endpoint | Purpose |
|----------|--------|----------|---------|
| `getExtensionNodes` | GET | `/api/extensions/nodes` | List custom nodes |
| `reloadExtensions` | POST | `/api/extensions/reload` | Reload extensions |

### Execution Endpoints

| Function | Method | Endpoint | Purpose |
|----------|--------|----------|---------|
| `runWorkflow` | POST | `/api/execution/run` | Start workflow |
| `cancelRun` | POST | `/api/execution/run/{id}/cancel` | Cancel run |
| `validateWorkflow` | POST | `/api/execution/validate` | Validate workflow |
| `getTopology` | POST | `/api/execution/topology` | Get workflow topology |
| `submitUserInput` | POST | `/api/execution/run/{id}/input` | Submit user input |

## SSE Streaming

Execution events are streamed via SSE:

```typescript
export function subscribeToRunEvents(
  runId: string,
  onEvent: (event: RunEvent) => void
): () => void {
  const eventSource = new EventSource(
    `http://localhost:6000/api/execution/run/${runId}/events`
  );

  eventSource.onmessage = (e) => {
    const event = JSON.parse(e.data);
    onEvent(event);
  };

  // Return cleanup function
  return () => eventSource.close();
}
```

### Event Types

```typescript
type RunEvent =
  | { type: 'run_started'; run_id: string }
  | { type: 'node_executing'; node_id: string }
  | { type: 'node_completed'; node_id: string; output: any }
  | { type: 'node_error'; node_id: string; error: string }
  | { type: 'user_input_required'; prompt: string; input_id: string }
  | { type: 'run_completed'; result: any }
  | { type: 'run_error'; error: string };
```

## Error Handling

### Response Errors

```typescript
async function loadProject(path: string) {
  try {
    const response = await client.get('/api/project/load', {
      params: { path },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.detail || 'Failed to load project');
    }
    throw error;
  }
}
```

### Network Errors

```typescript
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      // Network error
      console.error('Network error:', error.message);
    }
    return Promise.reject(error);
  }
);
```

## Types

### Request/Response Types

```typescript
// lib/types.ts

interface LoadProjectResponse {
  name: string;
  path: string;
  tabs: TabMetadata[];
}

interface SaveTabRequest {
  workflow: ReactFlowJSON;
}

interface RunWorkflowRequest {
  project_path: string;
  workflow: ReactFlowJSON;
}
```

## Usage Examples

### Loading a Project

```typescript
const project = await api.loadProject('/path/to/project');
console.log(project.name, project.tabs);
```

### Running a Workflow

```typescript
// Start execution
const { run_id } = await api.runWorkflow(projectPath, workflow);

// Subscribe to events
const unsubscribe = subscribeToRunEvents(run_id, (event) => {
  switch (event.type) {
    case 'node_executing':
      setNodeState(event.node_id, 'running');
      break;
    case 'node_completed':
      setNodeState(event.node_id, 'completed');
      break;
    case 'run_completed':
      console.log('Done:', event.result);
      break;
  }
});

// Cleanup on unmount
return () => unsubscribe();
```

## See Also

- [Backend API Reference](../backend/api-reference.md) - Endpoint details
- [Execution Engine](../backend/execution-engine.md) - How execution works
- [State Management](./state-management.md) - State integration
