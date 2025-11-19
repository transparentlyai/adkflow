# ADKFlow Backend

Backend API for ADKFlow - Visual workflow builder for Google ADK agents.

## Overview

This backend provides REST API endpoints for:
- Validating workflow configurations
- Converting workflows to/from YAML format
- Managing ADK agent workflows
- Providing available ADK tools information

## Tech Stack

- **FastAPI** - Modern, fast web framework for building APIs
- **Pydantic v2** - Data validation using Python type annotations
- **uvicorn** - ASGI server for running the application
- **PyYAML** - YAML parsing and generation

## Project Structure

```
backend/
├── src/
│   ├── __init__.py
│   ├── main.py              # FastAPI application entry point
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes.py        # API endpoint definitions
│   ├── models/
│   │   ├── __init__.py
│   │   └── workflow.py      # Pydantic models for workflows
│   └── services/
│       ├── __init__.py
│       └── yaml_converter.py # YAML conversion utilities
├── pyproject.toml           # Project dependencies and metadata
└── README.md                # This file
```

## Setup Instructions

### Prerequisites

- Python 3.11 or higher
- pip (Python package installer)

### Installation

1. Navigate to the backend directory:
   ```bash
   cd /home/mauro/projects/adkflow/backend
   ```

2. Create a virtual environment (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Linux/Mac
   # or
   venv\Scripts\activate     # On Windows
   ```

3. Install dependencies:
   ```bash
   pip install -e .
   ```

### Running the Server

Start the development server:

```bash
python -m backend.src.main
```

Or using uvicorn directly:

```bash
uvicorn backend.src.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- **API**: http://localhost:8000
- **Interactive docs**: http://localhost:8000/docs
- **Alternative docs**: http://localhost:8000/redoc

## API Endpoints

### Health Check

- **GET** `/health`
  - Returns service health status

### Workflow Validation

- **POST** `/api/workflows/validate`
  - Validates workflow configuration
  - Request body: `WorkflowModel`
  - Response: Validation results with any errors

### Workflow Export

- **POST** `/api/workflows/export`
  - Converts workflow to YAML format
  - Request body: `{ "workflow": WorkflowModel }`
  - Response: `{ "yaml": "..." }`

### Workflow Import

- **POST** `/api/workflows/import`
  - Parses YAML into workflow model
  - Request body: `{ "yaml": "..." }`
  - Response: `{ "workflow": WorkflowModel }`

### Available Tools

- **GET** `/api/tools`
  - Returns list of available ADK tools
  - Response: List of tool information (name, description, category)

## Data Models

### WorkflowVariable
- `name`: Variable name
- `type`: Variable type (string, number, boolean, etc.)
- `default`: Default value (optional)
- `description`: Variable description (optional)

### PromptModel
- `id`: Unique prompt identifier
- `content`: Prompt template content
- `variables`: List of variable names used in prompt

### SubagentModel
- `id`: Unique subagent identifier
- `prompt_ref`: Reference to prompt ID
- `tools`: List of tool names available to subagent

### AgentModel
- `id`: Unique agent identifier
- `type`: Agent type (e.g., 'llm', 'workflow', 'tool')
- `model`: LLM model name (optional)
- `temperature`: LLM temperature setting (optional)
- `tools`: List of tool names available to agent
- `subagents`: List of subagents

### WorkflowConnection
- `from_path`: Source path (e.g., 'agent1.output')
- `to_path`: Target path (e.g., 'agent2.input')

### WorkflowModel
- `name`: Workflow name
- `version`: Workflow version (default: "1.0.0")
- `variables`: Dictionary of workflow variables
- `prompts`: Dictionary of prompt templates
- `agents`: List of agent configurations
- `connections`: List of connections between agents

## Development

### CORS Configuration

The backend is configured to accept requests from:
- `http://localhost:3000` (Frontend development server)

To add additional origins, modify the `allow_origins` list in `/home/mauro/projects/adkflow/backend/src/main.py`.

### Adding New Tools

To add new ADK tools to the available tools list, edit the `get_available_tools()` function in `/home/mauro/projects/adkflow/backend/src/api/routes.py`.

## Testing

Test the API using the interactive documentation at http://localhost:8000/docs, or use tools like:
- cURL
- Postman
- HTTPie

Example using cURL:

```bash
# Health check
curl http://localhost:8000/health

# Get available tools
curl http://localhost:8000/api/tools
```

## License

Copyright 2025 ADKFlow Project
