"""Tests for WorkflowRunner._execute method.

Tests the internal _execute method with mocked ADK components.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from adkflow_runner.ir import (
    AgentIR,
    ConnectionSource,
    CustomNodeIR,
    UserInputIR,
    WorkflowIR,
)
from adkflow_runner.runner.types import RunConfig
from adkflow_runner.runner.workflow_runner import WorkflowRunner


@pytest.fixture
def mock_hooks():
    """Create a mock HooksIntegration that returns default values."""
    hooks = MagicMock()
    hooks.executor = MagicMock()
    hooks.executor.has_hooks.return_value = False
    return hooks


@pytest.fixture
def mock_adk():
    """Mock all ADK dependencies."""
    with (
        patch("adkflow_runner.runner.workflow_runner.Runner") as mock_runner_cls,
        patch(
            "adkflow_runner.runner.workflow_runner.InMemorySessionService"
        ) as mock_session_cls,
        patch(
            "adkflow_runner.runner.workflow_runner.configure_logging"
        ) as mock_logging,
        patch("adkflow_runner.runner.workflow_runner.Logger") as mock_logger,
        patch("adkflow_runner.runner.workflow_runner.setup_tracing") as mock_tracing,
        patch("adkflow_runner.runner.workflow_runner.load_dotenv") as mock_load_dotenv,
    ):
        # Setup session mock
        mock_session = MagicMock()
        mock_session.id = "session-123"
        mock_session_service = MagicMock()
        mock_session_service.create_session = AsyncMock(return_value=mock_session)
        mock_session_cls.return_value = mock_session_service

        # Setup runner mock
        mock_runner = MagicMock()
        mock_runner.run_async = AsyncMock()
        mock_runner_cls.return_value = mock_runner

        yield {
            "runner_cls": mock_runner_cls,
            "runner": mock_runner,
            "session_cls": mock_session_cls,
            "session_service": mock_session_service,
            "session": mock_session,
            "logging": mock_logging,
            "logger": mock_logger,
            "tracing": mock_tracing,
            "load_dotenv": mock_load_dotenv,
        }


@pytest.fixture
def simple_ir():
    """Create a simple WorkflowIR for testing."""
    agent = AgentIR(
        id="a1",
        name="TestAgent",
        type="llm",
        model="gemini-2.0-flash",
        instruction="Test instruction",
    )
    return WorkflowIR(
        root_agent=agent,
        all_agents={"a1": agent},
        custom_nodes=[],
        user_inputs=[],
    )


class TestWorkflowRunnerExecute:
    """Tests for WorkflowRunner._execute method."""

    @pytest.mark.asyncio
    async def test_execute_simple_workflow(
        self, tmp_path, mock_adk, simple_ir, mock_hooks
    ):
        """Execute a simple workflow with mocked ADK."""
        # Mock agent factory and runner
        with (
            patch(
                "adkflow_runner.runner.workflow_runner.AgentFactory"
            ) as mock_factory_cls,
            patch(
                "adkflow_runner.runner.workflow_runner.process_adk_event"
            ) as mock_process_event,
        ):
            mock_agent = MagicMock()
            mock_factory = MagicMock()
            mock_factory.create_from_workflow.return_value = mock_agent
            mock_factory_cls.return_value = mock_factory

            # Mock ADK event stream
            mock_part = MagicMock()
            mock_part.text = "Hello, world!"
            mock_content = MagicMock()
            mock_content.parts = [mock_part]
            mock_event = MagicMock()
            mock_event.content = mock_content

            async def mock_event_stream(*args, **kwargs):
                yield mock_event

            mock_adk["runner"].run_async = mock_event_stream
            mock_process_event.return_value = "TestAgent"

            runner = WorkflowRunner()
            config = RunConfig(
                project_path=tmp_path,
                input_data={"prompt": "Test prompt"},
            )
            emit = AsyncMock()

            output = await runner._execute(
                simple_ir, config, emit, "run-123", mock_hooks
            )

            assert output == "Hello, world!"
            # Verify factory was called with correct args (runtime_tools may be empty)
            mock_factory.create_from_workflow.assert_called_once()
            call_args = mock_factory.create_from_workflow.call_args
            assert call_args[0][0] == simple_ir
            assert call_args[1]["emit"] == emit
            assert call_args[1]["hooks"] == mock_hooks

    @pytest.mark.asyncio
    async def test_execute_with_default_prompt(
        self, tmp_path, mock_adk, simple_ir, mock_hooks
    ):
        """Execute uses default prompt if none provided."""
        with (
            patch(
                "adkflow_runner.runner.workflow_runner.AgentFactory"
            ) as mock_factory_cls,
        ):
            mock_agent = MagicMock()
            mock_factory = MagicMock()
            mock_factory.create_from_workflow.return_value = mock_agent
            mock_factory_cls.return_value = mock_factory

            async def mock_event_stream(*args, **kwargs):
                # Verify default prompt is used
                assert "Execute the workflow" in kwargs["new_message"].parts[0].text
                return
                yield  # Make it an async generator

            mock_adk["runner"].run_async = mock_event_stream

            runner = WorkflowRunner()
            config = RunConfig(
                project_path=tmp_path,
                input_data={},  # No prompt
            )
            emit = AsyncMock()

            await runner._execute(simple_ir, config, emit, "run-123", mock_hooks)

    @pytest.mark.asyncio
    async def test_execute_with_trigger_user_inputs(
        self, tmp_path, mock_adk, mock_hooks
    ):
        """Execute handles trigger user inputs."""
        user_input = UserInputIR(
            id="ui1",
            name="User Input",
            variable_name="user_query",
            is_trigger=True,
        )
        agent = AgentIR(id="a1", name="Agent", type="llm", model="gemini-2.0-flash")
        ir = WorkflowIR(
            root_agent=agent,
            all_agents={"a1": agent},
            user_inputs=[user_input],
        )

        with (
            patch(
                "adkflow_runner.runner.workflow_runner.handle_user_input"
            ) as mock_handle_input,
            patch(
                "adkflow_runner.runner.workflow_runner.AgentFactory"
            ) as mock_factory_cls,
        ):
            mock_handle_input.return_value = "User response"
            mock_factory = MagicMock()
            mock_factory.create_from_workflow.return_value = MagicMock()
            mock_factory_cls.return_value = mock_factory

            async def mock_event_stream(*args, **kwargs):
                # Verify trigger input is in prompt
                message_text = kwargs["new_message"].parts[0].text
                assert "user_query: User response" in message_text
                return
                yield

            mock_adk["runner"].run_async = mock_event_stream

            runner = WorkflowRunner()
            config = RunConfig(project_path=tmp_path, input_data={})
            emit = AsyncMock()

            await runner._execute(ir, config, emit, "run-123", mock_hooks)
            mock_handle_input.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_execute_with_custom_nodes(self, tmp_path, mock_adk, mock_hooks):
        """Execute handles custom nodes."""
        custom_node = CustomNodeIR(
            id="custom1",
            unit_id="test.unit",
            name="Test Node",
            source_node_id="custom1",
            config={},
        )
        agent = AgentIR(id="a1", name="Agent", type="llm", model="gemini-2.0-flash")
        ir = WorkflowIR(
            root_agent=agent,
            all_agents={"a1": agent},
            custom_nodes=[custom_node],
        )

        with (
            patch(
                "adkflow_runner.runner.workflow_runner.execute_custom_nodes_graph"
            ) as mock_execute_custom,
            patch(
                "adkflow_runner.runner.workflow_runner.AgentFactory"
            ) as mock_factory_cls,
        ):
            mock_execute_custom.return_value = {"custom1": {"output": "Custom output"}}
            mock_factory = MagicMock()
            mock_factory.create_from_workflow.return_value = MagicMock()
            mock_factory_cls.return_value = mock_factory

            async def mock_event_stream(*args, **kwargs):
                # Verify custom node output is in prompt
                message_text = kwargs["new_message"].parts[0].text
                assert "[custom1.output]: Custom output" in message_text
                return
                yield

            mock_adk["runner"].run_async = mock_event_stream

            runner = WorkflowRunner()
            config = RunConfig(project_path=tmp_path, input_data={})
            emit = AsyncMock()

            await runner._execute(ir, config, emit, "run-123", mock_hooks)
            mock_execute_custom.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_execute_with_context_vars(self, tmp_path, mock_adk, mock_hooks):
        """Execute resolves context variables from custom nodes."""
        custom_node = CustomNodeIR(
            id="custom1",
            unit_id="test.unit",
            name="Context Provider",
            source_node_id="custom1",
            config={},
        )
        agent = AgentIR(
            id="a1",
            name="Agent",
            type="llm",
            model="gemini-2.0-flash",
            context_var_sources=["custom1"],
        )
        ir = WorkflowIR(
            root_agent=agent,
            all_agents={"a1": agent},
            custom_nodes=[custom_node],
        )

        with (
            patch(
                "adkflow_runner.runner.workflow_runner.execute_custom_nodes_graph"
            ) as mock_execute_custom,
            patch(
                "adkflow_runner.runner.workflow_runner.merge_context_vars"
            ) as mock_merge_vars,
            patch(
                "adkflow_runner.runner.workflow_runner.AgentFactory"
            ) as mock_factory_cls,
        ):
            # Custom node outputs context variables
            mock_execute_custom.return_value = {
                "custom1": {"output": {"var1": "value1", "var2": "value2"}}
            }
            mock_merge_vars.return_value = {"var1": "value1", "var2": "value2"}

            mock_factory = MagicMock()
            mock_factory.create_from_workflow.return_value = MagicMock()
            mock_factory_cls.return_value = mock_factory

            async def mock_event_stream(*args, **kwargs):
                return
                yield

            mock_adk["runner"].run_async = mock_event_stream

            runner = WorkflowRunner()
            config = RunConfig(project_path=tmp_path, input_data={})
            emit = AsyncMock()

            await runner._execute(ir, config, emit, "run-123", mock_hooks)

            # Verify merge_context_vars was called
            mock_merge_vars.assert_called_once()
            # Verify agent context_vars were set
            assert agent.context_vars == {"var1": "value1", "var2": "value2"}

    @pytest.mark.asyncio
    async def test_execute_with_pause_user_inputs(self, tmp_path, mock_adk, mock_hooks):
        """Execute handles pause user inputs after agent execution."""
        user_input = UserInputIR(
            id="ui1",
            name="Review Input",
            variable_name="review",
            is_trigger=False,
        )
        agent = AgentIR(id="a1", name="Agent", type="llm", model="gemini-2.0-flash")
        ir = WorkflowIR(
            root_agent=agent,
            all_agents={"a1": agent},
            user_inputs=[user_input],
        )

        with (
            patch(
                "adkflow_runner.runner.workflow_runner.handle_user_input"
            ) as mock_handle_input,
            patch(
                "adkflow_runner.runner.workflow_runner.execute_downstream_agents"
            ) as mock_downstream,
            patch(
                "adkflow_runner.runner.workflow_runner.AgentFactory"
            ) as mock_factory_cls,
        ):
            mock_handle_input.return_value = "User feedback"
            mock_downstream.return_value = "Downstream output"

            mock_factory = MagicMock()
            mock_factory.create_from_workflow.return_value = MagicMock()
            mock_factory_cls.return_value = mock_factory

            # Mock first agent execution
            mock_part = MagicMock()
            mock_part.text = "Initial output"
            mock_content = MagicMock()
            mock_content.parts = [mock_part]
            mock_event = MagicMock()
            mock_event.content = mock_content

            async def mock_event_stream(*args, **kwargs):
                yield mock_event

            mock_adk["runner"].run_async = mock_event_stream

            with patch(
                "adkflow_runner.runner.workflow_runner.process_adk_event",
                new_callable=AsyncMock,
                return_value="Agent",
            ):
                runner = WorkflowRunner()
                config = RunConfig(project_path=tmp_path, input_data={})
                emit = AsyncMock()

                output = await runner._execute(ir, config, emit, "run-123", mock_hooks)

                # Verify pause input was handled
                mock_handle_input.assert_awaited_once()
                # Verify downstream agents were executed
                mock_downstream.assert_awaited_once()
                # Final output should be from downstream
                assert output == "Downstream output"

    @pytest.mark.asyncio
    async def test_execute_pause_input_no_downstream(
        self, tmp_path, mock_adk, mock_hooks
    ):
        """Execute handles pause user input with no downstream agents."""
        user_input = UserInputIR(
            id="ui1",
            name="Final Input",
            variable_name="final_input",
            is_trigger=False,
        )
        agent = AgentIR(id="a1", name="Agent", type="llm", model="gemini-2.0-flash")
        ir = WorkflowIR(
            root_agent=agent,
            all_agents={"a1": agent},
            user_inputs=[user_input],
        )

        with (
            patch(
                "adkflow_runner.runner.workflow_runner.handle_user_input"
            ) as mock_handle_input,
            patch(
                "adkflow_runner.runner.workflow_runner.execute_downstream_agents"
            ) as mock_downstream,
            patch(
                "adkflow_runner.runner.workflow_runner.AgentFactory"
            ) as mock_factory_cls,
        ):
            mock_handle_input.return_value = "Final user input"
            # No downstream output - this is the edge case
            mock_downstream.return_value = None

            mock_factory = MagicMock()
            mock_factory.create_from_workflow.return_value = MagicMock()
            mock_factory_cls.return_value = mock_factory

            # Mock first agent execution
            mock_part = MagicMock()
            mock_part.text = "Initial output"
            mock_content = MagicMock()
            mock_content.parts = [mock_part]
            mock_event = MagicMock()
            mock_event.content = mock_content

            async def mock_event_stream(*args, **kwargs):
                yield mock_event

            mock_adk["runner"].run_async = mock_event_stream

            with patch(
                "adkflow_runner.runner.workflow_runner.process_adk_event",
                new_callable=AsyncMock,
                return_value="Agent",
            ):
                runner = WorkflowRunner()
                config = RunConfig(project_path=tmp_path, input_data={})
                emit = AsyncMock()

                output = await runner._execute(ir, config, emit, "run-123", mock_hooks)

                # Final output should be the user input itself (no downstream)
                assert output == "Final user input"

    @pytest.mark.asyncio
    async def test_execute_writes_output_files(self, tmp_path, mock_adk, mock_hooks):
        """Execute writes output files after completion."""
        from adkflow_runner.ir import OutputFileIR

        output_file = OutputFileIR(
            name="output",
            file_path="output.txt",
            agent_id="a1",
        )
        agent = AgentIR(id="a1", name="Agent", type="llm", model="gemini-2.0-flash")
        ir = WorkflowIR(
            root_agent=agent,
            all_agents={"a1": agent},
            output_files=[output_file],
        )

        with (
            patch(
                "adkflow_runner.runner.workflow_runner.write_output_files"
            ) as mock_write,
            patch(
                "adkflow_runner.runner.workflow_runner.AgentFactory"
            ) as mock_factory_cls,
        ):
            mock_write.return_value = None  # Async function returns None
            mock_factory = MagicMock()
            mock_factory.create_from_workflow.return_value = MagicMock()
            mock_factory_cls.return_value = mock_factory

            async def mock_event_stream(*args, **kwargs):
                return
                yield

            mock_adk["runner"].run_async = mock_event_stream

            runner = WorkflowRunner()
            config = RunConfig(project_path=tmp_path, input_data={})
            emit = AsyncMock()

            await runner._execute(ir, config, emit, "run-123", mock_hooks)

            # Verify write_output_files was called
            mock_write.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_execute_reraises_with_friendly_error(
        self, tmp_path, mock_adk, mock_hooks
    ):
        """Execute re-raises exceptions with friendly error messages."""
        agent = AgentIR(id="a1", name="Agent", type="llm", model="gemini-2.0-flash")
        ir = WorkflowIR(root_agent=agent, all_agents={"a1": agent})

        with (
            patch(
                "adkflow_runner.runner.workflow_runner.AgentFactory"
            ) as mock_factory_cls,
            patch(
                "adkflow_runner.runner.workflow_runner.format_error"
            ) as mock_format_error,
        ):
            mock_factory = MagicMock()
            mock_factory.create_from_workflow.return_value = MagicMock()
            mock_factory_cls.return_value = mock_factory

            async def mock_event_stream(*args, **kwargs):
                raise RuntimeError("API key not valid")

            mock_adk["runner"].run_async = mock_event_stream
            mock_format_error.return_value = "Friendly error message"

            runner = WorkflowRunner()
            config = RunConfig(project_path=tmp_path, input_data={})
            emit = AsyncMock()

            with pytest.raises(RuntimeError, match="Friendly error message"):
                await runner._execute(ir, config, emit, "run-123", mock_hooks)

            mock_format_error.assert_called_once()

    @pytest.mark.asyncio
    async def test_execute_with_post_agent_custom_nodes_includes_finish_reason(
        self, tmp_path, mock_adk, mock_hooks
    ):
        """Execute includes finish-reason in agent outputs passed to post-agent custom nodes."""
        custom_node = CustomNodeIR(
            id="monitor1",
            unit_id="monitor.unit",
            name="Monitor Node",
            source_node_id="monitor1",
            config={},
            input_connections={
                "agent_output": [ConnectionSource(node_id="a1", handle="output")]
            },
            output_connections={},
        )
        agent = AgentIR(id="a1", name="Agent", type="llm", model="gemini-2.0-flash")
        ir = WorkflowIR(
            root_agent=agent,
            all_agents={"a1": agent},
            custom_nodes=[custom_node],
        )

        with (
            patch(
                "adkflow_runner.runner.workflow_runner.AgentFactory"
            ) as mock_factory_cls,
            patch(
                "adkflow_runner.runner.workflow_runner.partition_custom_nodes"
            ) as mock_partition,
            patch(
                "adkflow_runner.runner.workflow_runner.execute_custom_nodes_graph"
            ) as mock_execute_custom,
        ):
            # Mock factory with finish reason support
            mock_factory = MagicMock()
            mock_factory.create_from_workflow.return_value = MagicMock()
            mock_factory.get_finish_reason.return_value = {
                "name": "STOP",
                "description": "Natural completion",
            }
            mock_factory_cls.return_value = mock_factory

            # Mock partition to return post-agent nodes
            mock_partition.return_value = (
                [],
                ["monitor1"],
            )  # No pre-agent, one post-agent

            # Mock custom node execution
            mock_execute_custom.return_value = {"monitor1": {"result": "processed"}}

            # Mock agent execution
            mock_part = MagicMock()
            mock_part.text = "Agent output"
            mock_content = MagicMock()
            mock_content.parts = [mock_part]
            mock_event = MagicMock()
            mock_event.content = mock_content

            async def mock_event_stream(*args, **kwargs):
                yield mock_event

            mock_adk["runner"].run_async = mock_event_stream

            with patch(
                "adkflow_runner.runner.workflow_runner.process_adk_event",
                new_callable=AsyncMock,
                return_value="Agent",
            ):
                runner = WorkflowRunner()
                config = RunConfig(project_path=tmp_path, input_data={})
                emit = AsyncMock()

                await runner._execute(ir, config, emit, "run-123", mock_hooks)

                # Verify execute_custom_nodes_graph was called with external_results
                assert mock_execute_custom.call_count == 1
                call_kwargs = mock_execute_custom.call_args[1]

                # Verify external_results includes both output and finish-reason
                external_results = call_kwargs["external_results"]
                assert "a1" in external_results
                assert external_results["a1"]["output"] == "Agent output"
                assert external_results["a1"]["finish-reason"] == {
                    "name": "STOP",
                    "description": "Natural completion",
                }

                # Verify get_finish_reason was called for the agent
                mock_factory.get_finish_reason.assert_called_with("a1")
