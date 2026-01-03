# Logging System

ADKFlow includes a comprehensive, hierarchical logging system designed for debugging and monitoring workflow execution. This document covers configuration, usage, and integration details.

## Overview

The logging system provides:

- **Hierarchical categories**: Enable `api` to enable all `api.*` subcategories
- **Multiple outputs**: Console (with colors) and file logging
- **Runtime configuration**: Change log levels without restart (dev mode only)
- **ADK integration**: Automatic logging of API requests, responses, and tool calls
- **Project-scoped logs**: Each executed project gets its own `logs/` directory

## Quick Start

### Development Mode (Recommended)

When running with `./adkflow dev`, verbose logging is enabled automatically:

```bash
./adkflow dev
```

Dev mode enables:
- DEBUG log level by default
- Useful categories pre-enabled (api, compiler, runner)
- Debug API routes at `/api/debug/*`
- Clear error messages for common issues (e.g., port conflicts)

### Manual Configuration

For production or custom setups, set environment variables:

```bash
# Enable debug logging for all categories
export ADKFLOW_LOG_LEVEL=DEBUG

# Or enable specific categories
export ADKFLOW_LOG_CATEGORIES=api.*,runner.agent=DEBUG

# Run the workflow
adkflow run /path/to/project
```

### View Logs

Logs are written to the executed project's directory:

```
/path/to/project/
├── logs/
│   └── adkflow.jsonl    # Structured JSON logs (rotated)
├── manifest.json
└── ...
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ADKFLOW_LOG_LEVEL` | Global log level | `INFO` |
| `ADKFLOW_LOG_CATEGORIES` | Category-specific levels | (none) |
| `ADKFLOW_LOG_FILE` | Log file path override | `<project>/logs/` |
| `ADKFLOW_LOG_FORMAT` | Console format (`readable`/`json`) | `readable` |

### Category Syntax

Categories support wildcards and specific levels:

```bash
# Enable all API logging at DEBUG
export ADKFLOW_LOG_CATEGORIES="api.*"

# Multiple categories with different levels
export ADKFLOW_LOG_CATEGORIES="api.*,runner.agent=DEBUG,compiler=WARNING"

# Disable a specific category completely
export ADKFLOW_LOG_CATEGORIES="api.response=OFF"

# Disable all logging except errors
export ADKFLOW_LOG_LEVEL=OFF
export ADKFLOW_LOG_CATEGORIES="runner=ERROR"
```

### Config File

Logging configuration is stored in `manifest.json` under the `logging` key:

```json
{
  "name": "my-project",
  "logging": {
    "level": "INFO",
    "categories": {
      "api": "DEBUG",
      "compiler": "WARNING",
      "runner.agent.config": "DEBUG"
    },
    "file_clear_before_run": true,
    "trace_clear_before_run": true
  }
}
```

| Option | Description |
|--------|-------------|
| `level` | Global log level |
| `categories` | Per-category log levels |
| `file_clear_before_run` | Clear log file at start of each run |
| `trace_clear_before_run` | Clear trace file at start of each run |

The logging settings are managed via the Debug Panel UI when running in dev mode.

## Category Hierarchy

```
compiler
├── loader      # File loading, manifest parsing
├── parser      # Node/edge parsing
├── graph       # Graph construction
├── validator   # Validation checks
└── transformer # IR transformation

runner
├── workflow    # Workflow lifecycle
├── agent       # Agent execution
│   └── config  # Agent configuration before execution
├── tool        # Tool calls and results
└── custom_node # Custom FlowUnit execution

api
├── request     # LLM API requests
└── response    # LLM API responses
```

## Log Levels

| Level | Value | Use Case |
|-------|-------|----------|
| `DEBUG` | 10 | Detailed debugging, full payloads |
| `INFO` | 20 | General information, summaries |
| `WARNING` | 30 | Potential issues |
| `ERROR` | 40 | Errors that don't stop execution |
| `CRITICAL` | 50 | Fatal errors |
| `OFF` | 100 | Completely disable logging for a category |

## ADK Integration

### Agent Configuration Logging

Before each agent executes, its configuration is logged:

```
[INFO] runner.agent.config: Creating agent: weather_agent
  agent_id=abc123
  agent_type=llm
  model=gemini-2.0-flash
  temperature=0.7
  tool_count=2
```

At DEBUG level, full configuration including instructions:

```
[DEBUG] runner.agent.config: Agent full configuration
  instruction="You are a weather assistant..."
  tools=["get_weather", "get_forecast"]
  planner=think
  http_timeout=30000
```

### API Request/Response Logging

API calls to Gemini are logged at INFO (summary) and DEBUG (full payload):

```
[INFO] api.request: LLM request: weather_agent
  model=gemini-2.0-flash
  message_count=3
  preview="What's the weather in Paris?"

[INFO] api.response: LLM response: weather_agent
  has_content=true
  preview="The weather in Paris is currently..."
```

### Tool Execution Logging

Tool calls and results are captured:

```
[INFO] runner.tool: Tool call: get_weather
  args_preview={"city": "Paris"}

[INFO] runner.tool: Tool result: get_weather
  success=true
  result_preview={"temperature": 22, "conditions": "sunny"}
```

## Programmatic Usage

### Basic Logging

```python
from adkflow_runner.logging import get_logger

log = get_logger("compiler.loader")

# Simple messages
log.info("Loading project", project_path="/path/to/project")
log.debug("Parsed nodes", count=len(nodes))
log.warning("Missing optional file", file="config.yaml")
log.error("Failed to parse", error=str(e))

# Lazy evaluation for expensive messages
log.debug(lambda: f"Full IR: {expensive_serialize(ir)}")
```

### Timing Context

```python
from adkflow_runner.logging import get_logger, log_timing

log = get_logger("compiler")

with log_timing(log, "compile") as ctx:
    result = compile(project)
    ctx["agent_count"] = len(result.agents)
    ctx["tool_count"] = len(result.tools)

# Output: [INFO] compiler: compile completed in 1.234s
#         agent_count=5 tool_count=12
```

### Scoped Logging

```python
from adkflow_runner.logging import get_logger, log_scope

log = get_logger("runner.workflow")

with log_scope(log, "execute_agents", run_id="abc123") as scoped:
    scoped.info("Starting agent execution")
    # All logs within scope include run_id=abc123
    scoped.debug("Processing agent", agent_name="weather_agent")
```

## Runtime Configuration (Dev Mode)

When running with `./adkflow dev`, debug routes are available:

### Get Current Config

```bash
curl http://localhost:8000/api/debug/logging
```

### Update Config

```bash
curl -X PUT http://localhost:8000/api/debug/logging \
  -H "Content-Type: application/json" \
  -d '{"global_level": "DEBUG", "categories": {"api": "DEBUG"}}'
```

### List Categories

```bash
curl http://localhost:8000/api/debug/logging/categories
```

### Reset to Defaults

```bash
curl -X POST http://localhost:8000/api/debug/logging/reset
```

## Debug Panel UI

When running in dev mode (`./adkflow dev`), the Debug Panel provides a visual interface for configuring logging:

### Accessing the Debug Panel

1. Run a workflow to open the Run Panel
2. Click the **⚙** (gear) icon in the Run Panel header
3. The Debug Panel slides out with logging controls

### Available Controls

| Control | Description |
|---------|-------------|
| **Default Level** | Set global log verbosity |
| **Clear logs before run** | Toggle to clear log files on each run |
| **Clear traces before run** | Toggle to clear trace files on each run |
| **Quick Presets** | One-click presets (Production, Debug All, Silent, etc.) |
| **Categories** | Expandable tree of log categories with individual level controls |

### Quick Presets

| Preset | Effect |
|--------|--------|
| **Production** | WARNING level, minimal logging |
| **Debug All** | DEBUG level for all categories |
| **Silent** | OFF level, no logging |
| **API Focus** | DEBUG for api.* categories |
| **Agent Focus** | DEBUG for runner.agent.* categories |

Changes are saved to `manifest.json` and persist across sessions.

## Frontend Integration

A React hook is available for dev mode:

```tsx
import { useLoggingConfig } from "@/hooks/useLoggingConfig";

function DebugPanel() {
  const { isDevMode, config, updateConfig, categories } = useLoggingConfig();

  if (!isDevMode) return null;

  return (
    <select
      value={config?.globalLevel}
      onChange={(e) => updateConfig({ globalLevel: e.target.value })}
    >
      <option value="DEBUG">DEBUG</option>
      <option value="INFO">INFO</option>
      <option value="WARNING">WARNING</option>
      <option value="ERROR">ERROR</option>
      <option value="OFF">OFF</option>
    </select>
  );
}
```

## File Rotation

Log files are automatically rotated:

- Default max size: 10MB per file
- Default backup count: 5 files
- Rotation creates: `adkflow.jsonl.1`, `adkflow.jsonl.2`, etc.

## Troubleshooting

### Logs Not Appearing

1. Check log level: `ADKFLOW_LOG_LEVEL=DEBUG`
2. Verify category is enabled: `ADKFLOW_LOG_CATEGORIES=runner.*`
3. Check file permissions on project `logs/` directory

### Too Much Output

1. Increase log level: `ADKFLOW_LOG_LEVEL=WARNING`
2. Disable verbose categories: `ADKFLOW_LOG_CATEGORIES=api=ERROR`

### Finding Specific Logs

```bash
# Search for errors in JSON logs
cat logs/adkflow.jsonl | jq 'select(.level == "ERROR")'

# Filter by category
cat logs/adkflow.jsonl | jq 'select(.category | startswith("api"))'

# Search for specific text
grep "workflow" logs/adkflow.jsonl | jq .
```

## See Also

- [Tracing System](./tracing.md) - OpenTelemetry tracing for execution flow visualization
- [Execution Engine](./execution-engine.md) - How workflows are executed
- [API Reference](./api-reference.md) - Backend API endpoints
- [Troubleshooting](../../user-manual/troubleshooting.md) - Common issues and solutions
