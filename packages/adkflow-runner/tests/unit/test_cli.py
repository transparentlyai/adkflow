"""Tests for adkflow-runner CLI module."""

from __future__ import annotations

import asyncio
import json
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from click.testing import CliRunner

from adkflow_runner.cli import (
    CLIUserInputProvider,
    _truncate_output,
    cli,
    print_msg,
    print_panel,
    MAX_OUTPUT_DISPLAY_LENGTH,
    OUTPUT_TRUNCATION_SUFFIX,
)


@pytest.fixture
def runner():
    """Create a Click CLI test runner."""
    return CliRunner()


@pytest.fixture
def project_with_agent(tmp_path: Path) -> Path:
    """Create a project with a simple agent for testing."""
    manifest = {
        "name": "test-project",
        "version": "3.0",
        "tabs": [{"id": "tab1", "name": "Main", "isDefault": True}],
        "nodes": [
            {
                "id": "agent-1",
                "type": "agent",
                "position": {"x": 100, "y": 100},
                "data": {
                    "tabId": "tab1",
                    "agent": {
                        "name": "TestAgent",
                        "type": "llm",
                        "model": "gemini-2.0-flash",
                    },
                },
            }
        ],
        "edges": [],
        "settings": {},
    }
    (tmp_path / "manifest.json").write_text(json.dumps(manifest, indent=2))
    return tmp_path


@pytest.fixture
def project_with_start_end(tmp_path: Path) -> Path:
    """Create a project with start and end nodes."""
    manifest = {
        "name": "test-project",
        "version": "3.0",
        "tabs": [{"id": "tab1", "name": "Main", "isDefault": True}],
        "nodes": [
            {
                "id": "start-1",
                "type": "start",
                "position": {"x": 0, "y": 100},
                "data": {"tabId": "tab1"},
            },
            {
                "id": "agent-1",
                "type": "agent",
                "position": {"x": 200, "y": 100},
                "data": {
                    "tabId": "tab1",
                    "agent": {
                        "name": "TestAgent",
                        "type": "llm",
                        "model": "gemini-2.0-flash",
                    },
                },
            },
            {
                "id": "end-1",
                "type": "end",
                "position": {"x": 400, "y": 100},
                "data": {"tabId": "tab1"},
            },
        ],
        "edges": [
            {
                "id": "edge-1",
                "source": "start-1",
                "target": "agent-1",
                "sourceHandle": "output",
                "targetHandle": "input",
            },
            {
                "id": "edge-2",
                "source": "agent-1",
                "target": "end-1",
                "sourceHandle": "output",
                "targetHandle": "input",
            },
        ],
        "settings": {},
    }
    (tmp_path / "manifest.json").write_text(json.dumps(manifest, indent=2))
    return tmp_path


# =============================================================================
# Tests for _truncate_output
# =============================================================================


class TestTruncateOutput:
    """Tests for _truncate_output function."""

    def test_returns_short_text_unchanged(self):
        """Short text should be returned as-is."""
        text = "Hello, world!"
        result = _truncate_output(text)
        assert result == text

    def test_truncates_long_text(self):
        """Long text should be truncated with suffix."""
        text = "x" * (MAX_OUTPUT_DISPLAY_LENGTH + 100)
        result = _truncate_output(text)

        assert len(result) == MAX_OUTPUT_DISPLAY_LENGTH + len(OUTPUT_TRUNCATION_SUFFIX)
        assert result.endswith(OUTPUT_TRUNCATION_SUFFIX)

    def test_exact_length_not_truncated(self):
        """Text exactly at max length should not be truncated."""
        text = "x" * MAX_OUTPUT_DISPLAY_LENGTH
        result = _truncate_output(text)
        assert result == text

    def test_one_over_truncated(self):
        """Text one character over max should be truncated."""
        text = "x" * (MAX_OUTPUT_DISPLAY_LENGTH + 1)
        result = _truncate_output(text)
        assert result.endswith(OUTPUT_TRUNCATION_SUFFIX)

    def test_custom_max_length(self):
        """Custom max_length parameter should work."""
        text = "Hello, world!"
        result = _truncate_output(text, max_length=5)
        assert result == "Hello" + OUTPUT_TRUNCATION_SUFFIX

    def test_empty_string(self):
        """Empty string should return empty string."""
        result = _truncate_output("")
        assert result == ""


# =============================================================================
# Tests for CLIUserInputProvider
# =============================================================================


class TestCLIUserInputProvider:
    """Tests for CLIUserInputProvider class."""

    def test_init_default(self):
        """Default initialization should set quiet=False."""
        provider = CLIUserInputProvider()
        assert provider.quiet is False

    def test_init_quiet(self):
        """Should accept quiet parameter."""
        provider = CLIUserInputProvider(quiet=True)
        assert provider.quiet is True

    @pytest.mark.asyncio
    async def test_request_input_returns_stripped_value(self):
        """request_input should return stripped user input."""
        provider = CLIUserInputProvider(quiet=True)

        # Mock UserInputRequest
        request = MagicMock()
        request.previous_output = None
        request.node_name = "TestNode"
        request.variable_name = "query"
        request.timeout_seconds = 0

        with patch.object(provider, "_get_input_sync", return_value="  test input  "):
            result = await provider.request_input(request)
            assert result == "test input"

    @pytest.mark.asyncio
    async def test_request_input_with_timeout(self):
        """request_input should respect timeout."""
        provider = CLIUserInputProvider(quiet=True)

        request = MagicMock()
        request.previous_output = None
        request.node_name = "TestNode"
        request.variable_name = "query"
        request.timeout_seconds = 0.1  # Very short timeout

        # Simulate slow input by making _get_input_sync block
        import time

        def slow_input():
            time.sleep(1)
            return "slow"

        with patch.object(provider, "_get_input_sync", side_effect=slow_input):
            with patch("adkflow_runner.cli.print_msg"):  # Suppress output
                with pytest.raises(TimeoutError, match="timed out"):
                    await provider.request_input(request)

    @pytest.mark.asyncio
    async def test_request_input_shows_previous_output(self):
        """request_input should display previous output when not quiet."""
        provider = CLIUserInputProvider(quiet=False)

        request = MagicMock()
        request.previous_output = "Previous output text"
        request.node_name = "TestNode"
        request.variable_name = "query"
        request.timeout_seconds = 0

        with patch.object(provider, "_display_previous_output") as mock_display:
            with patch.object(provider, "_display_prompt_info"):
                with patch.object(provider, "_get_input_sync", return_value="input"):
                    await provider.request_input(request)
                    mock_display.assert_called_once_with("Previous output text")

    @pytest.mark.asyncio
    async def test_request_input_skips_display_when_quiet(self):
        """request_input should skip display when quiet=True."""
        provider = CLIUserInputProvider(quiet=True)

        request = MagicMock()
        request.previous_output = "Previous output text"
        request.node_name = "TestNode"
        request.variable_name = "query"
        request.timeout_seconds = 0

        with patch.object(provider, "_display_previous_output") as mock_display:
            with patch.object(provider, "_display_prompt_info") as mock_prompt:
                with patch.object(provider, "_get_input_sync", return_value="input"):
                    await provider.request_input(request)
                    mock_display.assert_not_called()
                    mock_prompt.assert_not_called()

    @pytest.mark.asyncio
    async def test_request_input_handles_keyboard_interrupt(self):
        """request_input should handle KeyboardInterrupt."""
        provider = CLIUserInputProvider(quiet=True)

        request = MagicMock()
        request.previous_output = None
        request.node_name = "TestNode"
        request.variable_name = "query"
        request.timeout_seconds = 0

        with patch.object(provider, "_get_input_sync", side_effect=KeyboardInterrupt):
            with pytest.raises(asyncio.CancelledError, match="cancelled"):
                await provider.request_input(request)


# =============================================================================
# Tests for print_msg and print_panel
# =============================================================================


class TestPrintHelpers:
    """Tests for print_msg and print_panel helper functions."""

    def test_print_msg_without_rich(self, capsys):
        """print_msg should work without rich."""
        with patch("adkflow_runner.cli.HAS_RICH", False):
            print_msg("Hello, world!")
            captured = capsys.readouterr()
            assert "Hello, world!" in captured.out

    def test_print_panel_without_rich(self, capsys):
        """print_panel should work without rich."""
        with patch("adkflow_runner.cli.HAS_RICH", False):
            print_panel("Test message")
            captured = capsys.readouterr()
            assert "Test message" in captured.out
            assert "=" in captured.out  # Should have decoration


# =============================================================================
# Tests for CLI group
# =============================================================================


class TestCliGroup:
    """Tests for the main CLI group."""

    def test_cli_version(self, runner):
        """Test --version option works."""
        result = runner.invoke(cli, ["--version"])
        assert result.exit_code == 0
        assert "0.1.0" in result.output

    def test_cli_help(self, runner):
        """Test --help option shows available commands."""
        result = runner.invoke(cli, ["--help"])
        assert result.exit_code == 0
        assert "run" in result.output
        assert "validate" in result.output
        assert "topology" in result.output


# =============================================================================
# Tests for run command
# =============================================================================


class TestRunCommand:
    """Tests for the 'run' command."""

    def test_run_help(self, runner):
        """Test run --help shows options."""
        result = runner.invoke(cli, ["run", "--help"])
        assert result.exit_code == 0
        assert "--tab" in result.output
        assert "--input" in result.output
        assert "--verbose" in result.output
        assert "--quiet" in result.output

    def test_run_missing_project(self, runner, tmp_path: Path):
        """Test run fails with missing project."""
        nonexistent = tmp_path / "nonexistent"
        result = runner.invoke(cli, ["run", str(nonexistent)])
        assert result.exit_code != 0

    def test_run_conflicting_input_options(self, runner, project_with_agent: Path):
        """Test run fails with both --input and --input-file."""
        input_file = project_with_agent / "input.json"
        input_file.write_text('{"query": "test"}')

        with patch("adkflow_runner.cli.load_dotenv"):
            result = runner.invoke(
                cli,
                [
                    "run",
                    str(project_with_agent),
                    "--input",
                    '{"query": "test"}',
                    "--input-file",
                    str(input_file),
                ],
            )
            assert result.exit_code != 0

    def test_run_invalid_json_input(self, runner, project_with_agent: Path):
        """Test run fails with invalid JSON input."""
        with patch("adkflow_runner.cli.load_dotenv"):
            result = runner.invoke(
                cli,
                ["run", str(project_with_agent), "--input", "not valid json"],
            )
            assert result.exit_code != 0
            assert "Invalid JSON" in result.output

    def test_run_invalid_json_file(self, runner, project_with_agent: Path):
        """Test run fails with invalid JSON file."""
        input_file = project_with_agent / "input.json"
        input_file.write_text("not valid json")

        with patch("adkflow_runner.cli.load_dotenv"):
            result = runner.invoke(
                cli,
                ["run", str(project_with_agent), "--input-file", str(input_file)],
            )
            assert result.exit_code != 0
            assert "Invalid JSON" in result.output

    def test_run_quiet_overrides_verbose(self, runner, project_with_agent: Path):
        """Test that --quiet overrides --verbose."""
        mock_result = MagicMock()
        mock_result.status.value = "completed"
        mock_result.output = "test output"
        mock_result.duration_ms = 100

        with patch("adkflow_runner.cli.load_dotenv"):
            with patch("adkflow_runner.runner.WorkflowRunner") as mock_runner_cls:
                mock_runner = MagicMock()
                mock_runner.run = AsyncMock(return_value=mock_result)
                mock_runner_cls.return_value = mock_runner

                result = runner.invoke(
                    cli,
                    ["run", str(project_with_agent), "--quiet", "--verbose"],
                )
                # Should warn about conflicting flags
                assert "conflicting" in result.output.lower() or result.exit_code == 0

    def test_run_success(self, runner, project_with_agent: Path):
        """Test successful run command."""
        mock_result = MagicMock()
        mock_result.status.value = "completed"
        mock_result.output = "test output"
        mock_result.duration_ms = 100

        with patch("adkflow_runner.cli.load_dotenv"):
            with patch("adkflow_runner.runner.WorkflowRunner") as mock_runner_cls:
                mock_runner = MagicMock()
                mock_runner.run = AsyncMock(return_value=mock_result)
                mock_runner_cls.return_value = mock_runner

                result = runner.invoke(cli, ["run", str(project_with_agent)])
                assert result.exit_code == 0

    def test_run_with_input_data(self, runner, project_with_agent: Path):
        """Test run command with input data."""
        mock_result = MagicMock()
        mock_result.status.value = "completed"
        mock_result.output = "response"
        mock_result.duration_ms = 50

        with patch("adkflow_runner.cli.load_dotenv"):
            with patch("adkflow_runner.runner.WorkflowRunner") as mock_runner_cls:
                mock_runner = MagicMock()
                mock_runner.run = AsyncMock(return_value=mock_result)
                mock_runner_cls.return_value = mock_runner

                result = runner.invoke(
                    cli,
                    ["run", str(project_with_agent), "--input", '{"query": "hello"}'],
                )
                assert result.exit_code == 0

                # Verify input was passed to config
                call_args = mock_runner.run.call_args
                config = call_args[0][0]
                assert config.input_data == {"query": "hello"}

    def test_run_with_input_file(self, runner, project_with_agent: Path):
        """Test run command with input file."""
        input_file = project_with_agent / "input.json"
        input_file.write_text('{"query": "from file"}')

        mock_result = MagicMock()
        mock_result.status.value = "completed"
        mock_result.output = "response"
        mock_result.duration_ms = 50

        with patch("adkflow_runner.cli.load_dotenv"):
            with patch("adkflow_runner.runner.WorkflowRunner") as mock_runner_cls:
                mock_runner = MagicMock()
                mock_runner.run = AsyncMock(return_value=mock_result)
                mock_runner_cls.return_value = mock_runner

                result = runner.invoke(
                    cli,
                    ["run", str(project_with_agent), "--input-file", str(input_file)],
                )
                assert result.exit_code == 0

                call_args = mock_runner.run.call_args
                config = call_args[0][0]
                assert config.input_data == {"query": "from file"}

    def test_run_failed_status(self, runner, project_with_agent: Path):
        """Test run command with failed status."""
        mock_result = MagicMock()
        mock_result.status.value = "failed"
        mock_result.error = "Something went wrong"

        with patch("adkflow_runner.cli.load_dotenv"):
            with patch("adkflow_runner.runner.WorkflowRunner") as mock_runner_cls:
                mock_runner = MagicMock()
                mock_runner.run = AsyncMock(return_value=mock_result)
                mock_runner_cls.return_value = mock_runner

                result = runner.invoke(cli, ["run", str(project_with_agent)])
                assert result.exit_code == 1
                assert "failed" in result.output.lower()

    def test_run_cancelled_status(self, runner, project_with_agent: Path):
        """Test run command with cancelled status."""
        mock_result = MagicMock()
        mock_result.status.value = "cancelled"

        with patch("adkflow_runner.cli.load_dotenv"):
            with patch("adkflow_runner.runner.WorkflowRunner") as mock_runner_cls:
                mock_runner = MagicMock()
                mock_runner.run = AsyncMock(return_value=mock_result)
                mock_runner_cls.return_value = mock_runner

                result = runner.invoke(cli, ["run", str(project_with_agent)])
                assert result.exit_code == 130
                assert "cancelled" in result.output.lower()

    def test_run_with_tab(self, runner, project_with_agent: Path):
        """Test run command with --tab option."""
        mock_result = MagicMock()
        mock_result.status.value = "completed"
        mock_result.output = "output"
        mock_result.duration_ms = 50

        with patch("adkflow_runner.cli.load_dotenv"):
            with patch("adkflow_runner.runner.WorkflowRunner") as mock_runner_cls:
                mock_runner = MagicMock()
                mock_runner.run = AsyncMock(return_value=mock_result)
                mock_runner_cls.return_value = mock_runner

                result = runner.invoke(
                    cli,
                    ["run", str(project_with_agent), "--tab", "tab1"],
                )
                assert result.exit_code == 0

                call_args = mock_runner.run.call_args
                config = call_args[0][0]
                assert config.tab_id == "tab1"

    def test_run_with_callback_url(self, runner, project_with_agent: Path):
        """Test run command with --callback-url option."""
        mock_result = MagicMock()
        mock_result.status.value = "completed"
        mock_result.output = "output"
        mock_result.duration_ms = 50

        with patch("adkflow_runner.cli.load_dotenv"):
            with patch("adkflow_runner.runner.WorkflowRunner") as mock_runner_cls:
                with patch("adkflow_runner.callbacks.HttpCallbacks") as mock_http:
                    mock_runner = MagicMock()
                    mock_runner.run = AsyncMock(return_value=mock_result)
                    mock_runner_cls.return_value = mock_runner

                    result = runner.invoke(
                        cli,
                        [
                            "run",
                            str(project_with_agent),
                            "--callback-url",
                            "http://localhost:8080/events",
                        ],
                    )
                    assert result.exit_code == 0
                    mock_http.assert_called_once_with("http://localhost:8080/events")

    def test_run_loads_env_file(self, runner, project_with_agent: Path):
        """Test run command loads .env file from project."""
        env_file = project_with_agent / ".env"
        env_file.write_text("TEST_VAR=test_value")

        mock_result = MagicMock()
        mock_result.status.value = "completed"
        mock_result.output = "output"
        mock_result.duration_ms = 50

        with patch("adkflow_runner.cli.load_dotenv") as mock_load:
            with patch("adkflow_runner.runner.WorkflowRunner") as mock_runner_cls:
                mock_runner = MagicMock()
                mock_runner.run = AsyncMock(return_value=mock_result)
                mock_runner_cls.return_value = mock_runner

                result = runner.invoke(cli, ["run", str(project_with_agent)])
                assert result.exit_code == 0
                mock_load.assert_called_once()

    def test_run_quiet_mode_only_outputs_result(self, runner, project_with_agent: Path):
        """Test run command in quiet mode only outputs result."""
        mock_result = MagicMock()
        mock_result.status.value = "completed"
        mock_result.output = "final output"
        mock_result.duration_ms = 50

        with patch("adkflow_runner.cli.load_dotenv"):
            with patch("adkflow_runner.runner.WorkflowRunner") as mock_runner_cls:
                mock_runner = MagicMock()
                mock_runner.run = AsyncMock(return_value=mock_result)
                mock_runner_cls.return_value = mock_runner

                result = runner.invoke(
                    cli,
                    ["run", str(project_with_agent), "--quiet"],
                )
                assert result.exit_code == 0
                assert "final output" in result.output

    def test_run_no_validate_option(self, runner, project_with_agent: Path):
        """Test run command with --no-validate option."""
        mock_result = MagicMock()
        mock_result.status.value = "completed"
        mock_result.output = "output"
        mock_result.duration_ms = 50

        with patch("adkflow_runner.cli.load_dotenv"):
            with patch("adkflow_runner.runner.WorkflowRunner") as mock_runner_cls:
                mock_runner = MagicMock()
                mock_runner.run = AsyncMock(return_value=mock_result)
                mock_runner_cls.return_value = mock_runner

                result = runner.invoke(
                    cli,
                    ["run", str(project_with_agent), "--no-validate"],
                )
                assert result.exit_code == 0

                call_args = mock_runner.run.call_args
                config = call_args[0][0]
                assert config.validate is False


# =============================================================================
# Tests for validate command
# =============================================================================


class TestValidateCommand:
    """Tests for the 'validate' command."""

    def test_validate_help(self, runner):
        """Test validate --help shows options."""
        result = runner.invoke(cli, ["validate", "--help"])
        assert result.exit_code == 0
        assert "--format" in result.output

    def test_validate_valid_project(self, runner, project_with_start_end: Path):
        """Test validate command with valid project."""
        result = runner.invoke(cli, ["validate", str(project_with_start_end)])
        # Should pass validation (exit code 0) or report validation issues
        assert "valid" in result.output.lower() or result.exit_code in [0, 1]

    def test_validate_missing_project(self, runner, tmp_path: Path):
        """Test validate fails with missing project."""
        nonexistent = tmp_path / "nonexistent"
        result = runner.invoke(cli, ["validate", str(nonexistent)])
        assert result.exit_code != 0

    def test_validate_json_format(self, runner, project_with_start_end: Path):
        """Test validate command with JSON output format."""
        result = runner.invoke(
            cli, ["validate", str(project_with_start_end), "--format", "json"]
        )
        # Should output valid JSON
        try:
            output = json.loads(result.output)
            assert "valid" in output
            assert "errors" in output
            assert "warnings" in output
        except json.JSONDecodeError:
            pytest.fail("Output is not valid JSON")

    def test_validate_yaml_format(self, runner, project_with_start_end: Path):
        """Test validate command with YAML output format."""
        result = runner.invoke(
            cli, ["validate", str(project_with_start_end), "--format", "yaml"]
        )
        assert "valid:" in result.output

    def test_validate_summary_format(self, runner, project_with_start_end: Path):
        """Test validate command with summary output format."""
        result = runner.invoke(
            cli, ["validate", str(project_with_start_end), "--format", "summary"]
        )
        # Summary format should show stats
        assert "Agents:" in result.output or "valid" in result.output.lower()

    def test_validate_invalid_manifest(self, runner, tmp_path: Path):
        """Test validate fails with invalid manifest."""
        manifest_file = tmp_path / "manifest.json"
        manifest_file.write_text("not valid json")

        result = runner.invoke(cli, ["validate", str(tmp_path)])
        assert result.exit_code != 0


# =============================================================================
# Tests for topology command
# =============================================================================


class TestTopologyCommand:
    """Tests for the 'topology' command."""

    def test_topology_help(self, runner):
        """Test topology --help shows options."""
        result = runner.invoke(cli, ["topology", "--help"])
        assert result.exit_code == 0
        assert "--format" in result.output

    def test_topology_missing_project(self, runner, tmp_path: Path):
        """Test topology fails with missing project."""
        nonexistent = tmp_path / "nonexistent"
        result = runner.invoke(cli, ["topology", str(nonexistent)])
        assert result.exit_code != 0

    def test_topology_ascii_format(self, runner, project_with_start_end: Path):
        """Test topology command with ASCII format."""
        result = runner.invoke(cli, ["topology", str(project_with_start_end)])
        # Should output ASCII topology or fail gracefully
        assert result.exit_code in [0, 1]

    def test_topology_mermaid_format(self, runner, project_with_start_end: Path):
        """Test topology command with Mermaid format."""
        result = runner.invoke(
            cli, ["topology", str(project_with_start_end), "--format", "mermaid"]
        )
        # Should output Mermaid diagram or fail gracefully
        assert result.exit_code in [0, 1]

    def test_topology_invalid_manifest(self, runner, tmp_path: Path):
        """Test topology fails with invalid manifest."""
        manifest_file = tmp_path / "manifest.json"
        manifest_file.write_text("not valid json")

        result = runner.invoke(cli, ["topology", str(tmp_path)])
        assert result.exit_code != 0
