# Getting Started with ADKFlow

Complete guide to set up and use ADKFlow for creating and executing AI agent workflows.

## Prerequisites

Before you begin, ensure you have:

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Python** 3.11+ ([Download](https://www.python.org/))
- **uv** Python package manager: `pip install uv`
- **Google API Key** for ADK ([Get one](https://ai.google.dev/))

## Quick Setup (5 minutes)

### Option 1: Automated Setup (Recommended)

```bash
cd /home/mauro/projects/adkflow

# 1. Start backend (Terminal 1)
./start-backend.sh

# 2. Start frontend (Terminal 2)
./start-frontend.sh

# 3. Setup CLI runner (Terminal 3)
./setup-runner.sh
```

### Option 2: All-in-One with Tmux

```bash
cd /home/mauro/projects/adkflow
./dev.sh
```

This starts both backend and frontend in a tmux session. Use `Ctrl+B` then `1` or `2` to switch windows.

## Step-by-Step Setup

### 1. Backend Setup

```bash
cd /home/mauro/projects/adkflow/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -e .

# Start server
python -m backend.src.main
```

**Verify**: Visit http://localhost:8000/docs - you should see the API documentation.

### 2. Frontend Setup

```bash
cd /home/mauro/projects/adkflow/frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

**Verify**: Visit http://localhost:3000 - you should see the visual workflow editor.

### 3. Flow Runner Setup

```bash
cd /home/mauro/projects/adkflow/flow-runner

# Install with uv
uv pip install -e .

# Configure API key
cp .env.example .env
nano .env  # Add your GOOGLE_API_KEY

# Test installation
adkflow --help
```

**Verify**: Run `adkflow list-tools` - you should see available ADK tools.

## Your First Workflow

### Using the Visual Editor

1. **Open the editor**: http://localhost:3000

2. **Create a simple workflow**:
   - Click "Add Prompt" → creates a prompt node
   - Double-click the prompt node → opens markdown editor
   - Add content: "Explain quantum computing in simple terms"
   - Save the prompt

   - Click "Add Agent" → creates an agent node
   - Click "Add Subagent" → creates a subagent node

   - Connect prompt to subagent: drag from prompt output to subagent input
   - Connect subagent to agent: drag from subagent output to agent input

3. **Configure the agent**:
   - Select agent node
   - Set type: "sequential"
   - Set model: "gemini-2.0-flash-exp"
   - Add tools: "code_execution"

4. **Export the workflow**:
   - Click "Export to YAML"
   - Save as `my-first-workflow.yaml`

### Running the Workflow

```bash
adkflow run my-first-workflow.yaml --verbose
```

You should see the agent execute and return an explanation of quantum computing!

## Example Workflows

### Example 1: Simple Q&A

```yaml
workflow:
  name: "simple-qa"
  version: "1.0"

  variables:
    question: "What is machine learning?"

  prompts:
    answer:
      content: "Answer this question: {question}"
      variables: ["question"]

  agents:
    - id: "answerer"
      type: "sequential"
      model: "gemini-2.0-flash-exp"
      temperature: 0.7
      tools: []

      subagents:
        - id: "main"
          prompt_ref: "answer"

  connections: []
```

**Run it**:
```bash
adkflow run examples/simple-workflow.yaml \
  --var question="What is machine learning?" \
  --verbose
```

### Example 2: Code Analysis

```yaml
workflow:
  name: "code-analyzer"
  version: "1.0"

  variables:
    code_file: "./app.py"

  prompts:
    analyze:
      content: |
        # Code Review
        Analyze this code file: {code_file}

        Check for:
        - Security issues
        - Performance problems
        - Best practices
      variables: ["code_file"]

    suggest:
      content: "Based on the analysis, suggest improvements."
      variables: []

  agents:
    - id: "reviewer"
      type: "sequential"
      model: "gemini-2.0-flash-exp"
      temperature: 0.3
      tools: ["code_execution", "file_reader"]

      subagents:
        - id: "analyzer"
          prompt_ref: "analyze"

        - id: "improver"
          prompt_ref: "suggest"

  connections: []
```

**Run it**:
```bash
adkflow run code-analyzer.yaml \
  --var code_file="./my-app.py" \
  --verbose
```

## Common Tasks

### Creating Workflows in the UI

1. **Add nodes**: Click toolbar buttons
2. **Position nodes**: Drag them around
3. **Connect nodes**: Drag from output (green) to input (blue)
4. **Edit prompts**: Double-click prompt nodes
5. **Delete nodes**: Select and press Delete key
6. **Zoom**: Use +/- buttons or mouse wheel
7. **Pan**: Drag the canvas background

### Node Types

#### Agent Node (Blue)
- Container for subagents
- Execution mode: sequential or parallel
- Configure model and tools

#### Subagent Node (Purple)
- Actual execution unit
- References a prompt
- Can override agent tools

#### Prompt Node (Green)
- Markdown-formatted prompts
- Supports {variable} substitution
- Opens full editor on double-click

### Exporting/Importing

**Export**:
1. Create workflow in UI
2. Click "Export to YAML"
3. File downloads automatically

**Import**:
1. Click "Import from YAML"
2. Select your .yaml file
3. Workflow loads on canvas

### Running Workflows

**Basic execution**:
```bash
adkflow run workflow.yaml
```

**With variables**:
```bash
adkflow run workflow.yaml \
  --var user_input="test data" \
  --var language="python"
```

**Verbose mode** (see detailed logs):
```bash
adkflow run workflow.yaml --verbose
```

**With custom API key**:
```bash
adkflow run workflow.yaml --api-key YOUR_KEY
```

### Validating Workflows

Before running, validate your workflow:

```bash
adkflow validate workflow.yaml
```

This checks:
- YAML syntax
- Required fields
- Prompt references
- Connection paths
- Tool names

## Configuration

### Backend Configuration

Edit `/home/mauro/projects/adkflow/backend/.env` (create if doesn't exist):

```env
# API Settings
HOST=localhost
PORT=8000
CORS_ORIGINS=http://localhost:3000
```

### Frontend Configuration

Edit `/home/mauro/projects/adkflow/frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Flow Runner Configuration

Edit `/home/mauro/projects/adkflow/flow-runner/.env`:

#### Option 1: Google AI Studio (API Key)
```env
# Required: Get from https://aistudio.google.com/app/apikey
GOOGLE_API_KEY=your_api_key_here

# Optional
DEFAULT_MODEL=gemini-2.0-flash-exp
DEFAULT_TEMPERATURE=0.7
```

#### Option 2: Vertex AI (Application Default Credentials)
```env
# Use Vertex AI with ADC
GOOGLE_API_KEY=vertex

# Required for Vertex AI
GOOGLE_CLOUD_PROJECT=your-project-id

# Optional
GOOGLE_CLOUD_REGION=us-central1  # Defaults to us-central1
DEFAULT_MODEL=gemini-2.0-flash-exp
DEFAULT_TEMPERATURE=0.7
```

**Setup for Vertex AI**:
```bash
# Authenticate with gcloud
gcloud auth application-default login

# Verify authentication
gcloud auth application-default print-access-token
```

## Troubleshooting

### Backend won't start

**Error**: "Module not found"
```bash
cd backend
pip install -e .  # Reinstall dependencies
```

**Error**: "Port 8000 already in use"
```bash
lsof -ti:8000 | xargs kill  # Kill process on port 8000
```

### Frontend won't start

**Error**: "Cannot find module 'drawflow'"
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install  # Reinstall dependencies
```

**Error**: "Port 3000 already in use"
```bash
# Edit frontend/package.json dev script to use different port:
"dev": "next dev -p 3001"
```

### Flow Runner Issues

**Error**: "GOOGLE_API_KEY not found"
```bash
# Set environment variable
export GOOGLE_API_KEY="your-key-here"

# Or use CLI flag
adkflow run workflow.yaml --api-key YOUR_KEY
```

**Error**: "Tool 'xyz' not found"
```bash
# List available tools
adkflow list-tools

# Check workflow YAML for typos
adkflow validate workflow.yaml
```

### Drawflow Issues

**Problem**: Nodes not appearing
- Clear browser cache (Ctrl+Shift+R)
- Check browser console for errors
- Verify backend is running

**Problem**: Can't connect nodes
- Only connect outputs (green) to inputs (blue)
- Check node types support connections
- Try zooming in for better precision

## Tips & Best Practices

### Workflow Design

1. **Start simple**: Begin with one agent and one subagent
2. **Use variables**: Make workflows reusable with {variable} syntax
3. **Sequential vs Parallel**:
   - Use sequential when order matters
   - Use parallel for independent tasks
4. **Tool selection**: Only add tools you actually need
5. **Temperature**:
   - Low (0.2-0.5) for deterministic tasks
   - High (0.7-0.9) for creative tasks

### Prompt Writing

1. **Be specific**: Clear instructions get better results
2. **Use markdown**: Format with headers, lists, code blocks
3. **Context first**: Provide context before the task
4. **Examples help**: Show expected output format
5. **Variables**: Use descriptive names like {user_input} not {x}

### Development Workflow

1. **Design in UI**: Visual editor for quick prototyping
2. **Export to YAML**: Version control friendly
3. **Test locally**: Use `adkflow validate` before running
4. **Iterate**: Refine prompts based on results
5. **Share**: YAML files are portable and sharable

## Next Steps

Now that you're set up:

1. **Explore examples**: Check `/examples` directory
2. **Read the schema**: See `/schemas/workflow-schema.md`
3. **Create custom tools**: Extend the tool registry
4. **Build workflows**: Create domain-specific agents
5. **Join the community**: Share your workflows!

## Resources

- **Project README**: `/home/mauro/projects/adkflow/README.md`
- **YAML Schema**: `/home/mauro/projects/adkflow/schemas/workflow-schema.md`
- **Backend API**: http://localhost:8000/docs
- **Frontend**: http://localhost:3000
- **Google ADK Docs**: https://google.github.io/adk-docs/
- **Flow Runner Guide**: `/home/mauro/projects/adkflow/flow-runner/QUICKSTART.md`

## Getting Help

1. Check the troubleshooting section above
2. Validate your workflow: `adkflow validate workflow.yaml`
3. Run with `--verbose` flag for detailed logs
4. Check browser console (F12) for frontend errors
5. Check backend logs in the terminal

Happy workflow building! 🚀
