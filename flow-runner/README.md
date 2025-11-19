# ADKFlow Runner

CLI tool for running ADKFlow workflow YAML files using Google Agent Development Kit (ADK).

## Installation

### Using uv (Recommended)

```bash
# Install uv if you haven't already
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install ADKFlow runner in development mode
cd /home/mauro/projects/adkflow/flow-runner
uv pip install -e .
```

### Using pip

```bash
cd /home/mauro/projects/adkflow/flow-runner
pip install -e .
```

## Usage

### Run a Workflow

Execute a workflow from a YAML file:

```bash
adkflow run workflow.yaml
```

With runtime variables:

```bash
adkflow run workflow.yaml --var user_input="Hello world" --var max_tokens=1000
```

With verbose output:

```bash
adkflow run workflow.yaml --var query="What is AI?" -v
```

### Validate a Workflow

Check if a workflow YAML file is valid:

```bash
adkflow validate workflow.yaml
```

This will:
- Parse the YAML file
- Validate the structure
- Show a summary of the workflow
- List required variables

### List Available Tools

Show available ADK tools that can be used in workflows:

```bash
adkflow list-tools
```

## Command Reference

### `adkflow run`

Run a workflow from a YAML file.

**Arguments:**
- `WORKFLOW_FILE` - Path to the workflow YAML file

**Options:**
- `--var KEY=VALUE` - Set runtime variables (can be used multiple times)
- `-v, --verbose` - Enable verbose output
- `--help` - Show help message

**Example:**
```bash
adkflow run examples/search-workflow.yaml \
  --var query="Google ADK documentation" \
  --var max_results=5 \
  --verbose
```

### `adkflow validate`

Validate a workflow YAML file without running it.

**Arguments:**
- `WORKFLOW_FILE` - Path to the workflow YAML file

**Example:**
```bash
adkflow validate examples/search-workflow.yaml
```

### `adkflow list-tools`

List available ADK tools that can be used in workflows.

**Example:**
```bash
adkflow list-tools
```

## Workflow YAML Format

ADKFlow workflows are defined in YAML files with the following structure:

```yaml
name: My Workflow
description: Description of what this workflow does

agents:
  - name: agent1
    type: llm
    model: gemini-2.0-flash-exp
    instruction: "Analyze the following: {user_input}"
    tools:
      - google_search
      - code_execution

  - name: agent2
    type: sequential
    steps:
      - name: step1
        action: search
        query: "{query}"
      - name: step2
        action: summarize
```

### Variable Substitution

Use `{variable_name}` in your workflow YAML to reference runtime variables:

```yaml
instruction: "Search for {query} and return {max_results} results"
```

Then provide values when running:

```bash
adkflow run workflow.yaml --var query="AI agents" --var max_results=10
```

## Development Status

**Current Status:** Core CLI structure complete, ADK integration pending.

**Completed:**
- ✅ CLI interface with Click
- ✅ YAML parsing and validation
- ✅ Variable resolution and substitution
- ✅ Workflow executor structure
- ✅ Rich terminal output

**TODO:**
- ⏳ Google ADK integration
- ⏳ Sequential agent execution
- ⏳ Parallel agent execution
- ⏳ LLM agent execution
- ⏳ Tool integration
- ⏳ Dynamic tool discovery

## Architecture

```
flow-runner/
├── src/adkflow/
│   ├── __init__.py          # Package initialization
│   ├── cli.py               # Click CLI interface
│   ├── parser.py            # YAML parsing and validation
│   ├── variable_resolver.py # Variable substitution
│   └── executor.py          # Workflow execution engine
├── pyproject.toml           # Project configuration
└── README.md               # This file
```

## License

MIT
