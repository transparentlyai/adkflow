"""Tests for IRTransformer._transform_agent method.

Tests the transformation of individual agent nodes into AgentIR.
"""

from __future__ import annotations

from unittest.mock import patch


from adkflow_runner.compiler.loader import LoadedProject
from adkflow_runner.compiler.transformer import IRTransformer


class TestTransformAgent:
    """Tests for the _transform_agent method."""

    def test_transform_basic_llm_agent(
        self,
        transformer: IRTransformer,
        mock_project: LoadedProject,
        make_graph_node_with_config,
        make_workflow_graph_for_transformer,
    ):
        """Should transform a basic LLM agent."""
        agent = make_graph_node_with_config(
            "agent-1",
            "agent",
            name="TestAgent",
            type="llm",
            model="gemini-2.0-flash",
            temperature=0.5,
        )

        graph = make_workflow_graph_for_transformer(nodes=[agent], edges=[])

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
        make_graph_node_with_config,
        make_workflow_graph_for_transformer,
    ):
        """Should transform agent with planner config."""
        agent = make_graph_node_with_config(
            "agent-1",
            "agent",
            name="PlannerAgent",
            planner_type="react",
            thinking_budget=100,
            include_thoughts=True,
        )

        graph = make_workflow_graph_for_transformer(nodes=[agent], edges=[])

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
        make_graph_node_with_config,
        make_workflow_graph_for_transformer,
    ):
        """Should transform agent with nested planner config."""
        agent = make_graph_node_with_config(
            "agent-1",
            "agent",
            name="PlannerAgent",
            planner={
                "type": "builtin",
                "thinking_budget": 50,
                "include_thoughts": False,
            },
        )

        graph = make_workflow_graph_for_transformer(nodes=[agent], edges=[])

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
        make_graph_node_with_config,
        make_workflow_graph_for_transformer,
    ):
        """Should transform agent with code executor config."""
        agent = make_graph_node_with_config(
            "agent-1",
            "agent",
            name="CodeAgent",
            code_executor_enabled=True,
            code_executor_stateful=True,
            code_executor_error_retry=5,
        )

        graph = make_workflow_graph_for_transformer(nodes=[agent], edges=[])

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
        make_graph_node_with_config,
        make_workflow_graph_for_transformer,
    ):
        """Should transform agent with HTTP options config."""
        agent = make_graph_node_with_config(
            "agent-1",
            "agent",
            name="HttpAgent",
            http_timeout=60000,
            http_max_retries=5,
            http_retry_delay=2000,
            http_backoff_multiplier=3.0,
        )

        graph = make_workflow_graph_for_transformer(nodes=[agent], edges=[])

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
        make_graph_node_with_config,
        make_workflow_graph_for_transformer,
    ):
        """Should transform agent with callback config."""
        agent = make_graph_node_with_config(
            "agent-1",
            "agent",
            name="CallbackAgent",
            before_model_callback="callbacks/before_model.py",
            after_model_callback="callbacks/after_model.py",
            before_tool_callback="callbacks/before_tool.py",
            after_tool_callback="callbacks/after_tool.py",
        )

        graph = make_workflow_graph_for_transformer(nodes=[agent], edges=[])

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

        # Callbacks are now wrapped in CallbackSourceIR
        assert agent_ir.callbacks.before_model is not None
        assert agent_ir.callbacks.before_model.file_path == "callbacks/before_model.py"
        assert agent_ir.callbacks.after_model is not None
        assert agent_ir.callbacks.after_model.file_path == "callbacks/after_model.py"
        assert agent_ir.callbacks.before_tool is not None
        assert agent_ir.callbacks.before_tool.file_path == "callbacks/before_tool.py"
        assert agent_ir.callbacks.after_tool is not None
        assert agent_ir.callbacks.after_tool.file_path == "callbacks/after_tool.py"

    def test_transform_agent_with_output_config(
        self,
        transformer: IRTransformer,
        mock_project: LoadedProject,
        make_graph_node_with_config,
        make_workflow_graph_for_transformer,
    ):
        """Should transform agent with output config."""
        agent = make_graph_node_with_config(
            "agent-1",
            "agent",
            name="OutputAgent",
            output_key="response",
            output_schema='{"type": "object"}',
            input_schema='{"type": "string"}',
        )

        graph = make_workflow_graph_for_transformer(nodes=[agent], edges=[])

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
        assert agent_ir.output_schema is not None
        assert agent_ir.output_schema.file_path == '{"type": "object"}'
        assert agent_ir.input_schema is not None
        assert agent_ir.input_schema.file_path == '{"type": "string"}'

    def test_transform_sequential_agent(
        self,
        transformer: IRTransformer,
        mock_project: LoadedProject,
        make_graph_node_with_config,
        make_workflow_graph_for_transformer,
    ):
        """Should transform sequential agent type."""
        agent = make_graph_node_with_config(
            "agent-1", "agent", name="SeqAgent", type="sequential"
        )

        graph = make_workflow_graph_for_transformer(nodes=[agent], edges=[])

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
        make_graph_node_with_config,
        make_workflow_graph_for_transformer,
    ):
        """Should transform parallel agent type."""
        agent = make_graph_node_with_config(
            "agent-1", "agent", name="ParAgent", type="parallel"
        )

        graph = make_workflow_graph_for_transformer(nodes=[agent], edges=[])

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
        make_graph_node_with_config,
        make_workflow_graph_for_transformer,
    ):
        """Should transform loop agent type."""
        agent = make_graph_node_with_config(
            "agent-1", "agent", name="LoopAgent", type="loop", max_iterations=10
        )

        graph = make_workflow_graph_for_transformer(nodes=[agent], edges=[])

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
        make_graph_node_with_config,
        make_workflow_graph_for_transformer,
    ):
        """Should transform agent with transfer controls."""
        agent = make_graph_node_with_config(
            "agent-1",
            "agent",
            name="TransferAgent",
            disallow_transfer_to_parent=True,
            disallow_transfer_to_peers=True,
        )

        graph = make_workflow_graph_for_transformer(nodes=[agent], edges=[])

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
