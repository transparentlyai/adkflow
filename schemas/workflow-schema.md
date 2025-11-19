# ADKFlow Workflow YAML Schema

## Overview

ADKFlow workflows are defined in YAML format and describe agent-based workflows using Google's Agent Development Kit (ADK). Each workflow consists of agents, subagents, prompts, variables, and connections that define how data flows through the system.

## Schema Version

Current version: `1.0`

## Root Structure

```yaml
workflow:
  name: string              # Required: Workflow name
  version: string           # Required: Schema version (e.g., "1.0")
  variables: dict           # Optional: Workflow-level variables
  prompts: dict             # Required: Prompt definitions
  agents: list              # Required: Agent definitions
  connections: list         # Optional: Inter-agent connections
```

## Variables

Variables define reusable values that can be referenced in prompts using `{variable_name}` syntax.

```yaml
variables:
  variable_name:
    type: string            # Optional: "string", "number", "boolean"
    default: any            # Optional: Default value
    description: string     # Optional: Human-readable description
```

### Simple Variables

```yaml
variables:
  user_input: "default value"
  temperature: 0.7
  max_retries: 3
```

### Detailed Variables

```yaml
variables:
  context:
    type: string
    default: "General purpose analysis"
    description: "Context for the analysis task"
```

## Prompts

Prompts are markdown-formatted templates that can include variable substitutions.

```yaml
prompts:
  prompt_id:
    content: string         # Required: Markdown content with {variable} placeholders
    variables: list         # Optional: List of variable names used in content
```

### Example

```yaml
prompts:
  analyze_data:
    content: |
      # Data Analysis Task

      Please analyze the following data: {data_input}

      Context: {context}

      Requirements:
      - Focus on {focus_area}
      - Provide actionable insights
    variables:
      - data_input
      - context
      - focus_area

  summarize:
    content: "Summarize the previous analysis in 3 bullet points."
    variables: []
```

## Agents

Agents are the core execution units in ADKFlow. Each agent can contain multiple subagents and supports different execution modes.

```yaml
agents:
  - id: string              # Required: Unique agent identifier
    type: string            # Required: "sequential" | "parallel"
    model: string           # Required: ADK model name (e.g., "gemini-2.0-flash-exp")
    temperature: float      # Optional: 0.0 to 1.0, default: 0.7
    tools: list             # Optional: List of tool names
    subagents: list         # Required: List of subagent definitions
```

### Agent Types

- **sequential**: Subagents execute in order, each receiving output from the previous
- **parallel**: Subagents execute concurrently

### Supported Models

- `gemini-2.0-flash-exp` (recommended for fast execution)
- `gemini-1.5-pro`
- `gemini-1.5-flash`
- Other ADK-supported models

### Available Tools

Common ADK tools that can be attached to agents or subagents:

- `code_execution` - Execute Python code
- `google_search` - Search the web using Google
- `web_browser` - Browse and fetch web content
- `file_reader` - Read files from filesystem
- `file_writer` - Write files to filesystem
- `calculator` - Perform calculations
- `datetime` - Get current date/time
- `bigquery` - Query BigQuery datasets
- `cloud_storage` - Access Google Cloud Storage
- `vertex_ai_search` - Search using Vertex AI

## Subagents

Subagents are the actual execution units within an agent. Each subagent runs a specific prompt with specified tools.

```yaml
subagents:
  - id: string              # Required: Unique subagent identifier (within agent)
    prompt_ref: string      # Required: Reference to prompt ID
    tools: list             # Optional: Override agent tools for this subagent
```

### Example

```yaml
agents:
  - id: "data_analyzer"
    type: "sequential"
    model: "gemini-2.0-flash-exp"
    temperature: 0.7
    tools:
      - "code_execution"
      - "calculator"
    subagents:
      - id: "load_data"
        prompt_ref: "load_prompt"
        tools:
          - "file_reader"
          - "code_execution"

      - id: "analyze"
        prompt_ref: "analyze_prompt"
        # Inherits agent tools: code_execution, calculator

      - id: "visualize"
        prompt_ref: "visualize_prompt"
        tools:
          - "code_execution"
```

## Connections

Connections define how data flows between agents. This is useful for multi-agent workflows.

```yaml
connections:
  - from: string            # Required: Source path (agent_id.subagent_id)
    to: string              # Required: Destination path (agent_id.subagent_id)
    type: string            # Optional: "sequential" (default) | "conditional"
```

### Example

```yaml
connections:
  - from: "agent_1.subagent_2"
    to: "agent_2.subagent_1"
    type: "sequential"
```

## Complete Example

```yaml
workflow:
  name: "data-analysis-workflow"
  version: "1.0"

  variables:
    dataset_path:
      type: string
      default: "data/sales.csv"
      description: "Path to the dataset to analyze"

    report_format:
      type: string
      default: "markdown"
      description: "Output format for the report"

  prompts:
    load_data:
      content: |
        # Load Dataset

        Load the dataset from: {dataset_path}

        Verify the data structure and show the first 5 rows.
      variables:
        - dataset_path

    analyze_data:
      content: |
        # Analyze Sales Data

        Perform statistical analysis on the loaded dataset:
        - Calculate summary statistics
        - Identify trends
        - Detect outliers
      variables: []

    generate_report:
      content: |
        # Generate Report

        Create a {report_format} report with:
        - Executive summary
        - Key findings
        - Visualizations
        - Recommendations
      variables:
        - report_format

  agents:
    - id: "analyzer"
      type: "sequential"
      model: "gemini-2.0-flash-exp"
      temperature: 0.5
      tools:
        - "code_execution"
        - "file_reader"
        - "calculator"

      subagents:
        - id: "data_loader"
          prompt_ref: "load_data"
          tools:
            - "file_reader"
            - "code_execution"

        - id: "data_analyzer"
          prompt_ref: "analyze_data"

        - id: "report_generator"
          prompt_ref: "generate_report"
          tools:
            - "code_execution"
            - "file_writer"

  connections: []
```

## Variable Substitution

Variables are substituted using `{variable_name}` syntax in prompts. The flow-runner will:

1. Extract all variable references from prompts
2. Check for values in:
   - Runtime CLI arguments (`--var key=value`)
   - Workflow variables section (defaults)
3. Replace `{variable_name}` with the actual value
4. Error if required variables are missing

### CLI Usage

```bash
adkflow run workflow.yaml --var dataset_path=/data/new_sales.csv --var report_format=pdf
```

## Validation Rules

1. **Required Fields**:
   - `workflow.name`
   - `workflow.version`
   - `workflow.prompts` (at least one)
   - `workflow.agents` (at least one)
   - Each agent must have: `id`, `type`, `model`, `subagents`
   - Each subagent must have: `id`, `prompt_ref`

2. **References**:
   - All `prompt_ref` in subagents must reference existing prompts
   - All variables in prompt content should be declared or passed at runtime
   - Connection paths must reference existing agents/subagents

3. **Types**:
   - Agent type must be: `sequential` or `parallel`
   - Temperature must be: 0.0 to 1.0
   - Tools must be valid ADK tool names

4. **Uniqueness**:
   - Agent IDs must be unique within workflow
   - Subagent IDs must be unique within agent
   - Prompt IDs must be unique within workflow

## Best Practices

1. **Naming**: Use descriptive, kebab-case names for IDs
2. **Prompts**: Write clear, specific prompts with markdown formatting
3. **Variables**: Document all variables with descriptions
4. **Tools**: Only include tools that are actually needed
5. **Temperature**: Use lower values (0.3-0.5) for deterministic tasks, higher (0.7-0.9) for creative tasks
6. **Modularity**: Break complex tasks into multiple subagents
7. **Sequential vs Parallel**: Use sequential when order matters, parallel for independent tasks

## Schema Evolution

Future versions may include:

- Conditional connections based on subagent output
- Error handling and retry policies
- Subagent timeouts
- Output transformations
- Workflow-level configuration (max_tokens, etc.)
- Support for custom tools
- Memory and artifact management
