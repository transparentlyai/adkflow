# ADKFlow

Visual workflow builder for Google Agent Development Kit (ADK). Design, configure, and execute AI agent workflows through an intuitive node-based editor.

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+ and [uv](https://docs.astral.sh/uv/) (`pip install uv`)
- Google AI API key ([Get one](https://aistudio.google.com/app/apikey)) or Vertex AI credentials

### Installation

```bash
git clone https://github.com/transparentlyai/adkflow.git
cd adkflow

# Install CLI tool
cd flow-runner && uv pip install -e . && cd ..

# Install frontend
cd frontend && npm install && cd ..

# Install backend
cd backend && uv pip install -e . && cd ..
```

### Start Development Servers

```bash
# Option 1: Use CLI (starts both backend and frontend)
./adkflow dev

# Option 2: Manual startup
# Terminal 1 - Backend
cd backend && python -m backend.src.main

# Terminal 2 - Frontend
cd frontend && npm run dev
```

Open http://localhost:3000 to start building workflows.

### Run a Workflow

```bash
export GOOGLE_API_KEY="your-api-key"
./adkflow run examples/simple-workflow.yaml --var question="What are the trends?"
```

---

## Features

### Visual Node Editor

Build workflows by connecting nodes on an interactive canvas:

- **Drag & drop** nodes from context menu (right-click)
- **Connect nodes** by dragging between handles
- **Group nodes** into collapsible containers
- **Multi-select** with shift-click or box selection
- **Copy/paste** with Ctrl+C/V
- **Undo/redo** support
- **Canvas controls**: zoom, pan, fit view, minimap
- **Lock canvas** to prevent accidental edits

### Node Types (16)

| Node | Purpose |
|------|---------|
| **Agent** | Container for execution with LLM/sequential/parallel/loop modes |
| **Prompt** | Markdown prompt templates with `{variable}` substitution |
| **Context** | Configuration and context data |
| **Tool** | External tool configuration |
| **Agent Tool** | Agent-level tool binding |
| **Variable** | Define workflow variables |
| **Process** | Process execution node |
| **Group** | Visual container for organizing nodes |
| **Label** | Documentation and annotations |
| **Input Probe** | Monitor input data |
| **Output Probe** | Monitor output data |
| **Log Probe** | Debug logging |
| **Output File** | Display file contents |
| **User Input** | Collect user input at runtime |
| **Teleport In/Out** | Cross-canvas connections |

### Theme System

- Light and dark themes
- Theme-aware UI components and scrollbars
- Custom theme support via JSON import/export

### Project Management

- Create and manage multiple projects
- Multi-tab workflow editing
- Auto-save with unsaved changes protection
- Session persistence across reloads

---

## Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Frontend      │◄────►│   Backend       │      │   CLI Runner    │
│   (Next.js)     │      │   (FastAPI)     │      │   (Python)      │
│                 │      │                 │      │                 │
│  ReactFlow      │      │  Project API    │      │  ADK Executor   │
│  Visual Editor  │      │  File System    │      │  YAML Parser    │
└─────────────────┘      └─────────────────┘      └─────────────────┘
     :3000                    :8000                   CLI tool
```

| Component | Description |
|-----------|-------------|
| **Frontend** | Next.js 15 with ReactFlow for visual editing |
| **Backend** | FastAPI server for project management and file operations |
| **CLI Runner** | Standalone tool for executing workflows with Google ADK |

---

## CLI Reference

The `./adkflow` wrapper script runs CLI commands from the project root.

### Workflow Commands

```bash
# Execute a workflow
./adkflow run <file.yaml> [--var KEY=VALUE]... [-v|--verbose]

# Validate without running
./adkflow validate <file.yaml>

# List available tools
./adkflow list-tools
```

### Server Commands

```bash
# Start both backend and frontend
./adkflow dev
./adkflow dev -b 8080 -f 3001    # Custom ports

# Start individual servers
./adkflow backend [--port 8000]
./adkflow frontend [--port 3000]

# Production mode (with build)
./adkflow start [--build]

# Stop all servers
./adkflow stop

# Initial setup
./adkflow setup
```

### Environment Variables

```bash
# Google AI Studio
export GOOGLE_API_KEY="your-api-key"

# Or Vertex AI
export GOOGLE_GENAI_USE_VERTEXAI=true
export GOOGLE_CLOUD_PROJECT="your-project"
export GOOGLE_CLOUD_LOCATION="us-central1"
```

---

## Workflow YAML Format

```yaml
workflow:
  name: "my-workflow"
  version: "1.0"

  variables:
    input_data: "default value"

  prompts:
    analyze_prompt:
      content: |
        Analyze the following: {input_data}
        Provide insights and recommendations.
      variables:
        - input_data

  agents:
    - id: "analyzer"
      type: "sequential"          # llm | sequential | parallel | loop
      model: "gemini-2.0-flash-exp"
      temperature: 0.7
      tools:
        - "code_execution"

      subagents:
        - id: "main"
          prompt_ref: "analyze_prompt"

  connections: []
```

See [schemas/workflow-schema.md](schemas/workflow-schema.md) for complete specification.

### Available Tools

| Tool | Description |
|------|-------------|
| `code_execution` | Execute Python code |
| `google_search` | Web search |
| `web_browser` | Fetch web content |
| `file_reader` | Read files |
| `file_writer` | Write files |
| `calculator` | Math operations |
| `datetime` | Date/time utilities |
| `bigquery` | Google BigQuery |
| `cloud_storage` | Google Cloud Storage |

---

## Project Structure

```
adkflow/
├── frontend/                 # Next.js application
│   ├── app/                  # App router and pages
│   ├── components/
│   │   ├── nodes/           # 16 node type components
│   │   └── ui/              # shadcn/ui components
│   ├── contexts/            # React contexts (theme, project, tabs)
│   └── lib/                 # Utilities, types, themes
│
├── backend/                  # FastAPI server
│   └── src/
│       ├── main.py          # App entry point
│       ├── api/routes.py    # REST endpoints
│       ├── models/          # Pydantic models
│       └── services/        # YAML conversion
│
├── flow-runner/              # CLI tool
│   └── src/adkflow/
│       ├── cli.py           # Command definitions
│       ├── executor.py      # Workflow execution
│       ├── parser.py        # YAML parsing
│       └── tools.py         # Tool registry
│
├── examples/                 # Sample workflows
├── schemas/                  # YAML schema docs
├── docs/                     # Additional documentation
└── adkflow                   # CLI wrapper script
```

---

## Development

### Frontend

```bash
cd frontend
npm install
npm run dev          # Development with hot-reload
npm run build        # Production build
npm run lint         # ESLint
```

**Tech stack**: Next.js 15, TypeScript, Tailwind CSS, ReactFlow, Radix UI, Monaco Editor

### Backend

```bash
cd backend
uv pip install -e .
python -m backend.src.main    # Runs on :8000 with auto-reload
```

API docs: http://localhost:8000/docs

**Tech stack**: FastAPI, Pydantic v2, uvicorn

### CLI Runner

```bash
cd flow-runner
uv pip install -e .
adkflow --help
```

**Tech stack**: Click, Google GenAI SDK, Rich

---

## Examples

```bash
# Simple analysis workflow
./adkflow run examples/simple-workflow.yaml \
  --var question="What are the key trends in AI?"

# Code review assistant (complex multi-agent)
./adkflow run examples/sample-workflow.yaml \
  --var repository_path=./my-project \
  --var language=python
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+C` | Copy selected nodes |
| `Ctrl+X` | Cut selected nodes |
| `Ctrl+V` | Paste nodes |
| `Delete` | Delete selected nodes |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+A` | Select all |
| Right-click | Context menu |

---

## Documentation

- [Workflow Schema](schemas/workflow-schema.md) - YAML format specification
- [Getting Started](docs/GETTING_STARTED.md) - Detailed setup guide
- [Project Management](docs/PROJECT_MANAGEMENT.md) - Working with projects
- [Port Configuration](docs/PORT_CONFIGURATION.md) - Custom port setup
- [Flow Runner Guide](flow-runner/README.md) - CLI documentation
- [Vertex AI Setup](flow-runner/VERTEX_AI.md) - Google Cloud authentication

---

## Contributing

1. Use absolute imports
2. TypeScript for frontend, type hints for Python
3. Run linters before committing (`npm run lint`, `ruff check`)
4. Follow conventional commit messages

---

## License

MIT

---

## Support

Issues and feature requests: [GitHub Issues](https://github.com/transparentlyai/adkflow/issues)
