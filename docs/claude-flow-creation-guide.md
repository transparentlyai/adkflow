# ADKFlow Flow Creation Guide (Claude Reference)

## Manifest Structure (v3.0)

```json
{
  "version": "3.0",
  "name": "Project Name",
  "tabs": [...],
  "nodes": [...],
  "edges": [...],
  "settings": { "defaultModel": "gemini-2.5-flash" }
}
```

### Tab Structure
```json
{
  "id": "tab_unique_id",
  "name": "Tab Display Name",
  "order": 0,
  "viewport": {
    "x": 0.0,
    "y": 0.0,
    "zoom": 1.0
  }
}
```
**Note:** Always preserve `viewport` values when updating - they represent the user's pan/zoom state.

## Node Type Mapping

### Built-in Nodes (type field values)
| Type String | Schema unit_id | Category |
|-------------|----------------|----------|
| `agent` | builtin.agent | Agents |
| `prompt` | builtin.prompt | Content |
| `context` | builtin.context | Content |
| `context_aggregator` | builtin.context_aggregator | Content |
| `variable` | builtin.variable | Utility |
| `userInput` | builtin.userInput | Interaction |
| `tool` | builtin.tool | Tools |
| `shellTool` | builtin.shellTool | Tools |
| `agentTool` | builtin.agentTool | Tools |
| `process` | builtin.process | Processing |
| `start` | builtin.start | Flow Control |
| `end` | builtin.end | Flow Control |
| `teleportIn` | builtin.teleportIn | Connectors |
| `teleportOut` | builtin.teleportOut | Connectors |
| `monitor` | builtin.monitor | Probes |
| `inputProbe` | builtin.inputProbe | Probes |
| `outputProbe` | builtin.outputProbe | Probes |
| `logProbe` | builtin.logProbe | Probes |
| `callback` | builtin.callback | Callbacks |
| `schema` | builtin.schema | Schema |
| `outputFile` | builtin.outputFile | Output |

### Custom Extension Nodes
**Format:** `custom:{unit_id}`

Example: `custom:advanced.api_client`

Extensions must be in `adkflow_extensions/` directory (symlink or actual).

---

## Node Data Structure

### Minimal (new nodes)
```json
{
  "id": "unique_id",
  "type": "node_type",
  "position": { "x": 100.0, "y": 200.0 },
  "data": {
    "config": { /* node-specific config */ },
    "isExpanded": false,
    "tabId": "tab_id",
    "activeTab": "General"
  }
}
```

### Full (existing nodes may have all these - PRESERVE THEM)
```json
{
  "id": "unique_id",
  "type": "node_type",
  "position": { "x": 100.0, "y": 200.0 },
  "data": {
    "config": { /* node-specific config */ },
    "isExpanded": true,
    "tabId": "tab_id",
    "activeTab": "General",
    "contractedPosition": { "x": 100, "y": 200 },
    "expandedPosition": { "x": 100, "y": 200 },
    "expandedSize": { "width": 400, "height": 300 },
    "fileSaveState": {
      "filePath": "prompts/file.prompt.md",
      "content": "...",
      "isDirty": false
    }
  },
  "selected": false,
  "dragging": false,
  "measured": { "width": 350.0, "height": 478.0 }
}
```

---

## Handle Names by Node Type

### Agent Node
**Inputs:**
- `input` - main input (accepts agent, prompt, tool, context, flow)
- `agent-input` - typed agent/flow input
- `prompt-input` - prompt input
- `tools-input` - tool input
- `context-input` - context/variables input
- `sub-agents` - receives plug from child agents (RIGHT side, target)
- `link-top` - agent chaining (top)

**Outputs:**
- `output` - main output
- `plug` - connects to parent's sub-agents (LEFT side, source)
- `link-bottom` - agent chaining (bottom)
- `finish-reason` - finish reason dict

### Prompt/Context Nodes
**Inputs:** None
**Outputs:** `output`

### Tool/ShellTool Nodes
**Inputs:** None
**Outputs:** `output`

### Variable Node
**Inputs:** None
**Outputs:** `output`

### UserInput Node
**Inputs:** `input` (trigger)
**Outputs:** `output`

### Start Node
**Inputs:** None
**Outputs:** `output`

### End Node (SINK)
**Inputs:** `input`
**Outputs:** None

### Monitor Node (SINK)
**Inputs:** `input`
**Outputs:** None

### TeleportOut Node
**Inputs:** `input`
**Outputs:** None (data goes to matching TeleportIn)

### TeleportIn Node
**Inputs:** None (receives from matching TeleportOut)
**Outputs:** `output`

### Process Node
**Inputs:** `input`
**Outputs:** `output`

### Context Aggregator Node (DYNAMIC INPUTS)
**Inputs:** None static - uses `dynamic_inputs: true`
**Outputs:** `output`
**WARNING:** Cannot receive direct connections! Use agent instead.

### API Client Extension
**Inputs:** `url`, `body`, `params`, `headers`
**Outputs:** `response`, `status_code`, `response_headers`, `error`

### API Response Parser Extension
**Inputs:** `response` (only accepts api_client source)
**Outputs:** `data`, `success`

---

## Sink Nodes (NO outputs - cannot chain forward)

- `end` - workflow termination
- `monitor` - display only
- `outputProbe` - capture only
- `logProbe` - logging only
- `teleportOut` - sends to teleporter (not direct output)

**CRITICAL:** Never create edges FROM sink nodes. They terminate data flow.

---

## Nodes Without Static Inputs

- `context_aggregator` - has `dynamic_inputs: true`, no static input handle
- `prompt` - no inputs, only outputs
- `context` - no inputs, only outputs
- `tool` - no inputs, only outputs
- `shellTool` - no inputs, only outputs
- `variable` - no inputs, only outputs
- `start` - no inputs, only outputs
- `teleportIn` - no direct inputs (receives via teleporter system)

**CRITICAL:** Don't try to connect edges TO nodes without input handles.

---

## Sub-Agent Connection Pattern

```
Child Agent (plug output) ──→ Parent Agent (sub-agents input)
```

- Child's `plug` handle is on LEFT (source, output direction)
- Parent's `sub-agents` handle is on RIGHT (target, input direction)
- This is REVERSED from normal left-input/right-output convention

```json
{
  "id": "edge_child_to_parent",
  "source": "child_agent_id",
  "target": "parent_agent_id",
  "sourceHandle": "plug",
  "targetHandle": "sub-agents"
}
```

---

## Config Fields by Node Type

### Agent
```json
{
  "name": "Agent Name",
  "description": "Description",
  "model": "gemini-2.5-flash",
  "temperature": 0.7,
  "max_output_tokens": 8192,
  "planner_type": "none",
  "include_contents": true
}
```

### Prompt/Context
```json
{
  "name": "Display Name",
  "file_path": "prompts/file.prompt.md"
}
```

### Variable
```json
{
  "name": "variable_name",
  "value": "variable value"
}
```

### UserInput
```json
{
  "name": "Input Name",
  "timeout": 300,
  "timeoutBehavior": "error",
  "predefinedText": ""
}
```

### Tool
```json
{
  "name": "Tool Name",
  "file_path": "tools/tool.py"
}
```

### ShellTool
```json
{
  "name": "Shell Tool Name",
  "allowed_commands": "echo:*\nls:*",
  "timeout": 30,
  "output_mode": "combined",
  "error_behavior": "pass_to_model",
  "working_directory": "",
  "pre_shell": "",
  "post_shell": "",
  "environment_variables": "",
  "max_output_size": 100000
}
```

### Process
```json
{
  "name": "Process Name",
  "description": "Description",
  "file_path": "",
  "code": "def process(data, options=None):\n    return {'status': 'success', 'data': data}"
}
```

### TeleportIn/TeleportOut
```json
{
  "name": "ConnectorName"
}
```
**CRITICAL:** `name` must match between In and Out pairs.

### Monitor
```json
{
  "name": "Monitor Name"
}
```

### Start/End
```json
{}
```

### Context Aggregator
```json
{
  "name": "Aggregator Name",
  "aggregationMode": "pass",
  "outputVariableName": "context",
  "separator": "\\n\\n---",
  "includeMetadata": false,
  "dynamicInputs": [
    {
      "id": "input_1",
      "label": "File Source",
      "variableName": "file_content",
      "inputType": "file",
      "filePath": "static/my-file.md"
    },
    {
      "id": "input_2",
      "label": "URL Source",
      "variableName": "url_content",
      "inputType": "url",
      "url": "https://example.com/docs"
    },
    {
      "id": "input_3",
      "label": "Directory Source",
      "variableName": "dir_content",
      "inputType": "directory",
      "directoryPath": "static/docs",
      "globPattern": "*.md",
      "directoryAggregation": "concatenate",
      "recursive": false
    }
  ]
}
```
**Dynamic Input Types:**
- `file` - Single file: requires `filePath`
- `url` - Web content: requires `url`
- `directory` - Multiple files: requires `directoryPath`, `globPattern`
- `node` - Edge connection: creates input handle with `id` as handle name

**Note:** File, URL, and Directory inputs don't need edges - they're configured in `dynamicInputs`. Only `node` type creates a handle for edge connections.

### API Client Extension
```json
{
  "name": "API Client Name",
  "method": "GET",
  "content_type": "application/json",
  "response_type": "json",
  "auth_type": "none",
  "timeout": 30,
  "max_retries": 3,
  "retry_delay": 1.0,
  "enable_cache": true,
  "verify_ssl": true,
  "follow_redirects": true,
  "custom_headers": "{}"
}
```

---

## Edge Structure

```json
{
  "id": "edge_unique_id",
  "source": "source_node_id",
  "target": "target_node_id",
  "sourceHandle": "output_handle_name",
  "targetHandle": "input_handle_name"
}
```

---

## Common Flow Patterns

### Basic Agent Flow
```
Start → Agent → Monitor
        ↑
      Prompt
```

### Multi-Tab with Teleport
```
Tab 1: Start → Agent → TeleportOut("Data")
Tab 2: TeleportIn("Data") → Agent → Monitor/End
```

### Sub-Agent Pattern
```
Data Source → Coordinator Agent ←─────────────────┐
                    ↑ (sub-agents)                │
        ┌───────────┼───────────┐                 │
        │ (plug)    │ (plug)    │ (plug)          │
   Sub-Agent 1  Sub-Agent 2  Sub-Agent 3          │
        ↑           ↑           ↑                 │
     Prompt      Prompt      Prompt               │
                                                  │
   (NO direct data connections to sub-agents!)───┘
```

**CRITICAL:** Sub-agents receive data from their parent via the plug/sub-agents relationship.
Do NOT connect data sources directly to sub-agents - only connect:
- Prompts to sub-agents (for their instructions)
- Tools to sub-agents (for their capabilities)
- Sub-agents to parent via plug → sub-agents

### Output Tab Pattern (CORRECT)
```
TeleportIn → Agent → Monitor
               ↓
              End
```
**NOT:** TeleportIn → Context Aggregator (no static inputs!)

---

## Project Structure

```
project/
├── manifest.json
├── prompts/
│   └── *.prompt.md
├── static/
│   └── *.md (context files)
├── tools/
│   └── *.py
└── adkflow_extensions/  (symlink or dir)
    └── extension_name/
        ├── __init__.py
        └── nodes.py
```

---

## Critical Mistakes to Avoid

1. **Monitor has no output** - Don't connect Monitor → End
2. **Context Aggregator has no static input** - Don't connect anything → Context Aggregator directly
3. **Custom extension type format** - Use `custom:unit_id` not just `unit_id`
4. **Sub-agent handles reversed** - plug is source (left), sub-agents is target (right)
5. **Teleporter names must match** - TeleportIn.name === TeleportOut.name
6. **Config field names** - Must match schema field IDs exactly
7. **Missing activeTab** - Always include `"activeTab": "General"` in node data
8. **Don't connect data directly to sub-agents** - Parent agent manages sub-agent data flow via plug/sub-agents relationship. Only connect prompts and tools to sub-agents, not data sources.
9. **Modifying existing node properties** - When updating flows, NEVER change position, measured, expandedPosition, contractedPosition, expandedSize, selected, dragging, or viewport. Only modify what's explicitly needed.
10. **Context Aggregator sources** - Use `dynamicInputs` array in config for file/url/directory sources. These don't need edges. Only `node` type inputs create handles for edge connections.

---

## Updating Existing Flows (CRITICAL)

When modifying an existing manifest.json, **preserve all existing properties**. Only change what's explicitly needed.

### Properties to NEVER modify (unless explicitly requested):

**Node properties:**
```json
{
  "position": { "x": 100.0, "y": 200.0 },      // User-set position
  "measured": { "width": 350.0, "height": 478.0 }, // UI-calculated size
  "expandedPosition": { "x": 100, "y": 200 },  // Position when expanded
  "contractedPosition": { "x": 100, "y": 200 }, // Position when contracted
  "expandedSize": { "width": 400, "height": 300 }, // Size when expanded
  "selected": false,                            // Selection state
  "dragging": false                             // Drag state
}
```

**Tab viewport:**
```json
{
  "viewport": {
    "x": 536.1017,    // Pan position X
    "y": 307.8792,    // Pan position Y
    "zoom": 0.8916    // Zoom level
  }
}
```

**Config values set by user:**
- All values in `data.config` that were explicitly set
- `data.isExpanded` state
- `data.activeTab` selection
- Monitor's `monitoredValue`, `monitoredValueType`, `monitoredTimestamp`

### Safe modifications:

1. **Adding new nodes** - Set initial position, let UI handle the rest
2. **Adding new edges** - Only specify required fields (id, source, target, handles)
3. **Adding new config fields** - When schema requires them
4. **Fixing broken references** - Correcting typos in IDs or handles

### Example: Adding a node to existing flow

**DO:**
```json
{
  "id": "new_node_001",
  "type": "prompt",
  "position": { "x": 200.0, "y": 300.0 },
  "data": {
    "config": { "name": "New Prompt", "file_path": "prompts/new.prompt.md" },
    "isExpanded": false,
    "tabId": "existing_tab_id",
    "activeTab": "General"
  }
}
```

**DON'T:**
- Reorganize or reformat the JSON
- Change positions of existing nodes
- Remove properties you don't recognize
- "Clean up" measured/selected/dragging fields

---

## Reference Files

- Node schemas: `/frontend/lib/builtinNodeSchemas/*.ts`
- Type mapping: `/frontend/lib/builtinNodeHelpers.ts` → `builtinTypeToSchema`
- Hydration: `/frontend/lib/nodeHydration.ts`
- Custom extensions: `/extensions/*/nodes.py`
- Example manifests:
  - Simple: `/home/mauro/adkflow/t2/manifest.json`
  - Complex (multi-agent + extensions): `/home/mauro/adkflow/demo-workflow/manifest.json`
