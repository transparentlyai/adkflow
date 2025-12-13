#!/usr/bin/env python3
"""
ADKFlow Codebase Scanner CLI

Usage:
    python -m scanner.cli /path/to/codebase [--output /path/to/output]

Environment Variables:
    GOOGLE_API_KEY      - Google API key for Gemini API access
    SCANNER_MODEL       - Model to use (default: gemini-2.5-flash)

For Vertex AI authentication:
    GOOGLE_CLOUD_PROJECT  - GCP project ID
    GOOGLE_CLOUD_LOCATION - GCP region (e.g., us-central1)
    GOOGLE_GENAI_USE_VERTEXAI=true
"""

import argparse
import asyncio
import os
import sys
from pathlib import Path

from google.genai import types
from prompt_toolkit.styles import Style
from rich.console import Console
from rich.markdown import Markdown
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.prompt import Confirm, Prompt
from rich.table import Table
from rich.text import Text

# Rich console for output
console = Console()

# Custom style for prompt-toolkit
pt_style = Style.from_dict(
    {
        "dialog": "bg:#1a1a2e",
        "dialog.body": "bg:#16213e",
        "dialog frame.label": "bg:#0f3460 #ffffff",
        "radiolist": "bg:#16213e",
        "button": "bg:#e94560",
        "button.focused": "bg:#ff6b6b",
    }
)


def show_welcome():
    """Display welcome message and banner."""
    console.clear()

    banner = """
    ╔═══════════════════════════════════════════════════════════════╗
    ║                                                               ║
    ║              🔍  ADKFlow Codebase Scanner  🔍                 ║
    ║                                                               ║
    ║     AI-powered tool for generating ADKFlow projects from      ║
    ║     Google ADK codebases                                      ║
    ║                                                               ║
    ╚═══════════════════════════════════════════════════════════════╝
    """

    console.print(Text(banner, style="bold cyan"))
    console.print()


def show_scan_summary(codebase_path: str, output_path: str):
    """Display scan configuration summary."""
    table = Table(title="Scan Configuration", show_header=False, border_style="cyan")
    table.add_column("Setting", style="bold white")
    table.add_column("Value", style="green")

    table.add_row("Codebase Path", str(codebase_path))
    table.add_row("Output Directory", str(output_path))
    table.add_row("Model", os.environ.get("SCANNER_MODEL", "gemini-2.5-flash"))

    console.print(table)
    console.print()


def check_credentials():
    """Check and prompt for Google API credentials if not configured."""
    has_api_key = bool(os.environ.get("GOOGLE_API_KEY"))
    has_vertex = os.environ.get(
        "GOOGLE_GENAI_USE_VERTEXAI", ""
    ).lower() == "true" and os.environ.get("GOOGLE_CLOUD_PROJECT")

    if has_api_key or has_vertex:
        return True

    console.print(
        Panel(
            "[yellow]Google API credentials not found in environment.[/yellow]\n\n"
            "You need to authenticate with Google to use the scanner.",
            title="Authentication Required",
            border_style="yellow",
        )
    )
    console.print()

    # Use rich prompt for selection
    auth_method = Prompt.ask(
        "Choose authentication method", choices=["api-key", "vertex-ai", "exit"], default="api-key"
    )

    if auth_method == "api-key":
        api_key = Prompt.ask("Enter your Google API key", password=True)
        if not api_key:
            console.print("[red]API key cannot be empty.[/red]")
            return False
        os.environ["GOOGLE_API_KEY"] = api_key
        console.print("[green]✓ API key configured for this session.[/green]")
        console.print()
        return True

    elif auth_method == "vertex-ai":
        project = Prompt.ask("Enter GCP project ID")
        if not project:
            console.print("[red]Project ID cannot be empty.[/red]")
            return False

        location = Prompt.ask("Enter GCP location", default="us-central1")

        os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "true"
        os.environ["GOOGLE_CLOUD_PROJECT"] = project
        os.environ["GOOGLE_CLOUD_LOCATION"] = location
        console.print(
            f"[green]✓ Vertex AI configured: project={project}, location={location}[/green]"
        )
        console.print()
        return True

    else:
        console.print("[yellow]Exiting.[/yellow]")
        return False


def get_user_guidance() -> dict:
    """Prompt user for additional guidance to help the agents."""
    guidance = {
        "additional_context": "",
        "grouping_preference": "auto",
        "tab_suggestions": [],
        "exclude_patterns": [],
    }

    console.print(
        Panel(
            "Before scanning, you can provide additional guidance to help the AI agents "
            "better understand your codebase and generate a more accurate ADKFlow project.\n\n"
            "[dim]Press Enter to skip any question.[/dim]",
            title="Pre-Scan Configuration",
            border_style="blue",
        )
    )
    console.print()

    # Additional context
    console.print("[bold]1. Additional Context[/bold]")
    console.print(
        "[dim]Describe your codebase structure, naming conventions, or any special considerations.[/dim]"
    )

    additional_context = Prompt.ask("Additional context", default="", show_default=False)
    if additional_context:
        guidance["additional_context"] = additional_context
    console.print()

    # Grouping preference
    console.print("[bold]2. Agent Grouping Preference[/bold]")
    console.print("[dim]How should agents be organized into groups/tabs?[/dim]")

    grouping = Prompt.ask(
        "Grouping strategy", choices=["auto", "by-module", "by-function", "flat"], default="auto"
    )
    guidance["grouping_preference"] = grouping
    console.print()

    # Tab suggestions
    console.print("[bold]3. Suggested Tab Names[/bold]")
    console.print("[dim]Enter comma-separated tab names, or leave empty for auto-detection.[/dim]")

    tabs_input = Prompt.ask("Tab names", default="", show_default=False)
    if tabs_input:
        guidance["tab_suggestions"] = [t.strip() for t in tabs_input.split(",") if t.strip()]
    console.print()

    # Exclude patterns
    console.print("[bold]4. Exclude Patterns[/bold]")
    console.print(
        "[dim]Patterns to exclude from scanning (e.g., tests, examples). Comma-separated.[/dim]"
    )

    exclude_input = Prompt.ask("Exclude patterns", default="", show_default=False)
    if exclude_input:
        guidance["exclude_patterns"] = [p.strip() for p in exclude_input.split(",") if p.strip()]
    console.print()

    # Show summary if any guidance provided
    if any(
        [
            guidance["additional_context"],
            guidance["grouping_preference"] != "auto",
            guidance["tab_suggestions"],
            guidance["exclude_patterns"],
        ]
    ):
        table = Table(title="Your Guidance", show_header=False, border_style="green")
        table.add_column("Setting", style="bold")
        table.add_column("Value", style="cyan")

        if guidance["additional_context"]:
            context_preview = (
                guidance["additional_context"][:50] + "..."
                if len(guidance["additional_context"]) > 50
                else guidance["additional_context"]
            )
            table.add_row("Context", context_preview)
        table.add_row("Grouping", guidance["grouping_preference"])
        if guidance["tab_suggestions"]:
            table.add_row("Tabs", ", ".join(guidance["tab_suggestions"]))
        if guidance["exclude_patterns"]:
            table.add_row("Exclude", ", ".join(guidance["exclude_patterns"]))

        console.print(table)
        console.print()

    return guidance


async def run_scanner(
    codebase_path: str, output_path: str | None = None, user_guidance: dict | None = None
):
    """Run the scanner on a codebase."""
    # Import after credential check to avoid early initialization errors
    from google.adk.runners import Runner
    from google.adk.sessions import InMemorySessionService

    from scanner.agent import root_agent

    session_service = InMemorySessionService()

    runner = Runner(agent=root_agent, app_name="adkflow_scanner", session_service=session_service)

    # Default output path
    if output_path is None:
        output_path = str(Path.home() / "adkworkflows" / Path(codebase_path).name)

    # Initialize session state with user guidance
    initial_state = {
        "codebase_path": str(Path(codebase_path).resolve()),
        "output_path": output_path,
        "user_preferences": user_guidance or {},
    }

    # Add guidance to state if provided
    if user_guidance:
        if user_guidance.get("additional_context"):
            initial_state["user_context"] = user_guidance["additional_context"]
        if user_guidance.get("grouping_preference"):
            initial_state["grouping_preference"] = user_guidance["grouping_preference"]
        if user_guidance.get("tab_suggestions"):
            initial_state["suggested_tabs"] = user_guidance["tab_suggestions"]
        if user_guidance.get("exclude_patterns"):
            initial_state["exclude_patterns"] = user_guidance["exclude_patterns"]

    show_scan_summary(codebase_path, output_path)

    # Confirm to proceed
    if not Confirm.ask("Start scanning?", default=True):
        console.print("[yellow]Scan cancelled.[/yellow]")
        return

    console.print()
    console.print(Panel("[bold green]Starting scan...[/bold green]", border_style="green"))
    console.print()

    # Create session with initial state
    await session_service.create_session(
        app_name="adkflow_scanner",
        user_id="cli_user",
        session_id="scan_session",
        state=initial_state,
    )

    # Create initial message with user guidance
    message_parts = [
        f"Scan and analyze the codebase at {codebase_path} to discover all ADK agents, prompts, tools, and configurations."
    ]

    if user_guidance:
        if user_guidance.get("additional_context"):
            message_parts.append(f"\nAdditional context: {user_guidance['additional_context']}")
        if user_guidance.get("grouping_preference") != "auto":
            message_parts.append(f"\nGrouping preference: {user_guidance['grouping_preference']}")
        if user_guidance.get("tab_suggestions"):
            message_parts.append(f"\nSuggested tabs: {', '.join(user_guidance['tab_suggestions'])}")
        if user_guidance.get("exclude_patterns"):
            message_parts.append(
                f"\nExclude patterns: {', '.join(user_guidance['exclude_patterns'])}"
            )

    content = types.Content(role="user", parts=[types.Part(text="\n".join(message_parts))])

    # Run the scanner with progress display
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
        transient=True,
    ) as progress:
        progress.add_task("Analyzing codebase...", total=None)

        async for event in runner.run_async(
            user_id="cli_user", session_id="scan_session", new_message=content
        ):
            # Display agent output
            if event.content:
                for part in event.content.parts:
                    if hasattr(part, "text") and part.text:
                        progress.stop()
                        console.print(Markdown(part.text))
                        progress.start()

            # Handle pending questions
            if event.actions and event.actions.state_delta:
                pending = event.actions.state_delta.get("pending_question")
                if pending:
                    progress.stop()

                    console.print()
                    console.print(
                        Panel(pending["question"], title="Agent Question", border_style="yellow")
                    )

                    if pending.get("options"):
                        choices = pending["options"]
                        if pending.get("allow_custom", True):
                            choices = choices + ["other"]

                        user_input = Prompt.ask(
                            "Your answer",
                            choices=choices if not pending.get("allow_custom", True) else None,
                            default=choices[0] if choices else None,
                        )
                    else:
                        user_input = Prompt.ask("Your answer")

                    event.actions.state_delta["user_response"] = user_input
                    console.print()
                    progress.start()

    console.print()

    # Phase 2: Generate project directly in Python (bypasses LLM unreliability)
    console.print(
        Panel("[bold blue]Generating ADKFlow project...[/bold blue]", border_style="blue")
    )

    # Get session state after agents complete
    session = await session_service.get_session(
        app_name="adkflow_scanner", user_id="cli_user", session_id="scan_session"
    )

    if not session:
        console.print(
            Panel("[bold red]✗ Session not found![/bold red]", title="Error", border_style="red")
        )
        return

    # Import and call generate_project directly
    from scanner.tools.output import generate_project_from_state

    result = generate_project_from_state(
        output_path=output_path,
        discovery_results=session.state.get("discovery_results", ""),
        analysis_results=session.state.get("analysis_results", ""),
    )

    if result["success"]:
        console.print(
            Panel(
                f"[bold green]✓ Project generated successfully![/bold green]\n\n"
                f"Output directory: [cyan]{output_path}[/cyan]\n"
                f"Files created: {result['file_count']}\n"
                f"Tabs: {result['tabs_created']}\n\n"
                f"[dim]Open the project in ADKFlow to visualize your agents.[/dim]",
                title="Complete",
                border_style="green",
            )
        )
    else:
        console.print(
            Panel(
                f"[bold red]✗ Project generation failed![/bold red]\n\n"
                f"Error: {result.get('error', 'Unknown error')}\n\n"
                f"[dim]Discovery results: {len(session.state.get('discovery_results', ''))} chars\n"
                f"Analysis results: {len(session.state.get('analysis_results', ''))} chars[/dim]",
                title="Error",
                border_style="red",
            )
        )


def main():
    parser = argparse.ArgumentParser(
        description="Scan codebase and generate ADKFlow project",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Environment Variables:
  GOOGLE_API_KEY          Google API key for Gemini API
  GOOGLE_GENAI_USE_VERTEXAI  Set to 'true' for Vertex AI
  GOOGLE_CLOUD_PROJECT    GCP project (for Vertex AI)
  GOOGLE_CLOUD_LOCATION   GCP region (for Vertex AI)
  SCANNER_MODEL           Model to use (default: gemini-2.5-flash)

Examples:
  adkflow-scanner /path/to/codebase
  adkflow-scanner /path/to/codebase --output ~/adkworkflows/myproject
  adkflow-scanner /path/to/codebase --skip-guidance
""",
    )
    parser.add_argument("codebase_path", help="Path to the codebase to scan")
    parser.add_argument("--output", "-o", help="Output directory for generated project")
    parser.add_argument(
        "--model",
        default=os.environ.get("SCANNER_MODEL", "gemini-2.5-flash"),
        help="Model to use (default: gemini-2.5-flash)",
    )
    parser.add_argument(
        "--skip-guidance", action="store_true", help="Skip the pre-scan guidance prompts"
    )

    args = parser.parse_args()

    # Show welcome banner
    show_welcome()

    # Validate codebase path
    codebase_path = Path(args.codebase_path).resolve()
    if not codebase_path.exists():
        console.print(f"[red]Error: Codebase path does not exist: {args.codebase_path}[/red]")
        sys.exit(1)

    console.print(f"[dim]Target codebase:[/dim] [bold]{codebase_path}[/bold]")
    console.print()

    # Check credentials - will prompt user if not found
    if not check_credentials():
        sys.exit(1)

    # Set model in environment for agents to use
    os.environ["SCANNER_MODEL"] = args.model

    # Get user guidance unless skipped
    user_guidance = None
    if not args.skip_guidance:
        user_guidance = get_user_guidance()

    # Determine output path
    output_path = args.output
    if not output_path:
        # Suggest default based on codebase name
        default_output = str(Path.home() / "adkworkflows" / codebase_path.name)
        console.print("[bold]5. Output Directory[/bold]")
        console.print("[dim]Where should the ADKFlow project be saved?[/dim]")
        output_path = Prompt.ask(
            "Output path",
            default=default_output,
        )
        console.print()

    # Run the scanner
    asyncio.run(run_scanner(args.codebase_path, output_path, user_guidance))


if __name__ == "__main__":
    main()
