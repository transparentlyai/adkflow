"""Project file loader.

Loads all files needed for compilation:
- manifest.json: Project metadata, tabs, nodes, and edges (v3.0 format)
- prompts/*.prompt.md: Prompt templates
- tools/*.py: Tool implementations

In v3.0 format, all nodes and edges are stored in manifest.json.
Each node has data.tabId to indicate which tab it belongs to.
"""

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from adkflow_runner.compiler.node_config import get_node_config
from adkflow_runner.errors import (
    CompilationError,
    ErrorLocation,
    PromptLoadError,
    ToolLoadError,
)
from adkflow_runner.logging import get_logger

_log = get_logger("compiler.loader")


@dataclass
class LoadedPrompt:
    """A loaded prompt file."""

    name: str
    file_path: str
    absolute_path: Path
    content: str


@dataclass
class LoadedTool:
    """A loaded tool file."""

    name: str
    file_path: str
    absolute_path: Path
    code: str


@dataclass
class LoadedTab:
    """A loaded tab with its ReactFlow data."""

    id: str
    name: str
    order: int
    flow_data: dict[str, Any]


@dataclass
class LoadedProject:
    """Complete loaded project data."""

    path: Path
    name: str
    version: str
    tabs: list[LoadedTab]
    prompts: dict[str, LoadedPrompt] = field(default_factory=dict)
    tools: dict[str, LoadedTool] = field(default_factory=dict)

    def get_tab(self, tab_id: str) -> LoadedTab | None:
        """Get a tab by ID."""
        for tab in self.tabs:
            if tab.id == tab_id:
                return tab
        return None

    def get_prompt(self, file_path: str) -> LoadedPrompt | None:
        """Get a prompt by file path."""
        return self.prompts.get(file_path)

    def get_tool(self, file_path: str) -> LoadedTool | None:
        """Get a tool by file path."""
        return self.tools.get(file_path)


class ProjectLoader:
    """Loads project files for compilation."""

    def __init__(self, load_prompts: bool = True, load_tools: bool = True):
        self.load_prompts = load_prompts
        self.load_tools = load_tools

    def load(self, project_path: Path | str) -> LoadedProject:
        """Load a complete project.

        Args:
            project_path: Path to the project directory

        Returns:
            LoadedProject with all files loaded

        Raises:
            CompilationError: If project structure is invalid
        """
        project_path = Path(project_path).resolve()

        _log.debug("Loading project", path=str(project_path))

        if not project_path.exists():
            _log.error("Project path does not exist", path=str(project_path))
            raise CompilationError(f"Project path does not exist: {project_path}")

        if not project_path.is_dir():
            _log.error("Project path is not a directory", path=str(project_path))
            raise CompilationError(f"Project path is not a directory: {project_path}")

        # Load manifest
        manifest = self._load_manifest(project_path)

        # Load tabs from manifest (nodes filtered by tabId)
        tabs = self._load_tabs(manifest)

        # Create project
        project = LoadedProject(
            path=project_path,
            name=manifest.get("name", "Untitled"),
            version=manifest.get("version", "3.0"),
            tabs=tabs,
        )

        # Scan for referenced prompts and tools in the flow data
        if self.load_prompts or self.load_tools:
            self._load_referenced_files(project)

        _log.info(
            "Project loaded",
            name=project.name,
            tabs=len(project.tabs),
            prompts=len(project.prompts),
            tools=len(project.tools),
        )

        return project

    def _load_manifest(self, project_path: Path) -> dict[str, Any]:
        """Load manifest.json."""
        manifest_path = project_path / "manifest.json"

        if not manifest_path.exists():
            raise CompilationError(
                f"No manifest.json found in project: {project_path}",
                location=ErrorLocation(file_path=str(manifest_path)),
            )

        try:
            with open(manifest_path, encoding="utf-8") as f:
                return json.load(f)
        except json.JSONDecodeError as e:
            raise CompilationError(
                f"Invalid JSON in manifest.json: {e}",
                location=ErrorLocation(file_path=str(manifest_path), line=e.lineno),
            ) from e

    def _load_tabs(self, manifest: dict[str, Any]) -> list[LoadedTab]:
        """Load all tabs from manifest (v3.0 format).

        In v3.0, nodes and edges are at the manifest root level.
        Each node has data.tabId to indicate which tab it belongs to.
        """
        tabs: list[LoadedTab] = []
        tab_metadata = manifest.get("tabs", [])

        if not tab_metadata:
            raise CompilationError("No tabs defined in manifest.json")

        # Get all nodes and edges from manifest
        all_nodes = manifest.get("nodes", [])
        all_edges = manifest.get("edges", [])

        for tab_info in sorted(tab_metadata, key=lambda t: t.get("order", 0)):
            tab_id = tab_info.get("id")
            if not tab_id:
                continue

            # Filter nodes by tabId
            tab_nodes = [
                n for n in all_nodes if n.get("data", {}).get("tabId") == tab_id
            ]

            # Filter edges - both source and target must be in this tab
            node_ids = {n["id"] for n in tab_nodes}
            tab_edges = [
                e
                for e in all_edges
                if e.get("source") in node_ids and e.get("target") in node_ids
            ]

            # Get viewport from tab metadata
            viewport = tab_info.get("viewport", {"x": 0, "y": 0, "zoom": 1})

            flow_data = {
                "nodes": tab_nodes,
                "edges": tab_edges,
                "viewport": viewport,
            }

            tabs.append(
                LoadedTab(
                    id=tab_id,
                    name=tab_info.get("name", tab_id),
                    order=tab_info.get("order", 0),
                    flow_data=flow_data,
                )
            )

        return tabs

    def _load_referenced_files(self, project: LoadedProject) -> None:
        """Scan flow data and load referenced prompts/tools."""
        for tab in project.tabs:
            nodes = tab.flow_data.get("nodes", [])
            for node in nodes:
                node_type = node.get("type")
                data = node.get("data", {})

                if node_type == "prompt" and self.load_prompts:
                    self._load_prompt_from_node(project, data, tab.id)
                elif node_type == "context" and self.load_prompts:
                    self._load_prompt_from_node(project, data, tab.id, is_context=True)
                elif node_type in ("tool", "agentTool") and self.load_tools:
                    self._load_tool_from_node(project, data, tab.id)

    def _load_prompt_from_node(
        self,
        project: LoadedProject,
        data: dict[str, Any],
        tab_id: str,
        is_context: bool = False,
    ) -> None:
        """Load a prompt file referenced by a node."""
        config = get_node_config(data)
        file_path = config.get("file_path")

        if not file_path or file_path in project.prompts:
            return

        # file_path may already include the directory (e.g., "prompts/file.prompt.md")
        # or just the filename. Handle both cases.
        absolute_path = (project.path / file_path).resolve()

        # If not found, try with default directory prefix
        if not absolute_path.exists():
            if is_context:
                absolute_path = (project.path / "static" / file_path).resolve()
            else:
                absolute_path = (project.path / "prompts" / file_path).resolve()

        # Security check: ensure path is within project
        try:
            absolute_path.relative_to(project.path)
        except ValueError:
            raise PromptLoadError(
                f"Prompt path escapes project directory: {file_path}",
                location=ErrorLocation(tab_id=tab_id, file_path=file_path),
            )

        if not absolute_path.exists():
            raise PromptLoadError(
                f"Prompt file not found: {file_path}",
                location=ErrorLocation(tab_id=tab_id, file_path=str(absolute_path)),
            )

        try:
            content = absolute_path.read_text(encoding="utf-8")
        except Exception as e:
            raise PromptLoadError(
                f"Failed to read prompt file: {e}",
                location=ErrorLocation(tab_id=tab_id, file_path=str(absolute_path)),
            ) from e

        project.prompts[file_path] = LoadedPrompt(
            name=config.get("name", file_path),
            file_path=file_path,
            absolute_path=absolute_path,
            content=content,
        )

    def _load_tool_from_node(
        self,
        project: LoadedProject,
        data: dict[str, Any],
        tab_id: str,
    ) -> None:
        """Load a tool file referenced by a node."""
        config = get_node_config(data)
        file_path = config.get("file_path")

        if not file_path or file_path in project.tools:
            return

        # file_path may already include the directory (e.g., "tools/file.py")
        # or just the filename. Handle both cases.
        absolute_path = (project.path / file_path).resolve()

        # If not found, try with tools/ prefix
        if not absolute_path.exists():
            absolute_path = (project.path / "tools" / file_path).resolve()

        # Security check
        try:
            absolute_path.relative_to(project.path)
        except ValueError:
            raise ToolLoadError(
                f"Tool path escapes project directory: {file_path}",
                location=ErrorLocation(tab_id=tab_id, file_path=file_path),
            )

        if not absolute_path.exists():
            raise ToolLoadError(
                f"Tool file not found: {file_path}",
                location=ErrorLocation(tab_id=tab_id, file_path=str(absolute_path)),
            )

        try:
            code = absolute_path.read_text(encoding="utf-8")
        except Exception as e:
            raise ToolLoadError(
                f"Failed to read tool file: {e}",
                location=ErrorLocation(tab_id=tab_id, file_path=str(absolute_path)),
            ) from e

        project.tools[file_path] = LoadedTool(
            name=config.get("name", Path(file_path).stem),
            file_path=file_path,
            absolute_path=absolute_path,
            code=code,
        )
