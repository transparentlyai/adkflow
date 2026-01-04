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

All built-in nodes are now **schema-driven** using CustomNodeSchema definitions located in `lib/builtinNodeSchemas/`:

| Type | Schema Location | Purpose |
|------|-----------------|---------|
| `Agent` | `builtinNodeSchemas/agentNodeSchema.ts` | LLM agent (model-driven fields) |
| `Prompt` | `builtinNodeSchemas/promptNodeSchema.ts` | Text templates |
| `Context` | `builtinNodeSchemas/contextNodeSchema.ts` | Static content |
| `ContextAggregator` | `builtinNodeSchemas/contextAggregatorNodeSchema.ts` | Multi-source content aggregation |
| `Tool` | `builtinNodeSchemas/toolNodeSchema.ts` | Agent tools |
| `AgentTool` | `builtinNodeSchemas/agentToolNodeSchema.ts` | Tool wrapper for agents |
| `Process` | `builtinNodeSchemas/processNodeSchema.ts` | Custom Python processing |
| `Variable` | `builtinNodeSchemas/variableNodeSchema.ts` | Variables |
| `UserInput` | `builtinNodeSchemas/userInputNodeSchema.ts` | Runtime user input |
| `Start` | `builtinNodeSchemas/startNodeSchema.ts` | Workflow start point |
| `End` | `builtinNodeSchemas/endNodeSchema.ts` | Workflow end point |
| `TeleportIn/Out` | `builtinNodeSchemas/teleport*.ts` | Connection shortcuts |
| `InputProbe` | `builtinNodeSchemas/inputProbeNodeSchema.ts` | Debug input |
| `OutputProbe` | `builtinNodeSchemas/outputProbeNodeSchema.ts` | Debug output |
| `LogProbe` | `builtinNodeSchemas/logProbeNodeSchema.ts` | Logging probe |
| `OutputFile` | `builtinNodeSchemas/outputFileNodeSchema.ts` | File output |
| `Group` | Built-in (non-schema) | Container |
| `Label` | Built-in (non-schema) | Annotation |

> **Note**: SequentialAgent, ParallelAgent, and LoopAgent have been consolidated into the unified Agent node. Agent behavior is now configured through model settings and flow connections.

### Custom Types

Loaded from extensions via API:

```typescript
const schemas = await api.getExtensionNodes();
// Returns CustomNodeSchema[] for custom nodes
```

### Schema-Based Model Configuration

The Agent node uses **model-driven field schemas** from `lib/constants/modelSchemas/`. Each model has its own schema file, and new models are auto-discovered at startup.

**File structure:**
```
lib/constants/modelSchemas/
├── types.ts          # ModelSchema interface, constants
├── fields.ts         # Shared field creation functions
├── index.ts          # Auto-discovery registry
├── gemini-2.5-flash.ts
├── gemini-2.5-pro.ts
├── gemini-3-flash-preview.ts
└── ... (other models)
```

**Adding a new model:**
1. Create a file in `modelSchemas/` (e.g., `my-model.ts`)
2. Export a `schema` object using shared field functions
3. Import and add it to `ALL_SCHEMAS` in `index.ts`

```typescript
// Get schema for a specific model
import { getModelSchema } from "@/lib/constants/modelSchemas";

const schema = getModelSchema("gemini-2.5-flash");
// Returns { modelId, label, order, tabs, fields, universalFieldIds }
```

Universal fields (preserved when switching models):
- `description` - Agent description
- `model` - Model selection
- `custom_model` - Custom model name
- `temperature` - Response randomness

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
| `TextInputWidget` | `text_input` | placeholder, default |
| `TextAreaWidget` | `text_area` | placeholder, rows |
| `NumberInputWidget` | `number_input` | min, max, step |
| `SelectWidget` | `select` | options |
| `SearchableSelectWidget` | `searchable_select` | options, placeholder |
| `CheckboxWidget` | `checkbox` | - |
| `SliderWidget` | `slider` | min, max, step |
| `RadioGroupWidget` | `radio_group` | options |
| `FilePickerWidget` | `file_picker` | extensions |
| `FileDisplayWidget` | `file_display` | read-only file display |
| `MonacoEditorWidget` | `code_editor` | language |
| `JsonTreeWidget` | `json_tree` | - |
| `ChatLogWidget` | `chat_log` | messages display |
| `InfoDisplayWidget` | `info_display` | read-only info text |
| `VariableDisplayWidget` | `variable_display` | variable value |

Widget types support both snake_case (Python) and lowercase (legacy) naming.

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

### Agent Node Handles

The Agent node has special input handles:

| Handle ID | Type | Purpose |
|-----------|------|---------|
| `prompt-input` | target | Receives instruction from Prompt nodes |
| `context-input` | target | Receives variables dict from Context Aggregator |
| `tool-input` | target | Receives tool functions |
| `flow-input` | target | Sequential execution flow |
| `output` | source | Agent output text |

The `context-input` handle:
- Accepts `*:dict` connections (any source, dict data type)
- Supports multiple connections (merged at runtime)
- Variables available for `{placeholder}` substitution in instruction

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
