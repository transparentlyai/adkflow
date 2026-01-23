"""Tests for the shell command executor.

Tests the CommandValidator and ShellExecutor for secure shell execution.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from adkflow_runner.runner.shell_executor import (
    CommandValidator,
    ErrorBehavior,
    ExecutionResult,
    OutputMode,
    ShellExecutor,
    ValidationResult,
    create_shell_tool,
)


class TestCommandValidator:
    """Tests for command validation against whitelist patterns."""

    def test_simple_wildcard_pattern(self):
        """Pattern with * matches any arguments."""
        validator = CommandValidator(["git:*"])

        result = validator.validate("git status")
        assert result.allowed
        assert result.command == "git"
        assert result.arguments == "status"
        assert result.matched_pattern == "git:*"

    def test_wildcard_matches_complex_args(self):
        """Wildcard matches complex argument strings."""
        validator = CommandValidator(["git:*"])

        result = validator.validate("git commit -m 'test message'")
        assert result.allowed
        assert result.command == "git"

    def test_exact_args_pattern(self):
        """Pattern with exact args only matches those args."""
        validator = CommandValidator(["ls:-la"])

        result = validator.validate("ls -la")
        assert result.allowed
        assert result.matched_pattern == "ls:-la"

        result = validator.validate("ls -la /tmp")
        assert not result.allowed

    def test_glob_pattern_in_args(self):
        """Glob patterns work in argument matching."""
        validator = CommandValidator(["python:*.py"])

        result = validator.validate("python script.py")
        assert result.allowed

        result = validator.validate("python test.py")
        assert result.allowed

        result = validator.validate("python -c 'print(1)'")
        assert not result.allowed

    def test_no_args_pattern(self):
        """Pattern without args only matches command alone."""
        validator = CommandValidator(["pwd:"])

        result = validator.validate("pwd")
        assert result.allowed

        result = validator.validate("pwd -L")
        assert not result.allowed

    def test_command_without_colon(self):
        """Pattern without colon matches command with no args."""
        validator = CommandValidator(["date"])

        result = validator.validate("date")
        assert result.allowed

        result = validator.validate("date -u")
        assert not result.allowed

    def test_multiple_patterns(self):
        """Multiple patterns - any match allows."""
        validator = CommandValidator(["git:*", "ls:*", "cat:*"])

        assert validator.validate("git status").allowed
        assert validator.validate("ls -la").allowed
        assert validator.validate("cat file.txt").allowed
        assert not validator.validate("rm -rf /").allowed

    def test_empty_command_blocked(self):
        """Empty commands are blocked."""
        validator = CommandValidator(["git:*"])

        result = validator.validate("")
        assert not result.allowed
        assert "Empty command" in result.error

    def test_whitespace_command_blocked(self):
        """Whitespace-only commands are blocked."""
        validator = CommandValidator(["git:*"])

        result = validator.validate("   ")
        assert not result.allowed

    def test_command_not_in_whitelist(self):
        """Commands not in whitelist are blocked."""
        validator = CommandValidator(["git:*"])

        result = validator.validate("rm -rf /")
        assert not result.allowed
        assert "not in allowed list" in result.error

    def test_dangerous_pipe_blocked(self):
        """Pipe characters are blocked."""
        validator = CommandValidator(["cat:*"])

        result = validator.validate("cat file.txt | grep secret")
        assert not result.allowed
        assert "dangerous pattern" in result.error

    def test_dangerous_semicolon_blocked(self):
        """Semicolon command separator is blocked."""
        validator = CommandValidator(["ls:*"])

        result = validator.validate("ls; rm -rf /")
        assert not result.allowed

    def test_dangerous_ampersand_blocked(self):
        """Ampersand (background/chain) is blocked."""
        validator = CommandValidator(["ls:*"])

        result = validator.validate("ls && rm -rf /")
        assert not result.allowed

        result = validator.validate("ls &")
        assert not result.allowed

    def test_dangerous_redirect_blocked(self):
        """Redirect operators are blocked."""
        validator = CommandValidator(["echo:*"])

        result = validator.validate("echo test > /etc/passwd")
        assert not result.allowed

        result = validator.validate("cat < /etc/passwd")
        assert not result.allowed

    def test_dangerous_backtick_blocked(self):
        """Backtick command substitution is blocked."""
        validator = CommandValidator(["echo:*"])

        result = validator.validate("echo `whoami`")
        assert not result.allowed

    def test_dangerous_dollar_paren_blocked(self):
        """$(...) command substitution is blocked."""
        validator = CommandValidator(["echo:*"])

        result = validator.validate("echo $(whoami)")
        assert not result.allowed

    def test_comments_and_empty_lines_ignored(self):
        """Comments and empty lines in patterns are ignored."""
        validator = CommandValidator(
            [
                "# This is a comment",
                "git:*",
                "",
                "  ",
                "ls:*",
            ]
        )

        assert validator.validate("git status").allowed
        assert validator.validate("ls -la").allowed
        assert len(validator.patterns) == 2

    def test_pattern_whitespace_trimmed(self):
        """Whitespace around patterns is trimmed."""
        validator = CommandValidator(["  git:*  ", "  ls:*"])

        assert validator.validate("git status").allowed
        assert validator.validate("ls").allowed


class TestShellExecutor:
    """Tests for shell command execution."""

    @pytest.mark.asyncio
    async def test_simple_command_execution(self, tmp_path: Path):
        """Execute a simple command and capture output."""
        executor = ShellExecutor(
            working_directory=tmp_path,
            timeout=5.0,
        )

        result = await executor.execute("echo 'hello world'")
        assert result.success
        assert result.exit_code == 0
        assert "hello world" in result.output

    @pytest.mark.asyncio
    async def test_command_with_non_zero_exit(self, tmp_path: Path):
        """Commands with non-zero exit code report failure."""
        executor = ShellExecutor(
            working_directory=tmp_path,
            timeout=5.0,
        )

        result = await executor.execute("exit 42")
        assert not result.success
        assert result.exit_code == 42

    @pytest.mark.asyncio
    async def test_command_timeout(self, tmp_path: Path):
        """Commands that exceed timeout are killed."""
        executor = ShellExecutor(
            working_directory=tmp_path,
            timeout=0.1,  # 100ms timeout
        )

        result = await executor.execute("sleep 10")
        assert not result.success
        assert "timed out" in result.error

    @pytest.mark.asyncio
    async def test_output_truncation(self, tmp_path: Path):
        """Large output is truncated."""
        executor = ShellExecutor(
            working_directory=tmp_path,
            timeout=5.0,
            max_output_size=100,  # Very small limit
        )

        # Generate output larger than limit
        result = await executor.execute("seq 1 1000")
        assert result.truncated
        assert "truncated" in result.output

    @pytest.mark.asyncio
    async def test_working_directory(self, tmp_path: Path):
        """Commands run in specified working directory."""
        subdir = tmp_path / "subdir"
        subdir.mkdir()

        executor = ShellExecutor(
            working_directory=subdir,
            timeout=5.0,
        )

        result = await executor.execute("pwd")
        assert result.success
        assert str(subdir) in result.output

    @pytest.mark.asyncio
    async def test_environment_variables(self, tmp_path: Path):
        """Custom environment variables are available."""
        executor = ShellExecutor(
            working_directory=tmp_path,
            timeout=5.0,
            environment_variables={"MY_VAR": "test_value"},
        )

        result = await executor.execute("echo $MY_VAR")
        assert result.success
        assert "test_value" in result.output

    @pytest.mark.asyncio
    async def test_output_mode_combined(self, tmp_path: Path):
        """Combined output mode captures both stdout and stderr."""
        executor = ShellExecutor(
            working_directory=tmp_path,
            timeout=5.0,
            output_mode=OutputMode.COMBINED,
        )

        result = await executor.execute("echo stdout; echo stderr >&2")
        assert result.success
        assert "stdout" in result.output
        assert "stderr" in result.output

    @pytest.mark.asyncio
    async def test_output_mode_stdout_only(self, tmp_path: Path):
        """Stdout mode captures only stdout."""
        executor = ShellExecutor(
            working_directory=tmp_path,
            timeout=5.0,
            output_mode=OutputMode.STDOUT,
        )

        result = await executor.execute("echo stdout; echo stderr >&2")
        assert result.success
        assert "stdout" in result.output
        # Note: stderr goes to PIPE separately, not in output

    @pytest.mark.asyncio
    async def test_output_mode_both(self, tmp_path: Path):
        """Both mode provides separate stdout and stderr."""
        executor = ShellExecutor(
            working_directory=tmp_path,
            timeout=5.0,
            output_mode=OutputMode.BOTH,
        )

        result = await executor.execute("echo stdout; echo stderr >&2")
        assert result.success
        assert result.stdout is not None
        assert result.stderr is not None
        assert "stdout" in result.stdout
        assert "stderr" in result.stderr


class TestCreateShellTool:
    """Tests for the shell tool factory function."""

    @pytest.mark.asyncio
    async def test_allowed_command_executes(self, tmp_path: Path):
        """Allowed commands execute successfully."""
        tool = create_shell_tool(
            allowed_patterns=["echo:*"],
            working_directory=tmp_path,
            timeout=5.0,
        )

        result = await tool("echo hello")
        assert result["success"]
        assert "hello" in result["output"]

    @pytest.mark.asyncio
    async def test_blocked_command_returns_error(self, tmp_path: Path):
        """Blocked commands return error dict."""
        tool = create_shell_tool(
            allowed_patterns=["echo:*"],
            working_directory=tmp_path,
            timeout=5.0,
            error_behavior=ErrorBehavior.PASS_TO_MODEL,
        )

        result = await tool("rm -rf /")
        assert "error" in result
        assert result["allowed"] is False

    @pytest.mark.asyncio
    async def test_blocked_command_raises_with_fail_fast(self, tmp_path: Path):
        """Blocked commands raise exception with fail_fast."""
        tool = create_shell_tool(
            allowed_patterns=["echo:*"],
            working_directory=tmp_path,
            timeout=5.0,
            error_behavior=ErrorBehavior.FAIL_FAST,
        )

        with pytest.raises(PermissionError):
            await tool("rm -rf /")

    @pytest.mark.asyncio
    async def test_failed_command_pass_to_model(self, tmp_path: Path):
        """Failed commands pass error to model."""
        tool = create_shell_tool(
            allowed_patterns=["exit:*"],
            working_directory=tmp_path,
            timeout=5.0,
            error_behavior=ErrorBehavior.PASS_TO_MODEL,
        )

        result = await tool("exit 1")
        assert not result["success"]
        assert result["exit_code"] == 1

    @pytest.mark.asyncio
    async def test_tool_has_docstring(self, tmp_path: Path):
        """Created tool has proper documentation."""
        tool = create_shell_tool(
            allowed_patterns=["echo:*"],
            working_directory=tmp_path,
        )

        assert tool.__doc__ is not None
        assert "shell command" in tool.__doc__.lower()


class TestValidationResult:
    """Tests for ValidationResult dataclass."""

    def test_allowed_result(self):
        """Create an allowed validation result."""
        result = ValidationResult(
            allowed=True,
            command="git",
            arguments="status",
            matched_pattern="git:*",
        )
        assert result.allowed
        assert result.error is None

    def test_blocked_result(self):
        """Create a blocked validation result."""
        result = ValidationResult(
            allowed=False,
            command="rm",
            arguments="-rf /",
            error="Command not allowed",
        )
        assert not result.allowed
        assert result.matched_pattern is None


class TestExecutionResult:
    """Tests for ExecutionResult dataclass."""

    def test_success_result(self):
        """Create a successful execution result."""
        result = ExecutionResult(
            output="hello world",
            exit_code=0,
            success=True,
        )
        assert result.success
        assert result.error is None
        assert not result.truncated

    def test_failure_result(self):
        """Create a failed execution result."""
        result = ExecutionResult(
            output="",
            exit_code=1,
            success=False,
            error="Command failed",
        )
        assert not result.success
        assert result.error is not None


class TestEdgeCases:
    """Tests for edge cases and error handling."""

    def test_empty_patterns_blocks_all(self):
        """Empty pattern list blocks all commands."""
        validator = CommandValidator([])

        result = validator.validate("echo test")
        assert not result.allowed

    def test_invalid_command_syntax(self):
        """Invalid command syntax is handled."""
        validator = CommandValidator(["echo:*"])

        # Unclosed quote
        result = validator.validate("echo 'unclosed")
        assert not result.allowed
        assert "syntax" in result.error.lower()

    @pytest.mark.asyncio
    async def test_nonexistent_command(self, tmp_path: Path):
        """Nonexistent commands are handled gracefully."""
        executor = ShellExecutor(
            working_directory=tmp_path,
            timeout=5.0,
        )

        result = await executor.execute("nonexistent_command_xyz123")
        assert not result.success
        assert result.exit_code != 0

    @pytest.mark.asyncio
    async def test_special_characters_in_output(self, tmp_path: Path):
        """Special characters in output are preserved."""
        executor = ShellExecutor(
            working_directory=tmp_path,
            timeout=5.0,
        )

        result = await executor.execute("echo 'unicode: äöü 日本語'")
        assert result.success
        assert "unicode" in result.output

    def test_npm_install_pattern(self):
        """NPM install pattern example from docs."""
        validator = CommandValidator(["npm:install *"])

        assert validator.validate("npm install lodash").allowed
        assert not validator.validate("npm run build").allowed
        assert not validator.validate("npm install").allowed  # Missing package

    def test_git_pattern_does_not_match_gitk(self):
        """git:* does not match gitk."""
        validator = CommandValidator(["git:*"])

        assert validator.validate("git status").allowed
        assert not validator.validate("gitk").allowed
