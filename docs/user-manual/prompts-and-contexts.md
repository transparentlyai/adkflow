# Prompts and Contexts

Creating and managing content files for your workflows.

## Overview

ADKFlow stores content in files within your project:

| Type | Location | Format | Purpose |
|------|----------|--------|---------|
| **Prompts** | `prompts/` | Markdown | Templates for agent instructions |
| **Contexts** | `static/` | Any | Configuration and static content |

## Prompts

### What are Prompts?

Prompts are markdown files that define instructions for agents. They support:
- Rich markdown formatting
- Variable substitution with `{variable}` syntax
- Version control friendly text format

### Creating a Prompt

#### From Node

1. Add a **Prompt** node to the canvas
2. Click **Create New** in the node configuration
3. Enter a filename (e.g., `analyze.prompt.md`)
4. The file is created in `prompts/`

#### From File System

Create a markdown file directly:

```bash
echo "Analyze the following: {input}" > prompts/analyze.prompt.md
```

### Editing Prompts

#### In ADKFlow

1. Click the Prompt node
2. The prompt content appears in the editor
3. Edit directly in the node
4. Changes are saved to the file

#### External Editor

Edit the markdown file with any text editor:
- VS Code, Vim, etc.
- Changes are reflected when you reload

### Variable Substitution

Use curly braces for variables:

```markdown
# System Prompt

You are a {role} assistant.

## Task

Analyze the following {content_type}:

{input}

## Output Format

Respond in {format} format.
```

Variables are replaced at runtime with:
- Values from connected Variable nodes
- User input values
- Upstream node outputs

### Prompt Best Practices

#### Structure

```markdown
# [Title]

[Brief description]

## Context

[Background information]

## Task

[What the agent should do]

## Constraints

[Rules and limitations]

## Output Format

[Expected response format]
```

#### Tips

- Be specific about expected output
- Include examples when helpful
- Use headers for organization
- Keep prompts focused on one task

## Contexts

### What are Contexts?

Contexts are files containing configuration or static content:
- JSON configuration
- YAML settings
- Text data
- Any file format

### Creating a Context

#### From Node

1. Add a **Context** node
2. Click **Create New**
3. Enter filename and choose format
4. File is created in `static/`

#### From File System

Create files directly in `static/`:

```bash
echo '{"model": "gemini-2.0-flash"}' > static/config.json
```

### Using Contexts

Connect Context nodes to agents to provide:
- Configuration settings
- Reference data
- Static content
- Shared constants

### Context Formats

| Format | Use Case |
|--------|----------|
| **JSON** | Structured configuration |
| **YAML** | Human-readable config |
| **Text** | Raw content |
| **Markdown** | Formatted documentation |

## Project Structure

```
my-project/
├── prompts/
│   ├── system.prompt.md
│   ├── analyze.prompt.md
│   └── summarize.prompt.md
├── static/
│   ├── config.json
│   ├── examples.yaml
│   └── reference.txt
└── tools/
    └── custom_tool.py
```

## Tools (Python)

### What are Tools?

Python files in `tools/` define custom functions that agents can use:
- Web scraping
- API calls
- Data processing
- File operations

### Creating a Tool

1. Add a **Tool** node
2. Click **Create New**
3. Enter filename (e.g., `scraper.py`)
4. Write Python code

### Tool Structure

```python
"""Tool description for the agent."""

def my_tool(arg1: str, arg2: int = 10) -> dict:
    """
    Description of what this tool does.

    Args:
        arg1: Description of arg1
        arg2: Description of arg2

    Returns:
        Description of return value
    """
    # Implementation
    return {"result": "value"}
```

## File Management

### Renaming Files

1. Rename the file in your file system
2. Update the node to point to the new file

### Deleting Files

1. Remove the file from your file system
2. Update or remove nodes that reference it

### Moving Files

Keep files in their designated folders:
- Prompts in `prompts/`
- Contexts in `static/`
- Tools in `tools/`

## Version Control

All content files are text-based and Git-friendly:

```bash
git add prompts/ static/ tools/
git commit -m "Update prompts and tools"
```

## See Also

- [Nodes](./nodes.md) - Prompt and Context node types
- [Running Workflows](./running-workflows.md) - How content is used
- [Projects](./projects.md) - Project structure
