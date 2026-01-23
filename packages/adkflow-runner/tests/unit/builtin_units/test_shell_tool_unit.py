"""Tests for the ShellTool FlowUnit.

Tests the shell tool unit including:
- Environment variable parsing
- Command pattern parsing
- Tool creation and configuration
- Integration with shell executor
"""

from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock

import pytest

from adkflow_runner.builtin_units.shell_tool_unit import (
    ShellToolUnit,
    parse_allowed_commands,
    parse_environment_variables,
)
from adkflow_runner.extensions.flow_unit import ExecutionContext


def make_execution_context(tmp_path: Path) -> ExecutionContext:
    """Create a basic ExecutionContext for testing."""
    return ExecutionContext(
        session_id="test-session",
        run_id="test-run",
        node_id="test-node",
        node_name="TestNode",
        state={},
        emit=MagicMock(),
        project_path=tmp_path,
    )


class TestParseEnvironmentVariables:
    """Tests for environment variable parsing."""

    def test_parse_single_variable(self):
        """Parse single KEY=VALUE pair."""
        result = parse_environment_variables("MY_VAR=test_value")
        assert result == {"MY_VAR": "test_value"}

    def test_parse_multiple_variables(self):
        """Parse multiple environment variables."""
        text = """
        VAR1=value1
        VAR2=value2
        VAR3=value3
        """
        result = parse_environment_variables(text)
        assert result == {
            "VAR1": "value1",
            "VAR2": "value2",
            "VAR3": "value3",
        }

    def test_parse_with_spaces(self):
        """Handle spaces around equals sign."""
        result = parse_environment_variables("KEY = value with spaces")
        assert result == {"KEY": "value with spaces"}

    def test_ignore_comments(self):
        """Ignore lines starting with #."""
        text = """
        # This is a comment
        VAR1=value1
        # Another comment
        VAR2=value2
        """
        result = parse_environment_variables(text)
        assert result == {"VAR1": "value1", "VAR2": "value2"}

    def test_ignore_empty_lines(self):
        """Ignore empty lines."""
        text = """
        VAR1=value1

        VAR2=value2

        """
        result = parse_environment_variables(text)
        assert result == {"VAR1": "value1", "VAR2": "value2"}

    def test_ignore_lines_without_equals(self):
        """Ignore malformed lines without equals sign."""
        text = """
        VAR1=value1
        INVALID_LINE
        VAR2=value2
        """
        result = parse_environment_variables(text)
        assert result == {"VAR1": "value1", "VAR2": "value2"}

    def test_empty_string(self):
        """Handle empty input string."""
        result = parse_environment_variables("")
        assert result == {}

    def test_value_with_equals(self):
        """Handle values containing equals signs."""
        result = parse_environment_variables("URL=https://example.com?key=value")
        assert result == {"URL": "https://example.com?key=value"}


class TestParseAllowedCommands:
    """Tests for allowed command pattern parsing."""

    def test_parse_single_pattern(self):
        """Parse single command pattern."""
        result = parse_allowed_commands("git:*")
        assert result == ["git:*"]

    def test_parse_multiple_patterns(self):
        """Parse multiple command patterns."""
        text = """
        git:*
        ls:*
        cat:*
        """
        result = parse_allowed_commands(text)
        assert result == ["git:*", "ls:*", "cat:*"]

    def test_ignore_comments(self):
        """Ignore lines starting with #."""
        text = """
        # Git commands
        git:*
        # File commands
        ls:*
        """
        result = parse_allowed_commands(text)
        assert result == ["git:*", "ls:*"]

    def test_ignore_empty_lines(self):
        """Ignore empty lines."""
        text = """
        git:*

        ls:*
        """
        result = parse_allowed_commands(text)
        assert result == ["git:*", "ls:*"]

    def test_trim_whitespace(self):
        """Trim whitespace from patterns."""
        text = """
          git:*
          ls:*
        """
        result = parse_allowed_commands(text)
        assert result == ["git:*", "ls:*"]

    def test_empty_string(self):
        """Handle empty input string."""
        result = parse_allowed_commands("")
        assert result == []


class TestShellToolUnit:
    """Tests for ShellToolUnit FlowUnit."""

    def test_unit_metadata(self):
        """Verify unit metadata."""
        assert ShellToolUnit.UNIT_ID == "builtin.shellTool"
        assert ShellToolUnit.UI_LABEL == "Shell Tool"
        assert ShellToolUnit.MENU_LOCATION == "Tools/Shell Tool"
        assert ShellToolUnit.VERSION == "1.0.0"
        assert not ShellToolUnit.OUTPUT_NODE
        assert not ShellToolUnit.ALWAYS_EXECUTE

    def test_setup_interface(self):
        """Verify UI schema setup."""
        schema = ShellToolUnit.setup_interface()

        # Check outputs
        assert len(schema.outputs) == 1
        output = schema.outputs[0]
        assert output.id == "output"
        assert output.source_type == "tool"
        assert output.data_type == "callable"

        # Check fields exist
        field_ids = {field.id for field in schema.fields}
        assert "allowed_commands" in field_ids
        assert "working_directory" in field_ids
        assert "timeout" in field_ids
        assert "output_mode" in field_ids
        assert "error_behavior" in field_ids
        assert "environment_variables" in field_ids
        assert "max_output_size" in field_ids

    @pytest.mark.asyncio
    async def test_run_process_creates_tool(self, tmp_path: Path):
        """Verify run_process creates a shell tool callable."""
        unit = ShellToolUnit()
        context = make_execution_context(tmp_path)

        config = {
            "allowed_commands": "echo:*\nls:*",
            "working_directory": "",
            "timeout": 30,
            "output_mode": "combined",
            "error_behavior": "pass_to_model",
            "max_output_size": 100000,
        }

        result = await unit.run_process(inputs={}, config=config, context=context)

        assert "output" in result
        assert callable(result["output"])

    @pytest.mark.asyncio
    async def test_run_process_with_working_directory(self, tmp_path: Path):
        """Verify working directory configuration."""
        unit = ShellToolUnit()

        # Create a subdirectory
        subdir = tmp_path / "subdir"
        subdir.mkdir()

        context = make_execution_context(tmp_path)

        config = {
            "allowed_commands": "pwd:",
            "working_directory": "subdir",
            "timeout": 5,
            "output_mode": "combined",
            "error_behavior": "pass_to_model",
            "max_output_size": 100000,
        }

        result = await unit.run_process(inputs={}, config=config, context=context)
        tool = result["output"]

        # Execute the tool
        exec_result = await tool("pwd")
        assert exec_result["success"]
        assert "subdir" in exec_result["output"]

    @pytest.mark.asyncio
    async def test_run_process_with_environment_variables(self, tmp_path: Path):
        """Verify environment variable configuration."""
        unit = ShellToolUnit()
        context = make_execution_context(tmp_path)

        config = {
            "allowed_commands": "echo:*",
            "working_directory": "",
            "timeout": 5,
            "output_mode": "combined",
            "error_behavior": "pass_to_model",
            "max_output_size": 100000,
            "environment_variables": "TEST_VAR=test_value",
        }

        result = await unit.run_process(inputs={}, config=config, context=context)
        tool = result["output"]

        # Execute the tool
        exec_result = await tool("echo $TEST_VAR")
        assert exec_result["success"]
        assert "test_value" in exec_result["output"]

    @pytest.mark.asyncio
    async def test_created_tool_validates_commands(self, tmp_path: Path):
        """Verify created tool validates against allowed patterns."""
        unit = ShellToolUnit()
        context = make_execution_context(tmp_path)

        config = {
            "allowed_commands": "echo:*",
            "working_directory": "",
            "timeout": 5,
            "output_mode": "combined",
            "error_behavior": "pass_to_model",
            "max_output_size": 100000,
        }

        result = await unit.run_process(inputs={}, config=config, context=context)
        tool = result["output"]

        # Allowed command should work
        exec_result = await tool("echo hello")
        assert exec_result["success"]
        assert "hello" in exec_result["output"]

        # Blocked command should return error
        exec_result = await tool("rm -rf /")
        assert "error" in exec_result
        assert exec_result["allowed"] is False

    @pytest.mark.asyncio
    async def test_absolute_working_directory(self, tmp_path: Path):
        """Verify absolute working directory path handling."""
        unit = ShellToolUnit()

        # Create an absolute path directory
        abs_dir = tmp_path / "absolute"
        abs_dir.mkdir()

        context = make_execution_context(tmp_path)

        config = {
            "allowed_commands": "pwd:",
            "working_directory": str(abs_dir),  # Absolute path
            "timeout": 5,
            "output_mode": "combined",
            "error_behavior": "pass_to_model",
            "max_output_size": 100000,
        }

        result = await unit.run_process(inputs={}, config=config, context=context)
        tool = result["output"]

        exec_result = await tool("pwd")
        assert exec_result["success"]
        assert str(abs_dir) in exec_result["output"]

    @pytest.mark.asyncio
    async def test_default_config_values(self, tmp_path: Path):
        """Verify default configuration values are used."""
        unit = ShellToolUnit()
        context = make_execution_context(tmp_path)

        # Minimal config - use defaults
        config = {}

        result = await unit.run_process(inputs={}, config=config, context=context)

        assert "output" in result
        assert callable(result["output"])
