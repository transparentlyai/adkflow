# File Operations

File and filesystem management in ADKFlow.

## Overview

The backend handles:
- Prompt file management (prompts/)
- Context file management (static/)
- Tool file management (tools/)
- Filesystem browsing
- Chunked file reading

## File Structure

```
project/
├── prompts/           # Markdown prompt files
│   └── *.prompt.md
├── static/            # Context/config files
│   └── *.json, *.yaml, *.txt
└── tools/             # Python tool files
    └── *.py
```

## Prompt Operations

**Location**: `routes/file_routes.py`

### Create Prompt

```python
@router.post("/project/prompt/create")
async def create_prompt(request: CreatePromptRequest) -> None:
    project_path = Path(request.project_path)
    prompts_dir = project_path / "prompts"
    prompts_dir.mkdir(exist_ok=True)

    # Sanitize filename
    filename = sanitize_filename(request.filename)
    if not filename.endswith(".prompt.md"):
        filename = f"{filename}.prompt.md"

    prompt_path = prompts_dir / filename

    if prompt_path.exists():
        raise HTTPException(400, "Prompt already exists")

    prompt_path.write_text(request.content or "")
```

### Read Prompt

```python
@router.post("/project/prompt/read")
async def read_prompt(request: ReadPromptRequest) -> PromptContent:
    project_path = Path(request.project_path)
    prompt_path = project_path / "prompts" / request.filename

    if not prompt_path.exists():
        raise HTTPException(404, "Prompt not found")

    return PromptContent(content=prompt_path.read_text())
```

### Save Prompt

```python
@router.post("/project/prompt/save")
async def save_prompt(request: SavePromptRequest) -> None:
    project_path = Path(request.project_path)
    prompt_path = project_path / "prompts" / request.filename

    prompt_path.write_text(request.content)
```

## Context Operations

### Create Context

```python
@router.post("/project/context/create")
async def create_context(request: CreateContextRequest) -> None:
    project_path = Path(request.project_path)
    static_dir = project_path / "static"
    static_dir.mkdir(exist_ok=True)

    filename = sanitize_filename(request.filename)
    context_path = static_dir / filename

    if context_path.exists():
        raise HTTPException(400, "Context file already exists")

    context_path.write_text(request.content or "")
```

## Tool Operations

### Create Tool

```python
@router.post("/project/tool/create")
async def create_tool(request: CreateToolRequest) -> None:
    project_path = Path(request.project_path)
    tools_dir = project_path / "tools"
    tools_dir.mkdir(exist_ok=True)

    filename = sanitize_filename(request.filename)
    if not filename.endswith(".py"):
        filename = f"{filename}.py"

    tool_path = tools_dir / filename

    if tool_path.exists():
        raise HTTPException(400, "Tool already exists")

    # Default tool template
    content = request.content or '''"""Tool description."""

def my_tool(arg: str) -> str:
    """
    Tool function.

    Args:
        arg: Input argument

    Returns:
        Result string
    """
    return arg
'''

    tool_path.write_text(content)
```

## Filesystem Operations

**Location**: `routes/filesystem_routes.py`

### List Directory

```python
@router.get("/filesystem/list")
async def list_directory(path: str) -> DirectoryListing:
    dir_path = Path(path).expanduser()

    if not dir_path.exists():
        raise HTTPException(404, "Directory not found")

    if not dir_path.is_dir():
        raise HTTPException(400, "Path is not a directory")

    entries = []
    for entry in sorted(dir_path.iterdir()):
        # Skip hidden files
        if entry.name.startswith("."):
            continue

        entries.append({
            "name": entry.name,
            "type": "directory" if entry.is_dir() else "file",
        })

    return DirectoryListing(
        path=str(dir_path),
        parent=str(dir_path.parent),
        entries=entries,
    )
```

### Create Directory

```python
@router.post("/filesystem/mkdir")
async def create_directory(request: MkdirRequest) -> None:
    dir_path = Path(request.path).expanduser()

    if dir_path.exists():
        raise HTTPException(400, "Directory already exists")

    dir_path.mkdir(parents=True)
```

### Ensure Directory

```python
@router.post("/filesystem/ensure-dir")
async def ensure_directory(request: EnsureDirRequest) -> None:
    dir_path = Path(request.path).expanduser()
    dir_path.mkdir(parents=True, exist_ok=True)
```

## Chunked File Reading

For large files (e.g., logs), read in chunks:

```python
@router.post("/project/file/chunk")
async def read_file_chunk(request: ReadChunkRequest) -> ChunkResponse:
    file_path = Path(request.path)

    if not file_path.exists():
        raise HTTPException(404, "File not found")

    # Read all lines
    lines = file_path.read_text().splitlines()
    total_lines = len(lines)

    # Apply reverse if requested (for logs, read from end)
    if request.reverse:
        lines = lines[::-1]

    # Apply offset and limit
    start = request.offset
    end = start + request.limit
    chunk = lines[start:end]

    # Restore order if reversed
    if request.reverse:
        chunk = chunk[::-1]

    return ChunkResponse(
        lines=chunk,
        has_more=end < total_lines,
        total_lines=total_lines,
    )
```

## Filename Sanitization

Prevent path traversal attacks:

```python
def sanitize_filename(filename: str) -> str:
    # Remove path separators
    filename = filename.replace("/", "_").replace("\\", "_")

    # Remove parent directory references
    filename = filename.replace("..", "_")

    # Remove leading dots (hidden files)
    filename = filename.lstrip(".")

    # Ensure not empty
    if not filename:
        filename = "unnamed"

    return filename
```

## Security Considerations

### Path Validation

All file operations validate paths:

```python
def validate_project_path(project_path: str, file_path: Path) -> None:
    """Ensure file is within project directory."""
    project = Path(project_path).resolve()
    target = file_path.resolve()

    if not str(target).startswith(str(project)):
        raise HTTPException(403, "Access denied: path outside project")
```

### No Absolute Paths

Filenames are always relative to project directories:

```python
# Good
prompt_path = project_path / "prompts" / filename

# Never
prompt_path = Path(filename)  # Could be /etc/passwd
```

## See Also

- [Project Management](./project-management.md) - Project structure
- [API Reference](./api-reference.md) - File endpoints
- [Tab System](./tab-system.md) - Workflow storage
