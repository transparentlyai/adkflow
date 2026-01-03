# Interface Overview

A tour of the ADKFlow visual editor interface.

## Main Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Menu Bar                                                    │
├─────────────────────────────────────────────────────────────┤
│  Tab Bar                                          [Run] [▼] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                                                             │
│                      Canvas                                 │
│                                                             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Run Panel (when executing)                                 │
└─────────────────────────────────────────────────────────────┘
```

## Menu Bar

Located at the top. Contains:

| Menu | Actions |
|------|---------|
| **File** | New Project, Open Project, Save, Recent Projects |
| **Edit** | Undo, Redo, Cut, Copy, Paste, Delete, Select All |
| **View** | Zoom In/Out, Fit View, Toggle Minimap, Lock Canvas |
| **Workflow** | Run, Validate, Show Topology |
| **Theme** | Light, Dark, System |

## Tab Bar

Below the menu. Manage multiple workflow tabs:

- **Click tab** to switch
- **Double-click** to rename
- **+ button** to add new tab
- **× button** to close tab (with unsaved changes warning)
- **Drag tabs** to reorder

## Canvas

The main workspace where you build workflows.

### Navigation

| Action | How |
|--------|-----|
| **Pan** | Click and drag on empty space, or use scroll wheel |
| **Zoom** | Scroll wheel, or pinch on trackpad |
| **Fit view** | Double-click empty space, or View → Fit View |

### Canvas Controls

Bottom-left corner:

- **Zoom slider** - Adjust zoom level
- **Fit view button** - Center all nodes
- **Lock button** - Prevent accidental edits

### Minimap

Bottom-right corner (toggle via View menu):

- Shows bird's-eye view of entire canvas
- Click to navigate
- Drag to pan

## Nodes

Nodes are the building blocks of your workflow.

### Node Anatomy

```
┌──────────────────────────────┐
│ ● Node Name            [−][×]│  ← Header (colored by type)
├──────────────────────────────┤
│ ○ Input 1                    │  ← Input handles (left)
│ ○ Input 2                    │
├──────────────────────────────┤
│  [Configuration Fields]      │  ← Editable settings
├──────────────────────────────┤
│                    Output ○  │  ← Output handles (right)
└──────────────────────────────┘
```

### Node States

| State | Appearance |
|-------|------------|
| **Normal** | Default styling |
| **Selected** | Blue border |
| **Running** | Pulsing animation |
| **Completed** | Green indicator |
| **Error** | Red indicator |
| **Validation Error** | Yellow warning icon |

### Expanded vs Collapsed

- **Expanded**: Shows all fields and handles
- **Collapsed**: Compact view showing just name and key info
- Toggle with the **[−]** button in header

## Handles

Connection points on nodes.

| Position | Type |
|----------|------|
| **Left side** | Inputs (receive data) |
| **Right side** | Outputs (send data) |
| **Top/Bottom** | Special connections (groups, agents) |

### Handle Colors

Different colors indicate different data types:
- **Blue** - General data
- **Green** - Success/data output
- **Red** - Error output
- **Purple** - Configuration

## Context Menu

Right-click to open:

- **On canvas**: Add nodes from categorized menu
- **On node**: Cut, Copy, Delete, Duplicate, Group

## Run Panel

Appears when executing a workflow:

- **Event stream** - Real-time execution logs
- **User input** - Prompts for interactive workflows
- **Status** - Running, completed, or error state
- **Cancel button** - Stop execution

### Dev Mode Controls

When running with `./adkflow dev`, additional controls appear in the Run Panel header:

| Control | Description |
|---------|-------------|
| **Log Explorer** (📄) | Opens log viewer in new tab |
| **Trace Explorer** (📊) | Opens trace viewer in new tab |
| **Debug Panel** (⚙) | Configure logging levels and options |

See [Running Workflows](./running-workflows.md#debugging-dev-mode) for details.

## Dialogs

Modal windows for various actions:

- **Project Dialog** - Create/open projects
- **Project Switcher** - Quick project switch (Ctrl+O)
- **Settings** - Preferences and configuration
- **Topology View** - Visual workflow diagram
- **Validation Results** - Errors and warnings

## See Also

- [Canvas](./canvas.md) - Detailed canvas operations
- [Nodes](./nodes.md) - Working with nodes
- [Keyboard Shortcuts](./keyboard-shortcuts.md) - All shortcuts
