# Canvas System

ReactFlow integration and canvas management.

## Overview

The canvas is built on ReactFlow (@xyflow/react), providing:
- Node-based visual editing
- Connection handling
- Viewport management
- Selection and multi-select

## Main Component

**Location**: `components/ReactFlowCanvas.tsx`

The main canvas component wraps ReactFlow with ADKFlow-specific logic:

```typescript
export const ReactFlowCanvas = forwardRef<ReactFlowCanvasRef, Props>(
  ({ workflow, onWorkflowChange, ...props }, ref) => {
    // Canvas hooks
    const canvasState = useCanvasState(workflow);
    const history = useCanvasHistory(workflow);
    const connections = useConnectionHandlers();
    // ... more hooks

    return (
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        // ... more props
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    );
  }
);
```

## Canvas Hooks

Located in `components/hooks/canvas/`:

### useCanvasState

Core state management for nodes and edges.

```typescript
const {
  nodes,
  edges,
  setNodes,
  setEdges,
  onNodesChange,
  onEdgesChange,
} = useCanvasState(initialWorkflow);
```

### useCanvasHistory

Undo/redo functionality.

```typescript
const {
  undo,
  redo,
  canUndo,
  canRedo,
  pushHistory,
} = useCanvasHistory(workflow);
```

### useConnectionHandlers

Handle connection creation and validation.

```typescript
const {
  onConnect,
  onConnectStart,
  onConnectEnd,
  isValidConnection,
} = useConnectionHandlers();
```

### useDeleteHandlers

Node and edge deletion.

```typescript
const {
  deleteSelected,
  deleteNodes,
  deleteEdges,
} = useDeleteHandlers();
```

### useClipboardOperations

Copy, cut, and paste.

```typescript
const {
  copy,
  cut,
  paste,
  duplicate,
} = useClipboardOperations();
```

### useKeyboardShortcuts

Keyboard shortcut handling.

```typescript
useKeyboardShortcuts({
  onUndo: undo,
  onRedo: redo,
  onCopy: copy,
  onPaste: paste,
  onDelete: deleteSelected,
});
```

### useNodeCreation

Creating new nodes from schema.

```typescript
const { createNode, createNodeAtPosition } = useNodeCreation(schemas);
```

### useContextMenu

Right-click menu state.

```typescript
const {
  contextMenu,
  showContextMenu,
  hideContextMenu,
} = useContextMenu();
```

### useCanvasOperations

Layout and viewport operations.

```typescript
const {
  fitView,
  zoomIn,
  zoomOut,
  resetZoom,
} = useCanvasOperations();
```

### useExecutionState

Node execution state during workflow runs.

```typescript
const { nodeStates, setNodeState, clearStates } = useExecutionState();
```

### useValidation

Workflow validation state.

```typescript
const {
  validationErrors,
  validationWarnings,
  validate,
} = useValidation();
```

## Node Types

Registered with ReactFlow:

```typescript
const nodeTypes = {
  customNode: CustomNode,
  groupNode: GroupNode,
  labelNode: LabelNode,
};
```

### CustomNode

The primary node type, rendering dynamically based on schema.

**Location**: `components/nodes/CustomNode.tsx`

Features:
- Expanded/collapsed views
- Schema-driven widgets
- Type-based styling
- Connection handles

### GroupNode

Container for organizing nodes.

**Location**: `components/nodes/GroupNode.tsx`

Features:
- Collapsible container
- Child node management
- Resize handling

### LabelNode

Text annotation node.

**Location**: `components/nodes/LabelNode.tsx`

## Connection Validation

Connections are validated using the dual-type system (source type + data type).

See [Type System](../extensions/type-system.md) for:
- `HandleTypeInfo` interface
- `isTypeCompatible` validation function
- Source and data type definitions
- Link type for parallel execution

## Viewport Management

### Saving Viewport

Viewport state is saved per tab:

```typescript
const viewport = {
  x: number,
  y: number,
  zoom: number,
};
```

### Restoring Viewport

When switching tabs, viewport is restored:

```typescript
useEffect(() => {
  if (savedViewport) {
    setViewport(savedViewport);
  }
}, [tabId]);
```

## Performance

### Memoization

Node components are memoized:

```typescript
export const CustomNode = memo(function CustomNode(props) {
  // ...
}, (prev, next) => {
  return prev.id === next.id
    && prev.data === next.data
    && prev.selected === next.selected;
});
```

### Virtualization

ReactFlow handles virtualization automatically, only rendering visible nodes.

### Debouncing

State updates are debounced for performance:

```typescript
const debouncedOnChange = useDebouncedCallback(
  (workflow) => onWorkflowChange(workflow),
  100
);
```

## See Also

- [Type System](../extensions/type-system.md) - Connection validation
- [Node System](./node-system.md) - Node implementation details
- [Hooks Architecture](./hooks-architecture.md) - Hook patterns
- [State Management](./state-management.md) - Context integration
