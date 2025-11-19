# ADKFlow Quick Start Guide

## Installation

```bash
cd /home/mauro/projects/adkflow/flow-runner
pip install -e .
```

## Configuration

### Option 1: Google AI Studio (API Key)

```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your Google API key
# Get key from: https://aistudio.google.com/app/apikey
nano .env
```

Or set directly in terminal:
```bash
export GOOGLE_API_KEY="your-api-key-here"
```

### Option 2: Vertex AI (Application Default Credentials)

Use Vertex AI for enterprise deployments with ADC:

```bash
# 1. Authenticate with gcloud
gcloud auth application-default login

# 2. Set environment variables
export GOOGLE_API_KEY=vertex
export GOOGLE_CLOUD_PROJECT=your-project-id
export GOOGLE_CLOUD_REGION=us-central1  # Optional, defaults to us-central1

# 3. Run workflows
adkflow run workflow.yaml --verbose
```

**Note**: When using `GOOGLE_API_KEY=vertex`, the runner automatically uses Vertex AI with your Application Default Credentials instead of an API key.

## Basic Usage

### Run a Simple Workflow
```bash
adkflow run examples/simple-workflow.yaml --verbose
```

### Run with Variables
```bash
adkflow run examples/sample-workflow.yaml \
  --var repository_path="./src" \
  --var language="python" \
  --verbose
```

### List Available Tools
```bash
adkflow list-tools
```

### Validate Workflow
```bash
adkflow validate examples/simple-workflow.yaml
```

## Workflow Structure

### Minimal Workflow
```yaml
workflow:
  name: "my-workflow"

  prompts:
    task:
      content: "Analyze this data"
      variables: []

  agents:
    - id: "analyzer"
      type: "sequential"
      model: "gemini-2.0-flash-exp"
      temperature: 0.7
      tools:
        - "code_execution"

      subagents:
        - id: "main"
          prompt_ref: "task"
```

### Sequential Agent (Steps Run One After Another)
```yaml
agents:
  - id: "sequential_agent"
    type: "sequential"
    model: "gemini-2.0-flash-exp"

    subagents:
      - id: "step1"
        prompt_ref: "analyze"
        tools: ["code_execution"]

      - id: "step2"
        prompt_ref: "summarize"
        # Step 2 receives output from step 1 as context
```

### Parallel Agent (Steps Run Concurrently)
```yaml
agents:
  - id: "parallel_agent"
    type: "parallel"
    model: "gemini-2.0-flash-exp"

    subagents:
      - id: "task_a"
        prompt_ref: "security_check"

      - id: "task_b"
        prompt_ref: "performance_check"

      - id: "task_c"
        prompt_ref: "style_check"
      # All run at the same time
```

### With Variables
```yaml
workflow:
  name: "variable-example"

  variables:
    user_input:
      type: string
      default: "Hello"
      description: "User's input text"

  prompts:
    greet:
      content: "Say {user_input} in a friendly way"
      variables:
        - user_input
```

Run with:
```bash
adkflow run workflow.yaml --var user_input="Bonjour"
```

## Available Tools

- `code_execution`: Execute Python code in sandbox
- `google_search`: Search the web using Google

More tools can be added to `/home/mauro/projects/adkflow/flow-runner/src/adkflow/tools.py`

## CLI Options

### adkflow run
```
--api-key TEXT       Google API key (or set GOOGLE_API_KEY env var)
--var TEXT           Variables in key=value format (multiple allowed)
--verbose, -v        Enable detailed output
```

### adkflow validate
```
Validates workflow YAML syntax and structure
```

### adkflow list-tools
```
Shows all available tools with descriptions
```

## Examples

### Example 1: Simple Question
```bash
adkflow run examples/simple-workflow.yaml \
  --var question="What is the capital of France?" \
  --verbose
```

### Example 2: Code Review
```bash
adkflow run examples/sample-workflow.yaml \
  --var repository_path="./my-project" \
  --var language="python" \
  --var focus_areas="security, performance" \
  --verbose
```

## Troubleshooting

### API Key Issues
```
Error: Google API key is required
```
**Solution:** Set `GOOGLE_API_KEY` environment variable or use `--api-key` flag

### Prompt Not Found
```
Error: Prompt reference 'X' not found
```
**Solution:** Check that prompt is defined in `prompts:` section of workflow

### Unknown Tool
```
Error: Unknown tool: X
```
**Solution:** Run `adkflow list-tools` to see available tools

## Tips

1. **Always start with `--verbose`** to see what's happening
2. **Validate first** with `adkflow validate` before running
3. **Use variables** instead of hardcoding values in prompts
4. **Sequential for dependent tasks**, parallel for independent ones
5. **Keep prompts clear and specific** for best results

## Next Steps

- Review `/home/mauro/projects/adkflow/flow-runner/IMPLEMENTATION.md` for technical details
- Check `/home/mauro/projects/adkflow/examples/` for more workflow examples
- Extend `/home/mauro/projects/adkflow/flow-runner/src/adkflow/tools.py` to add custom tools
