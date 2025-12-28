# Connections

Connecting nodes to build workflows.

## What are Connections?

Connections (edges) link nodes together, allowing data to flow from outputs to inputs. They define the structure and data flow of your workflow.

## Handles

Handles are the connection points on nodes:

| Position | Type | Purpose |
|----------|------|---------|
| **Left** | Input | Receives data from other nodes |
| **Right** | Output | Sends data to other nodes |
| **Top** | Special | Agent hierarchy (parent agents) |
| **Bottom** | Special | Agent hierarchy (child agents) |

### Handle Colors

Colors indicate data types:
- **Default blue** - General connections
- **Green** - Success/data
- **Red** - Error outputs
- **Purple** - Configuration
- **Custom** - Extension-defined colors

## Creating Connections

### Drag Method

1. **Hover** over an output handle (right side)
2. **Click and drag** toward the target input
3. **Release** on a compatible input handle

### Click Method

1. **Click** an output handle
2. **Click** a compatible input handle

### Keyboard Cancel

Press **Escape** while dragging to cancel.

## Connection Validation

Not all handles can connect. ADKFlow validates:

### Type Compatibility

- **Source type**: What kind of node produced the data
- **Data type**: The Python type of the data (str, dict, list, etc.)

### Accepted Types

Each input specifies what it accepts:
- `accepted_sources`: Which node types can connect
- `accepted_types`: Which data types are valid

### Visual Feedback

While dragging:
- **Compatible handles**: Highlighted
- **Incompatible handles**: Dimmed or no highlight

### Invalid Connection

If you try to connect incompatible handles:
- The connection won't be created
- A subtle visual indicator shows the rejection

## Connection Appearance

| State | Appearance |
|-------|------------|
| **Normal** | Gray line |
| **Selected** | Blue highlighted |
| **Running** | Animated flow |
| **Error path** | Red tinted |

## Selecting Connections

- **Click** on a connection line to select it
- Selected connections show as highlighted

## Deleting Connections

| Method | How |
|--------|-----|
| **Select + Delete** | Click connection, press Delete |
| **Reconnect** | Drag from input to a different output |
| **Delete node** | Deletes all connections to that node |

## Multiple Connections

### Multiple Outputs

One output can connect to multiple inputs:
- Drag multiple connections from the same output
- Data is sent to all connected inputs

### Multiple Inputs

Some inputs accept multiple connections:
- Look for the "multiple" indicator on the handle
- Each connection's data is collected into a list

## Special Connections

### Agent Hierarchy

For agent nodes (Sequential, Parallel, Loop):
- **Top handle**: Connect to parent agent
- **Bottom handle**: Connect to child agents
- Creates parent-child execution relationship

### Teleporter Connections

Cross-tab connections using Teleport nodes:
- **Teleport Out**: Sends data to a named channel
- **Teleport In**: Receives data from that channel
- See [Teleporters](./teleporters.md)

## Connection Tips

### Readability

- Avoid crossing connections when possible
- Use groups to organize related nodes
- Use teleporters for long-distance connections

### Debugging

- Connections show data flow during execution
- Use probe nodes to monitor specific connections

### Reorganizing

- Moving nodes automatically adjusts connections
- Connections route around obstacles when possible

## Common Patterns

### Linear Pipeline

```
[Prompt] → [Agent] → [Output]
```

### Fan-out

```
           → [Agent 1] →
[Prompt] → → [Agent 2] → [Collector]
           → [Agent 3] →
```

### Fan-in

```
[Source 1] →
[Source 2] → [Agent with multiple inputs]
[Source 3] →
```

## See Also

- [Nodes](./nodes.md) - Node types and handles
- [Teleporters](./teleporters.md) - Cross-tab connections
- [Validation](./validation.md) - Connection validation
