# State Management

React Context-based state management in ADKFlow.

## Overview

ADKFlow uses React Context for global state, with specialized contexts for different concerns:

```
App
├── ThemeContext          # Theme state
└── Page
    ├── TabsContext       # Multi-tab workflow state
    ├── ClipboardContext  # Copy/paste state
    ├── TeleporterContext # Cross-tab connections
    ├── ConnectionContext # Handle connection validation
    ├── ProjectContext    # Current project info
    └── RunWorkflowContext # Execution state
```

## Contexts

### ThemeContext

**Location**: `contexts/ThemeContext.tsx`

**Purpose**: Manages light/dark theme switching.

```typescript
interface ThemeContextValue {
  theme: 'light' | 'dark' | 'system';
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}
```

**Usage**:
```typescript
const { theme, setTheme } = useTheme();
```

### TabsContext

**Location**: `contexts/TabsContext.tsx`

**Purpose**: Manages workflow tabs within a project.

```typescript
interface TabsContextValue {
  tabs: Tab[];
  activeTabId: string | null;
  createTab: (name?: string) => Promise<Tab>;
  loadTab: (tabId: string) => Promise<void>;
  saveTab: (tabId: string, workflow: Workflow) => Promise<void>;
  deleteTab: (tabId: string) => Promise<void>;
  renameTab: (tabId: string, name: string) => Promise<void>;
  reorderTabs: (tabIds: string[]) => Promise<void>;
  duplicateTab: (tabId: string) => Promise<Tab>;
}
```

**Usage**:
```typescript
const { tabs, activeTabId, createTab } = useTabs();
```

### ClipboardContext

**Location**: `contexts/ClipboardContext.tsx`

**Purpose**: Stores copied nodes/edges for paste operations.

```typescript
interface ClipboardContextValue {
  clipboard: ClipboardData | null;
  copy: (nodes: Node[], edges: Edge[]) => void;
  cut: (nodes: Node[], edges: Edge[]) => void;
  paste: () => ClipboardData | null;
  hasContent: boolean;
}
```

**Usage**:
```typescript
const { copy, paste, hasContent } = useClipboard();
```

### TeleporterContext

**Location**: `contexts/TeleporterContext.tsx`

**Purpose**: Tracks cross-tab teleporter connections.

```typescript
interface TeleporterContextValue {
  teleporters: Map<string, TeleporterInfo>;
  registerTeleporter: (channel: string, nodeId: string, type: 'in' | 'out') => void;
  unregisterTeleporter: (channel: string, nodeId: string) => void;
  getChannelColor: (channel: string) => string;
}
```

**Usage**:
```typescript
const { getChannelColor, registerTeleporter } = useTeleporter();
```

### ConnectionContext

**Location**: `contexts/ConnectionContext.tsx`

**Purpose**: Validates handle connections during edge creation.

```typescript
interface ConnectionContextValue {
  isValidConnection: (connection: Connection) => boolean;
  getConnectionError: (connection: Connection) => string | null;
}
```

**Usage**:
```typescript
const { isValidConnection } = useConnection();
```

### ProjectContext

**Location**: `contexts/ProjectContext.tsx`

**Purpose**: Stores current project metadata.

```typescript
interface ProjectContextValue {
  projectPath: string | null;
  projectName: string | null;
  setProject: (path: string, name: string) => void;
  clearProject: () => void;
}
```

### RunWorkflowContext

**Location**: `contexts/RunWorkflowContext.tsx`

**Purpose**: Manages workflow execution state.

```typescript
interface RunWorkflowContextValue {
  isRunning: boolean;
  runId: string | null;
  nodeStates: Map<string, NodeExecutionState>;
  startRun: (workflow: Workflow) => Promise<void>;
  cancelRun: () => Promise<void>;
}
```

## Data Flow

### Read Pattern

```typescript
function MyComponent() {
  // Subscribe to context
  const { tabs, activeTabId } = useTabs();

  // Component re-renders when context changes
  return <div>{tabs.length} tabs</div>;
}
```

### Write Pattern

```typescript
function MyComponent() {
  const { createTab } = useTabs();

  const handleAddTab = async () => {
    // Action dispatched to context
    await createTab('New Tab');
    // Context updates, subscribers re-render
  };

  return <button onClick={handleAddTab}>Add Tab</button>;
}
```

## State Persistence

### Local Storage

Some state is persisted to browser localStorage:

| State | Key | Purpose |
|-------|-----|---------|
| Theme | `adkflow-theme` | User preference |
| Recent Projects | `adkflow-recent-projects` | Quick access |
| Session State | `adkflow-session` | Tab restoration |

### Server State

Project data is persisted via API calls:

| State | API | Storage |
|-------|-----|---------|
| Tabs | `/api/project/tabs` | `manifest.json` + `pages/` |
| Workflows | `/api/project/tabs/{id}` | `pages/{id}.json` |
| Prompts | `/api/project/prompt/save` | `prompts/` |

## Best Practices

### Context Granularity

Keep contexts focused:
```typescript
// Good: Focused contexts
<ThemeProvider>
  <TabsProvider>
    <ClipboardProvider>
      ...
    </ClipboardProvider>
  </TabsProvider>
</ThemeProvider>

// Avoid: One giant context
<AppStateProvider> // Everything in one place
```

### Memoization

Memoize context values to prevent unnecessary re-renders:

```typescript
const value = useMemo(() => ({
  tabs,
  createTab,
  deleteTab,
}), [tabs, createTab, deleteTab]);

return <TabsContext.Provider value={value}>{children}</TabsContext.Provider>;
```

### Custom Hooks

Always use custom hooks to access contexts:

```typescript
// Context file exports
export function useTabs() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('useTabs must be used within TabsProvider');
  }
  return context;
}
```

## See Also

- [Hooks Architecture](./hooks-architecture.md) - Hook patterns
- [API Client](./api-client.md) - Backend communication
- [Architecture](../architecture.md) - System overview
