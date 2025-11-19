"""CLI interface for ADKFlow workflow runner."""

import click
from pathlib import Path
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.syntax import Syntax

from adkflow.parser import parse_workflow, validate_workflow, extract_variables
from adkflow.executor import WorkflowExecutor
from adkflow.variable_resolver import resolve_variables

console = Console()


@click.group()
@click.version_option(version="0.1.0")
def cli():
    """ADKFlow - Run Google ADK workflows from YAML files."""
    pass


@cli.command()
@click.argument("workflow_file", type=click.Path(exists=True))
@click.option(
    "--var",
    multiple=True,
    help="Runtime variables in key=value format (can be used multiple times)",
)
@click.option(
    "--api-key",
    envvar="GOOGLE_API_KEY",
    help="Google API key for ADK (or set GOOGLE_API_KEY environment variable)",
)
@click.option("--verbose", "-v", is_flag=True, help="Enable verbose output")
def run(workflow_file: str, var: tuple, api_key: str, verbose: bool):
    """Run a workflow from a YAML file.

    Example:
        adkflow run workflow.yaml --var user_input="Hello" --var max_tokens=1000
        adkflow run workflow.yaml --api-key YOUR_API_KEY --verbose
    """
    try:
        # Check for API key
        if not api_key:
            console.print(
                "[red]Error: Google API key is required.[/red]\n"
                "[yellow]Set GOOGLE_API_KEY environment variable or use --api-key option.[/yellow]"
            )
            raise click.Abort()

        # Parse variables from --var options
        variables = {}
        for v in var:
            if "=" not in v:
                console.print(f"[red]Error: Invalid variable format '{v}'. Use key=value[/red]")
                return
            key, value = v.split("=", 1)
            variables[key.strip()] = value.strip()

        if verbose:
            console.print(f"[blue]Loading workflow from {workflow_file}...[/blue]")

        # Parse workflow
        workflow = parse_workflow(workflow_file)

        if verbose:
            console.print(f"[blue]Validating workflow...[/blue]")

        # Validate workflow
        if not validate_workflow(workflow):
            console.print("[red]Workflow validation failed![/red]")
            return

        # Extract required variables
        required_vars = extract_variables(workflow)
        missing_vars = [v for v in required_vars if v not in variables]

        if missing_vars:
            console.print(f"[yellow]Warning: Missing variables: {', '.join(missing_vars)}[/yellow]")

        if verbose and variables:
            console.print(f"[blue]Variables: {variables}[/blue]")

        # Execute workflow
        console.print(Panel.fit("Starting workflow execution", style="bold green"))
        executor = WorkflowExecutor(api_key=api_key, verbose=verbose)
        result = executor.execute_workflow(workflow, variables)

        console.print(Panel.fit("Workflow completed successfully", style="bold green"))

        if result:
            console.print("\n[bold]Result:[/bold]")
            console.print(result)

    except Exception as e:
        console.print(f"[red]Error: {str(e)}[/red]")
        if verbose:
            import traceback
            console.print(traceback.format_exc())
        raise click.Abort()


@cli.command()
@click.argument("workflow_file", type=click.Path(exists=True))
def validate(workflow_file: str):
    """Validate a workflow YAML file.

    Example:
        adkflow validate workflow.yaml
    """
    try:
        console.print(f"[blue]Validating {workflow_file}...[/blue]")

        # Parse workflow
        workflow = parse_workflow(workflow_file)

        # Validate workflow
        if validate_workflow(workflow):
            console.print("[green]✓ Workflow is valid![/green]")

            # Show workflow summary
            table = Table(title="Workflow Summary")
            table.add_column("Property", style="cyan")
            table.add_column("Value", style="white")

            table.add_row("Name", workflow.get("name", "N/A"))
            table.add_row("Description", workflow.get("description", "N/A"))

            if "agents" in workflow:
                table.add_row("Agents", str(len(workflow["agents"])))

            # Extract and show required variables
            required_vars = extract_variables(workflow)
            if required_vars:
                table.add_row("Required Variables", ", ".join(required_vars))

            console.print(table)
        else:
            console.print("[red]✗ Workflow validation failed![/red]")
            raise click.Abort()

    except Exception as e:
        console.print(f"[red]Error: {str(e)}[/red]")
        raise click.Abort()


@cli.command()
def list_tools():
    """List available ADK tools that can be used in workflows.

    Example:
        adkflow list-tools
    """
    from adkflow.tools import get_tool_descriptions

    table = Table(title="Available ADK Tools")
    table.add_column("Tool Name", style="cyan")
    table.add_column("Description", style="white")

    descriptions = get_tool_descriptions()

    for name, description in sorted(descriptions.items()):
        table.add_row(name, description)

    console.print(table)
    console.print(f"\n[green]Total tools available: {len(descriptions)}[/green]")


if __name__ == "__main__":
    cli()
