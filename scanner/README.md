# ADKFlow Scanner

AI-powered codebase scanner that generates ADKFlow projects from any Google ADK codebase.

## Installation

```bash
# Using uv
cd scanner
uv sync

# Or with pip
pip install -e .
```

## Usage

```bash
# Scan a codebase and generate ADKFlow project
adkflow-scanner /path/to/codebase --output ~/adkworkflows/myproject

# Or run as module
python -m scanner.cli /path/to/codebase --output ~/adkworkflows/myproject
```

## Features

- **Discovery**: Automatically finds agents, prompts, tools, and configurations
- **Analysis**: Maps relationships and proposes logical organization
- **Interactive**: Asks clarifying questions via CLI when needed
- **Generation**: Creates complete ADKFlow projects with proper layout

## Configuration

| Environment Variable | Description | Default |
|---------------------|-------------|---------|
| `SCANNER_MODEL` | Model to use for agents | `gemini-2.5-flash` |
| `GOOGLE_API_KEY` | Google API key for Gemini | Required |

## Architecture

```
ScannerOrchestrator (BaseAgent)
├── DiscoveryAgent  → Scans codebase for ADK patterns
├── AnalysisAgent   → Analyzes relationships, proposes organization
└── GeneratorAgent  → Creates manifest.json and page files
```

## Development

```bash
# Install with dev dependencies
uv sync --all-extras

# Run linting
uv run ruff check .

# Run type checking
uv run pyright

# Run tests
uv run pytest
```

## License

MIT
