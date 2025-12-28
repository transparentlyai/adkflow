# Hooks Architecture

Hook composition patterns in ADKFlow.

## Overview

ADKFlow uses a layered hook architecture:

1. **Primitive hooks** - Single-purpose utilities
2. **Composite hooks** - Combine primitives for specific features
3. **Orchestrator hooks** - Coordinate multiple composites

```
useHomeState (orchestrator)
├── useProjectManagement (composite)
│   ├── useProjectCreate (primitive)
│   └── useProjectLoad (primitive)
├── useTabHandlers (composite)
│   ├── useTabNavigation (primitive)
│   └── useDuplicateNameValidation (primitive)
└── useRunWorkflow (composite)
    ├── useWorkflowValidation (primitive)
    └── useWorkflowExecution (primitive)
```

## Home-Level Hooks

Located in `hooks/home/`:

### useHomeState

Master orchestrator for the home page.

```typescript
export function useHomeState() {
  // Compose child hooks
  const project = useProjectManagement();
  const tabs = useTabHandlers();
  const dialogs = useDialogHandlers();
  const run = useRunWorkflow();

  return {
    // Expose unified interface
    ...project,
    ...tabs,
    ...dialogs,
    ...run,
  };
}
```

### useProjectManagement

Project lifecycle operations.

```typescript
export function useProjectManagement() {
  const create = useProjectCreate();
  const load = useProjectLoad();

  return {
    createProject: create.createProject,
    loadProject: load.loadProject,
    switchProject: load.switchProject,
    // ...
  };
}
```

### useTabHandlers

Tab operations and state.

```typescript
export function useTabHandlers() {
  const { tabs, activeTabId } = useTabs();
  const navigation = useTabNavigation();

  return {
    createTab: navigation.createTab,
    renameTab: navigation.renameTab,
    deleteTab: navigation.deleteTab,
    duplicateTab: navigation.duplicateTab,
    // ...
  };
}
```

### useDialogHandlers

Dialog state factory.

```typescript
export function useDialogHandlers() {
  return {
    projectDialog: useNodeDialogFactory('project'),
    promptDialog: useNodeDialogFactory('prompt'),
    settingsDialog: useNodeDialogFactory('settings'),
    // ...
  };
}
```

### useRunWorkflow

Workflow execution orchestration.

```typescript
export function useRunWorkflow() {
  const validation = useWorkflowValidation();
  const execution = useWorkflowExecution();

  return {
    runWorkflow: async (workflow) => {
      const errors = await validation.validate(workflow);
      if (errors.length === 0) {
        await execution.execute(workflow);
      }
    },
    cancelRun: execution.cancel,
    // ...
  };
}
```

## Canvas-Level Hooks

Located in `components/hooks/canvas/`:

### useCanvasState

Core canvas state.

```typescript
export function useCanvasState(initialWorkflow: Workflow) {
  const [nodes, setNodes] = useState(initialWorkflow.nodes);
  const [edges, setEdges] = useState(initialWorkflow.edges);

  const onNodesChange = useCallback((changes) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  return { nodes, edges, setNodes, setEdges, onNodesChange, onEdgesChange };
}
```

### Hook Composition Example

```typescript
export function useCanvasOperations() {
  // Uses multiple primitive hooks
  const state = useCanvasState();
  const history = useCanvasHistory();
  const connections = useConnectionHandlers();
  const clipboard = useClipboardOperations();

  // Combines into unified operations
  const deleteWithHistory = useCallback((nodeIds) => {
    history.pushHistory();
    state.setNodes((n) => n.filter((node) => !nodeIds.includes(node.id)));
  }, [history, state]);

  return {
    ...state,
    ...history,
    ...connections,
    ...clipboard,
    deleteWithHistory,
  };
}
```

## Patterns

### Single Responsibility

Each hook has one job:

```typescript
// Good: focused hook
export function useProjectLoad() {
  const loadFromPath = async (path: string) => { /* ... */ };
  return { loadFromPath };
}

// Avoid: hook doing too much
export function useEverything() {
  // Loading, saving, validation, UI state...
}
```

### Dependency Injection

Pass dependencies as parameters:

```typescript
export function useTabNavigation(tabsContext: TabsContextValue) {
  // Uses injected context
  const { tabs, setActiveTab } = tabsContext;
}
```

### Return Objects

Use objects for named access:

```typescript
// Good: named access
const { createProject, loadProject } = useProjectManagement();

// Avoid: positional access
const [createProject, loadProject] = useProjectManagement();
```

### Memoization

Memoize callbacks and computed values:

```typescript
export function useNodeCreation(schemas: NodeSchema[]) {
  const schemaMap = useMemo(
    () => new Map(schemas.map((s) => [s.unit_id, s])),
    [schemas]
  );

  const createNode = useCallback(
    (typeId: string, position: XYPosition) => {
      const schema = schemaMap.get(typeId);
      return createNodeFromSchema(schema, position);
    },
    [schemaMap]
  );

  return { createNode };
}
```

## Testing

### Hook Testing

Test hooks in isolation:

```typescript
import { renderHook, act } from '@testing-library/react';

describe('useProjectManagement', () => {
  it('creates a project', async () => {
    const { result } = renderHook(() => useProjectManagement());

    await act(async () => {
      await result.current.createProject('/path', 'test-project');
    });

    expect(result.current.projectPath).toBe('/path/test-project');
  });
});
```

### Mock Dependencies

```typescript
jest.mock('@/lib/api', () => ({
  api: {
    createProject: jest.fn(),
  },
}));
```

## Best Practices

### Hook Organization

```
hooks/
├── home/
│   ├── useHomeState.ts      # Orchestrator
│   ├── useProjectManagement.ts
│   ├── useTabHandlers.ts
│   └── primitives/          # Primitive hooks
│       ├── useProjectCreate.ts
│       └── useProjectLoad.ts
└── shared/
    └── useDebounce.ts
```

### Avoid Deep Nesting

Keep hook depth manageable:

```typescript
// Good: 2-3 levels
useHomeState
└── useProjectManagement
    └── useProjectLoad

// Avoid: too deep
useHomeState
└── useProjectManagement
    └── useProjectOperations
        └── useProjectLoad
            └── useLoadFromPath
```

## See Also

- [State Management](./state-management.md) - Context integration
- [Canvas System](./canvas-system.md) - Canvas hooks
- [API Client](./api-client.md) - API hooks
