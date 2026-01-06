"""Tests for node type transformation.

Tests for user input, context, variable, tool, output file, and teleporter nodes.
"""

from __future__ import annotations

import json

from adkflow_runner.compiler.graph import GraphBuilder
from adkflow_runner.compiler.loader import ProjectLoader
from adkflow_runner.compiler.parser import FlowParser
from adkflow_runner.compiler.transformer import IRTransformer


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


class TestUpstreamOutputKeys:
    """Tests for upstream_output_keys resolution."""

    def test_sequential_agent_has_upstream_output_key(self, tmp_path):
        """Agent connected via SEQUENTIAL edge gets upstream's output_key."""
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
                            "name": "WriterAgent",
                            "description": "Writes a poem",
                            "output_key": "poem",
                        },
                    },
                },
                {
                    "id": "a2",
                    "type": "agent",
                    "position": {"x": 200, "y": 0},
                    "data": {
                        "tabId": "tab1",
                        "config": {
                            "name": "ReviewerAgent",
                            "description": "Reviews the poem",
                        },
                    },
                },
            ],
            "edges": [
                {
                    "id": "e1",
                    "source": "start",
                    "target": "a1",
                    "sourceHandle": "start",
                    "targetHandle": "input",
                },
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

        # The second agent should have the first agent's output_key
        agent2 = ir.all_agents.get("a2")
        assert agent2 is not None
        assert "poem" in agent2.upstream_output_keys

    def test_no_upstream_output_key_when_missing(self, tmp_path):
        """Agent has empty upstream_output_keys when upstream has no output_key."""
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
                            "name": "WriterAgent",
                            "description": "Writes something",
                            # No output_key specified
                        },
                    },
                },
                {
                    "id": "a2",
                    "type": "agent",
                    "position": {"x": 200, "y": 0},
                    "data": {
                        "tabId": "tab1",
                        "config": {
                            "name": "ReviewerAgent",
                            "description": "Reviews output",
                        },
                    },
                },
            ],
            "edges": [
                {
                    "id": "e1",
                    "source": "start",
                    "target": "a1",
                    "sourceHandle": "start",
                    "targetHandle": "input",
                },
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

        # The second agent should have empty upstream_output_keys
        agent2 = ir.all_agents.get("a2")
        assert agent2 is not None
        assert agent2.upstream_output_keys == []

    def test_upstream_output_keys_strips_braces(self, tmp_path):
        """Curly braces in output_key are stripped when resolving upstream keys."""
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
                            "name": "WriterAgent",
                            "description": "Writes a poem",
                            "output_key": "{poem}",  # User entered with braces
                        },
                    },
                },
                {
                    "id": "a2",
                    "type": "agent",
                    "position": {"x": 200, "y": 0},
                    "data": {
                        "tabId": "tab1",
                        "config": {
                            "name": "ReviewerAgent",
                            "description": "Reviews the poem",
                        },
                    },
                },
            ],
            "edges": [
                {
                    "id": "e1",
                    "source": "start",
                    "target": "a1",
                    "sourceHandle": "start",
                    "targetHandle": "input",
                },
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

        # The second agent should have "poem" without braces
        agent2 = ir.all_agents.get("a2")
        assert agent2 is not None
        assert "poem" in agent2.upstream_output_keys
        assert "{poem}" not in agent2.upstream_output_keys

    def test_agent_output_key_strips_braces(self, tmp_path):
        """Curly braces in output_key are stripped from the agent's own output_key."""
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
                            "name": "WriterAgent",
                            "description": "Writes a poem",
                            "output_key": "{poem}",  # User entered with braces
                        },
                    },
                },
            ],
            "edges": [
                {
                    "id": "e1",
                    "source": "start",
                    "target": "a1",
                    "sourceHandle": "start",
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

        # The agent's own output_key should have braces stripped
        agent1 = ir.all_agents.get("a1")
        assert agent1 is not None
        assert agent1.output_key == "poem"  # Not "{poem}"
