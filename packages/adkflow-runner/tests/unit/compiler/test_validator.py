"""Tests for the workflow validation module.

Tests validation rules for graphs and IR before execution.
"""

from __future__ import annotations

import json

import pytest

from adkflow_runner.compiler.graph import GraphBuilder, WorkflowGraph
from adkflow_runner.compiler.loader import ProjectLoader
from adkflow_runner.compiler.parser import FlowParser
from adkflow_runner.compiler.validator import WorkflowValidator
from adkflow_runner.config import EdgeSemantics
from adkflow_runner.errors import ValidationError
from adkflow_runner.ir import AgentIR, ToolIR, WorkflowIR


class TestValidateGraph:
    """Tests for graph validation."""

    def test_validate_empty_graph(self, minimal_project):
        """Validating empty graph (no agents) reports no start node."""
        loader = ProjectLoader()
        parser = FlowParser()
        builder = GraphBuilder()
        validator = WorkflowValidator()

        project = loader.load(minimal_project)
        parsed = parser.parse_project(project)
        graph = builder.build(parsed)

        result = validator.validate_graph(graph, project)
        # Empty graph has no start node
        assert not result.valid
        assert any("Start node" in str(e) for e in result.errors)

    def test_validate_graph_with_start(self, tmp_path):
        """Valid graph with start node passes."""
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
                        "config": {"name": "Agent1", "description": "Test agent"},
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
        validator = WorkflowValidator()

        project = loader.load(tmp_path)
        parsed = parser.parse_project(project)
        graph = builder.build(parsed)

        result = validator.validate_graph(graph, project)
        assert result.valid

    def test_detect_multiple_start_nodes(self, tmp_path):
        """Report error when multiple start nodes exist."""
        manifest = {
            "name": "test",
            "version": "3.0",
            "tabs": [{"id": "tab1", "name": "Main"}],
            "nodes": [
                {
                    "id": "start1",
                    "type": "start",
                    "position": {"x": 0, "y": 0},
                    "data": {"tabId": "tab1"},
                },
                {
                    "id": "start2",
                    "type": "start",
                    "position": {"x": 0, "y": 100},
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
            ],
            "edges": [
                {"id": "e1", "source": "start1", "target": "a1"},
            ],
        }
        (tmp_path / "manifest.json").write_text(json.dumps(manifest))

        loader = ProjectLoader()
        parser = FlowParser()
        builder = GraphBuilder()
        validator = WorkflowValidator()

        project = loader.load(tmp_path)
        parsed = parser.parse_project(project)
        graph = builder.build(parsed)

        result = validator.validate_graph(graph, project)
        assert not result.valid
        assert any("Start nodes" in str(e) for e in result.errors)

    def test_disconnected_start_warning(self, tmp_path):
        """Warn when start node has no connections."""
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
            ],
            "edges": [],
        }
        (tmp_path / "manifest.json").write_text(json.dumps(manifest))

        loader = ProjectLoader()
        parser = FlowParser()
        builder = GraphBuilder()
        validator = WorkflowValidator()

        project = loader.load(tmp_path)
        parsed = parser.parse_project(project)
        graph = builder.build(parsed)

        result = validator.validate_graph(graph, project)
        # At least a warning about disconnected start
        assert any("not connected" in str(w) for w in result.warnings)


class TestCycleDetection:
    """Tests for cycle detection in workflows."""

    def test_detect_simple_cycle(
        self, make_graph_node, make_graph_edge, minimal_project
    ):
        """Detect simple A -> B -> A cycle."""
        loader = ProjectLoader()
        project = loader.load(minimal_project)

        a = make_graph_node("a", "agent", "A")
        b = make_graph_node("b", "agent", "B")

        e1 = make_graph_edge(a, b, EdgeSemantics.SEQUENTIAL)
        e2 = make_graph_edge(b, a, EdgeSemantics.SEQUENTIAL)

        graph = WorkflowGraph(
            nodes={"a": a, "b": b},
            edges=[e1, e2],
            teleporter_pairs=[],
            entry_nodes=[],
        )

        validator = WorkflowValidator()
        result = validator.validate_graph(graph, project)
        assert not result.valid
        assert any("cycle" in str(e).lower() for e in result.errors)

    def test_no_cycle_in_valid_dag(
        self, make_graph_node, make_graph_edge, minimal_project
    ):
        """Valid DAG (no cycle) passes."""
        loader = ProjectLoader()
        project = loader.load(minimal_project)

        start = make_graph_node("start", "start", "Start")
        a = make_graph_node("a", "agent", "A")
        a.data = {"config": {"name": "A", "description": "Test agent A"}}
        b = make_graph_node("b", "agent", "B")
        b.data = {"config": {"name": "B", "description": "Test agent B"}}

        e1 = make_graph_edge(start, a, EdgeSemantics.SEQUENTIAL)
        e2 = make_graph_edge(a, b, EdgeSemantics.SEQUENTIAL)

        graph = WorkflowGraph(
            nodes={"start": start, "a": a, "b": b},
            edges=[e1, e2],
            teleporter_pairs=[],
            entry_nodes=[a],
        )

        validator = WorkflowValidator()
        result = validator.validate_graph(graph, project)
        # No cycle errors (may have other warnings)
        assert not any("cycle" in str(e).lower() for e in result.errors)


class TestMissingReferences:
    """Tests for missing file reference detection."""

    def test_missing_prompt_file_fails_at_load(self, tmp_path):
        """Loader fails when referenced prompt file doesn't exist."""
        from adkflow_runner.errors import PromptLoadError

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
                            "name": "Missing",
                            "file_path": "nonexistent.prompt.md",
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
        (tmp_path / "prompts").mkdir(exist_ok=True)

        loader = ProjectLoader()

        # Loader fails before we get to validation
        with pytest.raises(PromptLoadError):
            loader.load(tmp_path)

    def test_missing_tool_file_fails_at_load(self, tmp_path):
        """Loader fails when referenced tool file doesn't exist."""
        from adkflow_runner.errors import ToolLoadError

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
                            "name": "Missing",
                            "file_path": "nonexistent_tool.py",
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
        (tmp_path / "tools").mkdir(exist_ok=True)

        loader = ProjectLoader()

        # Loader fails before we get to validation
        with pytest.raises(ToolLoadError):
            loader.load(tmp_path)


class TestDisconnectedNodes:
    """Tests for disconnected node detection."""

    def test_disconnected_agent_warning(self, make_graph_node, minimal_project):
        """Warn about agent with no connections."""
        loader = ProjectLoader()
        project = loader.load(minimal_project)

        start = make_graph_node("start", "start", "Start")
        isolated = make_graph_node("isolated", "agent", "Isolated")
        isolated.data = {
            "config": {"name": "Isolated", "description": "Isolated agent"}
        }

        graph = WorkflowGraph(
            nodes={"start": start, "isolated": isolated},
            edges=[],
            teleporter_pairs=[],
            entry_nodes=[],
        )

        validator = WorkflowValidator()
        result = validator.validate_graph(graph, project)
        assert any(
            "no connections" in str(w).lower() or "isolated" in str(w).lower()
            for w in result.warnings
        )

    def test_orphaned_prompt_warning(
        self, make_graph_node, make_graph_edge, minimal_project
    ):
        """Warn about prompt not connected to agent."""
        loader = ProjectLoader()
        project = loader.load(minimal_project)

        start = make_graph_node("start", "start", "Start")
        prompt = make_graph_node("p1", "prompt", "OrphanedPrompt")

        graph = WorkflowGraph(
            nodes={"start": start, "p1": prompt},
            edges=[],
            teleporter_pairs=[],
            entry_nodes=[],
        )

        validator = WorkflowValidator()
        result = validator.validate_graph(graph, project)
        assert any("not connected" in str(w).lower() for w in result.warnings)


class TestDuplicateNames:
    """Tests for duplicate name detection."""

    def test_duplicate_agent_names(
        self, make_graph_node, make_graph_edge, minimal_project
    ):
        """Report error for duplicate agent names."""
        loader = ProjectLoader()
        project = loader.load(minimal_project)

        start = make_graph_node("start", "start", "Start")
        a1 = make_graph_node("a1", "agent", "SameName")
        a1.data = {"config": {"name": "SameName", "description": "First agent"}}
        a2 = make_graph_node("a2", "agent", "SameName")
        a2.data = {"config": {"name": "SameName", "description": "Second agent"}}

        e1 = make_graph_edge(start, a1, EdgeSemantics.SEQUENTIAL)

        graph = WorkflowGraph(
            nodes={"start": start, "a1": a1, "a2": a2},
            edges=[e1],
            teleporter_pairs=[],
            entry_nodes=[a1],
        )

        validator = WorkflowValidator()
        result = validator.validate_graph(graph, project)
        assert not result.valid
        assert any("duplicate" in str(e).lower() for e in result.errors)


class TestAgentConfigurations:
    """Tests for agent configuration validation."""

    def test_llm_without_instruction_warning(
        self, make_graph_node, make_graph_edge, minimal_project
    ):
        """Warn when LLM agent has no prompt or context."""
        loader = ProjectLoader()
        project = loader.load(minimal_project)

        start = make_graph_node("start", "start", "Start")
        agent = make_graph_node("a1", "agent", "NoPrompt")
        agent.data = {
            "config": {
                "name": "NoPrompt",
                "type": "llm",
                "description": "LLM without prompt",
            }
        }

        edge = make_graph_edge(start, agent, EdgeSemantics.SEQUENTIAL)

        graph = WorkflowGraph(
            nodes={"start": start, "a1": agent},
            edges=[edge],
            teleporter_pairs=[],
            entry_nodes=[agent],
        )

        validator = WorkflowValidator()
        result = validator.validate_graph(graph, project)
        assert any(
            "prompt" in str(w).lower() or "context" in str(w).lower()
            for w in result.warnings
        )

    def test_loop_agent_invalid_iterations(self, make_graph_node, minimal_project):
        """Error for loop agent with invalid max_iterations."""
        loader = ProjectLoader()
        project = loader.load(minimal_project)

        start = make_graph_node("start", "start", "Start")
        loop = make_graph_node("loop1", "agent", "BadLoop")
        loop.data = {
            "config": {
                "name": "BadLoop",
                "type": "loop",
                "max_iterations": 0,
                "description": "Bad loop",
            }
        }

        graph = WorkflowGraph(
            nodes={"start": start, "loop1": loop},
            edges=[],
            teleporter_pairs=[],
            entry_nodes=[],
        )

        validator = WorkflowValidator()
        result = validator.validate_graph(graph, project)
        assert not result.valid
        assert any("max_iterations" in str(e).lower() for e in result.errors)


class TestMissingDescriptions:
    """Tests for missing agent description detection."""

    def test_agent_missing_description(
        self, make_graph_node, make_graph_edge, minimal_project
    ):
        """Error when agent has no description."""
        loader = ProjectLoader()
        project = loader.load(minimal_project)

        start = make_graph_node("start", "start", "Start")
        agent = make_graph_node("a1", "agent", "NoDesc")
        agent.data = {"config": {"name": "NoDesc"}}  # No description

        edge = make_graph_edge(start, agent, EdgeSemantics.SEQUENTIAL)

        graph = WorkflowGraph(
            nodes={"start": start, "a1": agent},
            edges=[edge],
            teleporter_pairs=[],
            entry_nodes=[agent],
        )

        validator = WorkflowValidator()
        result = validator.validate_graph(graph, project)
        assert not result.valid
        assert any("description" in str(e).lower() for e in result.errors)


class TestValidateIR:
    """Tests for IR validation."""

    def test_valid_ir(self):
        """Valid IR passes validation."""
        root = AgentIR(id="root", name="Root", type="llm", model="gemini-2.0-flash")
        workflow = WorkflowIR(root_agent=root, all_agents={"root": root})

        validator = WorkflowValidator()
        result = validator.validate_ir(workflow)
        assert result.valid

    def test_ir_without_root_agent(self):
        """Error when IR has no root agent."""
        workflow = WorkflowIR(root_agent=None, all_agents={})  # type: ignore

        validator = WorkflowValidator()
        result = validator.validate_ir(workflow)
        assert not result.valid
        assert any("root agent" in str(e).lower() for e in result.errors)

    def test_ir_agent_without_name(self):
        """Error when agent has no name."""
        agent = AgentIR(id="test", name="", type="llm")
        workflow = WorkflowIR(root_agent=agent, all_agents={"test": agent})

        validator = WorkflowValidator()
        result = validator.validate_ir(workflow)
        assert not result.valid
        assert any("no name" in str(e).lower() for e in result.errors)

    def test_ir_llm_without_model(self):
        """Error when LLM agent has no model."""
        agent = AgentIR(id="test", name="Test", type="llm", model="")
        workflow = WorkflowIR(root_agent=agent, all_agents={"test": agent})

        validator = WorkflowValidator()
        result = validator.validate_ir(workflow)
        assert not result.valid
        assert any("no model" in str(e).lower() for e in result.errors)

    def test_ir_unusual_temperature_warning(self):
        """Warning for unusual temperature values."""
        agent = AgentIR(id="test", name="Test", type="llm", temperature=2.5)
        workflow = WorkflowIR(root_agent=agent, all_agents={"test": agent})

        validator = WorkflowValidator()
        result = validator.validate_ir(workflow)
        assert any("temperature" in str(w).lower() for w in result.warnings)

    def test_ir_composite_without_subagents(self):
        """Warning for composite agent without subagents."""
        agent = AgentIR(id="test", name="Test", type="sequential", subagents=[])
        workflow = WorkflowIR(root_agent=agent, all_agents={"test": agent})

        validator = WorkflowValidator()
        result = validator.validate_ir(workflow)
        assert any("subagent" in str(w).lower() for w in result.warnings)

    def test_ir_tool_without_code_or_file(self):
        """Error when tool has neither code nor file_path."""
        tool = ToolIR(name="bad_tool", code="def t(): pass")  # Valid tool first
        # Override to simulate invalid state
        tool.code = None
        tool.file_path = None

        agent = AgentIR(id="test", name="Test", type="llm", tools=[tool])
        workflow = WorkflowIR(root_agent=agent, all_agents={"test": agent})

        validator = WorkflowValidator()
        result = validator.validate_ir(workflow)
        assert not result.valid
        assert any(
            "code" in str(e).lower() and "file_path" in str(e).lower()
            for e in result.errors
        )


class TestValidationResult:
    """Tests for ValidationResult handling."""

    def test_validation_result_valid_by_default(self):
        """ValidationResult starts as valid."""
        from adkflow_runner.errors import ValidationResult

        result = ValidationResult(valid=True)
        assert result.valid
        assert len(result.errors) == 0
        assert len(result.warnings) == 0

    def test_adding_error_makes_invalid(self):
        """Adding an error makes result invalid."""
        from adkflow_runner.errors import ValidationResult

        result = ValidationResult(valid=True)
        result.add_error(ValidationError("Test error"))
        assert not result.valid
        assert len(result.errors) == 1

    def test_adding_warning_stays_valid(self):
        """Adding a warning keeps result valid."""
        from adkflow_runner.errors import ValidationResult

        result = ValidationResult(valid=True)
        result.add_warning("Test warning")
        assert result.valid
        assert len(result.warnings) == 1
