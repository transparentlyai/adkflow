# Tabs

Working with multiple workflow tabs within a project.

## What are Tabs?

Tabs allow you to organize complex projects into separate canvases:
- Each tab has its own workflow
- Tabs share project resources (prompts, contexts, tools)
- Use teleporters to connect across tabs

## Tab Bar

Located below the menu bar:

```
┌─────────────────────────────────────────────────────┐
│ [Main ●] [Helpers] [Utils]              [+]         │
└─────────────────────────────────────────────────────┘
```

- **Active tab**: Highlighted
- **Unsaved indicator**: Dot (●) next to name
- **+ button**: Add new tab

## Creating Tabs

### From Tab Bar

1. Click the **+** button at the end of the tab bar
2. New tab is created with a default name
3. Tab opens automatically

### Default Tab

Every new project starts with a "Main" tab.

## Switching Tabs

- **Click** a tab to switch to it
- Previous tab is saved automatically
- Viewport state is preserved per tab

## Renaming Tabs

1. **Double-click** the tab name
2. Type the new name
3. Press **Enter** to confirm
4. Press **Escape** to cancel

## Reordering Tabs

1. **Drag** a tab by its label
2. **Drop** at the new position
3. Order is saved to the project

## Closing Tabs

1. **Hover** over the tab
2. Click the **×** button
3. If unsaved, you'll be prompted to save or discard

### Last Tab

- You can't close the last tab
- A project must have at least one tab

## Duplicating Tabs

1. **Right-click** the tab
2. Select **Duplicate**
3. A copy is created with "(Copy)" suffix

Duplicating copies:
- All nodes and connections
- Node configurations
- Layout and positions

## Tab Storage

Tabs are stored in the project's `manifest.json` file (v3.0 format):

```
my-project/
├── manifest.json    # Project data including all tabs, nodes, and edges
├── prompts/         # Prompt template files
└── tools/           # Tool implementation files
```

The manifest contains:
- **tabs**: Tab metadata (id, name, order, viewport)
- **nodes**: All workflow nodes across all tabs
- **edges**: All connections between nodes

Each node has a `tabId` property indicating which tab it belongs to.

### Tab ID

Each tab has a unique ID used for:
- Node association via `data.tabId`
- Teleporter references
- Internal tracking

## Cross-Tab Connections

Use teleporters to pass data between tabs:

1. Add **Teleport Out** in source tab
2. Add **Teleport In** in target tab
3. Give them matching channel names
4. Connect nodes to the teleporters

See [Teleporters](./teleporters.md) for details.

## Use Cases

### Separation of Concerns

```
[Main]      - Primary workflow
[Prompts]   - Prompt engineering and testing
[Tools]     - Tool configuration
[Debug]     - Debugging and monitoring
```

### Modular Design

```
[Orchestrator] - Main control flow
[Analysis]     - Data analysis agents
[Generation]   - Content generation agents
[Validation]   - Output validation
```

### Development Workflow

```
[Production] - Production workflow
[Staging]    - Testing changes
[Scratch]    - Experimentation
```

## Tips

### Naming

Use descriptive, action-oriented names:
- "Process Orders" ✓
- "Tab 1" ✗

### Organization

Keep tabs focused:
- One concern per tab
- Use teleporters for communication
- Document with labels

### Performance

For large projects:
- Close unused tabs
- Consider multiple projects instead of many tabs

## See Also

- [Teleporters](./teleporters.md) - Cross-tab connections
- [Projects](./projects.md) - Project structure
- [Groups](./groups.md) - In-tab organization
