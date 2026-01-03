# Tracing System

ADKFlow includes OpenTelemetry-based tracing for visualizing agent execution flow. This document covers configuration, usage, and integration details.

## Overview

The tracing system provides:

- **OpenTelemetry integration**: Uses ADK's built-in tracing instrumentation
- **Automatic span creation**: Agent invocations, tool calls, and LLM requests are traced automatically
- **Local visualization**: Traces are stored in JSONL format and viewable in the Debug UI
- **Project-scoped traces**: Each executed project gets its own trace file in `logs/`

## Quick Start

### Development Mode

When running with `./adkflow dev`, tracing is enabled automatically:

```bash
./adkflow dev
```

Access the trace viewer at `http://localhost:3000/debug?tab=traces`

### View Traces

Traces are written to the executed project's directory:

```
/path/to/project/
├── logs/
│   ├── adkflow.jsonl    # Structured logs
│   └── traces.jsonl     # OpenTelemetry spans
├── manifest.json
└── ...
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ADKFLOW_TRACING_ENABLED` | Enable/disable tracing | `true` |
| `ADKFLOW_TRACE_FILE` | Trace file name | `traces.jsonl` |
| `ADKFLOW_TRACE_CLEAR_BEFORE_RUN` | Clear traces on each run | `false` |

```bash
# Disable tracing
export ADKFLOW_TRACING_ENABLED=false

# Custom trace file name
export ADKFLOW_TRACE_FILE=my-traces.jsonl

# Clear traces before each workflow run
export ADKFLOW_TRACE_CLEAR_BEFORE_RUN=true
```

### Config File

Tracing configuration can be set in `manifest.json` under the `logging` key:

```json
{
  "name": "my-project",
  "logging": {
    "level": "INFO",
    "trace_clear_before_run": true
  }
}
```

The `trace_clear_before_run` option clears the trace file at the start of each workflow run, keeping only the most recent execution's traces.

### Configuration Priority

Configuration is applied in this order (highest to lowest):

1. Function arguments (programmatic)
2. Environment variables
3. `manifest.json` configuration
4. Defaults

## Automatic Spans

ADK automatically creates spans for:

| Span Name | Description | Key Attributes |
|-----------|-------------|----------------|
| `invoke_agent` | Agent invocation | `gen_ai.agent.name`, `gen_ai.conversation.id` |
| `execute_tool` | Tool execution | `gen_ai.tool.name`, tool args/response |
| `call_llm` | LLM API call | `gen_ai.request.model`, token usage |

## Trace Structure

Each span in `traces.jsonl` contains:

```json
{
  "trace_id": "abc123...",
  "span_id": "def456...",
  "parent_span_id": "ghi789...",
  "name": "invoke_agent",
  "start_time": "2025-01-03T12:00:00.000Z",
  "end_time": "2025-01-03T12:00:01.500Z",
  "status": "OK",
  "attributes": {
    "gen_ai.agent.name": "weather_agent",
    "gen_ai.request.model": "gemini-2.0-flash"
  }
}
```

## Debug UI

### Debug Panel

In dev mode (`./adkflow dev`), the Debug Panel provides a UI toggle:

- **Clear traces before run**: Enable to automatically clear traces when starting a new workflow run

This setting is persisted to `manifest.json` and applies to future runs.

### Trace Explorer

Access the Trace Explorer at `http://localhost:3000/debug?tab=traces` or click the **📊** icon in the Run Panel.

The Trace Explorer provides:

- **Trace list**: Browse all traces with timing and status (collapsible sidebar)
- **Span tree**: Hierarchical view of spans within a trace (resizable panel)
- **Span details**: View attributes, duration, model names, and tool names
- **Timeline bars**: Visual representation of span timing relative to the trace

### Span Information

Each span displays:

| Element | Description |
|---------|-------------|
| **Icon** | Colored icon indicating span type (LLM, Agent, Tool, etc.) |
| **Name** | Formatted span name (e.g., "Invoke Agent: my_agent") |
| **Model badge** | Model name for LLM calls (e.g., "gemini-2.0-flash") |
| **Tool badge** | Tool name for tool executions |
| **Timeline bar** | Visual timing relative to trace duration |
| **Duration** | Execution time in human-readable format |

### Trace-Log Correlation

Click "View Logs" on a trace to see logs from the same time range. This helps correlate:

- Agent execution flow (traces) with detailed debug output (logs)
- Tool call spans with their logged input/output

## Programmatic Usage

### Basic Setup

Tracing is typically configured automatically, but can be set up programmatically:

```python
from adkflow_runner.telemetry import setup_tracing

# Configure tracing with defaults from manifest.json/env
setup_tracing(project_path)

# Or with explicit configuration
setup_tracing(
    project_path,
    trace_file="custom-traces.jsonl",
    enabled=True
)
```

### Check Tracing Status

```python
from adkflow_runner.telemetry import is_tracing_enabled

if is_tracing_enabled():
    print("Tracing is active")
```

## Troubleshooting

### Traces Not Appearing

1. Check tracing is enabled: `ADKFLOW_TRACING_ENABLED=true`
2. Verify ADK telemetry is available (requires `google-adk>=1.17.0`)
3. Check file permissions on project `logs/` directory
4. Refresh the Trace Explorer

### Empty Trace File

1. Run a workflow to generate traces
2. Wait 5 seconds for batch export (traces are batched for efficiency)
3. Check for errors in console output

### Missing Spans

1. Ensure the agent/tool is being executed
2. ADK only traces its built-in operations (agent invocations, tool calls, LLM requests)
3. Custom code is not automatically traced

## See Also

- [Logging System](./logging.md) - Complementary logging system
- [Execution Engine](./execution-engine.md) - How workflows are executed
- [API Reference](./api-reference.md) - Backend API endpoints
