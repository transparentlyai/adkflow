"""Tests for execution engine functions."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from adkflow_runner.runner.execution_engine import (
    format_error,
    execute_custom_nodes_graph,
    write_output_files,
    process_adk_event,
    extract_agent_monitor_connections,
    MonitorConnection,
)
from adkflow_runner.runner.types import EventType, RunConfig
from adkflow_runner.ir import (
    WorkflowIR,
    AgentIR,
    OutputFileIR,
    CustomNodeIR,
    ConnectionSource,
)


class TestFormatError:
    """Tests for format_error function."""

    def test_credential_error_missing_key(self, tmp_path):
        """Format missing API key error."""
        error = "Missing key inputs argument"
        result = format_error(error, tmp_path)

        assert "API credentials not configured" in result
        assert "GOOGLE_API_KEY" in result
        assert str(tmp_path) in result

    def test_credential_error_invalid_key(self, tmp_path):
        """Format invalid API key error."""
        error = "API key not valid. Please check and try again."
        result = format_error(error, tmp_path)

        assert "API credentials not configured" in result
        assert "aistudio.google.com" in result

    def test_credential_error_default_credentials(self, tmp_path):
        """Format DefaultCredentialsError."""
        error = "DefaultCredentialsError: Could not automatically determine credentials"
        result = format_error(error, tmp_path)

        assert "API credentials not configured" in result
        assert "GOOGLE_GENAI_USE_VERTEXAI" in result

    def test_credential_error_unauthorized(self, tmp_path):
        """Format unauthorized error."""
        error = "unauthorized: permission denied for this resource"
        result = format_error(error, tmp_path)

        assert "API credentials not configured" in result

    def test_non_credential_error_unchanged(self, tmp_path):
        """Non-credential errors pass through unchanged."""
        error = "Some other error message"
        result = format_error(error, tmp_path)

        assert result == error

    def test_runtime_error_unchanged(self, tmp_path):
        """Runtime errors without credential keywords pass through."""
        error = "Node 'agent_1' failed to execute"
        result = format_error(error, tmp_path)

        assert result == error

    def test_credential_patterns_case_insensitive(self, tmp_path):
        """Credential patterns match case-insensitively."""
        error = "GOOGLE_API_KEY environment variable not set"
        result = format_error(error, tmp_path)

        assert "API credentials not configured" in result


class TestExecuteCustomNodesGraph:
    """Tests for execute_custom_nodes_graph function."""

    @pytest.mark.asyncio
    async def test_returns_empty_when_no_custom_nodes(self, tmp_path):
        """Returns empty dict when workflow has no custom nodes."""
        ir = WorkflowIR(
            root_agent=AgentIR(
                id="a1", name="Agent", type="llm", model="gemini-2.0-flash"
            ),
            all_agents={
                "a1": AgentIR(
                    id="a1", name="Agent", type="llm", model="gemini-2.0-flash"
                )
            },
            custom_nodes=[],  # No custom nodes
        )

        config = RunConfig(project_path=tmp_path)
        emit = AsyncMock()

        result = await execute_custom_nodes_graph(
            ir=ir,
            config=config,
            emit=emit,
            session_state={},
            run_id="test-run",
        )

        assert result == {}

    @pytest.mark.asyncio
    async def test_executes_custom_nodes_with_graph_executor(self, tmp_path):
        """Executes custom nodes using GraphExecutor."""
        from adkflow_runner.ir import CustomNodeIR

        custom_node = CustomNodeIR(
            id="custom_1",
            unit_id="test.unit",
            name="Test Unit",
            source_node_id="custom_1_src",
            config={"value": 42},
            input_connections={},
            output_connections={},
        )

        ir = WorkflowIR(
            root_agent=AgentIR(
                id="a1", name="Agent", type="llm", model="gemini-2.0-flash"
            ),
            all_agents={
                "a1": AgentIR(
                    id="a1", name="Agent", type="llm", model="gemini-2.0-flash"
                )
            },
            custom_nodes=[custom_node],
        )

        config = RunConfig(project_path=tmp_path)
        emit = AsyncMock()

        with (
            patch(
                "adkflow_runner.runner.execution_engine.GraphBuilder"
            ) as mock_builder,
            patch(
                "adkflow_runner.runner.execution_engine.GraphExecutor"
            ) as mock_executor_cls,
        ):
            mock_graph = MagicMock()
            mock_builder.return_value.build.return_value = mock_graph

            mock_executor = MagicMock()
            mock_executor.execute = AsyncMock(
                return_value={"custom_1": {"output": "result"}}
            )
            mock_executor_cls.return_value = mock_executor

            result = await execute_custom_nodes_graph(
                ir=ir,
                config=config,
                emit=emit,
                session_state={},
                run_id="test-run",
            )

            # Verify build was called with correct IR and optional custom_node_ids
            mock_builder.return_value.build.assert_called_once()
            call_args = mock_builder.return_value.build.call_args
            assert call_args[0][0] == ir  # First positional arg is the IR
            mock_executor.execute.assert_called_once()
            assert result == {"custom_1": {"output": "result"}}


class TestWriteOutputFiles:
    """Tests for write_output_files function."""

    @pytest.mark.asyncio
    async def test_writes_output_to_file(self, tmp_path):
        """Writes output to configured file path."""
        output_file = OutputFileIR(name="output", file_path="output.txt", agent_id="a1")
        ir = WorkflowIR(
            root_agent=AgentIR(
                id="a1", name="Agent", type="llm", model="gemini-2.0-flash"
            ),
            all_agents={},
            output_files=[output_file],
        )

        emit = AsyncMock()
        await write_output_files(ir, "Hello, World!", tmp_path, emit)

        output_path = tmp_path / "output.txt"
        assert output_path.exists()
        assert output_path.read_text() == "Hello, World!"

    @pytest.mark.asyncio
    async def test_creates_parent_directories(self, tmp_path):
        """Creates parent directories if they don't exist."""
        output_file = OutputFileIR(
            name="nested_output", file_path="nested/dir/output.txt", agent_id="a1"
        )
        ir = WorkflowIR(
            root_agent=AgentIR(
                id="a1", name="Agent", type="llm", model="gemini-2.0-flash"
            ),
            all_agents={},
            output_files=[output_file],
        )

        emit = AsyncMock()
        await write_output_files(ir, "Test content", tmp_path, emit)

        output_path = tmp_path / "nested" / "dir" / "output.txt"
        assert output_path.exists()
        assert output_path.read_text() == "Test content"

    @pytest.mark.asyncio
    async def test_emits_agent_output_event(self, tmp_path):
        """Emits AGENT_OUTPUT event after writing."""
        output_file = OutputFileIR(name="output", file_path="output.txt", agent_id="a1")
        ir = WorkflowIR(
            root_agent=AgentIR(
                id="a1", name="Agent", type="llm", model="gemini-2.0-flash"
            ),
            all_agents={},
            output_files=[output_file],
        )

        emit = AsyncMock()
        await write_output_files(ir, "Content", tmp_path, emit)

        emit.assert_called_once()
        call_args = emit.call_args[0][0]
        assert call_args.type == EventType.AGENT_OUTPUT
        assert "output.txt" in call_args.data["output"]

    @pytest.mark.asyncio
    async def test_handles_write_error(self, tmp_path):
        """Emits ERROR event when write fails."""
        # Use an absolute path that doesn't exist and can't be created
        output_file = OutputFileIR(
            name="bad_output", file_path="/nonexistent/path/output.txt", agent_id="a1"
        )
        ir = WorkflowIR(
            root_agent=AgentIR(
                id="a1", name="Agent", type="llm", model="gemini-2.0-flash"
            ),
            all_agents={},
            output_files=[output_file],
        )

        emit = AsyncMock()
        await write_output_files(ir, "Content", tmp_path, emit)

        emit.assert_called_once()
        call_args = emit.call_args[0][0]
        assert call_args.type == EventType.ERROR
        assert "Failed to write" in call_args.data["error"]

    @pytest.mark.asyncio
    async def test_no_output_files(self, tmp_path):
        """Does nothing when no output files configured."""
        ir = WorkflowIR(
            root_agent=AgentIR(
                id="a1", name="Agent", type="llm", model="gemini-2.0-flash"
            ),
            all_agents={},
            output_files=[],
        )

        emit = AsyncMock()
        await write_output_files(ir, "Content", tmp_path, emit)

        emit.assert_not_called()


class TestProcessAdkEvent:
    """Tests for process_adk_event function."""

    @pytest.mark.asyncio
    async def test_emits_agent_output_for_final_response(self):
        """Emits AGENT_OUTPUT for final responses."""
        emit = AsyncMock()

        # Create mock event with content
        mock_part = MagicMock()
        mock_part.text = "Hello, world!"

        mock_content = MagicMock()
        mock_content.parts = [mock_part]

        mock_event = MagicMock()
        mock_event.author = "TestAgent"
        mock_event.content = mock_content
        mock_event.partial = False
        mock_event.is_final_response = MagicMock(return_value=True)

        result = await process_adk_event(mock_event, emit, None)

        assert result == "TestAgent"
        emit.assert_called_once()
        call_args = emit.call_args[0][0]
        assert call_args.type == EventType.AGENT_OUTPUT
        assert call_args.data["output"] == "Hello, world!"
        assert call_args.data["is_final"] is True

    @pytest.mark.asyncio
    async def test_skips_partial_events(self):
        """Skips partial events."""
        emit = AsyncMock()

        mock_part = MagicMock()
        mock_part.text = "Partial..."

        mock_content = MagicMock()
        mock_content.parts = [mock_part]

        mock_event = MagicMock()
        mock_event.author = "TestAgent"
        mock_event.content = mock_content
        mock_event.partial = True
        mock_event.is_final_response = MagicMock(return_value=False)

        await process_adk_event(mock_event, emit, None)

        emit.assert_not_called()

    @pytest.mark.asyncio
    async def test_skips_user_author(self):
        """Skips events from user author."""
        emit = AsyncMock()

        mock_part = MagicMock()
        mock_part.text = "User message"

        mock_content = MagicMock()
        mock_content.parts = [mock_part]

        mock_event = MagicMock()
        mock_event.author = "user"
        mock_event.content = mock_content
        mock_event.partial = False
        mock_event.is_final_response = MagicMock(return_value=True)

        result = await process_adk_event(mock_event, emit, "PreviousAgent")

        assert result == "PreviousAgent"  # Returns previous author
        emit.assert_not_called()

    @pytest.mark.asyncio
    async def test_handles_no_content(self):
        """Handles events without content."""
        emit = AsyncMock()

        mock_event = MagicMock()
        mock_event.author = "TestAgent"
        mock_event.content = None

        result = await process_adk_event(mock_event, emit, None)

        assert result == "TestAgent"
        emit.assert_not_called()

    @pytest.mark.asyncio
    async def test_handles_empty_parts(self):
        """Handles events with empty parts."""
        emit = AsyncMock()

        mock_content = MagicMock()
        mock_content.parts = []

        mock_event = MagicMock()
        mock_event.author = "TestAgent"
        mock_event.content = mock_content

        result = await process_adk_event(mock_event, emit, None)

        assert result == "TestAgent"
        emit.assert_not_called()

    @pytest.mark.asyncio
    async def test_returns_last_author_when_no_author(self):
        """Returns last_author when event has no author."""
        emit = AsyncMock()

        mock_event = MagicMock()
        mock_event.author = None
        mock_event.content = None

        result = await process_adk_event(mock_event, emit, "PreviousAgent")

        assert result == "PreviousAgent"

    @pytest.mark.asyncio
    async def test_concatenates_multiple_text_parts(self):
        """Concatenates text from multiple parts."""
        emit = AsyncMock()

        mock_part1 = MagicMock()
        mock_part1.text = "Hello, "
        mock_part2 = MagicMock()
        mock_part2.text = "world!"

        mock_content = MagicMock()
        mock_content.parts = [mock_part1, mock_part2]

        mock_event = MagicMock()
        mock_event.author = "TestAgent"
        mock_event.content = mock_content
        mock_event.partial = False
        mock_event.is_final_response = MagicMock(return_value=True)

        await process_adk_event(mock_event, emit, None)

        call_args = emit.call_args[0][0]
        assert call_args.data["output"] == "Hello, world!"

    @pytest.mark.asyncio
    async def test_handles_long_output(self):
        """Handles long output without truncation."""
        emit = AsyncMock()

        long_text = "x" * 3000
        mock_part = MagicMock()
        mock_part.text = long_text

        mock_content = MagicMock()
        mock_content.parts = [mock_part]

        mock_event = MagicMock()
        mock_event.author = "TestAgent"
        mock_event.content = mock_content
        mock_event.partial = False
        mock_event.is_final_response = MagicMock(return_value=True)

        await process_adk_event(mock_event, emit, None)

        call_args = emit.call_args[0][0]
        assert call_args.data["output"] == long_text
        assert len(call_args.data["output"]) == 3000


class TestExtractAgentMonitorConnections:
    """Tests for extract_agent_monitor_connections function."""

    def test_extracts_monitor_connections(self):
        """Test extracting monitor connections from IR."""
        # Create a mock IR with an agent and a monitor connected to it
        agent_ir = AgentIR(
            id="agent-1",
            name="TestAgent",
            type="llm",
        )

        monitor_node = CustomNodeIR(
            id="monitor-1",
            unit_id="builtin.monitor",
            name="Test Monitor",
            config={"name": "My Monitor"},
            source_node_id="monitor-1",
            input_connections={
                "input": [ConnectionSource(node_id="agent-1", handle="response")]
            },
        )

        ir = WorkflowIR(
            root_agent=agent_ir,
            all_agents={"agent-1": agent_ir},
            custom_nodes=[monitor_node],
        )

        result = extract_agent_monitor_connections(ir)

        assert "TestAgent" in result
        assert len(result["TestAgent"]) == 1
        assert result["TestAgent"][0].monitor_id == "monitor-1"
        assert result["TestAgent"][0].monitor_name == "My Monitor"
        assert result["TestAgent"][0].source_handle == "response"

    def test_returns_empty_when_no_monitors(self):
        """Test that empty dict is returned when no monitors exist."""
        agent_ir = AgentIR(
            id="agent-1",
            name="TestAgent",
            type="llm",
        )

        ir = WorkflowIR(
            root_agent=agent_ir,
            all_agents={"agent-1": agent_ir},
            custom_nodes=[],
        )

        result = extract_agent_monitor_connections(ir)
        assert result == {}

    def test_ignores_non_monitor_nodes(self):
        """Test that non-monitor custom nodes are ignored."""
        agent_ir = AgentIR(
            id="agent-1",
            name="TestAgent",
            type="llm",
        )

        other_node = CustomNodeIR(
            id="node-1",
            unit_id="tools.some_tool",
            name="Some Tool",
            config={},
            source_node_id="node-1",
            input_connections={
                "input": [ConnectionSource(node_id="agent-1", handle="response")]
            },
        )

        ir = WorkflowIR(
            root_agent=agent_ir,
            all_agents={"agent-1": agent_ir},
            custom_nodes=[other_node],
        )

        result = extract_agent_monitor_connections(ir)
        assert result == {}

    def test_normalizes_agent_names_for_adk(self):
        """Test that agent names with spaces are normalized to underscores.

        ADK internally uses underscores instead of spaces in agent names,
        so we need to normalize to match the ADK event author names.
        """
        # Agent with space in name (as it appears in the IR)
        agent_ir = AgentIR(
            id="agent-1",
            name="research Supervisor",  # Space in name
            type="llm",
        )

        monitor_node = CustomNodeIR(
            id="monitor-1",
            unit_id="builtin.monitor",
            name="Monitor",
            config={"name": "Monitor 1"},
            source_node_id="monitor-1",
            input_connections={
                "input": [ConnectionSource(node_id="agent-1", handle="response")]
            },
        )

        ir = WorkflowIR(
            root_agent=agent_ir,
            all_agents={"agent-1": agent_ir},
            custom_nodes=[monitor_node],
        )

        result = extract_agent_monitor_connections(ir)

        # Key should be normalized (underscore instead of space)
        assert "research_Supervisor" in result
        assert "research Supervisor" not in result
        assert len(result["research_Supervisor"]) == 1


class TestProcessAdkEventWithMonitors:
    """Tests for process_adk_event with monitor connections."""

    @pytest.mark.asyncio
    async def test_emits_monitor_update_for_connected_monitors(self):
        """Test that MONITOR_UPDATE events are emitted for connected monitors."""
        emit = AsyncMock()

        mock_part = MagicMock()
        mock_part.text = "Test output"

        mock_content = MagicMock()
        mock_content.parts = [mock_part]

        mock_event = MagicMock()
        mock_event.author = "TestAgent"
        mock_event.content = mock_content
        mock_event.partial = False
        mock_event.is_final_response = MagicMock(return_value=True)

        # Create monitor connection
        agent_monitors = {
            "TestAgent": [
                MonitorConnection(
                    monitor_id="monitor-1",
                    monitor_name="My Monitor",
                    source_handle="response",
                )
            ]
        }

        await process_adk_event(mock_event, emit, None, agent_monitors)

        # Should emit both AGENT_OUTPUT and MONITOR_UPDATE
        assert emit.call_count == 2

        # First call should be AGENT_OUTPUT
        first_call = emit.call_args_list[0][0][0]
        assert first_call.type == EventType.AGENT_OUTPUT

        # Second call should be MONITOR_UPDATE
        second_call = emit.call_args_list[1][0][0]
        assert second_call.type == EventType.MONITOR_UPDATE
        assert second_call.data["node_id"] == "monitor-1"
        assert second_call.data["value"] == "Test output"
        assert second_call.data["value_type"] == "plaintext"

    @pytest.mark.asyncio
    async def test_skips_monitors_with_non_response_handle(self):
        """Test that monitors connected to non-response handles are skipped."""
        emit = AsyncMock()

        mock_part = MagicMock()
        mock_part.text = "Test output"

        mock_content = MagicMock()
        mock_content.parts = [mock_part]

        mock_event = MagicMock()
        mock_event.author = "TestAgent"
        mock_event.content = mock_content
        mock_event.partial = False
        mock_event.is_final_response = MagicMock(return_value=True)

        # Create monitor connection with different handle
        agent_monitors = {
            "TestAgent": [
                MonitorConnection(
                    monitor_id="monitor-1",
                    monitor_name="My Monitor",
                    source_handle="output",  # Not "response"
                )
            ]
        }

        await process_adk_event(mock_event, emit, None, agent_monitors)

        # Should only emit AGENT_OUTPUT (not MONITOR_UPDATE)
        assert emit.call_count == 1
        assert emit.call_args_list[0][0][0].type == EventType.AGENT_OUTPUT

    @pytest.mark.asyncio
    async def test_works_without_agent_monitors(self):
        """Test that function works when agent_monitors is None."""
        emit = AsyncMock()

        mock_part = MagicMock()
        mock_part.text = "Test output"

        mock_content = MagicMock()
        mock_content.parts = [mock_part]

        mock_event = MagicMock()
        mock_event.author = "TestAgent"
        mock_event.content = mock_content
        mock_event.partial = False
        mock_event.is_final_response = MagicMock(return_value=True)

        # No agent_monitors passed (backwards compatibility)
        await process_adk_event(mock_event, emit, None, None)

        # Should only emit AGENT_OUTPUT
        assert emit.call_count == 1
        assert emit.call_args_list[0][0][0].type == EventType.AGENT_OUTPUT
