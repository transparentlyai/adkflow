"""Codebase Exploration Tools for ADKFlow Scanner

This module provides tools for exploring and analyzing codebases to find
ADK (Agent Development Kit) patterns, agents, prompts, tools, and configurations.

These tools are designed to work with Google ADK ToolContext and return
structured dictionaries for easy parsing by AI agents.
"""

import re
from pathlib import Path
from typing import Any

from google.adk.tools import ToolContext

# Directories to always exclude from scanning
EXCLUDED_DIRS = {
    ".venv",
    "venv",
    ".env",
    "env",
    "node_modules",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    ".git",
    ".hg",
    ".svn",
    "build",
    "dist",
    ".eggs",
    "*.egg-info",
    ".tox",
    ".nox",
    "site-packages",
}


def _should_exclude(path: Path) -> bool:
    """Check if a path should be excluded from scanning."""
    parts = path.parts
    for part in parts:
        if part in EXCLUDED_DIRS:
            return True
        # Also check for patterns like *.egg-info
        if part.endswith(".egg-info"):
            return True
    return False


def search_codebase(
    tool_context: ToolContext,
    pattern: str,
    file_types: list[str] | None = None,
    include_content: bool = False,
) -> dict[str, Any]:
    """Search codebase for files matching a regex pattern.

    This tool searches through files in the codebase directory for content
    matching the specified regex pattern. It can filter by file types and
    optionally include matching content snippets.

    Args:
        tool_context: ToolContext containing state with 'codebase_path'
        pattern: Regular expression pattern to search for
        file_types: List of file extensions to search (default: ["py"])
        include_content: If True, include matching lines in results (default: False)

    Returns:
        dict: {
            "status": "success" | "error",
            "matches": [
                {
                    "file": str,  # Relative path from codebase root
                    "line_number": int,  # Line where match occurred
                    "content": str,  # Matching line (if include_content=True)
                },
                ...
            ],
            "total_matches": int,
            "error": str  # Only present if status="error"
        }

    Example:
        >>> search_codebase(
        ...     context,
        ...     pattern=r"LlmAgent\\s*\\(",
        ...     file_types=["py"],
        ...     include_content=True
        ... )
        {
            "status": "success",
            "matches": [
                {
                    "file": "workflow/agent.py",
                    "line_number": 42,
                    "content": "agent = LlmAgent(name='MyAgent')"
                }
            ],
            "total_matches": 1
        }
    """
    try:
        # Get codebase path from context state
        codebase_path = Path(tool_context.state.get("codebase_path", "."))
        if not codebase_path.exists():
            return {
                "status": "error",
                "error": f"Codebase path does not exist: {codebase_path}",
                "matches": [],
                "total_matches": 0,
            }

        # Compile regex pattern
        try:
            regex = re.compile(pattern)
        except re.error as e:
            return {
                "status": "error",
                "error": f"Invalid regex pattern: {e}",
                "matches": [],
                "total_matches": 0,
            }

        # Build glob patterns for file types
        if file_types is None:
            file_types = ["py"]
        matches = []
        for ext in file_types:
            ext = ext.lstrip(".")  # Remove leading dot if present
            pattern_str = f"**/*.{ext}"

            # Search through files
            for file_path in codebase_path.glob(pattern_str):
                if not file_path.is_file():
                    continue

                # Skip excluded directories
                if _should_exclude(file_path):
                    continue

                try:
                    with open(file_path, encoding="utf-8") as f:
                        for line_num, line in enumerate(f, start=1):
                            if regex.search(line):
                                match_data = {
                                    "file": str(file_path.relative_to(codebase_path)),
                                    "line_number": line_num,
                                }
                                if include_content:
                                    match_data["content"] = line.strip()
                                matches.append(match_data)
                except (UnicodeDecodeError, PermissionError):
                    # Skip files that can't be read
                    continue

        return {
            "status": "success",
            "matches": matches,
            "total_matches": len(matches),
        }

    except Exception as e:
        return {
            "status": "error",
            "error": f"Unexpected error during search: {str(e)}",
            "matches": [],
            "total_matches": 0,
        }


def read_file(
    tool_context: ToolContext,
    file_path: str,
    start_line: int = 0,
    end_line: int | None = None,
) -> dict[str, Any]:
    """Read contents of a file in the codebase.

    This tool reads a file from the codebase directory, with optional line
    range filtering. File paths are resolved relative to the codebase root.

    Args:
        tool_context: ToolContext containing state with 'codebase_path'
        file_path: Path to file (relative to codebase root or absolute)
        start_line: First line to read (0-indexed, default: 0)
        end_line: Last line to read (exclusive, default: None for end of file)

    Returns:
        dict: {
            "status": "success" | "error",
            "content": str,  # File contents (requested line range)
            "total_lines": int,  # Total lines in file
            "lines_read": int,  # Number of lines returned
            "path": str,  # Absolute path to file
            "error": str  # Only present if status="error"
        }

    Example:
        >>> read_file(context, "workflow/agent.py", start_line=0, end_line=50)
        {
            "status": "success",
            "content": "from google.adk import LlmAgent\\n...",
            "total_lines": 150,
            "lines_read": 50,
            "path": "/path/to/codebase/workflow/agent.py"
        }
    """
    try:
        # Get codebase path from context state
        codebase_path = Path(tool_context.state.get("codebase_path", "."))

        # Resolve file path (handle both relative and absolute paths)
        target_path = Path(file_path)
        if not target_path.is_absolute():
            target_path = codebase_path / target_path

        # Verify file exists
        if not target_path.exists():
            return {
                "status": "error",
                "error": f"File does not exist: {file_path}",
                "content": "",
                "total_lines": 0,
                "lines_read": 0,
                "path": str(target_path),
            }

        if not target_path.is_file():
            return {
                "status": "error",
                "error": f"Path is not a file: {file_path}",
                "content": "",
                "total_lines": 0,
                "lines_read": 0,
                "path": str(target_path),
            }

        # Read file
        try:
            with open(target_path, encoding="utf-8") as f:
                lines = f.readlines()

            total_lines = len(lines)

            # Apply line range filtering
            end_line = total_lines if end_line is None else min(end_line, total_lines)
            start_line = max(0, start_line)
            selected_lines = lines[start_line:end_line]

            return {
                "status": "success",
                "content": "".join(selected_lines),
                "total_lines": total_lines,
                "lines_read": len(selected_lines),
                "path": str(target_path),
            }

        except UnicodeDecodeError:
            return {
                "status": "error",
                "error": f"Cannot read file (encoding issue): {file_path}",
                "content": "",
                "total_lines": 0,
                "lines_read": 0,
                "path": str(target_path),
            }

    except Exception as e:
        return {
            "status": "error",
            "error": f"Unexpected error reading file: {str(e)}",
            "content": "",
            "total_lines": 0,
            "lines_read": 0,
            "path": file_path,
        }


def list_directory(
    tool_context: ToolContext,
    path: str = ".",
    recursive: bool = False,
    pattern: str | None = None,
) -> dict[str, Any]:
    """List directory contents in the codebase.

    This tool lists files and directories within the codebase, with optional
    recursive traversal and glob pattern filtering.

    Args:
        tool_context: ToolContext containing state with 'codebase_path'
        path: Directory path relative to codebase root (default: ".")
        recursive: If True, list recursively (default: False)
        pattern: Optional glob pattern to filter results (e.g., "*.py", "test_*")

    Returns:
        dict: {
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

    Example:
        >>> list_directory(context, path="workflow", pattern="*.py")
        {
            "status": "success",
            "entries": [
                {
                    "name": "agent.py",
                    "path": "workflow/agent.py",
                    "type": "file",
                    "size": 4521
                }
            ],
            "total_entries": 1
        }
    """
    try:
        # Get codebase path from context state
        codebase_path = Path(tool_context.state.get("codebase_path", "."))

        # Resolve target directory
        target_path = Path(path)
        if not target_path.is_absolute():
            target_path = codebase_path / target_path

        # Verify directory exists
        if not target_path.exists():
            return {
                "status": "error",
                "error": f"Directory does not exist: {path}",
                "entries": [],
                "total_entries": 0,
            }

        if not target_path.is_dir():
            return {
                "status": "error",
                "error": f"Path is not a directory: {path}",
                "entries": [],
                "total_entries": 0,
            }

        # List entries
        entries = []

        if recursive:
            # Recursive listing with optional pattern
            glob_pattern = pattern if pattern else "**/*"
            for entry_path in target_path.glob(glob_pattern):
                if entry_path == target_path:
                    continue  # Skip the target directory itself

                # Skip excluded directories
                if _should_exclude(entry_path):
                    continue

                entry_type = "directory" if entry_path.is_dir() else "file"
                entry_size = entry_path.stat().st_size if entry_path.is_file() else 0

                entries.append(
                    {
                        "name": entry_path.name,
                        "path": str(entry_path.relative_to(codebase_path)),
                        "type": entry_type,
                        "size": entry_size,
                    }
                )
        else:
            # Non-recursive listing
            for entry_path in target_path.iterdir():
                # Apply pattern filter if specified
                if pattern and not entry_path.match(pattern):
                    continue

                # Skip excluded directories
                if _should_exclude(entry_path):
                    continue

                entry_type = "directory" if entry_path.is_dir() else "file"
                entry_size = entry_path.stat().st_size if entry_path.is_file() else 0

                entries.append(
                    {
                        "name": entry_path.name,
                        "path": str(entry_path.relative_to(codebase_path)),
                        "type": entry_type,
                        "size": entry_size,
                    }
                )

        # Sort entries: directories first, then files, both alphabetically
        entries.sort(key=lambda x: (x["type"] == "file", x["name"].lower()))

        return {
            "status": "success",
            "entries": entries,
            "total_entries": len(entries),
        }

    except Exception as e:
        return {
            "status": "error",
            "error": f"Unexpected error listing directory: {str(e)}",
            "entries": [],
            "total_entries": 0,
        }


def find_adk_patterns(
    tool_context: ToolContext,
    patterns: list[str] | None = None,
) -> dict[str, Any]:
    """Find ADK-specific patterns in codebase.

    This tool searches for common Google ADK patterns including agent definitions,
    prompt files, tool functions, and configuration files. It returns categorized
    findings for easy analysis.

    Args:
        tool_context: ToolContext containing state with 'codebase_path'
        patterns: List of pattern types to search for
            - "agents": Find Agent class instantiations
            - "prompts": Find .prompt.md files
            - "tools": Find tool function definitions
            - "configs": Find configuration files

    Returns:
        dict: {
            "status": "success" | "error",
            "findings": {
                "agents": [
                    {
                        "file": str,
                        "line_number": int,
                        "type": str,  # "LlmAgent", "SequentialAgent", etc.
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

    Example:
        >>> find_adk_patterns(context, patterns=["agents", "prompts"])
        {
            "status": "success",
            "findings": {
                "agents": [
                    {
                        "file": "workflow/agent.py",
                        "line_number": 42,
                        "type": "LlmAgent",
                        "content": "agent = LlmAgent(name='Researcher')"
                    }
                ],
                "prompts": [
                    {
                        "file": "prompts/system.prompt.md",
                        "name": "system",
                        "size": 1024
                    }
                ]
            },
            "summary": {
                "total_agents": 1,
                "total_prompts": 1,
                "total_tools": 0,
                "total_configs": 0
            }
        }
    """
    try:
        # Get codebase path from context state
        codebase_path = Path(tool_context.state.get("codebase_path", "."))
        if not codebase_path.exists():
            return {
                "status": "error",
                "error": f"Codebase path does not exist: {codebase_path}",
                "findings": {},
                "summary": {},
            }

        findings = {}

        # Default patterns if None provided
        if patterns is None:
            patterns = ["agents", "prompts", "tools", "configs"]

        # Pattern definitions
        agent_pattern = re.compile(r"(LlmAgent|Agent|SequentialAgent|ParallelAgent|LoopAgent)\s*\(")
        tool_pattern = re.compile(r"^def\s+(\w+)\s*\([^)]*\)\s*->\s*dict\s*:")

        # Find agents
        if "agents" in patterns:
            agents = []
            for py_file in codebase_path.glob("**/*.py"):
                if _should_exclude(py_file):
                    continue
                try:
                    with open(py_file, encoding="utf-8") as f:
                        for line_num, line in enumerate(f, start=1):
                            match = agent_pattern.search(line)
                            if match:
                                agents.append(
                                    {
                                        "file": str(py_file.relative_to(codebase_path)),
                                        "line_number": line_num,
                                        "type": match.group(1),
                                        "content": line.strip(),
                                    }
                                )
                except (UnicodeDecodeError, PermissionError):
                    continue

            findings["agents"] = agents

        # Find prompts
        if "prompts" in patterns:
            prompts = []
            for prompt_file in codebase_path.glob("**/*.prompt.md"):
                if _should_exclude(prompt_file):
                    continue
                # Extract prompt name from filename
                name = prompt_file.stem.replace(".prompt", "")
                prompts.append(
                    {
                        "file": str(prompt_file.relative_to(codebase_path)),
                        "name": name,
                        "size": prompt_file.stat().st_size,
                    }
                )

            findings["prompts"] = prompts

        # Find tools
        if "tools" in patterns:
            tools = []
            for py_file in codebase_path.glob("**/*.py"):
                if _should_exclude(py_file):
                    continue
                try:
                    with open(py_file, encoding="utf-8") as f:
                        content = f.read()
                        lines = content.split("\n")

                        for line_num, line in enumerate(lines, start=1):
                            match = tool_pattern.match(line.strip())
                            if match:
                                # Check if function has a docstring (next few lines)
                                has_docstring = False
                                if line_num < len(lines):
                                    next_lines = "\n".join(lines[line_num : line_num + 3])
                                    if '"""' in next_lines or "'''" in next_lines:
                                        has_docstring = True

                                if has_docstring:
                                    tools.append(
                                        {
                                            "file": str(py_file.relative_to(codebase_path)),
                                            "line_number": line_num,
                                            "name": match.group(1),
                                            "content": line.strip(),
                                        }
                                    )
                except (UnicodeDecodeError, PermissionError):
                    continue

            findings["tools"] = tools

        # Find configs
        if "configs" in patterns:
            configs = []

            # Search for config.py, settings.py
            for config_name in ["config.py", "settings.py"]:
                for config_file in codebase_path.glob(f"**/{config_name}"):
                    if _should_exclude(config_file):
                        continue
                    configs.append(
                        {
                            "file": str(config_file.relative_to(codebase_path)),
                            "type": config_name,
                            "size": config_file.stat().st_size,
                        }
                    )

            # Search for .env files
            for env_file in codebase_path.glob("**/.env"):
                if _should_exclude(env_file):
                    continue
                configs.append(
                    {
                        "file": str(env_file.relative_to(codebase_path)),
                        "type": ".env",
                        "size": env_file.stat().st_size,
                    }
                )

            # Search for .env.* files
            for env_file in codebase_path.glob("**/.env.*"):
                if _should_exclude(env_file):
                    continue
                configs.append(
                    {
                        "file": str(env_file.relative_to(codebase_path)),
                        "type": env_file.name,
                        "size": env_file.stat().st_size,
                    }
                )

            findings["configs"] = configs

        # Generate summary
        summary = {
            "total_agents": len(findings.get("agents", [])),
            "total_prompts": len(findings.get("prompts", [])),
            "total_tools": len(findings.get("tools", [])),
            "total_configs": len(findings.get("configs", [])),
        }

        return {
            "status": "success",
            "findings": findings,
            "summary": summary,
        }

    except Exception as e:
        return {
            "status": "error",
            "error": f"Unexpected error finding ADK patterns: {str(e)}",
            "findings": {},
            "summary": {},
        }
