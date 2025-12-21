# ADKFlow

Visual workflow builder for Google Agent Development Kit (ADK). Design and configure AI agent workflows through an intuitive node-based editor.

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+ and [uv](https://docs.astral.sh/uv/) (`pip install uv`)
- Google AI API key ([Get one](https://aistudio.google.com/app/apikey)) or Vertex AI credentials

### Installation

```bash
git clone https://github.com/transparentlyai/adkflow.git
cd adkflow

# Install frontend
cd frontend && npm install && cd ..

# Install backend
cd backend && uv pip install -e . && cd ..
```

### Start Development Servers

```bash
# Terminal 1 - Backend
cd backend && python -m backend.src.main

# Terminal 2 - Frontend
cd frontend && npm run dev
```

Open http://localhost:3000 to start building workflows.

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
┌─────────────────┐      ┌─────────────────┐
│   Frontend      │◄────►│   Backend       │
│   (Next.js)     │      │   (FastAPI)     │
│                 │      │                 │
│  ReactFlow      │      │  Project API    │
│  Visual Editor  │      │  File System    │
└─────────────────┘      └─────────────────┘
     :3000                    :8000
```

| Component | Description |
|-----------|-------------|
| **Frontend** | Next.js 15 with ReactFlow for visual node editing |
| **Backend** | FastAPI server for project management and file operations |

### Project Storage

Workflows are saved as JSON files:

```
my-project/
├── manifest.json      # Project metadata and tab list
├── prompts/           # Prompt markdown files
│   └── analyze.prompt.md
└── tabs/
    └── main.flow.json # ReactFlow canvas state
```

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
│       └── services/        # File operations
│
├── docs/                     # Documentation
└── schemas/                  # Schema documentation
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

## Environment Variables

```bash
# Google AI Studio
export GOOGLE_API_KEY="your-api-key"

# Or Vertex AI
export GOOGLE_GENAI_USE_VERTEXAI=true
export GOOGLE_CLOUD_PROJECT="your-project"
export GOOGLE_CLOUD_LOCATION="us-central1"
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
