"""CLI interface for ADKFlow workflow runner and development server."""

import click
import os
import signal
import subprocess
import sys
import threading
import time
from pathlib import Path
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

console = Console()

# Default ports
DEFAULT_BACKEND_PORT = 8000
DEFAULT_FRONTEND_PORT = 3000


def get_project_root() -> Path:
    """Find the ADKFlow project root directory."""
    current = Path.cwd()

    # Check if we're already in the project root
    if (current / "backend").exists() and (current / "frontend").exists():
        return current

    # Check if we're in flow-runner
    if current.name == "flow-runner" and (current.parent / "backend").exists():
        return current.parent

    # Check parent directories
    for parent in current.parents:
        if (parent / "backend").exists() and (parent / "frontend").exists():
            return parent

    return current


@click.group()
@click.version_option(version="0.1.0")
def cli():
    """ADKFlow - Visual workflow builder and runner for Google ADK agents."""
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
                console.print(
                    f"[red]Error: Invalid variable format '{v}'. Use key=value[/red]"
                )
                return
            key, value = v.split("=", 1)
            variables[key.strip()] = value.strip()

        # Import here to avoid loading heavy dependencies for dev commands
        from adkflow.parser import parse_workflow, validate_workflow, extract_variables
        from adkflow.executor import WorkflowExecutor

        if verbose:
            console.print(f"[blue]Loading workflow from {workflow_file}...[/blue]")

        # Parse workflow
        workflow = parse_workflow(workflow_file)

        if verbose:
            console.print("[blue]Validating workflow...[/blue]")

        # Validate workflow
        if not validate_workflow(workflow):
            console.print("[red]Workflow validation failed![/red]")
            return

        # Extract required variables
        required_vars = extract_variables(workflow)
        missing_vars = [v for v in required_vars if v not in variables]

        if missing_vars:
            console.print(
                f"[yellow]Warning: Missing variables: {', '.join(missing_vars)}[/yellow]"
            )

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
        from adkflow.parser import parse_workflow, validate_workflow, extract_variables

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


# =============================================================================
# Development Server Commands
# =============================================================================


def start_backend_server(project_root: Path, port: int) -> subprocess.Popen:
    """Start the backend server."""
    backend_dir = project_root / "backend"
    venv_path = backend_dir / "venv"

    # Create venv if it doesn't exist
    if not venv_path.exists():
        console.print("[blue]Creating backend virtual environment...[/blue]")
        subprocess.run([sys.executable, "-m", "venv", str(venv_path)], check=True)

    # Install dependencies
    pip_path = venv_path / "bin" / "pip"
    console.print("[blue]Installing backend dependencies...[/blue]")
    subprocess.run(
        [str(pip_path), "install", "-q", "--upgrade", "pip"],
        check=True,
        capture_output=True,
    )
    subprocess.run(
        [
            str(pip_path),
            "install",
            "-q",
            "fastapi",
            "uvicorn[standard]",
            "pydantic>=2.0",
            "pyyaml",
            "python-multipart",
        ],
        check=True,
        capture_output=True,
    )

    # Start server
    python_path = venv_path / "bin" / "python"
    env = os.environ.copy()
    env["PYTHONPATH"] = str(project_root)
    env["BACKEND_PORT"] = str(port)

    return subprocess.Popen(
        [str(python_path), "-m", "backend.src.main"],
        cwd=str(project_root),
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )


def start_frontend_server(
    project_root: Path, frontend_port: int, backend_port: int, dev_mode: bool = True
) -> subprocess.Popen:
    """Start the frontend server."""
    frontend_dir = project_root / "frontend"

    # Install dependencies if needed
    if not (frontend_dir / "node_modules").exists():
        console.print("[blue]Installing frontend dependencies...[/blue]")
        subprocess.run(["npm", "install"], cwd=str(frontend_dir), check=True)

    # Write .env.local
    env_file = frontend_dir / ".env.local"
    env_file.write_text(f"NEXT_PUBLIC_API_URL=http://localhost:{backend_port}\n")

    if dev_mode:
        # Start dev server
        return subprocess.Popen(
            ["npm", "run", "dev", "--", "-p", str(frontend_port)],
            cwd=str(frontend_dir),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
    else:
        # Build if needed
        next_dir = frontend_dir / ".next"
        if not next_dir.exists():
            console.print("[blue]Building frontend...[/blue]")
            subprocess.run(["npm", "run", "build"], cwd=str(frontend_dir), check=True)

        # Start production server
        return subprocess.Popen(
            ["npm", "run", "start", "--", "-p", str(frontend_port)],
            cwd=str(frontend_dir),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )


@cli.command()
@click.option(
    "--backend-port",
    "-b",
    default=DEFAULT_BACKEND_PORT,
    help=f"Backend port (default: {DEFAULT_BACKEND_PORT})",
)
@click.option(
    "--frontend-port",
    "-f",
    default=DEFAULT_FRONTEND_PORT,
    help=f"Frontend port (default: {DEFAULT_FRONTEND_PORT})",
)
def dev(backend_port: int, frontend_port: int):
    """Start both backend and frontend development servers.

    Example:
        adkflow dev
        adkflow dev --backend-port 8080 --frontend-port 3001
    """
    project_root = get_project_root()

    if not (project_root / "backend").exists():
        console.print("[red]Error: backend directory not found[/red]")
        console.print("Please run this command from the adkflow project root")
        raise click.Abort()

    console.print(
        Panel.fit("Starting ADKFlow Development Environment", style="bold blue")
    )
    console.print(f"  Backend port:  {backend_port}")
    console.print(f"  Frontend port: {frontend_port}")
    console.print()

    backend_proc = None
    frontend_proc = None

    def cleanup(signum=None, frame=None):
        console.print("\n[yellow]Shutting down servers...[/yellow]")
        for proc in [backend_proc, frontend_proc]:
            if proc and proc.poll() is None:
                proc.terminate()
                try:
                    proc.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    proc.kill()
        # Kill any remaining processes
        subprocess.run(
            ["pkill", "-f", "python -m backend.src.main"], capture_output=True
        )
        subprocess.run(["pkill", "-f", "next dev"], capture_output=True)
        console.print("[green]Servers stopped[/green]")
        sys.exit(0)

    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    try:
        # Start backend
        console.print("[blue]Starting backend server...[/blue]")
        backend_proc = start_backend_server(project_root, backend_port)
        time.sleep(3)

        if backend_proc.poll() is not None:
            console.print("[red]Backend failed to start[/red]")
            if backend_proc.stdout:
                console.print(backend_proc.stdout.read().decode())
            raise click.Abort()

        # Start frontend
        console.print("[blue]Starting frontend server...[/blue]")
        frontend_proc = start_frontend_server(project_root, frontend_port, backend_port)
        time.sleep(3)

        if frontend_proc.poll() is not None:
            console.print("[red]Frontend failed to start[/red]")
            if frontend_proc.stdout:
                console.print(frontend_proc.stdout.read().decode())
            cleanup()
            raise click.Abort()

        console.print()
        console.print(Panel.fit("Development environment started!", style="bold green"))
        console.print()
        console.print("[bold]Servers running:[/bold]")
        console.print(f"  Backend:  http://localhost:{backend_port}")
        console.print(f"  Frontend: http://localhost:{frontend_port}")
        console.print(f"  API docs: http://localhost:{backend_port}/docs")
        console.print()
        console.print("[dim]Press Ctrl+C to stop all servers[/dim]")
        console.print()

        # Stream logs from both processes
        def stream_output(proc, prefix, style):
            while proc.poll() is None:
                if proc.stdout:
                    line = proc.stdout.readline()
                    if line:
                        console.print(
                            f"[{style}]{prefix}[/{style}] {line.decode().rstrip()}"
                        )

        backend_thread = threading.Thread(
            target=stream_output, args=(backend_proc, "[BE]", "cyan"), daemon=True
        )
        frontend_thread = threading.Thread(
            target=stream_output, args=(frontend_proc, "[FE]", "magenta"), daemon=True
        )
        backend_thread.start()
        frontend_thread.start()

        # Wait for processes
        while True:
            if backend_proc.poll() is not None:
                console.print("[red]Backend server stopped unexpectedly[/red]")
                cleanup()
            if frontend_proc.poll() is not None:
                console.print("[red]Frontend server stopped unexpectedly[/red]")
                cleanup()
            time.sleep(1)

    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        cleanup()


@cli.command()
@click.option(
    "--backend-port",
    "-b",
    default=DEFAULT_BACKEND_PORT,
    help=f"Backend port (default: {DEFAULT_BACKEND_PORT})",
)
@click.option(
    "--frontend-port",
    "-f",
    default=DEFAULT_FRONTEND_PORT,
    help=f"Frontend port (default: {DEFAULT_FRONTEND_PORT})",
)
@click.option(
    "--build/--no-build",
    default=True,
    help="Build frontend before starting (default: True)",
)
def start(backend_port: int, frontend_port: int, build: bool):
    """Start both backend and frontend in production mode.

    Example:
        adkflow start
        adkflow start --backend-port 8080 --frontend-port 3001
        adkflow start --no-build  # Skip rebuild if already built
    """
    project_root = get_project_root()

    if not (project_root / "backend").exists():
        console.print("[red]Error: backend directory not found[/red]")
        console.print("Please run this command from the adkflow project root")
        raise click.Abort()

    console.print(Panel.fit("Starting ADKFlow (Production Mode)", style="bold blue"))
    console.print(f"  Backend port:  {backend_port}")
    console.print(f"  Frontend port: {frontend_port}")
    console.print()

    backend_proc = None
    frontend_proc = None

    def cleanup(signum=None, frame=None):
        console.print("\n[yellow]Shutting down servers...[/yellow]")
        for proc in [backend_proc, frontend_proc]:
            if proc and proc.poll() is None:
                proc.terminate()
                try:
                    proc.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    proc.kill()
        subprocess.run(
            ["pkill", "-f", "python -m backend.src.main"], capture_output=True
        )
        subprocess.run(["pkill", "-f", "next start"], capture_output=True)
        console.print("[green]Servers stopped[/green]")
        sys.exit(0)

    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    try:
        # Start backend
        console.print("[blue]Starting backend server...[/blue]")
        backend_proc = start_backend_server(project_root, backend_port)
        time.sleep(3)

        if backend_proc.poll() is not None:
            console.print("[red]Backend failed to start[/red]")
            if backend_proc.stdout:
                console.print(backend_proc.stdout.read().decode())
            raise click.Abort()

        # Build and start frontend
        frontend_dir = project_root / "frontend"
        if build or not (frontend_dir / ".next").exists():
            console.print("[blue]Building frontend...[/blue]")
            # Write .env.local before build
            env_file = frontend_dir / ".env.local"
            env_file.write_text(
                f"NEXT_PUBLIC_API_URL=http://localhost:{backend_port}\n"
            )
            subprocess.run(["npm", "run", "build"], cwd=str(frontend_dir), check=True)

        console.print("[blue]Starting frontend server...[/blue]")
        frontend_proc = start_frontend_server(
            project_root, frontend_port, backend_port, dev_mode=False
        )
        time.sleep(3)

        if frontend_proc.poll() is not None:
            console.print("[red]Frontend failed to start[/red]")
            if frontend_proc.stdout:
                console.print(frontend_proc.stdout.read().decode())
            cleanup()
            raise click.Abort()

        console.print()
        console.print(Panel.fit("ADKFlow started!", style="bold green"))
        console.print()
        console.print("[bold]Servers running:[/bold]")
        console.print(f"  Backend:  http://localhost:{backend_port}")
        console.print(f"  Frontend: http://localhost:{frontend_port}")
        console.print(f"  API docs: http://localhost:{backend_port}/docs")
        console.print()
        console.print("[dim]Press Ctrl+C to stop all servers[/dim]")

        # Wait for processes
        while True:
            if backend_proc.poll() is not None:
                console.print("[red]Backend server stopped unexpectedly[/red]")
                cleanup()
            if frontend_proc.poll() is not None:
                console.print("[red]Frontend server stopped unexpectedly[/red]")
                cleanup()
            time.sleep(1)

    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        cleanup()


@cli.command()
@click.option(
    "--port",
    "-p",
    default=DEFAULT_BACKEND_PORT,
    help=f"Backend port (default: {DEFAULT_BACKEND_PORT})",
)
def backend(port: int):
    """Start only the backend server.

    Example:
        adkflow backend
        adkflow backend --port 8080
    """
    project_root = get_project_root()

    if not (project_root / "backend").exists():
        console.print("[red]Error: backend directory not found[/red]")
        raise click.Abort()

    console.print(Panel.fit("Starting ADKFlow Backend", style="bold blue"))
    console.print(f"  Port: {port}")
    console.print()

    proc = None

    def cleanup(signum=None, frame=None):
        console.print("\n[yellow]Shutting down backend...[/yellow]")
        if proc and proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
        console.print("[green]Backend stopped[/green]")
        sys.exit(0)

    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    try:
        proc = start_backend_server(project_root, port)
        console.print()
        console.print(f"[green]Backend running at http://localhost:{port}[/green]")
        console.print(f"[green]API docs at http://localhost:{port}/docs[/green]")
        console.print()
        console.print("[dim]Press Ctrl+C to stop[/dim]")

        # Stream output
        while proc.poll() is None:
            if proc.stdout:
                line = proc.stdout.readline()
                if line:
                    console.print(line.decode().rstrip())

    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        cleanup()


@cli.command()
@click.option(
    "--port",
    "-p",
    default=DEFAULT_FRONTEND_PORT,
    help=f"Frontend port (default: {DEFAULT_FRONTEND_PORT})",
)
@click.option(
    "--backend-port",
    "-b",
    default=DEFAULT_BACKEND_PORT,
    help=f"Backend port to connect to (default: {DEFAULT_BACKEND_PORT})",
)
def frontend(port: int, backend_port: int):
    """Start only the frontend server.

    Example:
        adkflow frontend
        adkflow frontend --port 3001 --backend-port 8080
    """
    project_root = get_project_root()

    if not (project_root / "frontend").exists():
        console.print("[red]Error: frontend directory not found[/red]")
        raise click.Abort()

    console.print(Panel.fit("Starting ADKFlow Frontend", style="bold blue"))
    console.print(f"  Port: {port}")
    console.print(f"  Backend: http://localhost:{backend_port}")
    console.print()

    proc = None

    def cleanup(signum=None, frame=None):
        console.print("\n[yellow]Shutting down frontend...[/yellow]")
        if proc and proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
        console.print("[green]Frontend stopped[/green]")
        sys.exit(0)

    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    try:
        proc = start_frontend_server(project_root, port, backend_port)
        console.print()
        console.print(f"[green]Frontend running at http://localhost:{port}[/green]")
        console.print()
        console.print("[dim]Press Ctrl+C to stop[/dim]")

        # Stream output
        while proc.poll() is None:
            if proc.stdout:
                line = proc.stdout.readline()
                if line:
                    console.print(line.decode().rstrip())

    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        cleanup()


@cli.command()
def stop():
    """Stop any running ADKFlow servers.

    Example:
        adkflow stop
    """
    console.print("[yellow]Stopping ADKFlow servers...[/yellow]")

    # Kill backend processes
    result = subprocess.run(
        ["pkill", "-f", "python -m backend.src.main"], capture_output=True
    )
    if result.returncode == 0:
        console.print("[green]Backend stopped[/green]")
    else:
        console.print("[dim]No backend process found[/dim]")

    # Kill frontend processes
    result = subprocess.run(["pkill", "-f", "next dev"], capture_output=True)
    if result.returncode == 0:
        console.print("[green]Frontend stopped[/green]")
    else:
        console.print("[dim]No frontend process found[/dim]")

    console.print("[green]Done[/green]")


@cli.command()
def setup():
    """Set up the ADKFlow development environment.

    Installs backend and frontend dependencies.

    Example:
        adkflow setup
    """
    project_root = get_project_root()

    console.print(Panel.fit("Setting up ADKFlow", style="bold blue"))

    # Setup backend
    backend_dir = project_root / "backend"
    if backend_dir.exists():
        console.print("\n[bold]Setting up backend...[/bold]")
        venv_path = backend_dir / "venv"

        if not venv_path.exists():
            console.print("  Creating virtual environment...")
            subprocess.run([sys.executable, "-m", "venv", str(venv_path)], check=True)

        pip_path = venv_path / "bin" / "pip"
        console.print("  Installing dependencies...")
        subprocess.run(
            [str(pip_path), "install", "--upgrade", "pip"],
            check=True,
            capture_output=True,
        )
        subprocess.run(
            [
                str(pip_path),
                "install",
                "fastapi",
                "uvicorn[standard]",
                "pydantic>=2.0",
                "pyyaml",
                "python-multipart",
            ],
            check=True,
        )
        console.print("  [green]Backend ready[/green]")
    else:
        console.print("[yellow]Backend directory not found, skipping[/yellow]")

    # Setup frontend
    frontend_dir = project_root / "frontend"
    if frontend_dir.exists():
        console.print("\n[bold]Setting up frontend...[/bold]")
        console.print("  Installing dependencies...")
        subprocess.run(["npm", "install"], cwd=str(frontend_dir), check=True)
        console.print("  [green]Frontend ready[/green]")
    else:
        console.print("[yellow]Frontend directory not found, skipping[/yellow]")

    console.print()
    console.print(Panel.fit("Setup complete!", style="bold green"))
    console.print()
    console.print("Run [bold]adkflow dev[/bold] to start the development servers")


if __name__ == "__main__":
    cli()
