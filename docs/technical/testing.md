# Testing Guide

Comprehensive guide for running, writing, and maintaining tests in ADKFlow.

## Quick Start

```bash
# Run all Python tests
uv run pytest

# Run all frontend tests
cd frontend && npm test

# Run specific test files
uv run pytest backend/tests/unit/test_tab_routes.py -v
cd frontend && npx vitest run __tests__/lib/utils.test.ts
```

## Test Structure

```
adkflow/
├── backend/tests/
│   ├── conftest.py              # Shared fixtures (client, tmp_path)
│   └── unit/                    # Backend API tests
│       ├── test_tab_routes.py
│       ├── test_settings_routes.py
│       └── ...
├── packages/adkflow-runner/tests/
│   ├── conftest.py              # Runner-specific fixtures
│   └── unit/
│       ├── compiler/            # Compiler tests
│       ├── runner/              # Execution engine tests
│       ├── extensions/          # FlowUnit system tests
│       ├── callbacks/           # Callback tests
│       └── telemetry/           # Tracing tests
├── frontend/__tests__/
│   ├── lib/                     # Utility function tests
│   ├── mocks/                   # MSW handlers and server
│   └── test-utils.tsx           # React testing utilities
├── conftest.py                  # Root pytest configuration
├── pytest.ini                   # Pytest settings
└── frontend/vitest.config.ts    # Vitest configuration
```

## Design Philosophy

### 1. Full Mocks for External Dependencies

Never call real external services in tests. Mock at the boundary:

```python
# Good - mock the ADK agent
@patch("adkflow_runner.runner.agent_factory.LlmAgent")
def test_creates_agent(mock_agent):
    factory = AgentFactory()
    factory.create(config)
    mock_agent.assert_called_once()

# Bad - calling real Gemini API
def test_agent_response():
    agent = LlmAgent(model="gemini-1.5-flash")  # Real API call!
    result = await agent.run("hello")
```

### 2. Unit Tests Focus on Isolated Behavior

Each test should verify one specific behavior:

```python
# Good - focused test
def test_parse_env_ignores_comments():
    content = "# comment\nKEY=value"
    result = parse_env(content)
    assert result == {"KEY": "value"}

# Bad - testing too many things
def test_parse_env():
    # Tests comments, quotes, empty lines, errors all in one
```

### 3. API-Level Integration Tests

For backend routes, test at the HTTP level using the test client:

```python
@pytest.mark.asyncio
async def test_create_tab(client: AsyncClient, tmp_path: Path):
    response = await client.post(
        "/api/project/tabs",
        json={"project_path": str(tmp_path), "name": "New Tab"},
    )
    assert response.status_code == 200
    assert response.json()["tab"]["name"] == "New Tab"
```

### 4. Test Data Stays Local

Use `tmp_path` fixtures for file operations. Never write to real project directories:

```python
def test_saves_manifest(tmp_path):
    manifest_path = tmp_path / "manifest.json"
    save_manifest(manifest_path, data)
    assert manifest_path.exists()
```

---

## Python Testing (pytest)

### Running Tests

```bash
# All tests
uv run pytest

# Specific directory
uv run pytest packages/adkflow-runner/tests/unit/compiler/

# Specific file
uv run pytest backend/tests/unit/test_tab_routes.py

# Specific test
uv run pytest backend/tests/unit/test_tab_routes.py::TestCreateTab::test_create_tab_new_project

# With coverage
uv run pytest --cov=packages/adkflow-runner/src --cov-report=html

# Verbose output
uv run pytest -v

# Stop on first failure
uv run pytest -x

# Show print statements
uv run pytest -s
```

### Writing Tests

#### File Naming

- Test files: `test_<module>.py`
- Test classes: `Test<Feature>`
- Test functions: `test_<behavior>`

```python
# test_compiler.py
class TestCompiler:
    def test_compiles_simple_workflow(self):
        ...

    def test_raises_on_missing_start_node(self):
        ...
```

#### Using Fixtures

Fixtures provide reusable test setup. Define in `conftest.py`:

```python
# conftest.py
import pytest
from httpx import AsyncClient, ASGITransport
from backend.src.main import app

@pytest.fixture
async def client():
    """Async HTTP client for API tests."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

@pytest.fixture
def sample_manifest():
    """Sample manifest for compiler tests."""
    return {
        "name": "test",
        "version": "3.0",
        "tabs": [{"id": "main", "name": "Main", "order": 0}],
        "nodes": [...],
        "edges": [...],
    }
```

Use fixtures by adding them as parameters:

```python
@pytest.mark.asyncio
async def test_loads_project(client: AsyncClient, tmp_path: Path):
    # client and tmp_path are automatically injected
    response = await client.get("/api/project", params={"path": str(tmp_path)})
```

#### Async Tests

Mark async tests with `@pytest.mark.asyncio`:

```python
@pytest.mark.asyncio
async def test_async_operation():
    result = await some_async_function()
    assert result == expected
```

#### Mocking

```python
from unittest.mock import patch, MagicMock, AsyncMock

# Decorator style
@patch("module.func")
def test_with_mock(mock_func):
    mock_func.return_value = {"output": "test"}
    assert execute()["output"] == "test"

# Async mock
@patch("module.async_func", new_callable=AsyncMock)
async def test_async(mock_func):
    mock_func.return_value = "result"
    await some_caller()
    mock_func.assert_awaited_once()

# Context manager
with patch("module.function") as mock:
    mock.return_value = 42
```

#### Parametrized Tests

```python
@pytest.mark.parametrize("input,expected", [
    ("true", True), ("1", True), ("false", False), ("0", False),
])
def test_parse_bool(input, expected):
    assert parse_bool(input) == expected
```

### Common Patterns

#### Testing API Routes

```python
class TestTabRoutes:
    @pytest.mark.asyncio
    async def test_list_tabs_empty(self, client: AsyncClient, tmp_path: Path):
        response = await client.get(
            "/api/project/tabs",
            params={"path": str(tmp_path)},
        )
        assert response.status_code == 200
        assert response.json()["tabs"] == []

    @pytest.mark.asyncio
    async def test_create_tab(self, client: AsyncClient, tmp_path: Path):
        response = await client.post(
            "/api/project/tabs",
            json={"project_path": str(tmp_path), "name": "New Tab"},
        )
        assert response.status_code == 200
        assert "id" in response.json()["tab"]
```

#### Testing with Temporary Files

```python
def test_saves_and_loads(tmp_path):
    file_path = tmp_path / "data.json"

    # Write
    save_json(file_path, {"key": "value"})

    # Verify
    assert file_path.exists()
    loaded = load_json(file_path)
    assert loaded["key"] == "value"
```

#### Testing Exceptions

```python
def test_raises_on_invalid_input():
    with pytest.raises(ValidationError) as exc_info:
        validate_manifest({})

    assert "missing required field" in str(exc_info.value)
```

---

## Frontend Testing (vitest)

### Running Tests

```bash
cd frontend

# Run all tests
npm test

# Run in watch mode
npm run test:watch

# Run specific file
npx vitest run __tests__/lib/utils.test.ts

# Run with coverage
npm run test:coverage

# Run matching pattern
npx vitest run -t "generateNodeId"
```

### Writing Tests

#### File Naming

- Test files: `<module>.test.ts` or `<module>.test.tsx`
- Place in `__tests__/` mirroring source structure

```
frontend/
├── lib/
│   ├── utils.ts
│   └── nodeHydration.ts
└── __tests__/
    └── lib/
        ├── utils.test.ts
        └── nodeHydration.test.ts
```

#### Basic Test Structure

```typescript
import { describe, it, expect } from "vitest";
import { myFunction } from "@/lib/myModule";

describe("myFunction", () => {
  it("should return expected value", () => {
    const result = myFunction("input");
    expect(result).toBe("expected");
  });

  it("should handle edge cases", () => {
    expect(myFunction("")).toBe("");
    expect(myFunction(null)).toBeNull();
  });
});
```

#### Mocking Modules

```typescript
import { describe, it, expect, vi } from "vitest";

// Mock entire module
vi.mock("@/lib/api", () => ({
  fetchData: vi.fn(() => Promise.resolve({ data: "test" })),
}));

// Mock specific exports
vi.mock("@/components/nodes/CustomNode", () => ({
  getDefaultCustomNodeData: vi.fn((schema) => ({
    schema,
    config: {},
    handleTypes: { input: "any", output: "any" },
  })),
}));
```

#### Mocking with Implementations

```typescript
import { vi } from "vitest";

const mockFetch = vi.fn();

// Different returns per call
mockFetch
  .mockResolvedValueOnce({ data: "first" })
  .mockResolvedValueOnce({ data: "second" });

// Verify calls
expect(mockFetch).toHaveBeenCalledWith("arg1", "arg2");
expect(mockFetch).toHaveBeenCalledTimes(2);
```

#### Testing React Components

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MyComponent } from "@/components/MyComponent";

describe("MyComponent", () => {
  it("renders correctly", () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText("Test")).toBeInTheDocument();
  });

  it("handles click events", async () => {
    const onClick = vi.fn();
    render(<MyComponent onClick={onClick} />);

    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalled();
  });
});
```

#### Spying and Type Assertions

```typescript
// Spy on console
const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Unknown"));
warnSpy.mockRestore();

// Type assertions for generic returns
const config = (hydrated.data as { config: { name: string } }).config;
expect(config.name).toBe("Test");

// Async error handling
await expect(fetchData("/path")).rejects.toThrow("Network error");
```

---

## Test Categories

| Category | Location | What to Test |
|----------|----------|--------------|
| **Compiler** | `runner/tests/unit/compiler/` | Parsing, validation, IR generation |
| **Runner** | `runner/tests/unit/runner/` | Execution, caching, callbacks |
| **Extensions** | `runner/tests/unit/extensions/` | FlowUnit discovery, schema generation |
| **Backend API** | `backend/tests/unit/` | HTTP routes, request/response |
| **Frontend Utils** | `frontend/__tests__/lib/` | Pure functions, helpers |
| **Frontend Components** | `frontend/__tests__/components/` | React component behavior |

---

## Coverage Goals

- **Target**: 80%+ line coverage for core modules
- **Critical paths**: 90%+ for compiler, execution engine
- **Focus areas**: Error handling, edge cases, validation

### Checking Coverage

```bash
# Python
uv run pytest --cov=packages/adkflow-runner/src --cov-report=html
open htmlcov/index.html

# Frontend
cd frontend && npm run test:coverage
```

---

## Linting Tests

Tests must pass linting before commit:

```bash
# Python
uv run pyright <test_files>
uv run ruff check <test_files>

# TypeScript
cd frontend && npx tsc --noEmit
cd frontend && npx eslint __tests__/
```

### Relaxed Rules for Tests

Test files have relaxed linting rules:

- **Type ignores**: Use `# type: ignore` for mocks where strict typing is impractical
- **Magic values**: Inline test data allowed (no constants required)
- **Long functions**: Test functions can exceed normal limits
- **Unused variables**: Fixtures may appear unused (`_mock = patch(...)`)

---

## Debugging and CI

```bash
# Debug Python tests
uv run pytest -s          # Show print output
uv run pytest --pdb       # Drop into debugger on failure
uv run pytest -vvv        # Verbose output

# Debug frontend tests
npx vitest --ui           # Interactive UI mode
```

Tests run automatically on push via GitHub Actions (`.github/workflows/test.yml`).

---

## See Also

- [Contributing Guide](../contributing.md) - Development workflow
- [Architecture](./architecture.md) - System design
- [Extensions Guide](./extensions/README.md) - FlowUnit testing
