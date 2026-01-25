# Nodes

Working with nodes in ADKFlow workflows.

## Node Types

### Agent Nodes

Execute AI model inference.

| Node | Purpose |
|------|---------|
| **LlmAgent** | Single LLM execution with configurable model |
| **SequentialAgent** | Run child agents in sequence |
| **ParallelAgent** | Run child agents in parallel |
| **LoopAgent** | Run child agents in a loop |

#### Agent Inputs

Agent nodes have several input ports:

| Input | Connects From | Purpose |
|-------|---------------|---------|
| **Prompt** | Prompt node | Agent instruction template |
| **Context** | Context Aggregator | Variables for `{placeholder}` substitution |
| **Tools** | Tool nodes | Functions the agent can call |
| **Flow** | Other agents | Sequential execution flow |

See [Prompts and Contexts](./prompts-and-contexts.md) for details on template variables.

### Content Nodes

Provide text content to agents.

| Node | Purpose |
|------|---------|
| **Prompt** | Markdown template with variable substitution |
| **Context** | Static context or configuration data |
| **Context Aggregator** | Collect content from files, directories, URLs, and nodes into variables |

### Tool Nodes

Extend agent capabilities.

| Node | Purpose |
|------|---------|
| **Tool** | Built-in ADK tools (code execution, search, etc.) |
| **MCP Tool** | Model Context Protocol tools |

### Variable Nodes

Define and capture data.

| Node | Purpose |
|------|---------|
| **Variable** | Define reusable values |
| **User Input** | Pause execution for user input |

### Connector Nodes

Connect across boundaries.

| Node | Purpose |
|------|---------|
| **Teleport In** | Receive data from another tab |
| **Teleport Out** | Send data to another tab |

### Layout Nodes

Organize the canvas.

| Node | Purpose |
|------|---------|
| **Group** | Container for organizing related nodes |
| **Label** | Text annotation for documentation |

### Probe Nodes

Monitor execution.

| Node | Purpose |
|------|---------|
| **Input Probe** | Monitor input values |
| **Output Probe** | Monitor output values |
| **Log Probe** | Log messages during execution |

## Adding Nodes

### From Context Menu

1. **Right-click** on the canvas
2. Navigate to the category
3. Click the node type

## Selecting Nodes

| Action | How |
|--------|-----|
| **Single select** | Click the node |
| **Multi-select** | Shift+Click or box selection |
| **Select all** | Ctrl+A / Cmd+A |

## Moving Nodes

| Action | How |
|--------|-----|
| **Drag** | Click and drag the node |
| **Arrow keys** | Move selected nodes |
| **Into group** | Drag node over a group |

## Configuring Nodes

### Expanded View

Click a node to select and expand it. The expanded view shows:
- All input/output handles
- Configuration fields
- Tabs (for complex nodes)

### Configuration Fields

Different field types:

| Type | Description |
|------|-------------|
| **Text** | Single-line text input |
| **Text Area** | Multi-line text input |
| **Number** | Numeric input with optional range |
| **Select** | Dropdown with options |
| **Checkbox** | Boolean toggle |
| **Slider** | Range slider |
| **File Picker** | File selection |
| **Code Editor** | Monaco-powered code editor |

### Collapsed View

Click the **[−]** button to collapse a node. Collapsed nodes show:
- Node name
- Icon (if configured)
- Key summary information

## Duplicating Nodes

| Method | How |
|--------|-----|
| **Copy/Paste** | Ctrl+C, then Ctrl+V |
| **Context Menu** | Right-click → Duplicate |
| **With connections** | Copies preserve internal connections |

## Deleting Nodes

| Method | How |
|--------|-----|
| **Delete key** | Select and press Delete |
| **Backspace** | Select and press Backspace |
| **Context Menu** | Right-click → Delete |

Deleting a node also removes its connections.

## Node Visual States

| State | Indicator |
|-------|-----------|
| **Selected** | Blue border |
| **Running** | Pulsing animation |
| **Completed** | Green checkmark |
| **Error** | Red indicator |
| **Validation Warning** | Yellow warning icon |

## Validation

Nodes validate their configuration:

- **Required fields**: Must have a value
- **Type checking**: Values must match expected types
- **Connection requirements**: Required inputs must be connected

See [Validation](./validation.md) for details.

## Tips

### Naming Conventions

Use descriptive names:
- `analyze_sentiment` not `agent1`
- `user_prompt` not `prompt`

### Organization

- Group related nodes together
- Use labels for documentation
- Keep workflows readable (not too crowded)

### Performance

- Collapse nodes you're not editing
- Use groups to hide complexity

## See Also

- [Connections](./connections.md) - Connecting nodes
- [Groups](./groups.md) - Organizing nodes
- [Running Workflows](./running-workflows.md) - Execution
