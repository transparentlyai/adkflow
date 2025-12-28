# Groups

Organizing nodes into collapsible containers.

## What are Groups?

Groups are container nodes that:
- Visually organize related nodes
- Can be collapsed to hide complexity
- Can be moved as a single unit
- Help document workflow sections

## Creating Groups

### From Context Menu

1. **Right-click** on the canvas
2. Select **Layout → Group**
3. A new empty group appears

### From Selection

1. **Select** multiple nodes
2. **Right-click** → **Group Selection**
3. A group is created around the selected nodes

## Adding Nodes to Groups

### Drag Into

1. **Drag** a node over a group
2. **Release** when the group highlights
3. The node becomes a child of the group

### Create Inside

1. **Right-click** inside a group
2. Add a node from the context menu
3. The new node is automatically part of the group

## Removing Nodes from Groups

### Drag Out

1. **Drag** the node outside the group boundary
2. **Release** to detach from the group

### Ungroup

1. **Select** the group
2. **Right-click** → **Ungroup**
3. All child nodes are released

## Group Properties

### Name

- Double-click the group header to rename
- Use descriptive names like "Data Processing" or "API Integration"

### Color

Groups can have custom header colors (via node configuration).

### Size

- Groups auto-resize to fit their children
- Drag edges to manually resize
- Minimum size ensures visibility

## Collapsing Groups

### Toggle Collapse

- Click the **[−]** button in the group header
- Or double-click the group header

### Collapsed State

When collapsed:
- Children are hidden
- Group shows as a compact card
- Connections to children route to group edges
- Internal connections are hidden

### Expanded State

When expanded:
- All children are visible
- Full editing available
- Connections show actual targets

## Nested Groups

Groups can contain other groups:

```
[Outer Group                    ]
│  [Inner Group A]  [Inner Group B] │
│  │ Node 1      │  │ Node 3      │ │
│  │ Node 2      │  │ Node 4      │ │
└──────────────────────────────────┘
```

- Collapse outer to hide all
- Collapse inner to hide just that section

## Group Connections

### External Connections

- Nodes inside groups can connect to nodes outside
- Connections route through group boundaries

### Internal Connections

- Nodes inside groups can connect to each other
- Hidden when group is collapsed

### Group Handles

- Groups can have their own handles
- Useful for treating a group as a single unit

## Moving Groups

When you move a group:
- All child nodes move together
- Relative positions are preserved
- Connections follow

## Deleting Groups

### Delete Group Only

1. **Select** the group
2. **Right-click** → **Ungroup**
3. Children remain, group is removed

### Delete Group and Contents

1. **Select** the group
2. Press **Delete**
3. Confirmation dialog appears
4. Choose to delete children or keep them

## Use Cases

### Workflow Stages

Group nodes by processing stage:
- "Input Processing"
- "Analysis"
- "Output Generation"

### Reusable Patterns

Create groups for common patterns:
- "Error Handling"
- "Retry Logic"
- "Logging"

### Documentation

Use groups with clear names to:
- Document workflow sections
- Make large workflows scannable
- Hide implementation details

## Tips

### Naming

Use action-oriented names:
- "Process User Input" ✓
- "Group 1" ✗

### Nesting Depth

Avoid deep nesting (>2 levels):
- Hard to navigate
- Consider using tabs instead

### Size

Keep groups reasonably sized:
- 3-7 nodes is ideal
- Split large groups

## See Also

- [Nodes](./nodes.md) - Working with nodes
- [Canvas](./canvas.md) - Canvas navigation
- [Tabs](./tabs.md) - Alternative organization
