"""Tests for basic IR transformation.

Tests for variable name sanitization and basic workflow transformations.
"""

from __future__ import annotations

import json

import pytest

from adkflow_runner.compiler.graph import GraphBuilder
from adkflow_runner.compiler.loader import ProjectLoader
from adkflow_runner.compiler.node_transforms import sanitize_variable_name
from adkflow_runner.compiler.parser import FlowParser
from adkflow_runner.compiler.transformer import IRTransformer
from adkflow_runner.errors import CompilationError


class TestSanitizeVariableName:
    """Tests for variable name sanitization."""

    def test_simple_name(self):
        """Convert simple name."""
        result = sanitize_variable_name("test")
        assert result == "test_input"

    def test_name_with_spaces(self):
        """Convert name with spaces to underscores."""
        result = sanitize_variable_name("my test name")
        assert result == "my_test_name_input"

    def test_name_with_hyphens(self):
        """Convert hyphens to underscores."""
        result = sanitize_variable_name("my-test")
        assert result == "my_test_input"

    def test_name_with_special_chars(self):
        """Remove special characters."""
        result = sanitize_variable_name("test@name#123")
        assert result == "testname123_input"

    def test_name_starting_with_number(self):
        """Prefix with underscore if starts with number."""
        result = sanitize_variable_name("123test")
        assert result == "_123test_input"

    def test_empty_name(self):
        """Default to 'user' for empty name."""
        result = sanitize_variable_name("")
        assert result == "user_input"


class TestIRTransformer:
    """Tests for IRTransformer class."""

    def test_transform_empty_graph(self, minimal_project):
        """Transform empty graph fails (no agents)."""
        loader = ProjectLoader()
        parser = FlowParser()
        builder = GraphBuilder()
        transformer = IRTransformer()

        project = loader.load(minimal_project)
        parsed = parser.parse_project(project)
        graph = builder.build(parsed)

        with pytest.raises(CompilationError):
            transformer.transform(graph, project)

    def test_transform_single_agent(self, tmp_path):
        """Transform a single agent workflow."""
        manifest = {
            "name": "test",
            "version": "3.0",
            "tabs": [{"id": "tab1", "name": "Main"}],
            "nodes": [
                {
                    "id": "start",
                    "type": "start",
                    "position": {"x": 0, "y": 0},
                    "data": {"tabId": "tab1"},
                },
                {
                    "id": "a1",
                    "type": "agent",
                    "position": {"x": 100, "y": 0},
                    "data": {
                        "tabId": "tab1",
                        "config": {
                            "name": "Agent1",
                            "description": "Test agent",
                            "model": "gemini-2.0-flash",
                        },
                    },
                },
            ],
            "edges": [
                {"id": "e1", "source": "start", "target": "a1"},
            ],
        }
        (tmp_path / "manifest.json").write_text(json.dumps(manifest))

        loader = ProjectLoader()
        parser = FlowParser()
        builder = GraphBuilder()
        transformer = IRTransformer()

        project = loader.load(tmp_path)
        parsed = parser.parse_project(project)
        graph = builder.build(parsed)
        ir = transformer.transform(graph, project)

        assert ir.root_agent is not None
        assert ir.root_agent.name == "Agent1"
        assert ir.root_agent.model == "gemini-2.0-flash"
        assert "a1" in ir.all_agents

    def test_transform_with_prompt(self, tmp_path):
        """Transform agent with connected prompt."""
        manifest = {
            "name": "test",
            "version": "3.0",
            "tabs": [{"id": "tab1", "name": "Main"}],
            "nodes": [
                {
                    "id": "start",
                    "type": "start",
                    "position": {"x": 0, "y": 0},
                    "data": {"tabId": "tab1"},
                },
                {
                    "id": "p1",
                    "type": "prompt",
                    "position": {"x": 0, "y": 100},
                    "data": {
                        "tabId": "tab1",
                        "config": {
                            "name": "SystemPrompt",
                            "file_path": "system.prompt.md",
                        },
                    },
                },
                {
                    "id": "a1",
                    "type": "agent",
                    "position": {"x": 100, "y": 0},
                    "data": {
                        "tabId": "tab1",
                        "config": {"name": "Agent1", "description": "Test"},
                    },
                },
            ],
            "edges": [
                {"id": "e1", "source": "start", "target": "a1"},
                {"id": "e2", "source": "p1", "target": "a1"},
            ],
        }
        (tmp_path / "manifest.json").write_text(json.dumps(manifest))
        (tmp_path / "prompts").mkdir()
        (tmp_path / "prompts" / "system.prompt.md").write_text(
            "You are a helpful assistant."
        )

        loader = ProjectLoader()
        parser = FlowParser()
        builder = GraphBuilder()
        transformer = IRTransformer()

        project = loader.load(tmp_path)
        parsed = parser.parse_project(project)
        graph = builder.build(parsed)
        ir = transformer.transform(graph, project)

        assert ir.root_agent.instruction is not None
        assert "helpful assistant" in ir.root_agent.instruction

    def test_transform_with_tool(self, tmp_path):
        """Transform agent with connected tool."""
        manifest = {
            "name": "test",
            "version": "3.0",
            "tabs": [{"id": "tab1", "name": "Main"}],
            "nodes": [
                {
                    "id": "start",
                    "type": "start",
                    "position": {"x": 0, "y": 0},
                    "data": {"tabId": "tab1"},
                },
                {
                    "id": "t1",
                    "type": "tool",
                    "position": {"x": 0, "y": 100},
                    "data": {
                        "tabId": "tab1",
                        "config": {"name": "MyTool", "file_path": "my_tool.py"},
                    },
                },
                {
                    "id": "a1",
                    "type": "agent",
                    "position": {"x": 100, "y": 0},
                    "data": {
                        "tabId": "tab1",
                        "config": {"name": "Agent1", "description": "Test"},
                    },
                },
            ],
            "edges": [
                {"id": "e1", "source": "start", "target": "a1"},
                {"id": "e2", "source": "t1", "target": "a1"},
            ],
        }
        (tmp_path / "manifest.json").write_text(json.dumps(manifest))
        (tmp_path / "tools").mkdir()
        (tmp_path / "tools" / "my_tool.py").write_text(
            "def my_tool():\n    return 'result'"
        )

        loader = ProjectLoader()
        parser = FlowParser()
        builder = GraphBuilder()
        transformer = IRTransformer()

        project = loader.load(tmp_path)
        parsed = parser.parse_project(project)
        graph = builder.build(parsed)
        ir = transformer.transform(graph, project)

        assert len(ir.root_agent.tools) == 1
        # Tool name comes from config, not function name
        assert ir.root_agent.tools[0].name == "MyTool"

    def test_transform_sequential_agents(self, tmp_path):
        """Transform sequential chain of agents."""
        manifest = {
            "name": "test",
            "version": "3.0",
            "tabs": [{"id": "tab1", "name": "Main"}],
            "nodes": [
                {
                    "id": "start",
                    "type": "start",
                    "position": {"x": 0, "y": 0},
                    "data": {"tabId": "tab1"},
                },
                {
                    "id": "a1",
                    "type": "agent",
                    "position": {"x": 100, "y": 0},
                    "data": {
                        "tabId": "tab1",
                        "config": {"name": "First", "description": "First agent"},
                    },
                },
                {
                    "id": "a2",
                    "type": "agent",
                    "position": {"x": 200, "y": 0},
                    "data": {
                        "tabId": "tab1",
                        "config": {"name": "Second", "description": "Second agent"},
                    },
                },
            ],
            "edges": [
                {"id": "e1", "source": "start", "target": "a1"},
                {
                    "id": "e2",
                    "source": "a1",
                    "target": "a2",
                    "sourceHandle": "output",
                    "targetHandle": "agent-input",
                },
            ],
        }
        (tmp_path / "manifest.json").write_text(json.dumps(manifest))

        loader = ProjectLoader()
        parser = FlowParser()
        builder = GraphBuilder()
        transformer = IRTransformer()

        project = loader.load(tmp_path)
        parsed = parser.parse_project(project)
        graph = builder.build(parsed)
        ir = transformer.transform(graph, project)

        # Root should be sequential with both agents as subagents
        # all_agents includes original agents plus synthetic sequential wrapper
        assert ir.root_agent is not None
        assert ir.root_agent.type == "sequential"
        # 2 original agents + 1 sequential wrapper = 3 total
        assert len(ir.all_agents) >= 2
