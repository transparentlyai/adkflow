# ADKFlow Scanner Tools

Tools for the ADKFlow scanner agent. These tools enable AI agents to explore codebases and generate ADKFlow project files.

## Overview

The scanner tools package provides two categories of tools:

### Codebase Exploration Tools
1. **search_codebase** - Search for regex patterns across files
2. **read_file** - Read file contents with line range support
3. **list_directory** - List directory contents with filtering
4. **find_adk_patterns** - Find ADK-specific patterns (agents, prompts, tools, configs)

### Output Generation Tools
1. **create_manifest** - Create manifest.json for ADKFlow projects
2. **create_page** - Initialize page JSON structures for tabs
3. **create_node** - Create nodes (groups, agents, prompts, tools) in pages
4. **create_edge** - Create edges connecting nodes
5. **write_output** - Write generated project files to disk

All tools are designed to work with Google ADK's `ToolContext` and return structured dictionaries for easy parsing by AI agents.

## Installation

The tools are part of the ADKFlow scanner package. No additional installation is required beyond the scanner dependencies.

```python
# Codebase exploration tools
from scanner.tools import (
    search_codebase,
    read_file,
    list_directory,
    find_adk_patterns,
)

# Output generation tools
from scanner.tools import (
    create_manifest,
    create_page,
    create_node,
    create_edge,
    write_output,
)
```

## Tools Documentation

---

## Codebase Exploration Tools

### search_codebase

Search codebase for files matching a regex pattern.

**Function Signature:**
```python
def search_codebase(
    context: ToolContext,
    pattern: str,
    file_types: list[str] = ["py"],
    include_content: bool = False,
) -> dict[str, Any]
```

**Parameters:**
- `context`: ToolContext containing state with 'codebase_path'
- `pattern`: Regular expression pattern to search for
- `file_types`: List of file extensions to search (default: ["py"])
- `include_content`: If True, include matching lines in results (default: False)

**Returns:**
```python
{
    "status": "success" | "error",
    "matches": [
        {
            "file": str,         # Relative path from codebase root
            "line_number": int,  # Line where match occurred
            "content": str,      # Matching line (if include_content=True)
        },
        ...
    ],
    "total_matches": int,
    "error": str  # Only present if status="error"
}
```

**Example:**
```python
# Find all LlmAgent instantiations
result = search_codebase(
    context,
    pattern=r"LlmAgent\s*\(",
    file_types=["py"],
    include_content=True
)
# Returns: {"status": "success", "matches": [...], "total_matches": 5}
```

---

### read_file

Read contents of a file in the codebase.

**Function Signature:**
```python
def read_file(
    context: ToolContext,
    file_path: str,
    start_line: int = 0,
    end_line: int | None = None,
) -> dict[str, Any]
```

**Parameters:**
- `context`: ToolContext containing state with 'codebase_path'
- `file_path`: Path to file (relative to codebase root or absolute)
- `start_line`: First line to read (0-indexed, default: 0)
- `end_line`: Last line to read (exclusive, default: None for end of file)

**Returns:**
```python
{
    "status": "success" | "error",
    "content": str,      # File contents (requested line range)
    "total_lines": int,  # Total lines in file
    "lines_read": int,   # Number of lines returned
    "path": str,         # Absolute path to file
    "error": str         # Only present if status="error"
}
```

**Example:**
```python
# Read first 50 lines of an agent file
result = read_file(
    context,
    "workflow/agent.py",
    start_line=0,
    end_line=50
)
# Returns: {"status": "success", "content": "...", "total_lines": 150, ...}
```

---

### list_directory

List directory contents in the codebase.

**Function Signature:**
```python
def list_directory(
    context: ToolContext,
    path: str = ".",
    recursive: bool = False,
    pattern: str | None = None,
) -> dict[str, Any]
```

**Parameters:**
- `context`: ToolContext containing state with 'codebase_path'
- `path`: Directory path relative to codebase root (default: ".")
- `recursive`: If True, list recursively (default: False)
- `pattern`: Optional glob pattern to filter results (e.g., "*.py", "test_*")

**Returns:**
```python
{
    "status": "success" | "error",
    "entries": [
        {
            "name": str,  # Entry name
            "path": str,  # Relative path from codebase root
            "type": "file" | "directory",
            "size": int,  # File size in bytes (0 for directories)
        },
        ...
    ],
    "total_entries": int,
    "error": str  # Only present if status="error"
}
```

**Example:**
```python
# List all Python files in workflow directory
result = list_directory(
    context,
    path="workflow",
    pattern="*.py"
)
# Returns: {"status": "success", "entries": [...], "total_entries": 5}
```

---

### find_adk_patterns

Find ADK-specific patterns in codebase.

**Function Signature:**
```python
def find_adk_patterns(
    context: ToolContext,
    patterns: list[str] = ["agents", "prompts", "tools", "configs"],
) -> dict[str, Any]
```

**Parameters:**
- `context`: ToolContext containing state with 'codebase_path'
- `patterns`: List of pattern types to search for:
  - `"agents"`: Find Agent class instantiations (LlmAgent, SequentialAgent, etc.)
  - `"prompts"`: Find `.prompt.md` files
  - `"tools"`: Find tool function definitions (functions returning dict with docstrings)
  - `"configs"`: Find configuration files (config.py, settings.py, .env)

**Returns:**
```python
{
    "status": "success" | "error",
    "findings": {
        "agents": [
            {
                "file": str,
                "line_number": int,
                "type": str,     # "LlmAgent", "SequentialAgent", etc.
                "content": str
            },
            ...
        ],
        "prompts": [
            {
                "file": str,
                "name": str,
                "size": int
            },
            ...
        ],
        "tools": [
            {
                "file": str,
                "line_number": int,
                "name": str,
                "content": str
            },
            ...
        ],
        "configs": [
            {
                "file": str,
                "type": str,  # "config.py", "settings.py", ".env"
                "size": int
            },
            ...
        ]
    },
    "summary": {
        "total_agents": int,
        "total_prompts": int,
        "total_tools": int,
        "total_configs": int
    },
    "error": str  # Only present if status="error"
}
```

**Example:**
```python
# Find all agents and prompts in codebase
result = find_adk_patterns(
    context,
    patterns=["agents", "prompts"]
)
# Returns: {
#   "status": "success",
#   "findings": {
#     "agents": [...],
#     "prompts": [...]
#   },
#   "summary": {
#     "total_agents": 127,
#     "total_prompts": 45,
#     ...
#   }
# }
```

---

## Output Generation Tools

### create_manifest

Create manifest.json content for an ADKFlow project.

**Function Signature:**
```python
def create_manifest(
    context: ToolContext,
    project_name: str,
    tabs: list[dict],
) -> dict
```

**Parameters:**
- `context`: ToolContext for state management
- `project_name`: Name of the project
- `tabs`: List of tab definitions with 'id', 'name', and 'order' keys

**Returns:**
```python
{
    "success": bool,
    "manifest": dict,  # Manifest data structure
    "message": str
}
```

**Example:**
```python
tabs = [
    {"id": "page_docprep", "name": "DocPrep", "order": 0},
    {"id": "page_cagx", "name": "CAGX", "order": 1}
]
result = create_manifest(context, "My Project", tabs)
# Returns: {
#   "success": True,
#   "manifest": {"version": "2.0", "name": "My Project", "tabs": [...]},
#   "message": "Created manifest for 'My Project' with 2 tabs"
# }
```

**State Storage:**
- Stores manifest in `context.state["manifest"]`

---

### create_page

Initialize a page JSON structure for a tab.

**Function Signature:**
```python
def create_page(
    context: ToolContext,
    tab_id: str,
    groups: list[str],
) -> dict
```

**Parameters:**
- `context`: ToolContext for state management
- `tab_id`: Unique identifier for the tab (e.g., "page_docprep")
- `groups`: List of group names that belong to this page

**Returns:**
```python
{
    "success": bool,
    "tab_id": str,
    "page_key": str,  # Key used in context.state
    "groups": list[str],
    "message": str
}
```

**Example:**
```python
result = create_page(context, "page_docprep", ["DocPrep"])
# Returns: {
#   "success": True,
#   "tab_id": "page_docprep",
#   "page_key": "page_page_docprep",
#   "groups": ["DocPrep"],
#   "message": "Initialized page 'page_docprep' with 1 groups"
# }
```

**State Storage:**
- Stores page data in `context.state["page_{tab_id}"]`
- Stores groups in `context.state["page_{tab_id}_groups"]`

---

### create_node

Create a node in a page.

**Function Signature:**
```python
def create_node(
    context: ToolContext,
    tab_id: str,
    node_type: str,  # "group", "agent", "prompt", "tool"
    node_data: dict,
    position: dict | None = None,
    parent_id: str | None = None,
) -> dict
```

**Parameters:**
- `context`: ToolContext for state management
- `tab_id`: Tab identifier where the node should be added
- `node_type`: Type of node - must be one of: "group", "agent", "prompt", "tool"
- `node_data`: Node-specific data dictionary (structure varies by type)
- `position`: Optional position dict with 'x' and 'y' keys (default: {x: 0, y: 0})
- `parent_id`: Optional parent node ID (for nodes inside groups)

**Returns:**
```python
{
    "success": bool,
    "node_id": str,
    "node_type": str,
    "tab_id": str,
    "message": str,
    "error": str  # Only present if success=False
}
```

**Node Data Structures:**

**Group Node:**
```python
node_data = {
    "label": "GroupName",
    "width": 500,
    "height": 300
}
result = create_node(
    context, "page_docprep", "group", node_data,
    position={"x": 100, "y": 100}
)
```

**Agent Node:**
```python
node_data = {
    "agent": {
        "id": "agent_docprep_extractor",  # Optional, will be generated if not provided
        "name": "DocPrep - metadata_extractor",
        "type": "llm",
        "model": "gemini-2.5-flash",
        "temperature": 0.0,
        "description": "Extracts metadata from documents",
        "tools": ["tool1", "tool2"],
        # ... other agent config fields
    }
}
result = create_node(
    context, "page_docprep", "agent", node_data,
    position={"x": 200, "y": 150},
    parent_id="group_docprep"
)
```

**Prompt Node:**
```python
node_data = {
    "prompt": {
        "id": "prompt_docprep_extractor_main",  # Optional
        "name": "DocPrep - main_prompt",
        "file_path": "/path/to/prompt.md"
    }
}
result = create_node(
    context, "page_docprep", "prompt", node_data,
    position={"x": 50, "y": 150},
    parent_id="group_docprep"
)
```

**Tool Node:**
```python
node_data = {
    "name": "extract_metadata",
    "code": "def extract_metadata(doc): ...",
    "file_path": "/path/to/tools.py"
}
result = create_node(
    context, "page_docprep", "tool", node_data,
    position={"x": 50, "y": 200},
    parent_id="group_docprep"
)
```

**Auto-sizing:**
- Group nodes: Use provided width/height
- Agent nodes: Fixed 300×140 px
- Prompt nodes: Width calculated from text, height 30px
- Tool nodes: Width calculated from text, height 30px

---

### create_edge

Create an edge between nodes.

**Function Signature:**
```python
def create_edge(
    context: ToolContext,
    tab_id: str,
    source_id: str,
    target_id: str,
    source_handle: str = "output",
    target_handle: str = "input",
) -> dict
```

**Parameters:**
- `context`: ToolContext for state management
- `tab_id`: Tab identifier where the edge should be added
- `source_id`: ID of the source node
- `target_id`: ID of the target node
- `source_handle`: Source handle name (default: "output")
- `target_handle`: Target handle name (default: "input")

**Returns:**
```python
{
    "success": bool,
    "edge_id": str,
    "source": str,
    "target": str,
    "tab_id": str,
    "message": str,
    "error": str  # Only present if success=False
}
```

**Example:**
```python
result = create_edge(
    context,
    "page_docprep",
    "prompt_docprep_extractor_main",
    "agent_docprep_metadata_extractor"
)
# Returns: {
#   "success": True,
#   "edge_id": "xy-edge__prompt_docprep_extractor_mainoutput-agent_docprep_metadata_extractorinput",
#   "source": "prompt_docprep_extractor_main",
#   "target": "agent_docprep_metadata_extractor",
#   "tab_id": "page_docprep",
#   "message": "Created edge from 'prompt_docprep_extractor_main' to 'agent_docprep_metadata_extractor' in page 'page_docprep'"
# }
```

**Edge Styling:**
- All edges use strokeWidth: 1.5, stroke: "#64748b"
- Animated: false by default

---

### write_output

Write the generated project to disk.

**Function Signature:**
```python
def write_output(
    context: ToolContext,
    output_path: str,
) -> dict
```

**Parameters:**
- `context`: ToolContext containing manifest and page data
- `output_path`: Directory path where project files should be written

**Returns:**
```python
{
    "success": bool,
    "output_path": str,
    "manifest_path": str,
    "pages_directory": str,
    "written_files": list[str],
    "file_count": int,
    "page_count": int,
    "message": str,
    "error": str,  # Only present if success=False
    "partial_files": list[str]  # Only present on error
}
```

**Example:**
```python
result = write_output(context, "/home/user/adkworkflows/myproject")
# Returns: {
#   "success": True,
#   "output_path": "/home/user/adkworkflows/myproject",
#   "manifest_path": "/home/user/adkworkflows/myproject/manifest.json",
#   "pages_directory": "/home/user/adkworkflows/myproject/pages",
#   "written_files": [
#     "/home/user/adkworkflows/myproject/manifest.json",
#     "/home/user/adkworkflows/myproject/pages/page_docprep.json",
#     "/home/user/adkworkflows/myproject/pages/page_cagx.json"
#   ],
#   "file_count": 3,
#   "page_count": 2,
#   "message": "Successfully wrote 3 files to '/home/user/adkworkflows/myproject'"
# }
```

**Output Structure:**
```
output_path/
├── manifest.json
└── pages/
    ├── page_tab1.json
    ├── page_tab2.json
    └── ...
```

**Requirements:**
- Manifest must exist in `context.state["manifest"]`
- Creates output directory if it doesn't exist
- Overwrites existing files

---

## Context State Requirements

### Codebase Exploration Tools

All codebase exploration tools require the `ToolContext` to have a `codebase_path` in its state:

```python
from google.adk.tools import ToolContext

# Setup context with codebase path
context = ToolContext(state={"codebase_path": "/path/to/codebase"})

# Use codebase tools
result = search_codebase(context, pattern=r"LlmAgent\s*\(")
```

### Output Generation Tools

Output generation tools use the following state keys:

- `context.state["manifest"]` - Manifest data (created by `create_manifest`)
- `context.state["page_{tab_id}"]` - Page data for each tab (created by `create_page`)
- `context.state["page_{tab_id}_groups"]` - Group names for each page (created by `create_page`)

```python
from google.adk.tools import ToolContext

# State is automatically managed by the output tools
context = ToolContext(state={})

# Create manifest (stores in context.state["manifest"])
create_manifest(context, "My Project", [...])

# Create page (stores in context.state["page_page_docprep"])
create_page(context, "page_docprep", ["DocPrep"])

# Add nodes and edges (modifies page state)
create_node(context, "page_docprep", "group", {...})
create_edge(context, "page_docprep", "source_id", "target_id")

# Write to disk (reads all state)
write_output(context, "/path/to/output")
```

## Pattern Detection Details

### Agent Patterns

The `find_adk_patterns` tool detects these agent types:
- `LlmAgent` - Standard LLM agent
- `Agent` - Generic agent base class
- `SequentialAgent` - Sequential execution agent
- `ParallelAgent` - Parallel execution agent
- `LoopAgent` - Looping execution agent

Pattern: `(LlmAgent|Agent|SequentialAgent|ParallelAgent|LoopAgent)\s*\(`

### Tool Patterns

Tool functions must match these criteria:
- Function definition with `def` keyword
- Returns `dict` type annotation
- Has a docstring (""" or ''')

Pattern: `^def\s+(\w+)\s*\([^)]*\)\s*->\s*dict\s*:`

### Prompt Patterns

Prompt files must end with `.prompt.md`

Pattern: `**/*.prompt.md`

### Config Patterns

Configuration files include:
- `config.py` - Configuration modules
- `settings.py` - Settings modules
- `.env` - Environment variable files
- `.env.*` - Environment-specific configs (e.g., `.env.local`, `.env.production`)

## Error Handling

All tools return a consistent error format:

```python
{
    "status": "error",
    "error": "Error message describing what went wrong",
    # ... other fields with empty/default values
}
```

Common error scenarios:
- Codebase path doesn't exist
- Invalid regex pattern
- File not found
- Permission denied
- Unicode decode errors (non-text files)

## Best Practices

1. **Start with find_adk_patterns**: Get a high-level overview of the codebase structure
2. **Use search_codebase for specific patterns**: When you need to find specific code constructs
3. **Read files selectively**: Use line ranges to avoid reading large files entirely
4. **Filter by file types**: Narrow searches to relevant file extensions
5. **Handle errors gracefully**: Always check the `status` field in responses

## Example Workflow

```python
from scanner.tools import find_adk_patterns, read_file, search_codebase
from google.adk.tools import ToolContext

# Setup context
context = ToolContext(state={"codebase_path": "/home/user/my-adk-project"})

# 1. Discover ADK patterns
patterns = find_adk_patterns(context)
print(f"Found {patterns['summary']['total_agents']} agents")

# 2. Search for specific agent type
llm_agents = search_codebase(
    context,
    pattern=r"LlmAgent\s*\(",
    include_content=True
)

# 3. Read agent file for details
if llm_agents['matches']:
    first_match = llm_agents['matches'][0]
    agent_code = read_file(
        context,
        first_match['file'],
        start_line=0,
        end_line=100
    )
    print(agent_code['content'])
```

## Integration with Scanner

These tools are used by the ADKFlow scanner agent to:

1. **Discover** agents, prompts, and tools in target codebases
2. **Analyze** code structure and relationships
3. **Extract** configuration and metadata
4. **Generate** ADKFlow project files with proper node layout

The scanner orchestrator uses these tools to build a complete map of ADK components before generating the ADKFlow visual representation.

## Testing

To test the tools manually:

```python
from pathlib import Path
from scanner.tools import find_adk_patterns
from google.adk.tools import ToolContext

# Test with a known ADK project
context = ToolContext(state={
    "codebase_path": "/home/mauro/projects/lynx"
})

result = find_adk_patterns(context)
print(f"Status: {result['status']}")
print(f"Total agents found: {result['summary']['total_agents']}")
print(f"Total prompts found: {result['summary']['total_prompts']}")
```

## Future Enhancements

Potential improvements for future versions:

- [ ] Support for additional agent types (custom agents)
- [ ] Dependency graph analysis
- [ ] Memory and artifact detection
- [ ] Tool usage analysis (which agents use which tools)
- [ ] Prompt variable extraction and validation
- [ ] Configuration value extraction
- [ ] Support for more file formats (JSON, TOML, YAML configs)
- [ ] Parallel file searching for large codebases
- [ ] Caching for repeated searches
- [ ] Integration with code parsers (AST analysis)

## License

Part of the ADKFlow project.
