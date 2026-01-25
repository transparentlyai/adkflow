# CLI Documentation

Command-line interface for ADKFlow.

## Overview

ADKFlow provides two CLI tools:

| Tool | Purpose | Package |
|------|---------|---------|
| `adkflow` | Development server management | `adkflow` (main) |
| `adkflow-runner` | Standalone workflow execution | `adkflow-runner` |

## Installation

### Main CLI (Development)

```bash
# From project root
pip install -e .

# Or with uv
uv pip install -e .
```

### Runner CLI (Standalone)

```bash
# Install just the runner
pip install adkflow-runner

# Or from source
pip install -e ./packages/adkflow-runner
```

## Quick Start

### Development

```bash
# Start development environment
adkflow dev

# Opens:
#   Frontend: http://localhost:6006
#   Backend:  http://localhost:6000
#   API docs: http://localhost:6000/docs
```

### Running Workflows

```bash
# Run a workflow project
adkflow run /path/to/project

# Run with input
adkflow run . --input '{"prompt": "Hello!"}'

# Validate without running
adkflow validate .
```

## Command Groups

### Server Management

Commands for managing the ADKFlow development environment:

- `adkflow dev` - Start development servers (hot reload)
- `adkflow start` - Start production servers
- `adkflow stop` - Stop running servers
- `adkflow backend` - Start only backend
- `adkflow frontend` - Start only frontend
- `adkflow setup` - Install dependencies

### Workflow Execution

Commands for running and validating workflows:

- `adkflow run` - Execute a workflow
- `adkflow validate` - Validate a workflow
- `adkflow-runner topology` - Show agent topology

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKEND_PORT` | `6000` | Backend server port |
| `FRONTEND_PORT` | `6006` | Frontend server port |

Load from `.env` file in project root:

```bash
# .env
BACKEND_PORT=8080
FRONTEND_PORT=3001
GOOGLE_API_KEY=your_key_here
```

## Output Styling

The CLI uses [Rich](https://rich.readthedocs.io/) for styled output when available. Falls back to plain text if not installed.

```bash
# Install with rich support
pip install rich
```

## See Also

- [Commands Reference](./commands.md) - All commands in detail
- [Getting Started](../../user-manual/getting-started.md) - First steps
- [Running Workflows](../../user-manual/running-workflows.md) - Execution guide
