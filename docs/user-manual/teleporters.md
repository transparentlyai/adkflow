# Teleporters

Connecting workflows across tabs.

## What are Teleporters?

Teleporters enable data flow between different tabs:
- **Teleport Out**: Sends data to a named channel
- **Teleport In**: Receives data from that channel

This allows you to:
- Split complex workflows across tabs
- Create reusable workflow modules
- Keep canvases clean and focused

## How They Work

```
[Tab A]                          [Tab B]
┌────────────────────┐           ┌────────────────────┐
│                    │           │                    │
│  [Agent] → [Teleport Out]      │  [Teleport In] → [Agent]
│              "results"         │     "results"      │
│                    │           │                    │
└────────────────────┘           └────────────────────┘
```

1. Data flows into Teleport Out in Tab A
2. Teleport Out sends to channel "results"
3. Teleport In in Tab B receives from "results"
4. Data continues to connected nodes

## Creating Teleporters

### Add Teleport Out

1. **Right-click** → **Connectors → Teleport Out**
2. Configure the channel name
3. Connect input to the data source

### Add Teleport In

1. **Right-click** → **Connectors → Teleport In**
2. Use the same channel name
3. Connect output to data consumers

## Channel Configuration

### Channel Name

The channel name links teleporters:
- Must match exactly between Out and In
- Case-sensitive
- Can include any characters

### Naming Convention

Use descriptive names:
- `user_query` ✓
- `analysis_results` ✓
- `data` ✗ (too vague)

## Visual Indicators

### Color Coding

Matched teleporters share a color:
- Each unique channel gets a color
- Makes it easy to trace connections
- Colors are assigned automatically

### Channel Badge

Both Teleport In and Out display:
- The channel name
- The assigned color

## Multiple Receivers

One Teleport Out can feed multiple Teleport In nodes:

```
[Tab A]                     [Tab B]           [Tab C]
Teleport Out      →         Teleport In   →   Agent B
  "shared"        →         "shared"
                  →     [Tab D]
                  →     Teleport In   →   Agent D
                        "shared"
```

All receivers get the same data.

## Execution Order

During workflow execution:
1. Teleport Out waits for its input data
2. Data is sent to the channel
3. Teleport In nodes receive the data
4. Connected nodes in those tabs execute

## Use Cases

### Modular Workflows

Separate concerns into tabs:

```
[Data Ingestion]
  Teleport Out → "raw_data"

[Processing]
  Teleport In ← "raw_data"
  ... processing ...
  Teleport Out → "processed"

[Output]
  Teleport In ← "processed"
  ... output generation ...
```

### Shared Resources

Send common data to multiple tabs:

```
[Config Tab]
  Teleport Out → "api_config"
  Teleport Out → "user_context"

[Tab A]
  Teleport In ← "api_config"

[Tab B]
  Teleport In ← "api_config"
  Teleport In ← "user_context"
```

### Debugging

Create a debug tab that receives from multiple points:

```
[Main Workflow]
  Agent A → Teleport Out → "debug_a"
  Agent B → Teleport Out → "debug_b"

[Debug Tab]
  Teleport In ← "debug_a" → Log Probe
  Teleport In ← "debug_b" → Log Probe
```

## Tips

### Naming

- Use namespaces: `auth.token`, `data.raw`, `output.final`
- Be specific: `user_sentiment_score` not `score`

### Documentation

- Add Labels near teleporters explaining the channel
- Document channel names in project README

### Debugging

- Check channel names match exactly
- Verify data types are compatible
- Use probes to inspect teleporter data

## Limitations

- One-way only (Out → In)
- No direct loops through teleporters
- Channel names are project-scoped

## See Also

- [Tabs](./tabs.md) - Working with multiple tabs
- [Connections](./connections.md) - Connection basics
- [Running Workflows](./running-workflows.md) - Execution across tabs
