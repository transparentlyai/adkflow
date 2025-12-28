# Canvas

Navigating and working with the ADKFlow canvas.

## Navigation

### Panning

Move around the canvas:

| Method | Action |
|--------|--------|
| **Drag** | Click and drag on empty canvas space |
| **Scroll** | Use mouse wheel (horizontal or vertical) |
| **Trackpad** | Two-finger swipe |
| **Minimap** | Click or drag on the minimap |

### Zooming

Adjust zoom level:

| Method | Action |
|--------|--------|
| **Scroll wheel** | Zoom in/out at cursor position |
| **Pinch** | Trackpad pinch gesture |
| **Zoom controls** | Use the slider in bottom-left corner |
| **Menu** | View → Zoom In / Zoom Out |

### Fit View

Center all nodes in the viewport:

| Method | Action |
|--------|--------|
| **Double-click** | Double-click on empty canvas |
| **Button** | Click "Fit" in zoom controls |
| **Menu** | View → Fit View |

## Selection

### Single Selection

- **Click** a node to select it
- Selected nodes show a blue border

### Multi-Selection

| Method | Action |
|--------|--------|
| **Shift+Click** | Add/remove from selection |
| **Box selection** | Click and drag on canvas to draw selection box |
| **Select All** | Ctrl+A / Cmd+A |

### Deselection

- Click on empty canvas to deselect all
- Shift+Click a selected node to deselect it

## Canvas Controls

Located in the bottom-left corner:

### Zoom Controls

- **−** : Zoom out
- **Slider** : Adjust zoom level
- **+** : Zoom in
- **Fit** : Fit all nodes in view

### Lock Toggle

Click the lock icon to toggle canvas lock:
- **Unlocked**: Normal editing
- **Locked**: Prevents node movement, useful for presentations

## Minimap

Located in the bottom-right corner (toggle via View menu):

- Shows bird's-eye view of entire canvas
- Current viewport shown as a rectangle
- Click anywhere to navigate
- Drag to pan
- Nodes shown as colored rectangles

## Grid and Background

The canvas displays:
- **Dot grid**: Visual reference for alignment
- **Grid snapping**: Nodes snap to grid when moving

## Context Menu

Right-click on the canvas to open the context menu:

### Add Nodes

Nodes are organized in categories:

| Category | Node Types |
|----------|------------|
| **Agents** | LlmAgent, SequentialAgent, ParallelAgent, LoopAgent |
| **Content** | Prompt, Context |
| **Tools** | Tool, MCP Tool |
| **Variables** | Variable, User Input |
| **Connectors** | Teleport In, Teleport Out |
| **Layout** | Group, Label |
| **Probes** | Input Probe, Output Probe, Log Probe |

### Paste

If you've copied nodes, **Paste** appears in the context menu.

## Keyboard Navigation

| Shortcut | Action |
|----------|--------|
| **Arrow keys** | Move selected nodes |
| **Tab** | Cycle through nodes |
| **Escape** | Deselect all |

## Viewport State

Your viewport state (position, zoom) is:
- Saved when you switch tabs
- Restored when you return to a tab
- Persisted across browser sessions

## Tips

### Organizing Large Workflows

- Use **Groups** to cluster related nodes
- Use **Labels** for documentation
- Use multiple **Tabs** for different concerns
- Use **Teleporters** to connect across tabs

### Performance

For very large workflows (100+ nodes):
- Collapse nodes you're not editing
- Use the minimap for navigation
- Consider splitting into multiple tabs

## See Also

- [Nodes](./nodes.md) - Working with nodes
- [Connections](./connections.md) - Connecting nodes
- [Groups](./groups.md) - Organizing with groups
- [Keyboard Shortcuts](./keyboard-shortcuts.md) - All shortcuts
