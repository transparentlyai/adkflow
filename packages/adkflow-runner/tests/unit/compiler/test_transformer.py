"""Tests for the IR transformation module.

Tests the transformation of workflow graphs into Intermediate Representation.
"""

from __future__ import annotations

import json

import pytest

from adkflow_runner.compiler.graph import GraphBuilder
from adkflow_runner.compiler.loader import ProjectLoader
from adkflow_runner.compiler.parser import FlowParser
from adkflow_runner.compiler.transformer import IRTransformer, _sanitize_variable_name
from adkflow_runner.errors import CompilationError


class TestSanitizeVariableName:
    """Tests for variable name sanitization."""

    def test_simple_name(self):
        """Convert simple name."""
        result = _sanitize_variable_name("test")
        assert result == "test_input"

    def test_name_with_spaces(self):
        """Convert name with spaces to underscores."""
        result = _sanitize_variable_name("my test name")
        assert result == "my_test_name_input"

    def test_name_with_hyphens(self):
        """Convert hyphens to underscores."""
        result = _sanitize_variable_name("my-test")
        assert result == "my_test_input"

    def test_name_with_special_chars(self):
        """Remove special characters."""
        result = _sanitize_variable_name("test@name#123")
        assert result == "testname123_input"

    def test_name_starting_with_number(self):
        """Prefix with underscore if starts with number."""
        result = _sanitize_variable_name("123test")
        assert result == "_123test_input"

    def test_empty_name(self):
        """Default to 'user' for empty name."""
        result = _sanitize_variable_name("")
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


class TestAgentConfiguration:
    """Tests for agent configuration extraction."""

    def test_extract_planner_config(self, tmp_path):
        """Extract planner configuration from agent."""
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
                            "name": "Planner",
                            "description": "Test",
                            "planner_type": "builtin",
                            "thinking_budget": 1000,
                            "include_thoughts": True,
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

        assert ir.root_agent.planner.type == "builtin"
        assert ir.root_agent.planner.thinking_budget == 1000
        assert ir.root_agent.planner.include_thoughts is True

    def test_extract_code_executor_config(self, tmp_path):
        """Extract code executor configuration from agent."""
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
                            "name": "Coder",
                            "description": "Test",
                            "code_executor_enabled": True,
                            "code_executor_stateful": True,
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

        assert ir.root_agent.code_executor.enabled is True
        assert ir.root_agent.code_executor.stateful is True

    def test_extract_http_options(self, tmp_path):
        """Extract HTTP options from agent."""
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
                            "name": "Agent",
                            "description": "Test",
                            "http_timeout": 60000,
                            "http_max_retries": 5,
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

        assert ir.root_agent.http_options.timeout == 60000
        assert ir.root_agent.http_options.max_retries == 5

    def test_extract_output_key(self, tmp_path):
        """Extract output_key from agent."""
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
                            "name": "Agent",
                            "description": "Test",
                            "output_key": "result",
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

        assert ir.root_agent.output_key == "result"


class TestUserInputTransformation:
    """Tests for user input node transformation."""

    def test_transform_user_input_trigger(self, tmp_path):
        """Transform userInput node as trigger."""
        manifest = {
            "name": "test",
            "version": "3.0",
            "tabs": [{"id": "tab1", "name": "Main"}],
            "nodes": [
                {
                    "id": "ui1",
                    "type": "userInput",
                    "position": {"x": 0, "y": 0},
                    "data": {"tabId": "tab1", "config": {"name": "UserTrigger"}},
                },
                {
                    "id": "a1",
                    "type": "agent",
                    "position": {"x": 100, "y": 0},
                    "data": {
                        "tabId": "tab1",
                        "config": {"name": "Agent", "description": "Test"},
                    },
                },
            ],
            "edges": [
                {
                    "id": "e1",
                    "source": "ui1",
                    "target": "a1",
                    "sourceHandle": "output",
                    "targetHandle": "input",
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

        assert len(ir.user_inputs) >= 1


class TestWorkflowIRMetadata:
    """Tests for WorkflowIR metadata."""

    def test_metadata_includes_project_info(self, tmp_path):
        """WorkflowIR includes project metadata."""
        manifest = {
            "name": "my-project",
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
                        "config": {"name": "Agent", "description": "Test"},
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

        assert ir.metadata["project_name"] == "my-project"
        assert ir.metadata["version"] == "3.0"
        assert ir.project_path == str(tmp_path)
        assert "tab1" in ir.tab_ids

    def test_has_start_end_nodes(self, tmp_path):
        """Detect presence of start/end nodes."""
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
                        "config": {"name": "Agent", "description": "Test"},
                    },
                },
                {
                    "id": "end",
                    "type": "end",
                    "position": {"x": 200, "y": 0},
                    "data": {"tabId": "tab1"},
                },
            ],
            "edges": [
                {"id": "e1", "source": "start", "target": "a1"},
                {
                    "id": "e2",
                    "source": "a1",
                    "target": "end",
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

        assert ir.has_start_node is True
        assert ir.has_end_node is True


class TestIncludeContentsResolution:
    """Tests for include_contents resolution."""

    def test_include_contents_true(self, tmp_path):
        """Boolean true resolves to 'default'."""
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
                            "name": "Agent",
                            "description": "Test",
                            "include_contents": True,
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

        assert ir.root_agent.include_contents == "default"

    def test_include_contents_false(self, tmp_path):
        """Boolean false resolves to 'none'."""
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
                            "name": "Agent",
                            "description": "Test",
                            "include_contents": False,
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

        assert ir.root_agent.include_contents == "none"

    def test_include_contents_none_string(self, tmp_path):
        """String 'none' resolves to 'none'."""
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
                            "name": "Agent",
                            "description": "Test",
                            "include_contents": "none",
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

        assert ir.root_agent.include_contents == "none"


class TestContextAndVariableNodes:
    """Tests for context and variable node processing."""

    def test_transform_with_context(self, tmp_path):
        """Transform agent with connected context node."""
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
                    "id": "c1",
                    "type": "context",
                    "position": {"x": 0, "y": 100},
                    "data": {
                        "tabId": "tab1",
                        "config": {"name": "MyContext", "file_path": "docs.context.md"},
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
                {"id": "e2", "source": "c1", "target": "a1"},
            ],
        }
        (tmp_path / "manifest.json").write_text(json.dumps(manifest))
        (tmp_path / "static").mkdir()
        (tmp_path / "static" / "docs.context.md").write_text(
            "This is context documentation."
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
        assert "Context" in ir.root_agent.instruction
        assert "documentation" in ir.root_agent.instruction

    def test_transform_with_variable(self, tmp_path):
        """Transform agent with connected variable node."""
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
                    "id": "v1",
                    "type": "variable",
                    "position": {"x": 0, "y": 100},
                    "data": {
                        "tabId": "tab1",
                        "config": {"name": "api_key", "value": "secret123"},
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
                {"id": "e2", "source": "v1", "target": "a1"},
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

        assert ir.root_agent.instruction is not None
        assert "api_key" in ir.root_agent.instruction
        assert "secret123" in ir.root_agent.instruction


class TestToolTransformation:
    """Tests for tool transformation."""

    def test_transform_inline_tool(self, tmp_path):
        """Transform tool with inline code."""
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
                        "config": {
                            "name": "InlineTool",
                            "code": "def inline_tool():\n    return 42",
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
                {"id": "e2", "source": "t1", "target": "a1"},
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

        assert len(ir.root_agent.tools) == 1
        assert ir.root_agent.tools[0].name == "InlineTool"
        assert ir.root_agent.tools[0].code is not None
        assert "return 42" in ir.root_agent.tools[0].code

    def test_transform_builtin_tool_reference(self, tmp_path):
        """Transform agent with built-in tool reference."""
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
                            "description": "Test",
                            "tools": ["google_search", "calculator"],
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

        assert len(ir.root_agent.tools) == 2
        tool_names = [t.name for t in ir.root_agent.tools]
        assert "google_search" in tool_names
        assert "calculator" in tool_names

    def test_transform_agent_tool(self, tmp_path):
        """Transform agentTool node."""
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
                    "id": "at1",
                    "type": "agentTool",
                    "position": {"x": 0, "y": 100},
                    "data": {
                        "tabId": "tab1",
                        "config": {"name": "AgentTool", "file_path": "agent_tool.py"},
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
                {"id": "e2", "source": "at1", "target": "a1"},
            ],
        }
        (tmp_path / "manifest.json").write_text(json.dumps(manifest))
        (tmp_path / "tools").mkdir()
        (tmp_path / "tools" / "agent_tool.py").write_text(
            "def agent_tool():\n    return 'agent tool result'"
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
        assert ir.root_agent.tools[0].name == "AgentTool"


class TestOutputFileTransformation:
    """Tests for output file transformation."""

    def test_transform_output_file(self, tmp_path):
        """Transform agent with output file."""
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
                        "config": {"name": "Agent1", "description": "Test"},
                    },
                },
                {
                    "id": "of1",
                    "type": "outputFile",
                    "position": {"x": 200, "y": 0},
                    "data": {
                        "tabId": "tab1",
                        "config": {
                            "name": "Results",
                            "file_path": "outputs/results.txt",
                        },
                    },
                },
            ],
            "edges": [
                {"id": "e1", "source": "start", "target": "a1"},
                {
                    "id": "e2",
                    "source": "a1",
                    "target": "of1",
                    "sourceHandle": "output-file",
                    "targetHandle": "input",
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

        assert len(ir.output_files) == 1
        assert ir.output_files[0].name == "Results"
        assert ir.output_files[0].file_path == "outputs/results.txt"
        assert ir.output_files[0].agent_id == "a1"


class TestTeleporterTransformation:
    """Tests for teleporter transformation."""

    def test_transform_teleporters(self, tmp_path):
        """Transform teleporter pair."""
        manifest = {
            "name": "test",
            "version": "3.0",
            "tabs": [
                {"id": "tab1", "name": "Main"},
                {"id": "tab2", "name": "Secondary"},
            ],
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
                        "config": {"name": "Agent1", "description": "Test"},
                    },
                },
                {
                    "id": "tout",
                    "type": "teleportOut",
                    "position": {"x": 200, "y": 0},
                    "data": {"tabId": "tab1", "config": {"name": "transfer"}},
                },
                {
                    "id": "tin",
                    "type": "teleportIn",
                    "position": {"x": 0, "y": 0},
                    "data": {"tabId": "tab2", "config": {"name": "transfer"}},
                },
                {
                    "id": "a2",
                    "type": "agent",
                    "position": {"x": 100, "y": 0},
                    "data": {
                        "tabId": "tab2",
                        "config": {"name": "Agent2", "description": "Test2"},
                    },
                },
            ],
            "edges": [
                {"id": "e1", "source": "start", "target": "a1"},
                {
                    "id": "e2",
                    "source": "a1",
                    "target": "tout",
                    "sourceHandle": "output",
                    "targetHandle": "input",
                },
                {
                    "id": "e3",
                    "source": "tin",
                    "target": "a2",
                    "sourceHandle": "output",
                    "targetHandle": "input",
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

        assert "transfer" in ir.teleporters
        assert ir.teleporters["transfer"].name == "transfer"


class TestNestedPlannerConfig:
    """Tests for nested planner config format."""

    def test_nested_planner_config(self, tmp_path):
        """Extract planner from nested config."""
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
                            "name": "Planner",
                            "description": "Test",
                            "planner": {
                                "type": "custom",
                                "thinking_budget": 500,
                                "include_thoughts": True,
                            },
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

        assert ir.root_agent.planner.type == "custom"
        assert ir.root_agent.planner.thinking_budget == 500


class TestNestedCodeExecutorConfig:
    """Tests for nested code executor config format."""

    def test_nested_code_executor_config(self, tmp_path):
        """Extract code executor from nested config."""
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
                            "name": "Coder",
                            "description": "Test",
                            "code_executor": {
                                "enabled": True,
                                "stateful": True,
                                "error_retry_attempts": 5,
                                "optimize_data_file": True,
                            },
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

        assert ir.root_agent.code_executor.enabled is True
        assert ir.root_agent.code_executor.stateful is True
        assert ir.root_agent.code_executor.error_retry_attempts == 5
        assert ir.root_agent.code_executor.optimize_data_file is True


class TestNestedHttpOptionsConfig:
    """Tests for nested HTTP options config format."""

    def test_nested_http_options_config(self, tmp_path):
        """Extract HTTP options from nested config."""
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
                            "name": "Agent",
                            "description": "Test",
                            "http_options": {
                                "timeout": 90000,
                                "max_retries": 10,
                                "retry_delay": 2000,
                                "retry_backoff_multiplier": 3.0,
                            },
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

        assert ir.root_agent.http_options.timeout == 90000
        assert ir.root_agent.http_options.max_retries == 10
        assert ir.root_agent.http_options.retry_delay == 2000
        assert ir.root_agent.http_options.retry_backoff_multiplier == 3.0


class TestCallbacksConfig:
    """Tests for callbacks configuration."""

    def test_extract_callbacks(self, tmp_path):
        """Extract callback configuration from agent."""
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
                            "name": "Agent",
                            "description": "Test",
                            "before_model_callback": "my_before_model",
                            "after_model_callback": "my_after_model",
                            "before_tool_callback": "my_before_tool",
                            "after_tool_callback": "my_after_tool",
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

        assert ir.root_agent.callbacks.before_model == "my_before_model"
        assert ir.root_agent.callbacks.after_model == "my_after_model"
        assert ir.root_agent.callbacks.before_tool == "my_before_tool"
        assert ir.root_agent.callbacks.after_tool == "my_after_tool"
