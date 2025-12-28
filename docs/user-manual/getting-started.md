# Getting Started

Set up ADKFlow and create your first AI agent workflow.

## Prerequisites

- **Node.js 18+** and npm
- **Python 3.11+** and [uv](https://docs.astral.sh/uv/) package manager
- **Google API Key** (for AI Studio) or **Vertex AI** credentials

## Installation

### Clone and Setup

```bash
git clone https://github.com/transparentlyai/adkflow.git
cd adkflow
./adkflow setup   # Installs all dependencies
```

The setup command installs:
- Frontend dependencies (npm)
- Backend dependencies (uv/pip)
- Development tools

### Configure API Access

ADKFlow uses Google's Generative AI. Choose one:

**Option 1: Google AI Studio (recommended for getting started)**

```bash
export GOOGLE_API_KEY="your-api-key"
```

Get your key at [Google AI Studio](https://aistudio.google.com/).

**Option 2: Vertex AI (for production)**

```bash
export GOOGLE_GENAI_USE_VERTEXAI=true
export GOOGLE_CLOUD_PROJECT="your-project-id"
export GOOGLE_CLOUD_LOCATION="us-central1"
```

## Starting ADKFlow

### Development Mode

```bash
./adkflow dev
```

This starts both frontend and backend with hot-reload enabled.

### Production Mode

```bash
./adkflow start
```

Open http://localhost:3000 in your browser.

### Stopping

```bash
./adkflow stop
```

## Your First Project

### 1. Create a Project

1. Click **File → New Project** (or use the welcome screen)
2. Choose a location for your project
3. Enter a project name
4. Click **Create**

### 2. Add Your First Node

1. **Right-click** anywhere on the canvas
2. Select **Agents → LlmAgent** from the menu
3. The node appears on the canvas

### 3. Configure the Agent

1. Click the node to select it
2. In the expanded view, set:
   - **Name**: `my_agent`
   - **Model**: `gemini-2.0-flash-exp` (or your preferred model)
   - **Instructions**: "You are a helpful assistant."

### 4. Add a Prompt

1. Right-click → **Content → Prompt**
2. Connect the Prompt's output handle to the Agent's instruction input
3. Click the Prompt node and write your prompt text

### 5. Run the Workflow

1. Click the **Run** button in the toolbar
2. Watch the execution panel for output
3. If the agent needs input, you'll be prompted

## Project Structure

When you create a project, ADKFlow creates:

```
my-project/
├── manifest.json          # Project metadata
├── pages/                 # Workflow tabs
│   └── main.json          # Default tab
├── prompts/               # Prompt markdown files
├── static/                # Context files
└── tools/                 # Python tool files
```

## Next Steps

- [Interface Overview](./interface-overview.md) - Learn the UI
- [Nodes](./nodes.md) - Understand node types
- [Connections](./connections.md) - Connect nodes together
- [Running Workflows](./running-workflows.md) - Execute and debug

## Troubleshooting

### "Command not found: adkflow"

Make sure you're running from the repository root:

```bash
cd /path/to/adkflow
./adkflow dev
```

### "API key not found"

Set your Google API key:

```bash
export GOOGLE_API_KEY="your-key"
```

### Port already in use

Stop any running servers:

```bash
./adkflow stop
```

See [Troubleshooting](./troubleshooting.md) for more solutions.
