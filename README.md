# ADKFlow

Visual workflow builder for Google Agent Development Kit (ADK). Design and configure AI agent workflows through an intuitive node-based editor.

## Quick Start

```bash
git clone https://github.com/transparentlyai/adkflow.git
cd adkflow
./adkflow setup   # Install dependencies
./adkflow start   # Start the app
```

Open http://localhost:3000 and start building workflows.

---

## Features

### Visual Node Editor

Build workflows by connecting nodes on an interactive canvas:

- **Right-click** to add nodes from context menu
- **Drag between handles** to connect nodes
- **Group nodes** into collapsible containers
- **Multi-select** with Shift+click or box selection
- **Copy/paste** nodes with Ctrl+C/V
- **Undo/redo** support
- **Zoom, pan, minimap** for navigation
- **Lock canvas** to prevent accidental edits

### Node Types

| Node | Purpose |
|------|---------|
| **Agent** | LLM execution with sequential/parallel/loop modes |
| **Prompt** | Markdown templates with `{variable}` substitution |
| **Context** | Configuration and context data |
| **Tool** | External tool configuration |
| **Variable** | Define workflow variables |
| **Group** | Visual container for organizing nodes |
| **Label** | Documentation and annotations |
| **Probes** | Monitor input/output/logs |
| **Teleport** | Cross-canvas connections |

### Project Management

- Multi-tab workflow editing
- Auto-save with unsaved changes protection
- Light and dark themes
- Session persistence across reloads

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

## CLI Commands

```bash
./adkflow dev       # Start development servers
./adkflow start     # Start production servers
./adkflow stop      # Stop running servers
./adkflow setup     # Install all dependencies
```

---

## Configuration

### Environment Variables

```bash
# Google AI Studio
export GOOGLE_API_KEY="your-api-key"

# Or Vertex AI
export GOOGLE_GENAI_USE_VERTEXAI=true
export GOOGLE_CLOUD_PROJECT="your-project"
export GOOGLE_CLOUD_LOCATION="us-central1"
```

### Project Storage

Workflows are saved as JSON files:

```
my-project/
├── manifest.json          # Project metadata
├── prompts/               # Prompt markdown files
│   └── analyze.prompt.md
└── tabs/
    └── main.flow.json     # Canvas state
```

---

## Development

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+ and [uv](https://docs.astral.sh/uv/)

### Manual Setup

```bash
# Frontend
cd frontend && npm install

# Backend
cd backend && uv pip install -e .
```

### Running Servers

```bash
# Using CLI
./adkflow dev

# Or manually
cd backend && python -m backend.src.main  # Terminal 1
cd frontend && npm run dev                 # Terminal 2
```

### Tech Stack

| Component | Technologies |
|-----------|-------------|
| **Frontend** | Next.js 15, TypeScript, ReactFlow, Tailwind, Radix UI, Monaco |
| **Backend** | FastAPI, Pydantic v2, uvicorn |

API docs: http://localhost:8000/docs

### Project Structure

```
adkflow/
├── frontend/          # Next.js application
│   ├── components/    # React components + nodes
│   ├── contexts/      # Theme, project, tabs state
│   └── lib/           # Utilities and types
├── backend/           # FastAPI server
│   └── src/api/       # REST endpoints
└── cli/               # Dev server management
```

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
