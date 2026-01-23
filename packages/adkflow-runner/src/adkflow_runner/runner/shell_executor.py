"""Shell command execution with whitelist-based security.

This module provides secure shell command execution using glob pattern
matching for command whitelisting. Commands must match at least one
allowed pattern to execute.

Pattern format: `command:arguments_pattern`
- `git:*` matches any git command (git status, git push, etc.)
- `npm:install *` matches npm install with any package
- `ls:-la` matches only `ls -la` exactly
- `python:*.py` matches python with .py file arguments
"""

import asyncio
import fnmatch
import re
import shlex
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Any


class OutputMode(str, Enum):
    """Output capture modes for shell execution."""

    COMBINED = "combined"  # stdout + stderr interleaved
    STDOUT = "stdout"  # stdout only
    STDERR = "stderr"  # stderr only
    BOTH = "both"  # separate stdout and stderr


class ErrorBehavior(str, Enum):
    """How to handle command errors."""

    PASS_TO_MODEL = "pass_to_model"  # Return error dict for LLM to handle
    FAIL_FAST = "fail_fast"  # Raise exception


# Characters that could enable shell injection or command chaining
DANGEROUS_CHARS = set("; & | ` $ ( ) { } [ ] < > \\ \" '".split())
# More specific dangerous patterns that need regex
DANGEROUS_PATTERNS = [
    r"\$\(",  # Command substitution $(...)
    r"`",  # Backtick command substitution
    r"\$\{",  # Variable expansion ${...}
    r"&&",  # Command chaining
    r"\|\|",  # Command chaining
    r">>",  # Append redirect
    r"<<",  # Here document
    r"\|",  # Pipe
    r";",  # Command separator
    r"&",  # Background execution
    r">",  # Output redirect
    r"<",  # Input redirect
]


@dataclass
class ValidationResult:
    """Result of command validation."""

    allowed: bool
    command: str
    arguments: str
    matched_pattern: str | None = None
    error: str | None = None


@dataclass
class ExecutionResult:
    """Result of shell command execution."""

    output: str
    exit_code: int
    success: bool
    stdout: str | None = None
    stderr: str | None = None
    error: str | None = None
    truncated: bool = False


class CommandValidator:
    """Validates shell commands against whitelist patterns.

    Uses glob pattern matching to determine if a command is allowed.
    Patterns are in format: `command:arguments_pattern`

    Examples:
        validator = CommandValidator(["git:*", "npm:install *", "ls:-la"])
        validator.validate("git status")  # allowed
        validator.validate("rm -rf /")   # blocked - no matching pattern
    """

    def __init__(self, allowed_patterns: list[str]) -> None:
        """Initialize validator with allowed command patterns.

        Args:
            allowed_patterns: List of patterns in format "command:args_pattern"
                              e.g., ["git:*", "npm:install *"]
        """
        self.patterns = self._parse_patterns(allowed_patterns)

    def _parse_patterns(self, patterns: list[str]) -> list[tuple[str, str]]:
        """Parse pattern strings into (command, args_pattern) tuples.

        Args:
            patterns: List of pattern strings

        Returns:
            List of (command, args_pattern) tuples
        """
        parsed = []
        for pattern in patterns:
            pattern = pattern.strip()
            if not pattern or pattern.startswith("#"):
                continue

            if ":" in pattern:
                cmd, args = pattern.split(":", 1)
                parsed.append((cmd.strip(), args.strip()))
            else:
                # Pattern without colon - command only, no args
                parsed.append((pattern.strip(), ""))

        return parsed

    def _contains_dangerous_chars(self, text: str) -> tuple[bool, str | None]:
        """Check if text contains dangerous shell characters.

        Args:
            text: Text to check

        Returns:
            Tuple of (is_dangerous, detected_pattern)
        """
        for pattern in DANGEROUS_PATTERNS:
            if re.search(pattern, text):
                return True, pattern
        return False, None

    def validate(self, command: str) -> ValidationResult:
        """Validate a command against allowed patterns.

        Args:
            command: Full command string to validate

        Returns:
            ValidationResult with allowed status and details
        """
        command = command.strip()

        if not command:
            return ValidationResult(
                allowed=False,
                command="",
                arguments="",
                error="Empty command",
            )

        # Check for dangerous characters first
        is_dangerous, detected = self._contains_dangerous_chars(command)
        if is_dangerous:
            return ValidationResult(
                allowed=False,
                command=command,
                arguments="",
                error=f"Command contains dangerous pattern: {detected}",
            )

        # Split command into parts
        try:
            parts = shlex.split(command)
        except ValueError as e:
            return ValidationResult(
                allowed=False,
                command=command,
                arguments="",
                error=f"Invalid command syntax: {e}",
            )

        if not parts:
            return ValidationResult(
                allowed=False,
                command="",
                arguments="",
                error="Empty command after parsing",
            )

        cmd_name = parts[0]
        cmd_args = " ".join(parts[1:]) if len(parts) > 1 else ""

        # Check against patterns
        for pattern_cmd, pattern_args in self.patterns:
            # Command must match exactly
            if cmd_name != pattern_cmd:
                continue

            # Check arguments against pattern
            if not pattern_args:
                # Pattern has no args - only match if command has no args
                if not cmd_args:
                    return ValidationResult(
                        allowed=True,
                        command=cmd_name,
                        arguments=cmd_args,
                        matched_pattern=f"{pattern_cmd}:",
                    )
            elif pattern_args == "*":
                # Wildcard - match any arguments
                return ValidationResult(
                    allowed=True,
                    command=cmd_name,
                    arguments=cmd_args,
                    matched_pattern=f"{pattern_cmd}:*",
                )
            elif fnmatch.fnmatch(cmd_args, pattern_args):
                # Pattern match on arguments
                return ValidationResult(
                    allowed=True,
                    command=cmd_name,
                    arguments=cmd_args,
                    matched_pattern=f"{pattern_cmd}:{pattern_args}",
                )

        # No pattern matched
        return ValidationResult(
            allowed=False,
            command=cmd_name,
            arguments=cmd_args,
            error=f"Command '{cmd_name}' not in allowed list",
        )


class ShellExecutor:
    """Executes validated shell commands with resource limits.

    Provides async subprocess execution with timeout handling,
    output truncation, and configurable output modes.

    Example:
        executor = ShellExecutor(
            working_directory=Path("/project"),
            timeout=30,
            output_mode=OutputMode.COMBINED,
            max_output_size=100000,
        )
        result = await executor.execute("git status")
    """

    def __init__(
        self,
        working_directory: Path | None = None,
        timeout: float = 30.0,
        output_mode: OutputMode = OutputMode.COMBINED,
        max_output_size: int = 100000,
        shell: str = "bash",
        environment_variables: dict[str, str] | None = None,
    ) -> None:
        """Initialize shell executor.

        Args:
            working_directory: Directory to run commands in (None = current)
            timeout: Maximum execution time in seconds
            output_mode: How to capture output (combined, stdout, stderr, both)
            max_output_size: Maximum output size in bytes before truncation
            shell: Shell to use (bash, sh, zsh)
            environment_variables: Additional environment variables
        """
        self.working_directory = working_directory
        self.timeout = timeout
        self.output_mode = output_mode
        self.max_output_size = max_output_size
        self.shell = shell
        self.environment_variables = environment_variables or {}

    async def execute(self, command: str) -> ExecutionResult:
        """Execute a shell command.

        Args:
            command: The shell command to execute

        Returns:
            ExecutionResult with output, exit code, and success status
        """
        import os

        # Build environment
        env = os.environ.copy()
        env.update(self.environment_variables)

        # Determine working directory
        cwd = self.working_directory or Path.cwd()

        # Configure subprocess based on output mode
        if self.output_mode == OutputMode.COMBINED:
            stderr_mode = asyncio.subprocess.STDOUT
        else:
            stderr_mode = asyncio.subprocess.PIPE

        try:
            process = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=stderr_mode,
                cwd=cwd,
                env=env,
            )

            try:
                stdout_bytes, stderr_bytes = await asyncio.wait_for(
                    process.communicate(),
                    timeout=self.timeout,
                )
            except asyncio.TimeoutError:
                process.kill()
                await process.wait()
                return ExecutionResult(
                    output="",
                    exit_code=-1,
                    success=False,
                    error=f"Command timed out after {self.timeout} seconds",
                )

            # Decode output
            stdout = (
                stdout_bytes.decode("utf-8", errors="replace") if stdout_bytes else ""
            )
            stderr = (
                stderr_bytes.decode("utf-8", errors="replace") if stderr_bytes else ""
            )

            # Determine main output based on mode
            if self.output_mode == OutputMode.COMBINED:
                output = stdout
            elif self.output_mode == OutputMode.STDOUT:
                output = stdout
            elif self.output_mode == OutputMode.STDERR:
                output = stderr
            else:  # BOTH
                output = stdout

            # Check for truncation
            truncated = False
            if len(output) > self.max_output_size:
                output = output[: self.max_output_size]
                output += f"\n... [output truncated at {self.max_output_size} bytes]"
                truncated = True

            exit_code = process.returncode or 0

            return ExecutionResult(
                output=output,
                exit_code=exit_code,
                success=exit_code == 0,
                stdout=stdout if self.output_mode == OutputMode.BOTH else None,
                stderr=stderr
                if self.output_mode in (OutputMode.BOTH, OutputMode.STDERR)
                else None,
                truncated=truncated,
            )

        except OSError as e:
            return ExecutionResult(
                output="",
                exit_code=-1,
                success=False,
                error=f"Failed to execute command: {e}",
            )


def create_shell_tool(
    allowed_patterns: list[str],
    working_directory: Path | None = None,
    timeout: float = 30.0,
    output_mode: OutputMode = OutputMode.COMBINED,
    error_behavior: ErrorBehavior = ErrorBehavior.PASS_TO_MODEL,
    max_output_size: int = 100000,
    shell: str = "bash",
    environment_variables: dict[str, str] | None = None,
    pre_shell: str | None = None,
    post_shell: str | None = None,
    include_pre_shell_output: bool = False,
    include_post_shell_output: bool = False,
    pre_shell_on_fail: str = "stop",
    post_shell_on_fail: str = "run",
) -> Any:
    """Create an async shell tool callable for agent use.

    This factory creates a callable that agents can use to execute
    shell commands. The callable validates commands against the
    whitelist before execution.

    Args:
        allowed_patterns: List of allowed command patterns
        working_directory: Directory to run commands in
        timeout: Maximum execution time in seconds
        output_mode: How to capture output
        error_behavior: How to handle errors
        max_output_size: Maximum output size in bytes
        shell: Shell to use
        environment_variables: Additional environment variables
        pre_shell: Shell commands to run before each agent command (bypasses whitelist)
        post_shell: Shell commands to run after each agent command (bypasses whitelist)
        include_pre_shell_output: Include pre-shell output in result
        include_post_shell_output: Include post-shell output in result
        pre_shell_on_fail: "stop" or "continue" - behavior if pre-shell fails
        post_shell_on_fail: "run" or "skip" - whether to run post-shell if main fails

    Returns:
        Async callable function for shell command execution
    """
    validator = CommandValidator(allowed_patterns)
    executor = ShellExecutor(
        working_directory=working_directory,
        timeout=timeout,
        output_mode=output_mode,
        max_output_size=max_output_size,
        shell=shell,
        environment_variables=environment_variables,
    )

    async def execute_shell_command(command: str) -> dict[str, Any]:
        """Execute a shell command in the project directory.

        Use this tool to run shell commands for tasks like:
        - Checking git status, branches, or commit history
        - Listing files and directories
        - Reading file contents
        - Running build commands or scripts
        - Inspecting system state

        The command runs in the project's working directory. Some commands
        may be restricted for security reasons - if a command is blocked,
        try an alternative approach or ask the user for guidance.

        Args:
            command: The full shell command to execute.
                Examples: "git status", "ls -la", "cat README.md"

        Returns:
            dict containing:
            - output: Command output (stdout/stderr combined)
            - exit_code: Process exit code (0 = success)
            - success: Boolean indicating if command succeeded
            - error: Error message if command failed or was blocked
        """
        # Validate command
        validation = validator.validate(command)

        if not validation.allowed:
            error_msg = validation.error or "Command not allowed"
            if error_behavior == ErrorBehavior.FAIL_FAST:
                raise PermissionError(f"Shell command blocked: {error_msg}")
            return {
                "error": error_msg,
                "command": command,
                "allowed": False,
            }

        output_parts: list[str] = []
        has_wrapper_output = False

        # Run pre-shell commands (bypasses whitelist)
        if pre_shell and pre_shell.strip():
            pre_result = await executor.execute(pre_shell)
            if include_pre_shell_output and pre_result.output:
                output_parts.append(f"[pre-shell]\n{pre_result.output}")
                has_wrapper_output = True
            if not pre_result.success and pre_shell_on_fail == "stop":
                response: dict[str, Any] = {
                    "output": "\n".join(output_parts) if output_parts else "",
                    "exit_code": pre_result.exit_code,
                    "success": False,
                    "error": f"Pre-shell failed: {pre_result.error or 'exit code ' + str(pre_result.exit_code)}",
                }
                return response

        # Execute main command
        result = await executor.execute(command)
        main_output = result.output
        if has_wrapper_output:
            output_parts.append(f"[command]\n{main_output}")
        else:
            output_parts = [main_output]

        # Run post-shell commands (bypasses whitelist)
        if post_shell and post_shell.strip():
            should_run_post = result.success or post_shell_on_fail == "run"
            if should_run_post:
                post_result = await executor.execute(post_shell)
                if include_post_shell_output and post_result.output:
                    output_parts.append(f"[post-shell]\n{post_result.output}")
                    has_wrapper_output = True

        if result.error and error_behavior == ErrorBehavior.FAIL_FAST:
            raise RuntimeError(f"Shell command failed: {result.error}")

        response: dict[str, Any] = {
            "output": "\n".join(output_parts) if has_wrapper_output else result.output,
            "exit_code": result.exit_code,
            "success": result.success,
        }

        if result.error:
            response["error"] = result.error

        if result.truncated:
            response["truncated"] = True

        if result.stdout is not None:
            response["stdout"] = result.stdout

        if result.stderr is not None:
            response["stderr"] = result.stderr

        return response

    # Add metadata for ADK tool creation
    execute_shell_command.__name__ = "execute_shell_command"
    execute_shell_command.__doc__ = """Execute a shell command.

Args:
    command: The shell command to execute (e.g., "git status")

Returns:
    dict with 'output', 'exit_code', 'success' keys.
    If blocked, returns 'error' key with explanation.
"""

    return execute_shell_command
