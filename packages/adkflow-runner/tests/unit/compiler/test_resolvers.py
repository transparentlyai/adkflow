"""Tests for the resolver module.

Tests resolution of instructions, tools, callbacks, and schemas from connected nodes.
"""

from __future__ import annotations

from typing import Any
from unittest.mock import MagicMock

import pytest

from adkflow_runner.compiler.graph import GraphEdge, GraphNode, WorkflowGraph
from adkflow_runner.compiler.loader import LoadedProject
from adkflow_runner.compiler.parser import ParsedNode
from adkflow_runner.compiler.resolvers import (
    resolve_callbacks,
    resolve_instruction,
    resolve_schemas,
    resolve_tools,
)
from adkflow_runner.config import EdgeSemantics
from adkflow_runner.errors import CompilationError
from adkflow_runner.ir import CallbackSourceIR, SchemaSourceIR, ToolIR


# =============================================================================
# Test Fixtures
# =============================================================================


@pytest.fixture
def make_graph_node():
    """Factory to create GraphNode instances for testing."""

    def _make(
        node_id: str,
        node_type: str = "agent",
        name: str | None = None,
        tab_id: str = "tab1",
        **config_kwargs: Any,
    ) -> GraphNode:
        name = name or node_id.upper()

        config: dict[str, Any] = {"name": name}
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
        source_handle: str | None = None,
        target_handle: str | None = None,
    ) -> GraphEdge:
        edge = GraphEdge(
            source_id=source.id,
            target_id=target.id,
            semantics=semantics,
            source_handle=source_handle,
            target_handle=target_handle,
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
            teleporter_pairs=[],
            entry_nodes=entry_nodes,
        )

    return _make


@pytest.fixture
def mock_project():
    """Mock LoadedProject for testing."""
    project = MagicMock(spec=LoadedProject)
    project.get_prompt = MagicMock(return_value=None)
    project.get_tool = MagicMock(return_value=None)
    return project


# =============================================================================
# Test resolve_instruction
# =============================================================================


class TestResolveInstruction:
    """Tests for resolve_instruction function."""

    def test_resolve_from_prompt_node(
        self, make_graph_node, make_graph_edge, make_workflow_graph, mock_project
    ):
        """Resolve instruction from connected prompt node."""
        agent = make_graph_node("agent1", "agent")
        prompt = make_graph_node("prompt1", "prompt", file_path="system.txt")

        edge = make_graph_edge(prompt, agent, EdgeSemantics.INSTRUCTION)
        graph = make_workflow_graph([agent, prompt], [edge])

        # Mock project.get_prompt to return prompt content
        mock_prompt = MagicMock()
        mock_prompt.content = "You are a helpful assistant."
        mock_project.get_prompt.return_value = mock_prompt

        result = resolve_instruction(agent, graph, mock_project)

        assert result == "You are a helpful assistant."
        mock_project.get_prompt.assert_called_once_with("system.txt")

    def test_resolve_from_context_node(
        self, make_graph_node, make_graph_edge, make_workflow_graph, mock_project
    ):
        """Resolve instruction from connected context node."""
        agent = make_graph_node("agent1", "agent")
        context = make_graph_node("context1", "context", file_path="context.txt")

        edge = make_graph_edge(context, agent, EdgeSemantics.CONTEXT)
        graph = make_workflow_graph([agent, context], [edge])

        # Mock project.get_prompt to return context content
        mock_context = MagicMock()
        mock_context.content = "Some context"
        mock_project.get_prompt.return_value = mock_context

        result = resolve_instruction(agent, graph, mock_project)

        assert result == "## Context\nSome context"

    def test_resolve_missing_prompt_raises_error(
        self, make_graph_node, make_graph_edge, make_workflow_graph, mock_project
    ):
        """Error when referenced prompt file is not loaded."""
        agent = make_graph_node("agent1", "agent")
        prompt = make_graph_node("prompt1", "prompt", file_path="missing.txt")

        edge = make_graph_edge(prompt, agent, EdgeSemantics.INSTRUCTION)
        graph = make_workflow_graph([agent, prompt], [edge])

        # Mock project.get_prompt to return None (file not found)
        mock_project.get_prompt.return_value = None

        with pytest.raises(CompilationError, match="Prompt file not loaded"):
            resolve_instruction(agent, graph, mock_project)

    def test_resolve_skips_missing_source_node(
        self, make_graph_node, make_workflow_graph, mock_project
    ):
        """Skip edges with missing source nodes."""
        agent = make_graph_node("agent1", "agent")

        # Create edge pointing to non-existent node
        edge = GraphEdge(
            source_id="nonexistent",
            target_id=agent.id,
            semantics=EdgeSemantics.INSTRUCTION,
        )
        agent.incoming.append(edge)

        graph = make_workflow_graph([agent], [edge])

        result = resolve_instruction(agent, graph, mock_project)

        # Should return None (no valid instructions)
        assert result is None


# =============================================================================
# Test resolve_tools
# =============================================================================


class TestResolveTools:
    """Tests for resolve_tools function."""

    def test_resolve_shelltool_node(
        self, make_graph_node, make_graph_edge, make_workflow_graph, mock_project
    ):
        """Resolve tools from connected shellTool node."""
        agent = make_graph_node("agent1", "agent")
        shell_tool = make_graph_node(
            "shell1",
            "shellTool",
            allowed_commands=["ls", "pwd"],
            error_behavior="pass_to_model",
        )

        edge = make_graph_edge(shell_tool, agent, EdgeSemantics.TOOL)
        graph = make_workflow_graph([agent, shell_tool], [edge])

        result = resolve_tools(agent, graph, mock_project)

        assert len(result) == 1
        assert result[0].name == "shell_tool"
        assert result[0].tool_type == "shellTool"
        assert result[0].config["allowed_commands"] == ["ls", "pwd"]
        assert result[0].error_behavior == "pass_to_model"

    def test_resolve_inline_code_tool(
        self, make_graph_node, make_graph_edge, make_workflow_graph, mock_project
    ):
        """Resolve tools with inline code (no file_path)."""
        agent = make_graph_node("agent1", "agent")
        tool = make_graph_node(
            "tool1",
            "tool",
            name="my_tool",
            code="def my_tool(): pass",
            error_behavior="fail_fast",
        )

        edge = make_graph_edge(tool, agent, EdgeSemantics.TOOL)
        graph = make_workflow_graph([agent, tool], [edge])

        result = resolve_tools(agent, graph, mock_project)

        assert len(result) == 1
        assert result[0].name == "my_tool"
        assert result[0].code == "def my_tool(): pass"
        assert result[0].error_behavior == "fail_fast"


# =============================================================================
# Test resolve_callbacks
# =============================================================================


class TestResolveCallbacks:
    """Tests for resolve_callbacks function."""

    def test_resolve_callbacks_from_connected_nodes(
        self, make_graph_node, make_graph_edge, make_workflow_graph
    ):
        """Resolve callbacks from connected callback nodes."""
        agent = make_graph_node("agent1", "agent")
        callback_node = make_graph_node(
            "cb1",
            "callback",
            name="BeforeModelCallback",
            code="print('before model')",
        )

        # Edge from agent to callback node with source handle
        edge = make_graph_edge(
            agent,
            callback_node,
            EdgeSemantics.CALLBACK,
            source_handle="before_model_callback",
        )
        graph = make_workflow_graph([agent, callback_node], [edge])

        agent_data = {"config": {}}
        result = resolve_callbacks(agent, graph, agent_data)

        assert result.before_model is not None
        assert result.before_model.code == "print('before model')"
        assert result.before_model.source_node_id == "cb1"

    def test_resolve_callbacks_unknown_handle_warning(
        self, make_graph_node, make_graph_edge, make_workflow_graph
    ):
        """Warn when callback edge has unknown source handle."""
        agent = make_graph_node("agent1", "agent")
        callback_node = make_graph_node(
            "cb1",
            "callback",
            name="Callback",
            code="print('test')",
        )

        # Edge with unknown source handle
        edge = make_graph_edge(
            agent,
            callback_node,
            EdgeSemantics.CALLBACK,
            source_handle="unknown_callback",
        )
        graph = make_workflow_graph([agent, callback_node], [edge])

        agent_data = {"config": {}}
        result = resolve_callbacks(agent, graph, agent_data)

        # All callbacks should be None (unknown handle skipped)
        assert result.before_model is None
        assert result.after_model is None

    def test_resolve_callbacks_skips_empty_code(
        self, make_graph_node, make_graph_edge, make_workflow_graph
    ):
        """Skip callback nodes with empty code."""
        agent = make_graph_node("agent1", "agent")
        callback_node = make_graph_node(
            "cb1",
            "callback",
            name="EmptyCallback",
            code="",
        )

        edge = make_graph_edge(
            agent,
            callback_node,
            EdgeSemantics.CALLBACK,
            source_handle="before_model_callback",
        )
        graph = make_workflow_graph([agent, callback_node], [edge])

        agent_data = {"config": {}}
        result = resolve_callbacks(agent, graph, agent_data)

        # Callback should be None (empty code skipped)
        assert result.before_model is None

    def test_resolve_callbacks_skips_non_callback_nodes(
        self, make_graph_node, make_graph_edge, make_workflow_graph
    ):
        """Skip edges targeting non-callback node types."""
        agent = make_graph_node("agent1", "agent")
        other_node = make_graph_node("other1", "tool")

        # Edge with CALLBACK semantics but wrong target type
        edge = make_graph_edge(
            agent,
            other_node,
            EdgeSemantics.CALLBACK,
            source_handle="before_model_callback",
        )
        graph = make_workflow_graph([agent, other_node], [edge])

        agent_data = {"config": {}}
        result = resolve_callbacks(agent, graph, agent_data)

        # Should be None (wrong node type)
        assert result.before_model is None


# =============================================================================
# Test resolve_schemas
# =============================================================================


class TestResolveSchemas:
    """Tests for resolve_schemas function."""

    def test_resolve_schemas_from_connected_nodes(
        self, make_graph_node, make_graph_edge, make_workflow_graph
    ):
        """Resolve schemas from connected schema nodes."""
        agent = make_graph_node("agent1", "agent")
        schema_node = make_graph_node(
            "schema1",
            "schema",
            name="OutputSchema",
            code='class OutputSchema(BaseModel): pass',
            schema_class="OutputSchema",
        )

        # Edge from schema node to agent with target handle
        edge = make_graph_edge(
            schema_node,
            agent,
            EdgeSemantics.SCHEMA,
            target_handle="output_schema",
        )
        graph = make_workflow_graph([agent, schema_node], [edge])

        agent_data = {"config": {}}
        input_schema, output_schema = resolve_schemas(agent, graph, agent_data)

        assert output_schema is not None
        assert output_schema.code == 'class OutputSchema(BaseModel): pass'
        assert output_schema.class_name == "OutputSchema"
        assert output_schema.source_node_id == "schema1"

    def test_resolve_schemas_unknown_handle_warning(
        self, make_graph_node, make_graph_edge, make_workflow_graph
    ):
        """Warn when schema edge has unknown target handle."""
        agent = make_graph_node("agent1", "agent")
        schema_node = make_graph_node(
            "schema1",
            "schema",
            name="Schema",
            code="class Schema(BaseModel): pass",
        )

        # Edge with unknown target handle
        edge = make_graph_edge(
            schema_node,
            agent,
            EdgeSemantics.SCHEMA,
            target_handle="unknown_schema",
        )
        graph = make_workflow_graph([agent, schema_node], [edge])

        agent_data = {"config": {}}
        input_schema, output_schema = resolve_schemas(agent, graph, agent_data)

        # Both should be None (unknown handle skipped)
        assert input_schema is None
        assert output_schema is None

    def test_resolve_schemas_skips_empty_code(
        self, make_graph_node, make_graph_edge, make_workflow_graph
    ):
        """Skip schema nodes with empty code."""
        agent = make_graph_node("agent1", "agent")
        schema_node = make_graph_node(
            "schema1",
            "schema",
            name="EmptySchema",
            code="",
        )

        edge = make_graph_edge(
            schema_node,
            agent,
            EdgeSemantics.SCHEMA,
            target_handle="output_schema",
        )
        graph = make_workflow_graph([agent, schema_node], [edge])

        agent_data = {"config": {}}
        input_schema, output_schema = resolve_schemas(agent, graph, agent_data)

        # Should be None (empty code skipped)
        assert output_schema is None

    def test_resolve_schemas_skips_non_schema_nodes(
        self, make_graph_node, make_graph_edge, make_workflow_graph
    ):
        """Skip edges from non-schema node types."""
        agent = make_graph_node("agent1", "agent")
        other_node = make_graph_node("other1", "tool")

        # Edge with SCHEMA semantics but wrong source type
        edge = make_graph_edge(
            other_node,
            agent,
            EdgeSemantics.SCHEMA,
            target_handle="output_schema",
        )
        graph = make_workflow_graph([agent, other_node], [edge])

        agent_data = {"config": {}}
        input_schema, output_schema = resolve_schemas(agent, graph, agent_data)

        # Should be None (wrong node type)
        assert output_schema is None
