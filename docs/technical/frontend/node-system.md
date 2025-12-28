# Node System

Node types, layouts, and widgets in ADKFlow.

## Overview

Nodes are the fundamental building blocks of workflows. The node system provides:
- Multiple node types (agent, prompt, group, etc.)
- Visual layouts (standard, pill, diamond, etc.)
- Input widgets (text, select, slider, etc.)
- Schema-driven rendering

## Node Architecture

```
CustomNode (entry point)
├── CustomNodeExpanded (full view)
│   ├── CustomNodeHeader
│   ├── CustomNodeInput (per input port)
│   │   └── Widget (based on type)
│   ├── Fields (configuration)
│   │   └── Widget (based on type)
│   └── CustomNodeOutput (per output port)
└── CustomNodeCollapsed (compact view)
    └── Layout Component (pill, diamond, etc.)
```

## Node Types

### Built-in Types

| Type | Schema Location | Purpose |
|------|-----------------|---------|
| `LlmAgent` | `builtinNodeSchemas/agent.ts` | LLM execution |
| `SequentialAgent` | `builtinNodeSchemas/sequential.ts` | Sequential execution |
| `ParallelAgent` | `builtinNodeSchemas/parallel.ts` | Parallel execution |
| `LoopAgent` | `builtinNodeSchemas/loop.ts` | Loop execution |
| `Prompt` | `builtinNodeSchemas/prompt.ts` | Text templates |
| `Context` | `builtinNodeSchemas/context.ts` | Static content |
| `Tool` | `builtinNodeSchemas/tool.ts` | Agent tools |
| `Variable` | `builtinNodeSchemas/variable.ts` | Variables |
| `Group` | Built-in | Container |
| `Label` | Built-in | Annotation |

### Custom Types

Loaded from extensions via API:

```typescript
const schemas = await api.getExtensionNodes();
// Returns NodeSchema[] for custom nodes
```

## Node Schema

Each node type is defined by a schema:

```typescript
interface NodeSchema {
  unit_id: string;           // Unique identifier
  label: string;             // Display name
  description?: string;      // Tooltip text
  menu_location: string;     // Menu path
  ui_schema: {
    inputs: PortDefinition[];
    outputs: PortDefinition[];
    fields: FieldDefinition[];
    color: string;
    icon?: string;
    layout?: NodeLayout;
    expandable?: boolean;
  };
}
```

## Layouts

### Standard Layout

Default expandable panel:
- Full header with controls
- All inputs, fields, outputs visible
- Resizable

### Collapsed Layouts

When collapsed, nodes use specialized layouts:

| Layout | Shape | Use Case |
|--------|-------|----------|
| `pill` | Rounded rectangle | Compact display |
| `circle` | Circle | Buttons, simple nodes |
| `diamond` | Diamond | Decision nodes |
| `octagon` | Octagon | Stop/special nodes |
| `compact` | Small pill | Minimal nodes |

**Location**: `components/nodes/layouts/`

## Widgets

### Input Widgets

Located in `components/nodes/widgets/`:

| Widget | Type | Props |
|--------|------|-------|
| `TextInputWidget` | `TEXT_INPUT` | placeholder, default |
| `TextAreaWidget` | `TEXT_AREA` | placeholder, rows |
| `NumberInputWidget` | `NUMBER_INPUT` | min, max, step |
| `SelectWidget` | `SELECT` | options |
| `CheckboxWidget` | `CHECKBOX` | - |
| `SliderWidget` | `SLIDER` | min, max, step |
| `FilePickerWidget` | `FILE_PICKER` | extensions |
| `MonacoEditorWidget` | `CODE_EDITOR` | language |
| `JsonTreeWidget` | `JSON_TREE` | - |

### Widget Rendering

Widgets are rendered based on field type:

```typescript
function renderWidget(field: FieldDefinition, value: any, onChange: (v: any) => void) {
  switch (field.widget) {
    case 'TEXT_INPUT':
      return <TextInputWidget value={value} onChange={onChange} {...field} />;
    case 'SELECT':
      return <SelectWidget value={value} onChange={onChange} options={field.options} />;
    // ... other widgets
  }
}
```

## Handles

### Handle Types

```typescript
interface Handle {
  id: string;
  type: 'source' | 'target';
  position: 'left' | 'right' | 'top' | 'bottom';
  sourceType: string;    // Semantic type
  dataType: string;      // Python type
  label: string;
}
```

### Handle Positioning

**Standard nodes**:
- Inputs on left
- Outputs on right

**Custom positioning** (via `handle_layout`):
- Configurable positions
- Additional handles

### DraggableHandle

Located in `components/DraggableHandle.tsx`:

Allows repositioning handles on expanded nodes for better visual layout.

## Node Data

Each node stores data in ReactFlow format:

```typescript
interface NodeData {
  label: string;
  type: string;           // Node type ID
  schema: NodeSchema;     // Full schema
  config: Record<string, any>;  // Field values
  inputs: Record<string, any>;  // Input values (when manual)
  expanded: boolean;
  // ... other state
}
```

## Node Hooks

Located in `components/nodes/hooks/`:

| Hook | Purpose |
|------|---------|
| `useCustomNodeName` | Node naming logic |
| `useCustomNodeTabs` | Tab organization for fields |
| `useCustomNodeHandleTypes` | Handle type resolution |
| `useConnectedHandleNames` | Connected node labels |
| `useConnectedInputs` | Input value resolution |
| `useFileOperations` | File picker operations |

## Styling

### Theme Integration

Nodes use theme colors:

```typescript
const colors = useThemeColors();

<div style={{
  background: colors.node.background,
  border: `1px solid ${colors.node.border}`,
}}>
```

### Type-based Colors

Each node type has a header color:

```typescript
const typeColors = {
  agent: '#3b82f6',      // Blue
  prompt: '#22c55e',     // Green
  context: '#8b5cf6',    // Purple
  tool: '#f59e0b',       // Orange
};
```

## Validation Display

Nodes show validation state:

```typescript
function ValidationIndicator({ errors, warnings }) {
  if (errors.length > 0) {
    return <ErrorIcon className="text-red-500" />;
  }
  if (warnings.length > 0) {
    return <WarningIcon className="text-yellow-500" />;
  }
  return null;
}
```

## See Also

- [Canvas System](./canvas-system.md) - Canvas integration
- [Theme System](./theme-system.md) - Theming
- [Extensions](../extensions/README.md) - Custom node development
