# ADKFlow

Visual workflow builder for Google Agent Development Kit (ADK) agents. Create, edit, and execute complex AI agent workflows using a web-based node editor.

## Overview

ADKFlow enables you to:
- **Design** agent workflows visually using a drag-and-drop interface
- **Configure** agents, subagents, and prompts with rich markdown editing
- **Export** workflows as YAML files for version control and sharing
- **Execute** workflows using the standalone CLI runner

## Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │      │                 │
│  Frontend       │◄────►│  Backend        │      │  Flow Runner    │
│  (Next.js)      │      │  (FastAPI)      │      │  (CLI)          │
│                 │      │                 │      │                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘
     Drawflow                YAML Converter            ADK Executor
     Visual Editor           API Server                Python CLI
```

### Components

1. **Frontend** (`/frontend`) - Next.js web application with Drawflow visual editor
2. **Backend** (`/backend`) - FastAPI server for workflow validation and YAML conversion
3. **Flow Runner** (`/flow-runner`) - Standalone CLI tool for executing YAML workflows with Google ADK

## Quick Start

### Prerequisites

- **Node.js** 18+ (for frontend)
- **Python** 3.11+ (for backend and runner)
- **uv** (Python package manager) - Install: `pip install uv`
- **Authentication** (choose one):
  - Google AI Studio API key ([Get one](https://aistudio.google.com/app/apikey))
  - Vertex AI with Application Default Credentials

### 1. Start the Backend

```bash
cd backend
uv pip install -e .
python -m backend.src.main
```

Backend runs at: `http://localhost:8000`
API docs: `http://localhost:8000/docs`

### 2. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: `http://localhost:3000`

### 3. Install Flow Runner

```bash
cd flow-runner
uv pip install -e .
```

### 4. Execute a Workflow

```bash
adkflow run examples/simple-workflow.yaml --var question="Analyze this data"
```

### Alternative: Automated Startup

Use the `dev.sh` script to start both backend and frontend in parallel:

```bash
# Default ports (8000, 3000)
./dev.sh

# Custom ports
./dev.sh -b 8080 -f 3001

# Show help
./dev.sh --help
```

**Port Options:**
- `-b, --backend-port PORT` - Backend port (default: 8000)
- `-f, --frontend-port PORT` - Frontend port (default: 3000)
- `-h, --help` - Show help message

**Logs:**
- Backend: `/tmp/adkflow-backend.log`
- Frontend: `/tmp/adkflow-frontend.log`

Press Ctrl+C to stop all servers.

See [PORT_CONFIGURATION.md](PORT_CONFIGURATION.md) for detailed port configuration guide.

## Features

### Visual Workflow Editor

- **Node Types**:
  - **Agent** - Container for subagents, supports sequential/parallel execution
  - **Subagent** - Execution unit with prompt and tools
  - **Prompt** - Markdown-formatted prompt templates with variable substitution

- **Connections**: Link prompts to subagents and agents together

- **Export/Import**: Save workflows as YAML, version control friendly

### Prompt Editor

- Full **markdown** support with live preview
- **Variable substitution** using `{variable}` syntax
- Syntax highlighting and formatting

### Tool Support

Configure ADK tools at agent or subagent level:
- `code_execution` - Execute Python code
- `google_search` - Web search
- `web_browser` - Fetch web content
- `file_reader`, `file_writer` - File operations
- `calculator`, `datetime` - Utilities
- `bigquery`, `cloud_storage` - Google Cloud

### Workflow Execution

Run workflows from the command line:

```bash
# Run with variables
adkflow run workflow.yaml --var key=value --var foo=bar

# Validate workflow
adkflow validate workflow.yaml

# List available tools
adkflow list-tools
```

## Project Structure

```
adkflow/
├── frontend/              # Next.js web application
│   ├── app/              # App router pages
│   ├── components/       # React components (Drawflow, nodes, editor)
│   └── lib/              # API client, types, utilities
│
├── backend/              # FastAPI server
│   └── src/
│       ├── api/          # REST API routes
│       ├── models/       # Pydantic models
│       └── services/     # YAML conversion, validation
│
├── flow-runner/          # CLI execution tool
│   └── src/adkflow/
│       ├── cli.py        # Click CLI interface
│       ├── parser.py     # YAML parsing
│       ├── executor.py   # ADK agent orchestration
│       └── variable_resolver.py  # Variable substitution
│
├── schemas/              # YAML schema documentation
│   └── workflow-schema.md
│
└── examples/             # Sample workflows
    ├── simple-workflow.yaml
    └── sample-workflow.yaml
```

## Workflow YAML Format

Workflows are defined in YAML with this structure:

```yaml
workflow:
  name: "my-workflow"
  version: "1.0"

  variables:
    input_data: "default value"

  prompts:
    analyze_prompt:
      content: "Analyze: {input_data}"
      variables: ["input_data"]

  agents:
    - id: "analyzer"
      type: "sequential"
      model: "gemini-2.0-flash-exp"
      temperature: 0.7
      tools: ["code_execution"]

      subagents:
        - id: "main"
          prompt_ref: "analyze_prompt"
          tools: ["code_execution"]

  connections: []
```

See [`schemas/workflow-schema.md`](schemas/workflow-schema.md) for complete specification.

## Examples

### Simple Analysis Workflow

```bash
adkflow run examples/simple-workflow.yaml --var question="What are the trends?"
```

### Code Review Assistant

```bash
adkflow run examples/sample-workflow.yaml \
  --var repository_path=./my-project \
  --var language=python
```

## Development

### Backend Development

```bash
cd backend
uv pip install -e ".[dev]"  # Install with dev dependencies
python -m backend.src.main  # Run with auto-reload
```

Visit `http://localhost:8000/docs` for interactive API documentation.

### Frontend Development

```bash
cd frontend
npm install
npm run dev  # Runs with hot-reload
```

### Flow Runner Development

```bash
cd flow-runner
uv pip install -e .
adkflow --help
```

## Technology Stack

| Component | Technologies |
|-----------|-------------|
| Frontend | Next.js 14+, TypeScript, Tailwind CSS, Drawflow, React MD Editor |
| Backend | Python 3.11+, FastAPI, Pydantic v2, PyYAML, uvicorn |
| Runner | Python 3.11+, Google ADK (genai), Click, Rich |
| Package Manager | npm (frontend), uv (Python) |

## Roadmap

- [ ] Complete Drawflow integration (node templates, connections)
- [ ] Implement ADK execution in flow-runner
- [ ] Add node property editor panel
- [ ] Workflow validation UI feedback
- [ ] Undo/redo functionality
- [ ] Keyboard shortcuts
- [ ] Workflow templates library
- [ ] Real-time execution monitoring
- [ ] Export to Python code
- [ ] Custom tool integration
- [ ] Memory and artifact management

## Documentation

- [Workflow Schema](schemas/workflow-schema.md) - Complete YAML format specification
- [Frontend README](frontend/README.md) - Frontend setup and development
- [Backend README](backend/README.md) - Backend API documentation
- [Flow Runner README](flow-runner/README.md) - CLI usage and architecture

## Contributing

1. Follow absolute import conventions
2. Use TypeScript for frontend, type hints for Python
3. Run linters before committing
4. Add tests for new features
5. Update documentation

## License

[Add your license here]

## Support

For issues and feature requests, please open an issue on GitHub.
