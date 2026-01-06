"""Tests for IRTransformer.

Tests the transformation of workflow graphs into Intermediate Representation (IR).
"""

from __future__ import annotations

from pathlib import Path
from typing import Any
from unittest.mock import patch

import pytest

from adkflow_runner.compiler.graph import (
    GraphEdge,
    GraphNode,
    TeleporterPair,
    WorkflowGraph,
)
from adkflow_runner.compiler.loader import LoadedProject, LoadedTab
from adkflow_runner.compiler.parser import ParsedNode
from adkflow_runner.compiler.transformer import IRTransformer
from adkflow_runner.config import EdgeSemantics, ExecutionConfig
from adkflow_runner.errors import CompilationError
from adkflow_runner.ir import AgentIR


# =============================================================================
# Test Fixtures
# =============================================================================


@pytest.fixture
def transformer() -> IRTransformer:
    """Create a default transformer instance."""
    return IRTransformer()


@pytest.fixture
def mock_project(tmp_path: Path) -> LoadedProject:
    """Create a mock loaded project."""
    return LoadedProject(
        path=tmp_path,
        name="test-project",
        version="3.0",
        tabs=[
            LoadedTab(
                id="tab1",
                name="Main",
                order=0,
                flow_data={"nodes": [], "edges": []},
            )
        ],
    )


@pytest.fixture
def make_graph_node():
    """Factory to create GraphNode instances for testing.

    Note: Node configuration is stored in data.config, not data.agent.
    """

    def _make(
        node_id: str,
        node_type: str = "agent",
        name: str | None = None,
        tab_id: str = "tab1",
        **config_kwargs: Any,
    ) -> GraphNode:
        name = name or node_id.upper()

        # Build config dict - all node configs go in data.config
        config: dict[str, Any] = {"name": name}
        if node_type == "agent":
            config["type"] = "llm"
        config.update(config_kwargs)

        data: dict[str, Any] = {"config": config, "tabId": tab_id}

        parsed = ParsedNode(
            id=node_id,
            type=node_type,
            position=(0.0, 0.0),
            data=data,
        )

        return GraphNode(
            id=node_id,
            type=node_type,
            name=name,
            tab_id=tab_id,
            data=data,
            parsed_node=parsed,
        )

    return _make


@pytest.fixture
def make_graph_edge():
    """Factory to create GraphEdge instances for testing."""

    def _make(
        source: GraphNode,
        target: GraphNode,
        semantics: EdgeSemantics = EdgeSemantics.SEQUENTIAL,
    ) -> GraphEdge:
        edge = GraphEdge(
            source_id=source.id,
            target_id=target.id,
            semantics=semantics,
        )
        source.outgoing.append(edge)
        target.incoming.append(edge)
        return edge

    return _make


@pytest.fixture
def make_workflow_graph():
    """Factory to create WorkflowGraph instances for testing."""

    def _make(
        nodes: list[GraphNode],
        edges: list[GraphEdge],
        teleporter_pairs: list[TeleporterPair] | None = None,
    ) -> WorkflowGraph:
        nodes_dict = {n.id: n for n in nodes}

        # Find entry nodes (agents with no incoming sequential edges)
        entry_nodes = []
        for node in nodes:
            if node.type == "agent":
                has_sequential = any(
                    e.semantics == EdgeSemantics.SEQUENTIAL for e in node.incoming
                )
                if not has_sequential:
                    entry_nodes.append(node)

        return WorkflowGraph(
            nodes=nodes_dict,
            edges=edges,
            teleporter_pairs=teleporter_pairs or [],
            entry_nodes=entry_nodes,
        )

    return _make


# =============================================================================
# Test IRTransformer
# =============================================================================


class TestIRTransformer:
    """Tests for IRTransformer class."""

    def test_init_default_config(self):
        """Should initialize with default config."""
        transformer = IRTransformer()
        assert transformer.config is not None

    def test_init_custom_config(self):
        """Should accept custom config."""
        config = ExecutionConfig()
        transformer = IRTransformer(config=config)
        assert transformer.config is config


class TestTransform:
    """Tests for the transform method."""

    def test_transform_empty_graph(
        self,
        transformer: IRTransformer,
        mock_project: LoadedProject,
        make_workflow_graph,
    ):
        """Should raise error for graph with no agents."""
        graph = make_workflow_graph(nodes=[], edges=[])

        with pytest.raises(CompilationError, match="No root agent found"):
            transformer.transform(graph, mock_project)

    def test_transform_single_agent(
        self,
        transformer: IRTransformer,
        mock_project: LoadedProject,
        make_graph_node,
        make_workflow_graph,
    ):
        """Should transform a single agent graph."""
        agent = make_graph_node(
            "agent-1", "agent", name="TestAgent", model="gemini-2.0-flash"
        )

        graph = make_workflow_graph(nodes=[agent], edges=[])

        with (
            patch(
                "adkflow_runner.compiler.transformer.resolve_instruction"
            ) as mock_instr,
            patch("adkflow_runner.compiler.transformer.resolve_tools") as mock_tools,
            patch(
                "adkflow_runner.compiler.transformer.resolve_context_var_sources"
            ) as mock_ctx,
            patch(
                "adkflow_runner.compiler.transformer.resolve_upstream_output_keys"
            ) as mock_keys,
            patch(
                "adkflow_runner.compiler.transformer.resolve_output_files"
            ) as mock_files,
            patch(
                "adkflow_runner.compiler.transformer.transform_user_inputs"
            ) as mock_inputs,
            patch(
                "adkflow_runner.compiler.transformer.transform_custom_nodes"
            ) as mock_custom,
        ):
            mock_instr.return_value = "Do something"
            mock_tools.return_value = []
            mock_ctx.return_value = []
            mock_keys.return_value = []
            mock_files.return_value = []
            mock_inputs.return_value = []
            mock_custom.return_value = []

            result = transformer.transform(graph, mock_project)

        assert result is not None
        assert result.root_agent is not None
        assert result.root_agent.name == "TestAgent"
        assert len(result.all_agents) == 1

    def test_transform_sequential_chain(
        self,
        transformer: IRTransformer,
        mock_project: LoadedProject,
        make_graph_node,
        make_graph_edge,
        make_workflow_graph,
    ):
        """Should transform a sequential chain of agents."""
        agent1 = make_graph_node("agent-1", "agent", name="Agent1")
        agent2 = make_graph_node("agent-2", "agent", name="Agent2")

        edge = make_graph_edge(agent1, agent2, EdgeSemantics.SEQUENTIAL)
        graph = make_workflow_graph(nodes=[agent1, agent2], edges=[edge])

        with (
            patch(
                "adkflow_runner.compiler.transformer.resolve_instruction"
            ) as mock_instr,
            patch("adkflow_runner.compiler.transformer.resolve_tools") as mock_tools,
            patch(
                "adkflow_runner.compiler.transformer.resolve_context_var_sources"
            ) as mock_ctx,
            patch(
                "adkflow_runner.compiler.transformer.resolve_upstream_output_keys"
            ) as mock_keys,
            patch(
                "adkflow_runner.compiler.transformer.resolve_output_files"
            ) as mock_files,
            patch(
                "adkflow_runner.compiler.transformer.transform_user_inputs"
            ) as mock_inputs,
            patch(
                "adkflow_runner.compiler.transformer.transform_custom_nodes"
            ) as mock_custom,
        ):
            mock_instr.return_value = "Test instruction"
            mock_tools.return_value = []
            mock_ctx.return_value = []
            mock_keys.return_value = []
            mock_files.return_value = []
            mock_inputs.return_value = []
            mock_custom.return_value = []

            result = transformer.transform(graph, mock_project)

        assert result is not None
        # Should be wrapped in a sequential agent
        assert result.root_agent.type == "sequential"
        assert len(result.all_agents) >= 2

    def test_transform_with_teleporters(
        self,
        transformer: IRTransformer,
        mock_project: LoadedProject,
        make_graph_node,
        make_graph_edge,
        make_workflow_graph,
    ):
        """Should transform graph with teleporter connections."""
        agent1 = make_graph_node("agent-1", "agent", name="Agent1")

        teleport_out = make_graph_node("teleport-out", "teleportOut", name="CrossTab")
        teleport_in = make_graph_node(
            "teleport-in", "teleportIn", name="CrossTab", tab_id="tab2"
        )

        agent2 = make_graph_node("agent-2", "agent", name="Agent2", tab_id="tab2")

        edge1 = make_graph_edge(agent1, teleport_out, EdgeSemantics.SEQUENTIAL)
        edge2 = make_graph_edge(teleport_in, agent2, EdgeSemantics.SEQUENTIAL)

        teleporter_pair = TeleporterPair(
            name="CrossTab",
            output_node=teleport_out,
            input_node=teleport_in,
        )

        graph = make_workflow_graph(
            nodes=[agent1, teleport_out, teleport_in, agent2],
            edges=[edge1, edge2],
            teleporter_pairs=[teleporter_pair],
        )

        with (
            patch(
                "adkflow_runner.compiler.transformer.resolve_instruction"
            ) as mock_instr,
            patch("adkflow_runner.compiler.transformer.resolve_tools") as mock_tools,
            patch(
                "adkflow_runner.compiler.transformer.resolve_context_var_sources"
            ) as mock_ctx,
            patch(
                "adkflow_runner.compiler.transformer.resolve_upstream_output_keys"
            ) as mock_keys,
            patch(
                "adkflow_runner.compiler.transformer.resolve_output_files"
            ) as mock_files,
            patch(
                "adkflow_runner.compiler.transformer.transform_user_inputs"
            ) as mock_inputs,
            patch(
                "adkflow_runner.compiler.transformer.transform_custom_nodes"
            ) as mock_custom,
        ):
            mock_instr.return_value = "Test"
            mock_tools.return_value = []
            mock_ctx.return_value = []
            mock_keys.return_value = []
            mock_files.return_value = []
            mock_inputs.return_value = []
            mock_custom.return_value = []

            result = transformer.transform(graph, mock_project)

        assert result is not None
        assert len(result.teleporters) == 1
        assert "CrossTab" in result.teleporters

    def test_transform_with_start_node(
        self,
        transformer: IRTransformer,
        mock_project: LoadedProject,
        make_graph_node,
        make_graph_edge,
        make_workflow_graph,
    ):
        """Should detect start node in graph."""
        start = make_graph_node("start-1", "start", name="Start")
        agent = make_graph_node("agent-1", "agent", name="Agent1")

        edge = make_graph_edge(start, agent, EdgeSemantics.SEQUENTIAL)
        graph = make_workflow_graph(nodes=[start, agent], edges=[edge])

        with (
            patch(
                "adkflow_runner.compiler.transformer.resolve_instruction"
            ) as mock_instr,
            patch("adkflow_runner.compiler.transformer.resolve_tools") as mock_tools,
            patch(
                "adkflow_runner.compiler.transformer.resolve_context_var_sources"
            ) as mock_ctx,
            patch(
                "adkflow_runner.compiler.transformer.resolve_upstream_output_keys"
            ) as mock_keys,
            patch(
                "adkflow_runner.compiler.transformer.resolve_output_files"
            ) as mock_files,
            patch(
                "adkflow_runner.compiler.transformer.transform_user_inputs"
            ) as mock_inputs,
            patch(
                "adkflow_runner.compiler.transformer.transform_custom_nodes"
            ) as mock_custom,
        ):
            mock_instr.return_value = "Test"
            mock_tools.return_value = []
            mock_ctx.return_value = []
            mock_keys.return_value = []
            mock_files.return_value = []
            mock_inputs.return_value = []
            mock_custom.return_value = []

            result = transformer.transform(graph, mock_project)

        assert result.has_start_node is True

    def test_transform_with_end_node(
        self,
        transformer: IRTransformer,
        mock_project: LoadedProject,
        make_graph_node,
        make_graph_edge,
        make_workflow_graph,
    ):
        """Should detect end node in graph."""
        agent = make_graph_node("agent-1", "agent", name="Agent1")
        end = make_graph_node("end-1", "end", name="End")

        edge = make_graph_edge(agent, end, EdgeSemantics.SEQUENTIAL)
        graph = make_workflow_graph(nodes=[agent, end], edges=[edge])

        with (
            patch(
                "adkflow_runner.compiler.transformer.resolve_instruction"
            ) as mock_instr,
            patch("adkflow_runner.compiler.transformer.resolve_tools") as mock_tools,
            patch(
                "adkflow_runner.compiler.transformer.resolve_context_var_sources"
            ) as mock_ctx,
            patch(
                "adkflow_runner.compiler.transformer.resolve_upstream_output_keys"
            ) as mock_keys,
            patch(
                "adkflow_runner.compiler.transformer.resolve_output_files"
            ) as mock_files,
            patch(
                "adkflow_runner.compiler.transformer.transform_user_inputs"
            ) as mock_inputs,
            patch(
                "adkflow_runner.compiler.transformer.transform_custom_nodes"
            ) as mock_custom,
        ):
            mock_instr.return_value = "Test"
            mock_tools.return_value = []
            mock_ctx.return_value = []
            mock_keys.return_value = []
            mock_files.return_value = []
            mock_inputs.return_value = []
            mock_custom.return_value = []

            result = transformer.transform(graph, mock_project)

        assert result.has_end_node is True

    def test_transform_includes_metadata(
        self,
        transformer: IRTransformer,
        mock_project: LoadedProject,
        make_graph_node,
        make_workflow_graph,
    ):
        """Should include project metadata in result."""
        agent = make_graph_node("agent-1", "agent", name="Agent1")

        graph = make_workflow_graph(nodes=[agent], edges=[])

        with (
            patch(
                "adkflow_runner.compiler.transformer.resolve_instruction"
            ) as mock_instr,
            patch("adkflow_runner.compiler.transformer.resolve_tools") as mock_tools,
            patch(
                "adkflow_runner.compiler.transformer.resolve_context_var_sources"
            ) as mock_ctx,
            patch(
                "adkflow_runner.compiler.transformer.resolve_upstream_output_keys"
            ) as mock_keys,
            patch(
                "adkflow_runner.compiler.transformer.resolve_output_files"
            ) as mock_files,
            patch(
                "adkflow_runner.compiler.transformer.transform_user_inputs"
            ) as mock_inputs,
            patch(
                "adkflow_runner.compiler.transformer.transform_custom_nodes"
            ) as mock_custom,
        ):
            mock_instr.return_value = "Test"
            mock_tools.return_value = []
            mock_ctx.return_value = []
            mock_keys.return_value = []
            mock_files.return_value = []
            mock_inputs.return_value = []
            mock_custom.return_value = []

            result = transformer.transform(graph, mock_project)

        assert result.metadata["project_name"] == "test-project"
        assert result.metadata["version"] == "3.0"
        assert result.project_path == str(mock_project.path)
        assert "tab1" in result.tab_ids


class TestTransformAgent:
    """Tests for the _transform_agent method."""

    def test_transform_basic_llm_agent(
        self,
        transformer: IRTransformer,
        mock_project: LoadedProject,
        make_graph_node,
        make_workflow_graph,
    ):
        """Should transform a basic LLM agent."""
        agent = make_graph_node(
            "agent-1",
            "agent",
            name="TestAgent",
            type="llm",
            model="gemini-2.0-flash",
            temperature=0.5,
        )

        graph = make_workflow_graph(nodes=[agent], edges=[])

        with (
            patch(
                "adkflow_runner.compiler.transformer.resolve_instruction"
            ) as mock_instr,
            patch("adkflow_runner.compiler.transformer.resolve_tools") as mock_tools,
            patch(
                "adkflow_runner.compiler.transformer.resolve_context_var_sources"
            ) as mock_ctx,
            patch(
                "adkflow_runner.compiler.transformer.resolve_upstream_output_keys"
            ) as mock_keys,
        ):
            mock_instr.return_value = "You are a helpful assistant."
            mock_tools.return_value = []
            mock_ctx.return_value = []
            mock_keys.return_value = []

            agent_ir = transformer._transform_agent(agent, graph, mock_project)

        assert agent_ir.id == "agent-1"
        assert agent_ir.name == "TestAgent"
        assert agent_ir.type == "llm"
        assert agent_ir.model == "gemini-2.0-flash"
        assert agent_ir.temperature == 0.5
        assert agent_ir.instruction == "You are a helpful assistant."

    def test_transform_agent_with_planner(
        self,
        transformer: IRTransformer,
        mock_project: LoadedProject,
        make_graph_node,
        make_workflow_graph,
    ):
        """Should transform agent with planner config."""
        agent = make_graph_node(
            "agent-1",
            "agent",
            name="PlannerAgent",
            planner_type="react",
            thinking_budget=100,
            include_thoughts=True,
        )

        graph = make_workflow_graph(nodes=[agent], edges=[])

        with (
            patch(
                "adkflow_runner.compiler.transformer.resolve_instruction"
            ) as mock_instr,
            patch("adkflow_runner.compiler.transformer.resolve_tools") as mock_tools,
            patch(
                "adkflow_runner.compiler.transformer.resolve_context_var_sources"
            ) as mock_ctx,
            patch(
                "adkflow_runner.compiler.transformer.resolve_upstream_output_keys"
            ) as mock_keys,
        ):
            mock_instr.return_value = None
            mock_tools.return_value = []
            mock_ctx.return_value = []
            mock_keys.return_value = []

            agent_ir = transformer._transform_agent(agent, graph, mock_project)

        assert agent_ir.planner.type == "react"
        assert agent_ir.planner.thinking_budget == 100
        assert agent_ir.planner.include_thoughts is True

    def test_transform_agent_with_nested_planner(
        self,
        transformer: IRTransformer,
        mock_project: LoadedProject,
        make_graph_node,
        make_workflow_graph,
    ):
        """Should transform agent with nested planner config."""
        agent = make_graph_node(
            "agent-1",
            "agent",
            name="PlannerAgent",
            planner={
                "type": "builtin",
                "thinking_budget": 50,
                "include_thoughts": False,
            },
        )

        graph = make_workflow_graph(nodes=[agent], edges=[])

        with (
            patch(
                "adkflow_runner.compiler.transformer.resolve_instruction"
            ) as mock_instr,
            patch("adkflow_runner.compiler.transformer.resolve_tools") as mock_tools,
            patch(
                "adkflow_runner.compiler.transformer.resolve_context_var_sources"
            ) as mock_ctx,
            patch(
                "adkflow_runner.compiler.transformer.resolve_upstream_output_keys"
            ) as mock_keys,
        ):
            mock_instr.return_value = None
            mock_tools.return_value = []
            mock_ctx.return_value = []
            mock_keys.return_value = []

            agent_ir = transformer._transform_agent(agent, graph, mock_project)

        assert agent_ir.planner.type == "builtin"
        assert agent_ir.planner.thinking_budget == 50
        assert agent_ir.planner.include_thoughts is False

    def test_transform_agent_with_code_executor(
        self,
        transformer: IRTransformer,
        mock_project: LoadedProject,
        make_graph_node,
        make_workflow_graph,
    ):
        """Should transform agent with code executor config."""
        agent = make_graph_node(
            "agent-1",
            "agent",
            name="CodeAgent",
            code_executor_enabled=True,
            code_executor_stateful=True,
            code_executor_error_retry=5,
        )

        graph = make_workflow_graph(nodes=[agent], edges=[])

        with (
            patch(
                "adkflow_runner.compiler.transformer.resolve_instruction"
            ) as mock_instr,
            patch("adkflow_runner.compiler.transformer.resolve_tools") as mock_tools,
            patch(
                "adkflow_runner.compiler.transformer.resolve_context_var_sources"
            ) as mock_ctx,
            patch(
                "adkflow_runner.compiler.transformer.resolve_upstream_output_keys"
            ) as mock_keys,
        ):
            mock_instr.return_value = None
            mock_tools.return_value = []
            mock_ctx.return_value = []
            mock_keys.return_value = []

            agent_ir = transformer._transform_agent(agent, graph, mock_project)

        assert agent_ir.code_executor.enabled is True
        assert agent_ir.code_executor.stateful is True
        assert agent_ir.code_executor.error_retry_attempts == 5

    def test_transform_agent_with_http_options(
        self,
        transformer: IRTransformer,
        mock_project: LoadedProject,
        make_graph_node,
        make_workflow_graph,
    ):
        """Should transform agent with HTTP options config."""
        agent = make_graph_node(
            "agent-1",
            "agent",
            name="HttpAgent",
            http_timeout=60000,
            http_max_retries=5,
            http_retry_delay=2000,
            http_backoff_multiplier=3.0,
        )

        graph = make_workflow_graph(nodes=[agent], edges=[])

        with (
            patch(
                "adkflow_runner.compiler.transformer.resolve_instruction"
            ) as mock_instr,
            patch("adkflow_runner.compiler.transformer.resolve_tools") as mock_tools,
            patch(
                "adkflow_runner.compiler.transformer.resolve_context_var_sources"
            ) as mock_ctx,
            patch(
                "adkflow_runner.compiler.transformer.resolve_upstream_output_keys"
            ) as mock_keys,
        ):
            mock_instr.return_value = None
            mock_tools.return_value = []
            mock_ctx.return_value = []
            mock_keys.return_value = []

            agent_ir = transformer._transform_agent(agent, graph, mock_project)

        assert agent_ir.http_options.timeout == 60000
        assert agent_ir.http_options.max_retries == 5
        assert agent_ir.http_options.retry_delay == 2000
        assert agent_ir.http_options.retry_backoff_multiplier == 3.0

    def test_transform_agent_with_callbacks(
        self,
        transformer: IRTransformer,
        mock_project: LoadedProject,
        make_graph_node,
        make_workflow_graph,
    ):
        """Should transform agent with callback config."""
        agent = make_graph_node(
            "agent-1",
            "agent",
            name="CallbackAgent",
            before_model_callback="callbacks/before_model.py",
            after_model_callback="callbacks/after_model.py",
            before_tool_callback="callbacks/before_tool.py",
            after_tool_callback="callbacks/after_tool.py",
        )

        graph = make_workflow_graph(nodes=[agent], edges=[])

        with (
            patch(
                "adkflow_runner.compiler.transformer.resolve_instruction"
            ) as mock_instr,
            patch("adkflow_runner.compiler.transformer.resolve_tools") as mock_tools,
            patch(
                "adkflow_runner.compiler.transformer.resolve_context_var_sources"
            ) as mock_ctx,
            patch(
                "adkflow_runner.compiler.transformer.resolve_upstream_output_keys"
            ) as mock_keys,
        ):
            mock_instr.return_value = None
            mock_tools.return_value = []
            mock_ctx.return_value = []
            mock_keys.return_value = []

            agent_ir = transformer._transform_agent(agent, graph, mock_project)

        assert agent_ir.callbacks.before_model == "callbacks/before_model.py"
        assert agent_ir.callbacks.after_model == "callbacks/after_model.py"
        assert agent_ir.callbacks.before_tool == "callbacks/before_tool.py"
        assert agent_ir.callbacks.after_tool == "callbacks/after_tool.py"

    def test_transform_agent_with_output_config(
        self,
        transformer: IRTransformer,
        mock_project: LoadedProject,
        make_graph_node,
        make_workflow_graph,
    ):
        """Should transform agent with output config."""
        agent = make_graph_node(
            "agent-1",
            "agent",
            name="OutputAgent",
            output_key="response",
            output_schema='{"type": "object"}',
            input_schema='{"type": "string"}',
        )

        graph = make_workflow_graph(nodes=[agent], edges=[])

        with (
            patch(
                "adkflow_runner.compiler.transformer.resolve_instruction"
            ) as mock_instr,
            patch("adkflow_runner.compiler.transformer.resolve_tools") as mock_tools,
            patch(
                "adkflow_runner.compiler.transformer.resolve_context_var_sources"
            ) as mock_ctx,
            patch(
                "adkflow_runner.compiler.transformer.resolve_upstream_output_keys"
            ) as mock_keys,
        ):
            mock_instr.return_value = None
            mock_tools.return_value = []
            mock_ctx.return_value = []
            mock_keys.return_value = []

            agent_ir = transformer._transform_agent(agent, graph, mock_project)

        assert agent_ir.output_key == "response"
        assert agent_ir.output_schema == '{"type": "object"}'
        assert agent_ir.input_schema == '{"type": "string"}'

    def test_transform_sequential_agent(
        self,
        transformer: IRTransformer,
        mock_project: LoadedProject,
        make_graph_node,
        make_workflow_graph,
    ):
        """Should transform sequential agent type."""
        agent = make_graph_node("agent-1", "agent", name="SeqAgent", type="sequential")

        graph = make_workflow_graph(nodes=[agent], edges=[])

        with (
            patch(
                "adkflow_runner.compiler.transformer.resolve_instruction"
            ) as mock_instr,
            patch("adkflow_runner.compiler.transformer.resolve_tools") as mock_tools,
            patch(
                "adkflow_runner.compiler.transformer.resolve_context_var_sources"
            ) as mock_ctx,
            patch(
                "adkflow_runner.compiler.transformer.resolve_upstream_output_keys"
            ) as mock_keys,
        ):
            mock_instr.return_value = None
            mock_tools.return_value = []
            mock_ctx.return_value = []
            mock_keys.return_value = []

            agent_ir = transformer._transform_agent(agent, graph, mock_project)

        assert agent_ir.type == "sequential"

    def test_transform_parallel_agent(
        self,
        transformer: IRTransformer,
        mock_project: LoadedProject,
        make_graph_node,
        make_workflow_graph,
    ):
        """Should transform parallel agent type."""
        agent = make_graph_node("agent-1", "agent", name="ParAgent", type="parallel")

        graph = make_workflow_graph(nodes=[agent], edges=[])

        with (
            patch(
                "adkflow_runner.compiler.transformer.resolve_instruction"
            ) as mock_instr,
            patch("adkflow_runner.compiler.transformer.resolve_tools") as mock_tools,
            patch(
                "adkflow_runner.compiler.transformer.resolve_context_var_sources"
            ) as mock_ctx,
            patch(
                "adkflow_runner.compiler.transformer.resolve_upstream_output_keys"
            ) as mock_keys,
        ):
            mock_instr.return_value = None
            mock_tools.return_value = []
            mock_ctx.return_value = []
            mock_keys.return_value = []

            agent_ir = transformer._transform_agent(agent, graph, mock_project)

        assert agent_ir.type == "parallel"

    def test_transform_loop_agent(
        self,
        transformer: IRTransformer,
        mock_project: LoadedProject,
        make_graph_node,
        make_workflow_graph,
    ):
        """Should transform loop agent type."""
        agent = make_graph_node(
            "agent-1", "agent", name="LoopAgent", type="loop", max_iterations=10
        )

        graph = make_workflow_graph(nodes=[agent], edges=[])

        with (
            patch(
                "adkflow_runner.compiler.transformer.resolve_instruction"
            ) as mock_instr,
            patch("adkflow_runner.compiler.transformer.resolve_tools") as mock_tools,
            patch(
                "adkflow_runner.compiler.transformer.resolve_context_var_sources"
            ) as mock_ctx,
            patch(
                "adkflow_runner.compiler.transformer.resolve_upstream_output_keys"
            ) as mock_keys,
        ):
            mock_instr.return_value = None
            mock_tools.return_value = []
            mock_ctx.return_value = []
            mock_keys.return_value = []

            agent_ir = transformer._transform_agent(agent, graph, mock_project)

        assert agent_ir.type == "loop"
        assert agent_ir.max_iterations == 10

    def test_transform_agent_with_transfer_controls(
        self,
        transformer: IRTransformer,
        mock_project: LoadedProject,
        make_graph_node,
        make_workflow_graph,
    ):
        """Should transform agent with transfer controls."""
        agent = make_graph_node(
            "agent-1",
            "agent",
            name="TransferAgent",
            disallow_transfer_to_parent=True,
            disallow_transfer_to_peers=True,
        )

        graph = make_workflow_graph(nodes=[agent], edges=[])

        with (
            patch(
                "adkflow_runner.compiler.transformer.resolve_instruction"
            ) as mock_instr,
            patch("adkflow_runner.compiler.transformer.resolve_tools") as mock_tools,
            patch(
                "adkflow_runner.compiler.transformer.resolve_context_var_sources"
            ) as mock_ctx,
            patch(
                "adkflow_runner.compiler.transformer.resolve_upstream_output_keys"
            ) as mock_keys,
        ):
            mock_instr.return_value = None
            mock_tools.return_value = []
            mock_ctx.return_value = []
            mock_keys.return_value = []

            agent_ir = transformer._transform_agent(agent, graph, mock_project)

        assert agent_ir.disallow_transfer_to_parent is True
        assert agent_ir.disallow_transfer_to_peers is True


class TestBuildAgentHierarchy:
    """Tests for _build_agent_hierarchy method."""

    def test_build_sequential_agent_subagents(
        self,
        transformer: IRTransformer,
        make_graph_node,
        make_graph_edge,
        make_workflow_graph,
    ):
        """Should build subagents list for sequential agents."""
        seq_agent = make_graph_node(
            "seq-1", "agent", name="SeqAgent", type="sequential"
        )
        sub1 = make_graph_node("sub-1", "agent", name="Sub1")
        sub2 = make_graph_node("sub-2", "agent", name="Sub2")

        # Connect seq_agent to sub1 to sub2
        edge1 = make_graph_edge(seq_agent, sub1, EdgeSemantics.SEQUENTIAL)
        edge2 = make_graph_edge(sub1, sub2, EdgeSemantics.SEQUENTIAL)

        graph = make_workflow_graph(
            nodes=[seq_agent, sub1, sub2],
            edges=[edge1, edge2],
        )

        all_agents = {
            "seq-1": AgentIR(id="seq-1", name="SeqAgent", type="sequential"),
            "sub-1": AgentIR(id="sub-1", name="Sub1", type="llm"),
            "sub-2": AgentIR(id="sub-2", name="Sub2", type="llm"),
        }

        transformer._build_agent_hierarchy(graph, all_agents)

        assert len(all_agents["seq-1"].subagents) == 2
        assert all_agents["seq-1"].subagents[0].name == "Sub1"
        assert all_agents["seq-1"].subagents[1].name == "Sub2"

    def test_build_parallel_agent_subagents(
        self,
        transformer: IRTransformer,
        make_graph_node,
        make_graph_edge,
        make_workflow_graph,
    ):
        """Should build subagents list for parallel agents."""
        par_agent = make_graph_node("par-1", "agent", name="ParAgent", type="parallel")
        branch1 = make_graph_node("branch-1", "agent", name="Branch1")
        branch2 = make_graph_node("branch-2", "agent", name="Branch2")

        # Connect par_agent to branches with PARALLEL semantics
        edge1 = make_graph_edge(par_agent, branch1, EdgeSemantics.PARALLEL)
        edge2 = make_graph_edge(par_agent, branch2, EdgeSemantics.PARALLEL)

        graph = make_workflow_graph(
            nodes=[par_agent, branch1, branch2],
            edges=[edge1, edge2],
        )

        all_agents = {
            "par-1": AgentIR(id="par-1", name="ParAgent", type="parallel"),
            "branch-1": AgentIR(id="branch-1", name="Branch1", type="llm"),
            "branch-2": AgentIR(id="branch-2", name="Branch2", type="llm"),
        }

        transformer._build_agent_hierarchy(graph, all_agents)

        assert len(all_agents["par-1"].subagents) == 2
        subagent_names = [s.name for s in all_agents["par-1"].subagents]
        assert "Branch1" in subagent_names
        assert "Branch2" in subagent_names

    def test_build_hierarchy_with_missing_node(
        self,
        transformer: IRTransformer,
        make_graph_node,  # noqa: ARG002
        make_workflow_graph,
    ):
        """Should handle missing nodes gracefully."""
        # Create graph without the sequential agent node
        graph = make_workflow_graph(nodes=[], edges=[])

        all_agents = {
            "seq-1": AgentIR(id="seq-1", name="SeqAgent", type="sequential"),
        }

        # Should not raise error
        transformer._build_agent_hierarchy(graph, all_agents)
        assert all_agents["seq-1"].subagents == []


class TestFindSequentialChain:
    """Tests for _find_sequential_chain method."""

    def test_find_empty_chain(
        self,
        transformer: IRTransformer,
        make_graph_node,
        make_workflow_graph,
    ):
        """Should return empty list when no outgoing sequential edges."""
        agent = make_graph_node("agent-1", "agent", name="Agent1")
        graph = make_workflow_graph(nodes=[agent], edges=[])

        all_agents = {
            "agent-1": AgentIR(id="agent-1", name="Agent1", type="sequential"),
        }

        chain = transformer._find_sequential_chain(agent, graph, all_agents)
        assert chain == []

    def test_find_linear_chain(
        self,
        transformer: IRTransformer,
        make_graph_node,
        make_graph_edge,
        make_workflow_graph,
    ):
        """Should find agents in a linear chain."""
        start = make_graph_node("start", "agent", name="Start")
        mid = make_graph_node("mid", "agent", name="Mid")
        end = make_graph_node("end", "agent", name="End")

        edge1 = make_graph_edge(start, mid, EdgeSemantics.SEQUENTIAL)
        edge2 = make_graph_edge(mid, end, EdgeSemantics.SEQUENTIAL)

        graph = make_workflow_graph(
            nodes=[start, mid, end],
            edges=[edge1, edge2],
        )

        all_agents = {
            "start": AgentIR(id="start", name="Start", type="sequential"),
            "mid": AgentIR(id="mid", name="Mid", type="llm"),
            "end": AgentIR(id="end", name="End", type="llm"),
        }

        chain = transformer._find_sequential_chain(start, graph, all_agents)
        assert len(chain) == 2
        assert chain[0].name == "Mid"
        assert chain[1].name == "End"

    def test_find_chain_skips_non_sequential(
        self,
        transformer: IRTransformer,
        make_graph_node,
        make_graph_edge,
        make_workflow_graph,
    ):
        """Should only follow SEQUENTIAL edges."""
        start = make_graph_node("start", "agent", name="Start")
        parallel_target = make_graph_node("par", "agent", name="Par")
        seq_target = make_graph_node("seq", "agent", name="Seq")

        # Mix of edge types
        par_edge = make_graph_edge(start, parallel_target, EdgeSemantics.PARALLEL)
        seq_edge = make_graph_edge(start, seq_target, EdgeSemantics.SEQUENTIAL)

        graph = make_workflow_graph(
            nodes=[start, parallel_target, seq_target],
            edges=[par_edge, seq_edge],
        )

        all_agents = {
            "start": AgentIR(id="start", name="Start", type="sequential"),
            "par": AgentIR(id="par", name="Par", type="llm"),
            "seq": AgentIR(id="seq", name="Seq", type="llm"),
        }

        chain = transformer._find_sequential_chain(start, graph, all_agents)
        assert len(chain) == 1
        assert chain[0].name == "Seq"

    def test_find_chain_handles_cycles(
        self,
        transformer: IRTransformer,
        make_graph_node,
        make_graph_edge,
        make_workflow_graph,
    ):
        """Should handle cycles without infinite loop."""
        a = make_graph_node("a", "agent", name="A")
        b = make_graph_node("b", "agent", name="B")

        # Create cycle: A -> B -> A
        edge1 = make_graph_edge(a, b, EdgeSemantics.SEQUENTIAL)
        # Manually create back edge to avoid helper function
        back_edge = GraphEdge(
            source_id=b.id,
            target_id=a.id,
            semantics=EdgeSemantics.SEQUENTIAL,
        )
        b.outgoing.append(back_edge)
        a.incoming.append(back_edge)

        graph = make_workflow_graph(
            nodes=[a, b],
            edges=[edge1, back_edge],
        )

        all_agents = {
            "a": AgentIR(id="a", name="A", type="sequential"),
            "b": AgentIR(id="b", name="B", type="llm"),
        }

        chain = transformer._find_sequential_chain(a, graph, all_agents)
        # Should terminate due to visited check
        assert len(chain) == 1


class TestFindParallelAgents:
    """Tests for _find_parallel_agents method."""

    def test_find_no_parallel(
        self,
        transformer: IRTransformer,
        make_graph_node,
        make_workflow_graph,
    ):
        """Should return empty when no parallel edges."""
        agent = make_graph_node("agent-1", "agent", name="Agent1")
        graph = make_workflow_graph(nodes=[agent], edges=[])

        all_agents = {
            "agent-1": AgentIR(id="agent-1", name="Agent1", type="parallel"),
        }

        parallel = transformer._find_parallel_agents(agent, graph, all_agents)
        assert parallel == []

    def test_find_multiple_parallel(
        self,
        transformer: IRTransformer,
        make_graph_node,
        make_graph_edge,
        make_workflow_graph,
    ):
        """Should find all parallel-connected agents."""
        root = make_graph_node("root", "agent", name="Root")
        branch1 = make_graph_node("b1", "agent", name="Branch1")
        branch2 = make_graph_node("b2", "agent", name="Branch2")
        branch3 = make_graph_node("b3", "agent", name="Branch3")

        edge1 = make_graph_edge(root, branch1, EdgeSemantics.PARALLEL)
        edge2 = make_graph_edge(root, branch2, EdgeSemantics.PARALLEL)
        edge3 = make_graph_edge(root, branch3, EdgeSemantics.PARALLEL)

        graph = make_workflow_graph(
            nodes=[root, branch1, branch2, branch3],
            edges=[edge1, edge2, edge3],
        )

        all_agents = {
            "root": AgentIR(id="root", name="Root", type="parallel"),
            "b1": AgentIR(id="b1", name="Branch1", type="llm"),
            "b2": AgentIR(id="b2", name="Branch2", type="llm"),
            "b3": AgentIR(id="b3", name="Branch3", type="llm"),
        }

        parallel = transformer._find_parallel_agents(root, graph, all_agents)
        assert len(parallel) == 3
        names = [p.name for p in parallel]
        assert "Branch1" in names
        assert "Branch2" in names
        assert "Branch3" in names

    def test_find_parallel_ignores_sequential(
        self,
        transformer: IRTransformer,
        make_graph_node,
        make_graph_edge,
        make_workflow_graph,
    ):
        """Should only return PARALLEL-connected agents."""
        root = make_graph_node("root", "agent", name="Root")
        parallel_target = make_graph_node("par", "agent", name="Par")
        seq_target = make_graph_node("seq", "agent", name="Seq")

        par_edge = make_graph_edge(root, parallel_target, EdgeSemantics.PARALLEL)
        seq_edge = make_graph_edge(root, seq_target, EdgeSemantics.SEQUENTIAL)

        graph = make_workflow_graph(
            nodes=[root, parallel_target, seq_target],
            edges=[par_edge, seq_edge],
        )

        all_agents = {
            "root": AgentIR(id="root", name="Root", type="parallel"),
            "par": AgentIR(id="par", name="Par", type="llm"),
            "seq": AgentIR(id="seq", name="Seq", type="llm"),
        }

        parallel = transformer._find_parallel_agents(root, graph, all_agents)
        assert len(parallel) == 1
        assert parallel[0].name == "Par"


class TestBuildSequentialChainFromRoot:
    """Tests for _build_sequential_chain_from_root method."""

    def test_build_single_agent_chain(
        self,
        transformer: IRTransformer,
        make_graph_node,
        make_workflow_graph,
    ):
        """Should build chain with single agent."""
        root = make_graph_node("root", "agent", name="Root")
        graph = make_workflow_graph(nodes=[root], edges=[])

        all_agents = {
            "root": AgentIR(id="root", name="Root", type="llm"),
        }

        chain = transformer._build_sequential_chain_from_root(root, graph, all_agents)
        assert len(chain) == 1
        assert chain[0].name == "Root"

    def test_build_multi_agent_chain(
        self,
        transformer: IRTransformer,
        make_graph_node,
        make_graph_edge,
        make_workflow_graph,
    ):
        """Should build chain following sequential edges."""
        a = make_graph_node("a", "agent", name="A")
        b = make_graph_node("b", "agent", name="B")
        c = make_graph_node("c", "agent", name="C")

        edge1 = make_graph_edge(a, b, EdgeSemantics.SEQUENTIAL)
        edge2 = make_graph_edge(b, c, EdgeSemantics.SEQUENTIAL)

        graph = make_workflow_graph(
            nodes=[a, b, c],
            edges=[edge1, edge2],
        )

        all_agents = {
            "a": AgentIR(id="a", name="A", type="llm"),
            "b": AgentIR(id="b", name="B", type="llm"),
            "c": AgentIR(id="c", name="C", type="llm"),
        }

        chain = transformer._build_sequential_chain_from_root(a, graph, all_agents)
        assert len(chain) == 3
        assert chain[0].name == "A"
        assert chain[1].name == "B"
        assert chain[2].name == "C"

    def test_build_chain_stops_at_non_agent(
        self,
        transformer: IRTransformer,
        make_graph_node,
        make_graph_edge,
        make_workflow_graph,
    ):
        """Should stop at non-agent nodes."""
        agent = make_graph_node("agent", "agent", name="Agent")
        end_node = make_graph_node("end", "end", name="End")

        edge = make_graph_edge(agent, end_node, EdgeSemantics.SEQUENTIAL)

        graph = make_workflow_graph(
            nodes=[agent, end_node],
            edges=[edge],
        )

        all_agents = {
            "agent": AgentIR(id="agent", name="Agent", type="llm"),
        }

        chain = transformer._build_sequential_chain_from_root(agent, graph, all_agents)
        assert len(chain) == 1
        assert chain[0].name == "Agent"

    def test_build_chain_handles_cycle(
        self,
        transformer: IRTransformer,
        make_graph_node,
        make_graph_edge,
        make_workflow_graph,
    ):
        """Should handle cycles by tracking visited nodes."""
        a = make_graph_node("a", "agent", name="A")
        b = make_graph_node("b", "agent", name="B")

        edge1 = make_graph_edge(a, b, EdgeSemantics.SEQUENTIAL)
        # Create back edge manually
        back_edge = GraphEdge(
            source_id=b.id,
            target_id=a.id,
            semantics=EdgeSemantics.SEQUENTIAL,
        )
        b.outgoing.append(back_edge)
        a.incoming.append(back_edge)

        graph = make_workflow_graph(
            nodes=[a, b],
            edges=[edge1, back_edge],
        )

        all_agents = {
            "a": AgentIR(id="a", name="A", type="llm"),
            "b": AgentIR(id="b", name="B", type="llm"),
        }

        chain = transformer._build_sequential_chain_from_root(a, graph, all_agents)
        # Should terminate at B since A is already visited
        assert len(chain) == 2

    def test_build_chain_takes_first_sequential(
        self,
        transformer: IRTransformer,
        make_graph_node,
        make_graph_edge,
        make_workflow_graph,
    ):
        """When multiple sequential edges, should take first valid one."""
        a = make_graph_node("a", "agent", name="A")
        b = make_graph_node("b", "agent", name="B")
        c = make_graph_node("c", "agent", name="C")

        # A has two sequential outgoing edges
        edge1 = make_graph_edge(a, b, EdgeSemantics.SEQUENTIAL)
        edge2 = make_graph_edge(a, c, EdgeSemantics.SEQUENTIAL)

        graph = make_workflow_graph(
            nodes=[a, b, c],
            edges=[edge1, edge2],
        )

        all_agents = {
            "a": AgentIR(id="a", name="A", type="llm"),
            "b": AgentIR(id="b", name="B", type="llm"),
            "c": AgentIR(id="c", name="C", type="llm"),
        }

        chain = transformer._build_sequential_chain_from_root(a, graph, all_agents)
        # Should pick up A, then one of B or C (first found)
        assert len(chain) == 2
        assert chain[0].name == "A"
        assert chain[1].name in ("B", "C")
