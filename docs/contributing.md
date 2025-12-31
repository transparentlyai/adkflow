# Contributing to ADKFlow

Guidelines for contributing to ADKFlow.

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- [uv](https://github.com/astral-sh/uv) (recommended) or pip
- npm

### Development Setup

1. Clone the repository:

```bash
git clone https://github.com/your-org/adkflow.git
cd adkflow
```

2. Set up the environment:

```bash
# Install dependencies
adkflow setup

# Or manually:
# Backend
cd backend
uv pip install -e .

# Frontend
cd ../frontend
npm install
```

3. Start development servers:

```bash
adkflow dev
```

4. Open http://localhost:3000

## Project Structure

```
adkflow/
├── backend/          # FastAPI backend
├── frontend/         # Next.js frontend
├── cli/              # CLI tool
├── packages/
│   └── adkflow-runner/  # Standalone runner package
└── docs/             # Documentation
```

## Development Workflow

### Branch Naming

```
feature/short-description
fix/issue-description
docs/what-changed
refactor/what-changed
```

### Commit Messages

Use conventional commits:

```
feat: add new node type
fix: resolve connection validation bug
docs: update extension API reference
refactor: simplify canvas hooks
test: add unit tests for compiler
```

### Pull Requests

1. Create a feature branch from `main`
2. Make your changes
3. Run tests and linting
4. Submit a PR with a clear description
5. Address review feedback

## Code Style

### Python

- Follow [PEP 8](https://pep8.org/)
- Use type hints
- Use absolute imports
- Max line length: 88 (Black formatter)

```python
# Good
from backend.src.models.workflow import WorkflowNode

# Avoid
from ..models.workflow import WorkflowNode
```

### TypeScript

- Use TypeScript strict mode
- Prefer functional components with hooks
- Use named exports

```typescript
// Good
export function NodeComponent({ data }: NodeProps) {
  return <div>{data.label}</div>;
}

// Avoid
export default function({ data }) {
  return <div>{data.label}</div>;
}
```

### File Organization

- Keep files under 400 lines (React components under 300)
- Split large files into smaller modules
- One component per file

## Testing

### Backend

```bash
cd backend
pytest
pytest --cov=src  # With coverage
```

### Frontend

```bash
cd frontend
npm test
npm run test:coverage
```

### Extension Testing

```python
import pytest
from my_extension.nodes import MyNode

@pytest.mark.asyncio
async def test_my_node():
    node = MyNode()
    result = await node.run_process(
        inputs={"text": "hello"},
        config={},
        context=MockContext(),
    )
    assert result["output"] == "HELLO"
```

## Linting

### Python

```bash
# Format
ruff format .

# Lint
ruff check .

# Fix auto-fixable issues
ruff check --fix .
```

### TypeScript

```bash
cd frontend
npm run lint
npm run lint:fix
```

## Documentation

When making changes:

1. Update relevant docs in `docs/`
2. Update docstrings and comments
3. Update README if applicable

### Writing Docs

- Keep files under 300 lines
- Use consistent heading hierarchy
- Include code examples
- Add "See also" links
- Use clear, concise language

## Extension Development

See [Extensions Guide](./technical/extensions/README.md) for creating custom nodes.

### Quick Start

1. Create extension directory:

```bash
mkdir -p ~/.adkflow/extensions/my_extension
```

2. Add `__init__.py`:

```python
from .nodes import MyNode

__all__ = ["MyNode"]
```

3. Create your node in `nodes.py`

4. Reload extensions in ADKFlow

## Architecture Overview

Understanding the codebase:

| Area | Key Files | Purpose |
|------|-----------|---------|
| State | `frontend/contexts/` | React contexts for global state |
| Canvas | `frontend/components/ReactFlowCanvas.tsx` | Main canvas component |
| Nodes | `frontend/components/nodes/` | Node type components |
| API | `backend/src/api/routes/` | REST endpoints |
| Execution | `backend/src/api/execution_routes.py`, `run_manager.py` | Workflow execution |
| Runner | `packages/adkflow-runner/` | Standalone execution engine |

See [Architecture](./technical/architecture.md) for details.

## Getting Help

- Check existing issues before creating new ones
- Use issue templates when available
- Include reproduction steps for bugs
- Share relevant logs and screenshots

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow

## See Also

- [Technical Documentation](./technical/README.md)
- [Architecture Overview](./technical/architecture.md)
- [Extensions Guide](./technical/extensions/README.md)
