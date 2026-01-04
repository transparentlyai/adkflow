"""Tests for the ProjectLoader module.

Tests project file loading including:
- Manifest loading and validation
- Tab loading from v3.0 format
- Prompt file discovery and loading
- Tool file discovery and loading
- Error handling for missing/invalid files
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from adkflow_runner.compiler.loader import (
    LoadedPrompt,
    LoadedTab,
    LoadedTool,
    ProjectLoader,
)
from adkflow_runner.errors import CompilationError, PromptLoadError, ToolLoadError


class TestProjectLoader:
    """Tests for ProjectLoader.load() method."""

    def test_load_minimal_project(self, minimal_project: Path):
        """Load a minimal valid project with just manifest.json."""
        loader = ProjectLoader()
        project = loader.load(minimal_project)

        assert project.path == minimal_project
        assert project.name == "minimal-project"
        assert project.version == "3.0"
        assert len(project.tabs) == 1
        assert project.tabs[0].id == "tab1"
        assert project.tabs[0].name == "Main"

    def test_load_nonexistent_path(self, tmp_path: Path):
        """Error when project path doesn't exist."""
        loader = ProjectLoader()
        nonexistent = tmp_path / "nonexistent"

        with pytest.raises(CompilationError, match="does not exist"):
            loader.load(nonexistent)

    def test_load_file_not_directory(self, tmp_path: Path):
        """Error when project path is a file, not directory."""
        file_path = tmp_path / "somefile.txt"
        file_path.write_text("not a directory")

        loader = ProjectLoader()
        with pytest.raises(CompilationError, match="not a directory"):
            loader.load(file_path)

    def test_load_missing_manifest(self, tmp_path: Path):
        """Error when manifest.json is missing."""
        loader = ProjectLoader()
        with pytest.raises(CompilationError, match="No manifest.json"):
            loader.load(tmp_path)

    def test_load_invalid_manifest_json(self, tmp_path: Path):
        """Error when manifest.json contains invalid JSON."""
        (tmp_path / "manifest.json").write_text("{ invalid json }")

        loader = ProjectLoader()
        with pytest.raises(CompilationError, match="Invalid JSON"):
            loader.load(tmp_path)

    def test_load_manifest_no_tabs(self, tmp_path: Path):
        """Error when manifest has no tabs defined."""
        manifest = {
            "name": "test",
            "version": "3.0",
            "tabs": [],
            "nodes": [],
            "edges": [],
        }
        (tmp_path / "manifest.json").write_text(json.dumps(manifest))

        loader = ProjectLoader()
        with pytest.raises(CompilationError, match="No tabs defined"):
            loader.load(tmp_path)

    def test_load_project_with_multiple_tabs(self, tmp_path: Path):
        """Load project with multiple tabs."""
        manifest = {
            "name": "multi-tab-project",
            "version": "3.0",
            "tabs": [
                {"id": "tab1", "name": "First", "order": 0},
                {"id": "tab2", "name": "Second", "order": 1},
                {"id": "tab3", "name": "Third", "order": 2},
            ],
            "nodes": [],
            "edges": [],
        }
        (tmp_path / "manifest.json").write_text(json.dumps(manifest))

        loader = ProjectLoader()
        project = loader.load(tmp_path)

        assert len(project.tabs) == 3
        # Should be sorted by order
        assert project.tabs[0].name == "First"
        assert project.tabs[1].name == "Second"
        assert project.tabs[2].name == "Third"

    def test_load_project_nodes_filtered_by_tab(self, tmp_path: Path):
        """Nodes are correctly filtered by tabId."""
        manifest = {
            "name": "test",
            "version": "3.0",
            "tabs": [
                {"id": "tab1", "name": "Tab1"},
                {"id": "tab2", "name": "Tab2"},
            ],
            "nodes": [
                {"id": "n1", "type": "agent", "data": {"tabId": "tab1"}},
                {"id": "n2", "type": "agent", "data": {"tabId": "tab1"}},
                {"id": "n3", "type": "agent", "data": {"tabId": "tab2"}},
            ],
            "edges": [],
        }
        (tmp_path / "manifest.json").write_text(json.dumps(manifest))

        loader = ProjectLoader()
        project = loader.load(tmp_path)

        tab1 = project.get_tab("tab1")
        tab2 = project.get_tab("tab2")

        assert tab1 is not None
        assert len(tab1.flow_data["nodes"]) == 2
        assert tab2 is not None
        assert len(tab2.flow_data["nodes"]) == 1

    def test_load_project_edges_filtered_by_tab(self, tmp_path: Path):
        """Edges are correctly filtered - both endpoints must be in same tab."""
        manifest = {
            "name": "test",
            "version": "3.0",
            "tabs": [
                {"id": "tab1", "name": "Tab1"},
                {"id": "tab2", "name": "Tab2"},
            ],
            "nodes": [
                {"id": "n1", "type": "agent", "data": {"tabId": "tab1"}},
                {"id": "n2", "type": "agent", "data": {"tabId": "tab1"}},
                {"id": "n3", "type": "agent", "data": {"tabId": "tab2"}},
            ],
            "edges": [
                {"id": "e1", "source": "n1", "target": "n2"},  # Both in tab1
                {"id": "e2", "source": "n1", "target": "n3"},  # Cross-tab (excluded)
            ],
        }
        (tmp_path / "manifest.json").write_text(json.dumps(manifest))

        loader = ProjectLoader()
        project = loader.load(tmp_path)

        tab1 = project.get_tab("tab1")
        tab2 = project.get_tab("tab2")

        assert tab1 is not None
        assert len(tab1.flow_data["edges"]) == 1
        assert tab1.flow_data["edges"][0]["id"] == "e1"

        assert tab2 is not None
        assert len(tab2.flow_data["edges"]) == 0


class TestProjectLoaderPrompts:
    """Tests for prompt file loading."""

    def test_load_prompt_file(self, project_with_prompt: Path):
        """Load a prompt file referenced by a node."""
        loader = ProjectLoader()
        project = loader.load(project_with_prompt)

        assert len(project.prompts) == 1
        prompt = project.get_prompt("test.prompt.md")
        assert prompt is not None
        assert prompt.name == "TestPrompt"
        assert "Hello, {name}!" in prompt.content

    def test_skip_prompts_when_disabled(self, project_with_prompt: Path):
        """Skip loading prompts when load_prompts=False."""
        loader = ProjectLoader(load_prompts=False)
        project = loader.load(project_with_prompt)

        assert len(project.prompts) == 0

    def test_prompt_file_not_found(self, tmp_path: Path):
        """Error when referenced prompt file doesn't exist."""
        manifest = {
            "name": "test",
            "version": "3.0",
            "tabs": [{"id": "tab1", "name": "Main"}],
            "nodes": [
                {
                    "id": "prompt-1",
                    "type": "prompt",
                    "position": {"x": 0, "y": 0},
                    "data": {
                        "tabId": "tab1",
                        "config": {"name": "Missing", "file_path": "nonexistent.md"},
                    },
                }
            ],
            "edges": [],
        }
        (tmp_path / "manifest.json").write_text(json.dumps(manifest))
        (tmp_path / "prompts").mkdir()

        loader = ProjectLoader()
        with pytest.raises(PromptLoadError, match="not found"):
            loader.load(tmp_path)

    def test_prompt_path_traversal_blocked(self, tmp_path: Path):
        """Block path traversal attempts in prompt file paths."""
        manifest = {
            "name": "test",
            "version": "3.0",
            "tabs": [{"id": "tab1", "name": "Main"}],
            "nodes": [
                {
                    "id": "prompt-1",
                    "type": "prompt",
                    "position": {"x": 0, "y": 0},
                    "data": {
                        "tabId": "tab1",
                        "config": {"name": "Evil", "file_path": "../../../etc/passwd"},
                    },
                }
            ],
            "edges": [],
        }
        (tmp_path / "manifest.json").write_text(json.dumps(manifest))

        loader = ProjectLoader()
        with pytest.raises(PromptLoadError, match="escapes project"):
            loader.load(tmp_path)


class TestProjectLoaderTools:
    """Tests for tool file loading."""

    def test_load_tool_file(self, project_with_tool: Path):
        """Load a tool file referenced by a node."""
        loader = ProjectLoader()
        project = loader.load(project_with_tool)

        assert len(project.tools) == 1
        tool = project.get_tool("test_tool.py")
        assert tool is not None
        assert tool.name == "TestTool"
        assert "def test_tool" in tool.code

    def test_skip_tools_when_disabled(self, project_with_tool: Path):
        """Skip loading tools when load_tools=False."""
        loader = ProjectLoader(load_tools=False)
        project = loader.load(project_with_tool)

        assert len(project.tools) == 0

    def test_tool_file_not_found(self, tmp_path: Path):
        """Error when referenced tool file doesn't exist."""
        manifest = {
            "name": "test",
            "version": "3.0",
            "tabs": [{"id": "tab1", "name": "Main"}],
            "nodes": [
                {
                    "id": "tool-1",
                    "type": "tool",
                    "position": {"x": 0, "y": 0},
                    "data": {
                        "tabId": "tab1",
                        "config": {"name": "Missing", "file_path": "nonexistent.py"},
                    },
                }
            ],
            "edges": [],
        }
        (tmp_path / "manifest.json").write_text(json.dumps(manifest))
        (tmp_path / "tools").mkdir()

        loader = ProjectLoader()
        with pytest.raises(ToolLoadError, match="not found"):
            loader.load(tmp_path)

    def test_tool_path_traversal_blocked(self, tmp_path: Path):
        """Block path traversal attempts in tool file paths."""
        manifest = {
            "name": "test",
            "version": "3.0",
            "tabs": [{"id": "tab1", "name": "Main"}],
            "nodes": [
                {
                    "id": "tool-1",
                    "type": "tool",
                    "position": {"x": 0, "y": 0},
                    "data": {
                        "tabId": "tab1",
                        "config": {"name": "Evil", "file_path": "../../../etc/shadow"},
                    },
                }
            ],
            "edges": [],
        }
        (tmp_path / "manifest.json").write_text(json.dumps(manifest))

        loader = ProjectLoader()
        with pytest.raises(ToolLoadError, match="escapes project"):
            loader.load(tmp_path)


class TestLoadedProject:
    """Tests for LoadedProject helper methods."""

    def test_get_tab_by_id(self, minimal_project: Path):
        """Get tab by ID returns correct tab."""
        loader = ProjectLoader()
        project = loader.load(minimal_project)

        tab = project.get_tab("tab1")
        assert tab is not None
        assert tab.id == "tab1"

    def test_get_tab_nonexistent(self, minimal_project: Path):
        """Get nonexistent tab returns None."""
        loader = ProjectLoader()
        project = loader.load(minimal_project)

        tab = project.get_tab("nonexistent")
        assert tab is None

    def test_get_prompt_nonexistent(self, minimal_project: Path):
        """Get nonexistent prompt returns None."""
        loader = ProjectLoader()
        project = loader.load(minimal_project)

        prompt = project.get_prompt("nonexistent.md")
        assert prompt is None

    def test_get_tool_nonexistent(self, minimal_project: Path):
        """Get nonexistent tool returns None."""
        loader = ProjectLoader()
        project = loader.load(minimal_project)

        tool = project.get_tool("nonexistent.py")
        assert tool is None


class TestLoadedDataclasses:
    """Tests for the dataclass structures."""

    def test_loaded_prompt_fields(self):
        """LoadedPrompt has expected fields."""
        prompt = LoadedPrompt(
            name="test",
            file_path="test.md",
            absolute_path=Path("/abs/path/test.md"),
            content="Hello",
        )
        assert prompt.name == "test"
        assert prompt.file_path == "test.md"
        assert prompt.absolute_path == Path("/abs/path/test.md")
        assert prompt.content == "Hello"

    def test_loaded_tool_fields(self):
        """LoadedTool has expected fields."""
        tool = LoadedTool(
            name="mytool",
            file_path="mytool.py",
            absolute_path=Path("/abs/path/mytool.py"),
            code="def mytool(): pass",
        )
        assert tool.name == "mytool"
        assert tool.file_path == "mytool.py"
        assert tool.absolute_path == Path("/abs/path/mytool.py")
        assert tool.code == "def mytool(): pass"

    def test_loaded_tab_fields(self):
        """LoadedTab has expected fields."""
        tab = LoadedTab(
            id="tab1",
            name="Main",
            order=0,
            flow_data={"nodes": [], "edges": []},
        )
        assert tab.id == "tab1"
        assert tab.name == "Main"
        assert tab.order == 0
        assert tab.flow_data == {"nodes": [], "edges": []}
