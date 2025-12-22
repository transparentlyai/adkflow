"""Console callbacks for CLI output.

Uses Rich library for beautiful terminal output.
"""

from typing import TYPE_CHECKING

from adkflow_runner.runner.workflow_runner import EventType, RunEvent

if TYPE_CHECKING:
    from rich.console import Console as RichConsole

try:
    from rich.console import Console
    from rich.panel import Panel

    HAS_RICH = True
except ImportError:
    HAS_RICH = False
    Console = None  # type: ignore[assignment, misc]
    Panel = None  # type: ignore[assignment, misc]


class ConsoleCallbacks:
    """Rich console output for CLI.

    Provides colored, formatted output during workflow execution.
    """

    console: "RichConsole | None"

    def __init__(self, verbose: bool = False, quiet: bool = False):
        self.verbose = verbose
        self.quiet = quiet

        if HAS_RICH and Console is not None:
            self.console = Console()
        else:
            self.console = None

        self._current_agent: str | None = None

    async def on_event(self, event: RunEvent) -> None:
        """Handle an execution event."""
        if self.quiet:
            return

        if HAS_RICH and self.console is not None:
            await self._handle_rich(event)
        else:
            await self._handle_plain(event)

    async def _handle_rich(self, event: RunEvent) -> None:
        """Handle event with Rich formatting."""
        assert self.console is not None
        assert Panel is not None

        if event.type == EventType.RUN_START:
            self.console.print()
            self.console.print(
                Panel(
                    f"[bold]Running workflow[/bold]\n"
                    f"Project: {event.data.get('project_path', 'unknown')}\n"
                    f"Run ID: {event.data.get('run_id', 'unknown')}",
                    title="[cyan]ADKFlow[/cyan]",
                    border_style="cyan",
                )
            )
            self.console.print()

        elif event.type == EventType.AGENT_START:
            agent_name = event.agent_name or "unknown"
            self._current_agent = agent_name
            self.console.print(
                f"[bold blue]▶[/bold blue] Agent: [bold]{agent_name}[/bold]"
            )

        elif event.type == EventType.AGENT_OUTPUT:
            output = event.data.get("output", "")
            if output:
                # Indent output under current agent
                for line in output.split("\n"):
                    self.console.print(f"  [dim]│[/dim] {line}")

        elif event.type == EventType.AGENT_END:
            agent_name = event.agent_name or self._current_agent or "unknown"
            self.console.print(
                f"[bold green]✓[/bold green] Agent completed: [bold]{agent_name}[/bold]"
            )
            self.console.print()

        elif event.type == EventType.TOOL_CALL:
            tool_name = event.data.get("tool_name", "unknown")
            self.console.print(
                f"  [yellow]⚡[/yellow] Tool: [italic]{tool_name}[/italic]"
            )

        elif event.type == EventType.TOOL_RESULT:
            if self.verbose:
                tool_name = event.data.get("tool_name", "unknown")
                self.console.print(
                    f"  [green]✓[/green] Tool result: [italic]{tool_name}[/italic]"
                )

        elif event.type == EventType.THINKING:
            if self.verbose:
                self.console.print("  [dim]💭 Thinking...[/dim]")

        elif event.type == EventType.ERROR:
            error = event.data.get("error", "Unknown error")
            self.console.print()
            self.console.print(
                Panel(
                    f"[bold red]{error}[/bold red]",
                    title="[red]Error[/red]",
                    border_style="red",
                )
            )

        elif event.type == EventType.RUN_COMPLETE:
            output = event.data.get("output", "")
            self.console.print()
            self.console.print("[bold green]━━━ Run Complete ━━━[/bold green]")
            if output:
                self.console.print()
                self.console.print(
                    Panel(
                        output[:1000] + ("..." if len(output) > 1000 else ""),
                        title="[green]Output[/green]",
                        border_style="green",
                    )
                )

    async def _handle_plain(self, event: RunEvent) -> None:
        """Handle event with plain text output."""
        if event.type == EventType.RUN_START:
            print()
            print("=" * 50)
            print("Running workflow")
            print(f"Project: {event.data.get('project_path', 'unknown')}")
            print(f"Run ID: {event.data.get('run_id', 'unknown')}")
            print("=" * 50)
            print()

        elif event.type == EventType.AGENT_START:
            agent_name = event.agent_name or "unknown"
            self._current_agent = agent_name
            print(f"▶ Agent: {agent_name}")

        elif event.type == EventType.AGENT_OUTPUT:
            output = event.data.get("output", "")
            if output:
                for line in output.split("\n"):
                    print(f"  │ {line}")

        elif event.type == EventType.AGENT_END:
            agent_name = event.agent_name or self._current_agent or "unknown"
            print(f"✓ Agent completed: {agent_name}")
            print()

        elif event.type == EventType.TOOL_CALL:
            tool_name = event.data.get("tool_name", "unknown")
            print(f"  ⚡ Tool: {tool_name}")

        elif event.type == EventType.TOOL_RESULT:
            if self.verbose:
                tool_name = event.data.get("tool_name", "unknown")
                print(f"  ✓ Tool result: {tool_name}")

        elif event.type == EventType.ERROR:
            error = event.data.get("error", "Unknown error")
            print()
            print("ERROR:", error)

        elif event.type == EventType.RUN_COMPLETE:
            output = event.data.get("output", "")
            print()
            print("━━━ Run Complete ━━━")
            if output:
                print()
                print("Output:")
                print(output[:1000] + ("..." if len(output) > 1000 else ""))
