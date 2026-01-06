"""Tests for node_transforms module.

Tests the transformation of UserInput and Custom nodes to their IR representations.
"""

from __future__ import annotations

from typing import Any
from unittest.mock import MagicMock, patch

import pytest

from adkflow_runner.compiler.graph import GraphEdge, GraphNode, WorkflowGraph
from adkflow_runner.compiler.node_transforms import (
    sanitize_variable_name,
    transform_custom_nodes,
    transform_user_inputs,
)
from adkflow_runner.compiler.parser import ParsedNode
from adkflow_runner.config import EdgeSemantics


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

        # Find entry nodes
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


# =============================================================================
# Test sanitize_variable_name
# =============================================================================


class TestSanitizeVariableName:
    """Tests for sanitize_variable_name function."""

    def test_basic_name(self):
        """Should convert simple name."""
        result = sanitize_variable_name("ReviewStep")
        assert result == "reviewstep_input"

    def test_spaces_to_underscores(self):
        """Should convert spaces to underscores."""
        result = sanitize_variable_name("Review Step")
        assert result == "review_step_input"

    def test_hyphens_to_underscores(self):
        """Should convert hyphens to underscores."""
        result = sanitize_variable_name("review-step")
        assert result == "review_step_input"

    def test_mixed_spaces_and_hyphens(self):
        """Should handle mixed spaces and hyphens."""
        result = sanitize_variable_name("Review-Step Name")
        assert result == "review_step_name_input"

    def test_removes_invalid_characters(self):
        """Should remove invalid characters."""
        result = sanitize_variable_name("Review!@#$%^&*()Step")
        assert result == "reviewstep_input"

    def test_lowercase_conversion(self):
        """Should convert to lowercase."""
        result = sanitize_variable_name("REVIEW_STEP")
        assert result == "review_step_input"

    def test_starting_with_number(self):
        """Should prefix underscore if starts with number."""
        result = sanitize_variable_name("123Step")
        assert result == "_123step_input"

    def test_empty_name(self):
        """Should return default for empty name."""
        result = sanitize_variable_name("")
        assert result == "user_input"

    def test_only_invalid_characters(self):
        """Should return default if only invalid characters."""
        result = sanitize_variable_name("!@#$%")
        assert result == "user_input"

    def test_unicode_removed(self):
        """Should remove unicode characters."""
        result = sanitize_variable_name("Reviewäöü")
        assert result == "review_input"

    def test_preserves_underscores(self):
        """Should preserve existing underscores."""
        result = sanitize_variable_name("review_step")
        assert result == "review_step_input"


# =============================================================================
# Test transform_user_inputs
# =============================================================================


class TestTransformUserInputs:
    """Tests for transform_user_inputs function."""

    def test_transform_trigger_user_input(
        self,
        make_graph_node,
        make_graph_edge,
        make_workflow_graph,
    ):
        """Should transform trigger mode UserInput (no incoming)."""
        user_input = make_graph_node(
            "ui-1",
            "userInput",
            name="Start Input",
            timeout=600,
            timeoutBehavior="pass_through",
        )
        agent = make_graph_node("agent-1", "agent", name="Agent1")

        edge = make_graph_edge(user_input, agent, EdgeSemantics.SEQUENTIAL)
        graph = make_workflow_graph(nodes=[user_input, agent], edges=[edge])

        all_agents = {"agent-1": MagicMock()}

        result = transform_user_inputs(graph, all_agents)

        assert len(result) == 1
        assert result[0].id == "ui-1"
        assert result[0].name == "Start Input"
        assert result[0].variable_name == "start_input_input"
        assert result[0].is_trigger is True
        assert result[0].timeout_seconds == 600.0
        assert result[0].timeout_behavior == "pass_through"
        assert result[0].incoming_agent_ids == []
        assert result[0].outgoing_agent_ids == ["agent-1"]

    def test_transform_pause_user_input(
        self,
        make_graph_node,
        make_graph_edge,
        make_workflow_graph,
    ):
        """Should transform pause mode UserInput (has incoming)."""
        agent1 = make_graph_node("agent-1", "agent", name="Agent1")
        user_input = make_graph_node(
            "ui-1",
            "userInput",
            name="Review Step",
            predefinedText="Default response",
        )
        agent2 = make_graph_node("agent-2", "agent", name="Agent2")

        edge1 = make_graph_edge(agent1, user_input, EdgeSemantics.SEQUENTIAL)
        edge2 = make_graph_edge(user_input, agent2, EdgeSemantics.SEQUENTIAL)

        graph = make_workflow_graph(
            nodes=[agent1, user_input, agent2],
            edges=[edge1, edge2],
        )

        all_agents = {
            "agent-1": MagicMock(),
            "agent-2": MagicMock(),
        }

        result = transform_user_inputs(graph, all_agents)

        assert len(result) == 1
        assert result[0].id == "ui-1"
        assert result[0].is_trigger is False
        assert result[0].incoming_agent_ids == ["agent-1"]
        assert result[0].outgoing_agent_ids == ["agent-2"]
        assert result[0].predefined_text == "Default response"

    def test_skip_unconnected_user_input(
        self,
        make_graph_node,
        make_workflow_graph,
    ):
        """Should skip UserInput nodes with no outgoing connections."""
        user_input = make_graph_node("ui-1", "userInput", name="Orphan")

        graph = make_workflow_graph(nodes=[user_input], edges=[])

        result = transform_user_inputs(graph, {})

        assert len(result) == 0

    def test_skip_user_input_not_connected_to_agent(
        self,
        make_graph_node,
        make_graph_edge,
        make_workflow_graph,
    ):
        """Should skip UserInput if not connected to an agent."""
        user_input = make_graph_node("ui-1", "userInput", name="Input")
        other_node = make_graph_node("other-1", "prompt", name="Prompt")

        # Connect to non-agent node
        edge = make_graph_edge(user_input, other_node, EdgeSemantics.SEQUENTIAL)

        graph = make_workflow_graph(nodes=[user_input, other_node], edges=[edge])

        result = transform_user_inputs(graph, {})

        assert len(result) == 0

    def test_multiple_user_inputs(
        self,
        make_graph_node,
        make_graph_edge,
        make_workflow_graph,
    ):
        """Should transform multiple UserInput nodes."""
        agent1 = make_graph_node("agent-1", "agent", name="Agent1")
        ui1 = make_graph_node("ui-1", "userInput", name="Input 1")
        agent2 = make_graph_node("agent-2", "agent", name="Agent2")
        ui2 = make_graph_node("ui-2", "userInput", name="Input 2")
        agent3 = make_graph_node("agent-3", "agent", name="Agent3")

        edge1 = make_graph_edge(agent1, ui1, EdgeSemantics.SEQUENTIAL)
        edge2 = make_graph_edge(ui1, agent2, EdgeSemantics.SEQUENTIAL)
        edge3 = make_graph_edge(agent2, ui2, EdgeSemantics.SEQUENTIAL)
        edge4 = make_graph_edge(ui2, agent3, EdgeSemantics.SEQUENTIAL)

        graph = make_workflow_graph(
            nodes=[agent1, ui1, agent2, ui2, agent3],
            edges=[edge1, edge2, edge3, edge4],
        )

        all_agents = {
            "agent-1": MagicMock(),
            "agent-2": MagicMock(),
            "agent-3": MagicMock(),
        }

        result = transform_user_inputs(graph, all_agents)

        assert len(result) == 2
        assert {r.name for r in result} == {"Input 1", "Input 2"}

    def test_default_timeout_values(
        self,
        make_graph_node,
        make_graph_edge,
        make_workflow_graph,
    ):
        """Should use default timeout values when not specified."""
        user_input = make_graph_node("ui-1", "userInput", name="Input")
        agent = make_graph_node("agent-1", "agent", name="Agent1")

        edge = make_graph_edge(user_input, agent, EdgeSemantics.SEQUENTIAL)
        graph = make_workflow_graph(nodes=[user_input, agent], edges=[edge])

        result = transform_user_inputs(graph, {"agent-1": MagicMock()})

        assert len(result) == 1
        assert result[0].timeout_seconds == 300.0  # Default
        assert result[0].timeout_behavior == "error"  # Default

    def test_default_name_from_node_id(
        self,
        make_graph_node,
        make_graph_edge,
        make_workflow_graph,
    ):
        """Should generate name from node ID if not provided."""
        # Create node without name in config
        parsed = ParsedNode(
            id="ui-12345678-rest",
            type="userInput",
            position=(0.0, 0.0),
            data={"config": {}, "tabId": "tab1"},
        )
        user_input = GraphNode(
            id="ui-12345678-rest",
            type="userInput",
            name="",
            tab_id="tab1",
            data={"config": {}, "tabId": "tab1"},
            parsed_node=parsed,
        )

        agent = make_graph_node("agent-1", "agent", name="Agent1")

        edge = make_graph_edge(user_input, agent, EdgeSemantics.SEQUENTIAL)
        graph = make_workflow_graph(nodes=[user_input, agent], edges=[edge])

        result = transform_user_inputs(graph, {"agent-1": MagicMock()})

        assert len(result) == 1
        assert result[0].name == "user_input_ui-12345"


# =============================================================================
# Test transform_custom_nodes
# =============================================================================


class TestTransformCustomNodes:
    """Tests for transform_custom_nodes function.

    Note: The transform_custom_nodes function imports get_registry inside a try/except,
    so we test both with and without the registry available.
    """

    def _make_custom_node(
        self, node_id: str, unit_type: str, name: str, config: dict | None = None
    ) -> GraphNode:
        """Helper to create a custom node."""
        full_type = f"custom:{unit_type}"
        data = {"config": config or {}, "tabId": "tab1"}
        parsed = ParsedNode(
            id=node_id,
            type=full_type,
            position=(0.0, 0.0),
            data=data,
        )
        return GraphNode(
            id=node_id,
            type=full_type,
            name=name,
            tab_id="tab1",
            data=data,
            parsed_node=parsed,
        )

    def test_transform_custom_node_basic(
        self,
        make_workflow_graph,
    ):
        """Should transform a basic custom node."""
        custom_node = self._make_custom_node(
            "custom-1", "tools.web_search", "Web Search", {"query": "test query"}
        )
        graph = make_workflow_graph(nodes=[custom_node], edges=[])

        # Run without mocking - relies on ImportError fallback
        result = transform_custom_nodes(graph)

        assert len(result) == 1
        assert result[0].id == "custom-1"
        assert result[0].unit_id == "tools.web_search"
        assert result[0].name == "Web Search"
        assert result[0].config == {"query": "test query"}

    def test_custom_node_with_unit_id_override(
        self,
        make_workflow_graph,
    ):
        """Should use _unit_id from data if present."""
        data = {
            "_unit_id": "new.unit_id",
            "config": {},
            "tabId": "tab1",
        }
        parsed = ParsedNode(
            id="custom-1",
            type="custom:old_unit_id",
            position=(0.0, 0.0),
            data=data,
        )
        custom_node = GraphNode(
            id="custom-1",
            type="custom:old_unit_id",
            name="Test Node",
            tab_id="tab1",
            data=data,
            parsed_node=parsed,
        )

        graph = make_workflow_graph(nodes=[custom_node], edges=[])

        result = transform_custom_nodes(graph)

        assert len(result) == 1
        assert result[0].unit_id == "new.unit_id"

    def test_custom_node_with_connections(
        self,
        make_graph_node,
        make_graph_edge,
        make_workflow_graph,
    ):
        """Should capture input and output connections."""
        agent1 = make_graph_node("agent-1", "agent", name="Agent1")
        agent2 = make_graph_node("agent-2", "agent", name="Agent2")

        custom_node = self._make_custom_node("custom-1", "processor", "Processor")

        edge1 = make_graph_edge(
            agent1,
            custom_node,
            EdgeSemantics.SEQUENTIAL,
            source_handle="output",
            target_handle="data_in",
        )
        edge2 = make_graph_edge(
            custom_node,
            agent2,
            EdgeSemantics.SEQUENTIAL,
            source_handle="result",
            target_handle="input",
        )

        graph = make_workflow_graph(
            nodes=[agent1, custom_node, agent2],
            edges=[edge1, edge2],
        )

        result = transform_custom_nodes(graph)

        assert len(result) == 1
        assert result[0].input_connections == {"data_in": ["agent-1"]}
        assert result[0].output_connections == {"result": ["agent-2"]}

    def test_custom_node_with_multiple_connections(
        self,
        make_graph_node,
        make_workflow_graph,
    ):
        """Should handle multiple connections per port."""
        source1 = make_graph_node("source-1", "agent", name="Source1")
        source2 = make_graph_node("source-2", "agent", name="Source2")

        custom_node = self._make_custom_node("custom-1", "merger", "Merger")

        # Create edges manually to same handle
        edge1 = GraphEdge(
            source_id=source1.id,
            target_id=custom_node.id,
            semantics=EdgeSemantics.SEQUENTIAL,
            target_handle="input",
        )
        source1.outgoing.append(edge1)
        custom_node.incoming.append(edge1)

        edge2 = GraphEdge(
            source_id=source2.id,
            target_id=custom_node.id,
            semantics=EdgeSemantics.SEQUENTIAL,
            target_handle="input",
        )
        source2.outgoing.append(edge2)
        custom_node.incoming.append(edge2)

        graph = make_workflow_graph(
            nodes=[source1, source2, custom_node],
            edges=[edge1, edge2],
        )

        result = transform_custom_nodes(graph)

        assert len(result) == 1
        assert len(result[0].input_connections["input"]) == 2
        assert "source-1" in result[0].input_connections["input"]
        assert "source-2" in result[0].input_connections["input"]

    def test_custom_node_with_registry(
        self,
        make_workflow_graph,
    ):
        """Should extract FlowUnit properties from registry."""
        custom_node = self._make_custom_node(
            "custom-1", "tools.output_sink", "Output Sink"
        )
        graph = make_workflow_graph(nodes=[custom_node], edges=[])

        # Create mock FlowUnit class
        mock_flow_unit = MagicMock()
        mock_flow_unit.OUTPUT_NODE = True
        mock_flow_unit.ALWAYS_EXECUTE = True

        mock_port = MagicMock()
        mock_port.id = "lazy_port"
        mock_port.lazy = True

        mock_ui_schema = MagicMock()
        mock_ui_schema.inputs = [mock_port]
        mock_flow_unit.setup_interface.return_value = mock_ui_schema

        mock_registry = MagicMock()
        mock_registry.get_unit.return_value = mock_flow_unit

        mock_extensions = MagicMock()
        mock_extensions.get_registry.return_value = mock_registry

        with patch.dict("sys.modules", {"adkflow_runner.extensions": mock_extensions}):
            # Need to reimport to pick up the mock
            from importlib import reload
            import adkflow_runner.compiler.node_transforms as nt

            reload(nt)

            result = nt.transform_custom_nodes(graph)

        assert len(result) == 1
        assert result[0].output_node is True
        assert result[0].always_execute is True
        assert result[0].lazy_inputs == ["lazy_port"]

    def test_custom_node_registry_error(
        self,
        make_workflow_graph,
    ):
        """Should handle registry errors gracefully."""
        custom_node = self._make_custom_node("custom-1", "tools.broken", "Broken")
        graph = make_workflow_graph(nodes=[custom_node], edges=[])

        mock_flow_unit = MagicMock()
        mock_flow_unit.OUTPUT_NODE = False
        mock_flow_unit.ALWAYS_EXECUTE = False
        mock_flow_unit.setup_interface.side_effect = Exception("Schema error")

        mock_registry = MagicMock()
        mock_registry.get_unit.return_value = mock_flow_unit

        mock_extensions = MagicMock()
        mock_extensions.get_registry.return_value = mock_registry

        with patch.dict("sys.modules", {"adkflow_runner.extensions": mock_extensions}):
            from importlib import reload
            import adkflow_runner.compiler.node_transforms as nt

            reload(nt)

            # Should not raise
            result = nt.transform_custom_nodes(graph)

        assert len(result) == 1
        assert result[0].lazy_inputs == []  # Default fallback

    def test_skip_non_custom_nodes(
        self,
        make_graph_node,
        make_workflow_graph,
    ):
        """Should only process custom: prefixed nodes."""
        agent = make_graph_node("agent-1", "agent", name="Agent1")
        prompt = make_graph_node("prompt-1", "prompt", name="Prompt1")

        graph = make_workflow_graph(nodes=[agent, prompt], edges=[])

        result = transform_custom_nodes(graph)

        assert len(result) == 0

    def test_custom_node_default_handles(
        self,
        make_graph_node,
        make_workflow_graph,
    ):
        """Should use default handle names when not specified."""
        agent = make_graph_node("agent-1", "agent", name="Agent1")

        custom_node = self._make_custom_node("custom-1", "processor", "Processor")

        # Edge without handles
        edge = GraphEdge(
            source_id=agent.id,
            target_id=custom_node.id,
            semantics=EdgeSemantics.SEQUENTIAL,
            source_handle=None,
            target_handle=None,
        )
        agent.outgoing.append(edge)
        custom_node.incoming.append(edge)

        graph = make_workflow_graph(
            nodes=[agent, custom_node],
            edges=[edge],
        )

        result = transform_custom_nodes(graph)

        assert len(result) == 1
        # Should use "input" as default target handle
        assert result[0].input_connections == {"input": ["agent-1"]}

    def test_custom_node_fallback_name(
        self,
        make_workflow_graph,
    ):
        """Should use unit_id as fallback name."""
        data = {"config": {}, "tabId": "tab1"}
        parsed = ParsedNode(
            id="custom-1",
            type="custom:tools.processor",
            position=(0.0, 0.0),
            data=data,
        )
        custom_node = GraphNode(
            id="custom-1",
            type="custom:tools.processor",
            name="",  # Empty name
            tab_id="tab1",
            data=data,
            parsed_node=parsed,
        )

        graph = make_workflow_graph(nodes=[custom_node], edges=[])

        result = transform_custom_nodes(graph)

        assert len(result) == 1
        assert result[0].name == "tools.processor"  # Falls back to unit_id
