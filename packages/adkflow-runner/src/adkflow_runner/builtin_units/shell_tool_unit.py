"""ShellTool FlowUnit for executing shell commands with whitelist security.

This builtin unit provides a secure shell command execution tool that
agents can use to run whitelisted commands. Commands are validated
against glob patterns before execution.
"""

from pathlib import Path
from typing import Any

from adkflow_runner.extensions.flow_unit import (
    ExecutionContext,
    FieldDefinition,
    FlowUnit,
    HandleLayout,
    NodeLayout,
    PortDefinition,
    UISchema,
    WidgetType,
)
from adkflow_runner.runner.shell_executor import (
    ErrorBehavior,
    OutputMode,
    create_shell_tool,
)


def parse_environment_variables(env_text: str) -> dict[str, str]:
    """Parse environment variables from text format.

    Args:
        env_text: Text with KEY=VALUE pairs, one per line

    Returns:
        Dictionary of environment variables
    """
    env_vars = {}
    for line in env_text.strip().split("\n"):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" in line:
            key, value = line.split("=", 1)
            env_vars[key.strip()] = value.strip()
    return env_vars


def parse_allowed_commands(commands_text: str) -> list[str]:
    """Parse allowed commands from text format.

    Args:
        commands_text: Text with command patterns, one per line

    Returns:
        List of command patterns
    """
    patterns = []
    for line in commands_text.strip().split("\n"):
        line = line.strip()
        if line and not line.startswith("#"):
            patterns.append(line)
    return patterns


class ShellToolUnit(FlowUnit):
    """Shell Tool node for secure command execution.

    This is a tool node that:
    - Validates commands against whitelist patterns
    - Executes allowed commands with resource limits
    - Returns output as a callable tool for agents
    """

    UNIT_ID = "builtin.shellTool"
    UI_LABEL = "Shell Tool"
    MENU_LOCATION = "Tools/Shell Tool"
    DESCRIPTION = (
        "Execute shell commands with whitelist-based security. "
        "Commands must match allowed patterns to run."
    )
    VERSION = "1.0.0"

    OUTPUT_NODE = False
    ALWAYS_EXECUTE = False

    @classmethod
    def setup_interface(cls) -> UISchema:
        """Define the shell tool node's UI schema."""
        return UISchema(
            inputs=[],
            outputs=[
                PortDefinition(
                    id="output",
                    label="Tool",
                    source_type="tool",
                    data_type="callable",
                    required=False,
                    multiple=True,
                )
            ],
            fields=[
                # Security tab
                FieldDefinition(
                    id="allowed_commands",
                    label="Allowed Commands",
                    widget=WidgetType.TEXT_AREA,
                    default="git:*\nls:*\ncat:*",
                    help_text="Command patterns (one per line). Format: command:args_pattern",
                    tab="Security",
                ),
                # Config tab
                FieldDefinition(
                    id="working_directory",
                    label="Working Directory",
                    widget=WidgetType.TEXT_INPUT,
                    default="",
                    placeholder="Leave empty for project root",
                    help_text="Directory to run commands in (relative to project or absolute)",
                    tab="Config",
                ),
                FieldDefinition(
                    id="timeout",
                    label="Timeout (seconds)",
                    widget=WidgetType.NUMBER_INPUT,
                    default=30,
                    min_value=1,
                    max_value=600,
                    help_text="Maximum execution time per command",
                    tab="Config",
                ),
                FieldDefinition(
                    id="output_mode",
                    label="Output Mode",
                    widget=WidgetType.SELECT,
                    default="combined",
                    options=[
                        {"value": "combined", "label": "Combined (stdout + stderr)"},
                        {"value": "stdout", "label": "Stdout only"},
                        {"value": "stderr", "label": "Stderr only"},
                        {"value": "both", "label": "Both (separate)"},
                    ],
                    help_text="How to capture command output",
                    tab="Config",
                ),
                FieldDefinition(
                    id="error_behavior",
                    label="Error Handling",
                    widget=WidgetType.SELECT,
                    default="pass_to_model",
                    options=[
                        {"value": "pass_to_model", "label": "Pass error to model"},
                        {
                            "value": "fail_fast",
                            "label": "Fail fast (terminate workflow)",
                        },
                    ],
                    help_text="How to handle command errors or blocked commands",
                    tab="Config",
                ),
                # Advanced tab
                FieldDefinition(
                    id="environment_variables",
                    label="Environment Variables",
                    widget=WidgetType.CODE_EDITOR,
                    default="",
                    placeholder="KEY=VALUE (one per line)",
                    help_text="Additional environment variables for commands",
                    tab="Advanced",
                ),
                FieldDefinition(
                    id="max_output_size",
                    label="Max Output Size (bytes)",
                    widget=WidgetType.NUMBER_INPUT,
                    default=100000,
                    min_value=1000,
                    max_value=10000000,
                    help_text="Maximum output size before truncation",
                    tab="Advanced",
                ),
            ],
            color="#ea580c",  # Deep orange for shell tool
            icon="Terminal",
            expandable=True,
            default_width=400,
            default_height=300,
            layout=NodeLayout.PILL,
            theme_key="tool",
            handle_layout=HandleLayout(output_position="right"),
        )

    async def run_process(
        self,
        inputs: dict[str, Any],
        config: dict[str, Any],
        context: ExecutionContext,
    ) -> dict[str, Any]:
        """Create the shell tool callable.

        Args:
            inputs: Values from connected input ports (none for this node)
            config: Configuration values
            context: Execution context

        Returns:
            Dict with 'output' key containing the shell tool callable
        """
        # Parse configuration
        allowed_patterns = parse_allowed_commands(
            config.get("allowed_commands", "git:*\nls:*\ncat:*")
        )

        # Determine working directory
        working_dir_str = config.get("working_directory", "").strip()
        if working_dir_str:
            working_dir = Path(working_dir_str)
            if not working_dir.is_absolute():
                working_dir = context.project_path / working_dir
        else:
            working_dir = context.project_path

        # Parse other config
        timeout = float(config.get("timeout", 30))
        output_mode = OutputMode(config.get("output_mode", "combined"))
        error_behavior = ErrorBehavior(config.get("error_behavior", "pass_to_model"))
        max_output_size = int(config.get("max_output_size", 100000))

        # Parse environment variables
        env_text = config.get("environment_variables", "")
        env_vars = parse_environment_variables(env_text) if env_text else None

        # Parse pre/post shell config
        pre_shell = config.get("pre_shell", "").strip() or None
        post_shell = config.get("post_shell", "").strip() or None
        include_pre_shell_output = config.get("include_pre_shell_output", False)
        include_post_shell_output = config.get("include_post_shell_output", False)
        pre_shell_on_fail = config.get("pre_shell_on_fail", "stop")
        post_shell_on_fail = config.get("post_shell_on_fail", "run")

        # Create the shell tool
        shell_tool = create_shell_tool(
            allowed_patterns=allowed_patterns,
            working_directory=working_dir,
            timeout=timeout,
            output_mode=output_mode,
            error_behavior=error_behavior,
            max_output_size=max_output_size,
            shell="bash",
            environment_variables=env_vars,
            pre_shell=pre_shell,
            post_shell=post_shell,
            include_pre_shell_output=include_pre_shell_output,
            include_post_shell_output=include_post_shell_output,
            pre_shell_on_fail=pre_shell_on_fail,
            post_shell_on_fail=post_shell_on_fail,
        )

        return {"output": shell_tool}
