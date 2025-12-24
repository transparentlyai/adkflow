"""CLI for adkflow-runner standalone package.

Provides run and validate commands for executing ADKFlow workflows.
"""

import asyncio
import json
import sys
from pathlib import Path
from typing import TYPE_CHECKING

import click
from dotenv import load_dotenv

if TYPE_CHECKING:
    from adkflow_runner.runner import UserInputRequest

try:
    from rich.console import Console
    from rich.panel import Panel
    from rich.prompt import Prompt

    console = Console()
    HAS_RICH = True
except ImportError:
    HAS_RICH = False
    console = None
    Panel = None  # type: ignore[assignment]
    Prompt = None  # type: ignore[assignment]


class CLIUserInputProvider:
    """Interactive CLI handler for user input requests.

    Displays previous output and prompts for user input in the terminal.
    """

    def __init__(self, quiet: bool = False):
        self.quiet = quiet

    async def request_input(self, request: "UserInputRequest") -> str | None:
        """Request user input interactively.

        Args:
            request: The input request context

        Returns:
            User input string

        Raises:
            TimeoutError: If timeout occurs (not implemented in CLI - blocks)
            asyncio.CancelledError: If the request was cancelled
        """
        # Display previous output if available
        if request.previous_output and not self.quiet:
            if HAS_RICH and console and Panel:
                # Truncate very long outputs
                output_display = request.previous_output
                if len(output_display) > 2000:
                    output_display = output_display[:2000] + "\n... (truncated)"

                console.print()
                console.print(
                    Panel(
                        output_display,
                        title="[cyan]Output from previous step[/cyan]",
                        border_style="cyan",
                    )
                )
            else:
                print("\n" + "=" * 50)
                print("Previous output:")
                output_display = request.previous_output
                if len(output_display) > 2000:
                    output_display = output_display[:2000] + "\n... (truncated)"
                print(output_display)
                print("=" * 50)

        # Display prompt info
        if not self.quiet:
            if HAS_RICH and console:
                console.print()
                console.print(
                    f"[bold yellow]?[/bold yellow] [bold]{request.node_name}[/bold]"
                )
                console.print(
                    f"  [dim]Variable: {{{request.variable_name}}} | "
                    f"Timeout: {request.timeout_seconds}s[/dim]"
                )
            else:
                print(f"\n? {request.node_name}")
                print(
                    f"  Variable: {{{request.variable_name}}} | "
                    f"Timeout: {request.timeout_seconds}s"
                )

        # Read user input
        try:
            if HAS_RICH and Prompt:
                response = Prompt.ask("[bold]Your input[/bold]")
            else:
                response = input("Your input: ")

            return response.strip()

        except (KeyboardInterrupt, EOFError):
            raise asyncio.CancelledError("User cancelled input")


def print_msg(msg: str, style: str | None = None):
    """Print message with optional styling."""
    if HAS_RICH and console:
        if style:
            console.print(f"[{style}]{msg}[/{style}]")
        else:
            console.print(msg)
    else:
        print(msg)


def print_panel(msg: str, style: str = "bold blue"):
    """Print a panel message."""
    if HAS_RICH and console and Panel:
        console.print(Panel.fit(msg, style=style))
    else:
        print(f"\n{'=' * 50}")
        print(f"  {msg}")
        print(f"{'=' * 50}\n")


@click.group()
@click.version_option(version="0.1.0", prog_name="adkflow-runner")
def cli():
    """ADKFlow Runner - Execute Google ADK agent workflows."""
    pass


@cli.command("run")
@click.argument("project_path", type=click.Path(exists=True), default=".")
@click.option(
    "--tab",
    "-t",
    default=None,
    help="Specific tab to run (default: all tabs via teleporters)",
)
@click.option(
    "--input",
    "-i",
    "input_str",
    default=None,
    help='Input JSON string (e.g., \'{"prompt": "Hello"}\')',
)
@click.option(
    "--input-file",
    "-f",
    type=click.Path(exists=True),
    default=None,
    help="Path to input JSON file",
)
@click.option(
    "--callback-url",
    "-c",
    default=None,
    help="URL to POST execution events for real-time updates",
)
@click.option(
    "--verbose",
    "-v",
    is_flag=True,
    default=False,
    help="Show verbose output including tool results and thinking",
)
@click.option(
    "--quiet",
    "-q",
    is_flag=True,
    default=False,
    help="Suppress output, only show final result",
)
@click.option(
    "--timeout",
    default=300,
    help="Execution timeout in seconds (default: 300)",
)
@click.option(
    "--no-validate",
    is_flag=True,
    default=False,
    help="Skip workflow validation before execution",
)
@click.option(
    "--interactive/--no-interactive",
    "-I",
    default=True,
    help="Enable/disable interactive user input prompts (default: enabled)",
)
def run_command(
    project_path: str,
    tab: str | None,
    input_str: str | None,
    input_file: str | None,
    callback_url: str | None,
    verbose: bool,
    quiet: bool,
    timeout: int,
    no_validate: bool,
    interactive: bool,
):
    """Run an ADKFlow workflow.

    Compiles and executes the workflow in the specified project directory.

    Examples:
        adkflow-runner run .
        adkflow-runner run /path/to/project
        adkflow-runner run . --input '{"prompt": "Hello!"}'
        adkflow-runner run . --input-file input.json
        adkflow-runner run . --tab main --verbose
        adkflow-runner run . --callback-url http://localhost:3000/api/events
    """
    # Load .env from workflow project directory
    workflow_env = Path(project_path).resolve() / ".env"
    if workflow_env.exists():
        load_dotenv(workflow_env, override=True)
        if not quiet:
            print_msg(f"Loaded environment from {workflow_env}", "dim")

    # Parse input
    input_data: dict = {}
    if input_file:
        with open(input_file) as f:
            input_data = json.load(f)
    elif input_str:
        try:
            input_data = json.loads(input_str)
        except json.JSONDecodeError as e:
            print_msg(f"Invalid JSON input: {e}", "red")
            raise click.Abort()

    # Import execution modules
    from adkflow_runner.runner import WorkflowRunner, RunConfig
    from adkflow_runner.callbacks import ConsoleCallbacks, CompositeCallbacks

    # Build callbacks
    callbacks = CompositeCallbacks()

    if not quiet:
        callbacks.add(ConsoleCallbacks(verbose=verbose))

    if callback_url:
        try:
            from adkflow_runner.callbacks import HttpCallbacks

            callbacks.add(HttpCallbacks(callback_url))
        except ImportError:
            print_msg(
                "httpx not installed, HTTP callbacks disabled. Install with: pip install httpx",
                "yellow",
            )

    # Set up user input provider
    user_input_provider = None
    if interactive and not quiet:
        user_input_provider = CLIUserInputProvider(quiet=quiet)

    # Create run config
    config = RunConfig(
        project_path=Path(project_path).resolve(),
        tab_id=tab,
        input_data=input_data,
        callbacks=callbacks,
        timeout_seconds=timeout,
        validate=not no_validate,
        user_input_provider=user_input_provider,
    )

    # Run the workflow
    async def execute():
        runner = WorkflowRunner()
        return await runner.run(config)

    try:
        result = asyncio.run(execute())

        if result.status.value == "completed":
            if quiet:
                # Only print output in quiet mode
                if result.output:
                    print(result.output)
            else:
                print_msg("")
                print_msg(f"Run completed in {result.duration_ms:.0f}ms", "green")

            sys.exit(0)
        elif result.status.value == "failed":
            print_msg(f"\nRun failed: {result.error}", "red")
            sys.exit(1)
        elif result.status.value == "cancelled":
            print_msg("\nRun cancelled", "yellow")
            sys.exit(130)
        else:
            print_msg(f"\nRun ended with status: {result.status.value}", "yellow")
            sys.exit(1)

    except KeyboardInterrupt:
        print_msg("\nRun cancelled by user", "yellow")
        sys.exit(130)
    except Exception as e:
        print_msg(f"\nError running workflow: {e}", "red")
        if verbose:
            import traceback

            traceback.print_exc()
        sys.exit(1)


@cli.command("validate")
@click.argument("project_path", type=click.Path(exists=True), default=".")
@click.option(
    "--format",
    "-f",
    "output_format",
    type=click.Choice(["json", "yaml", "summary"]),
    default="summary",
    help="Output format (default: summary)",
)
def validate_command(project_path: str, output_format: str):
    """Validate an ADKFlow workflow without executing it.

    Checks for:
    - Valid project structure (manifest.json, pages/)
    - Missing file references (prompts, tools)
    - Cycles in sequential flow
    - Invalid agent configurations

    Examples:
        adkflow-runner validate .
        adkflow-runner validate /path/to/project
        adkflow-runner validate . --format json
    """
    from adkflow_runner.compiler import Compiler

    compiler = Compiler()

    try:
        # Load and parse
        project = compiler.load(Path(project_path).resolve())
        parsed = compiler.parse(project)
        graph = compiler.build_graph(parsed)

        # Validate
        result = compiler.validate_graph(graph, project)

        if output_format == "json":
            output = {
                "valid": result.valid,
                "errors": [str(e) for e in result.errors],
                "warnings": result.warnings,
            }
            print(json.dumps(output, indent=2))
        elif output_format == "yaml":
            print(f"valid: {result.valid}")
            if result.errors:
                print("errors:")
                for e in result.errors:
                    print(f"  - {e}")
            if result.warnings:
                print("warnings:")
                for w in result.warnings:
                    print(f"  - {w}")
        else:
            # Summary format
            if result.valid:
                print_panel("Workflow is valid", "bold green")
            else:
                print_panel("Workflow has errors", "bold red")

            if result.errors:
                print_msg("\nErrors:", "red")
                for e in result.errors:
                    print_msg(f"  • {e}", "red")

            if result.warnings:
                print_msg("\nWarnings:", "yellow")
                for w in result.warnings:
                    print_msg(f"  • {w}", "yellow")

            # Summary stats
            print_msg("")
            print_msg(f"Agents: {len(graph.get_agent_nodes())}")
            print_msg(f"Tabs: {len(project.tabs)}")
            print_msg(f"Teleporter pairs: {len(graph.teleporter_pairs)}")

        sys.exit(0 if result.valid else 1)

    except Exception as e:
        if output_format == "json":
            print(json.dumps({"valid": False, "errors": [str(e)], "warnings": []}))
        else:
            print_msg(f"Validation failed: {e}", "red")
        sys.exit(1)


def main():
    """Entry point for adkflow-runner CLI."""
    cli()


if __name__ == "__main__":
    main()
