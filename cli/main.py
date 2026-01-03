"""CLI interface for ADKFlow development server management."""

import subprocess
import sys
import threading

import click
from adkflow_runner.cli import run_command, validate_command

from cli.utils import (
    print_msg,
    print_panel,
    get_project_root,
    load_env,
    HAS_RICH,
    console,
)
from cli.servers import start_backend_server, start_frontend_server
from cli.process_manager import (
    create_dev_manager,
    create_prod_manager,
    create_backend_manager,
    create_frontend_manager,
    wait_for_server_health,
    wait_for_process_running,
    BACKEND_PROCESS_PATTERN,
    FRONTEND_DEV_PATTERN,
    FRONTEND_PROD_PATTERN,
)


# Server configuration constants
DEFAULT_BACKEND_PORT = 6000
DEFAULT_FRONTEND_PORT = 6006


@click.group()
@click.version_option(version="0.1.0")
def cli():
    """ADKFlow - Visual workflow builder for Google ADK agents."""
    load_env()


@cli.command()
@click.option(
    "--backend-port",
    "-b",
    default=DEFAULT_BACKEND_PORT,
    envvar="BACKEND_PORT",
    help=f"Backend port (default: {DEFAULT_BACKEND_PORT}, or BACKEND_PORT env var)",
)
@click.option(
    "--frontend-port",
    "-f",
    default=DEFAULT_FRONTEND_PORT,
    envvar="FRONTEND_PORT",
    help=f"Frontend port (default: {DEFAULT_FRONTEND_PORT}, or FRONTEND_PORT env var)",
)
def dev(backend_port: int, frontend_port: int):
    """Start both backend and frontend development servers."""
    project_root = get_project_root()

    if not (project_root / "backend").exists():
        print_msg("Error: backend directory not found", "red")
        print_msg("Please run this command from the adkflow project root")
        raise click.Abort()

    print_panel("Starting ADKFlow Development Environment")
    print_msg(f"  Backend port:  {backend_port}")
    print_msg(f"  Frontend port: {frontend_port}")
    print_msg("")

    manager = create_dev_manager()
    manager.setup_signal_handlers()

    try:
        print_msg("Starting backend server...", "blue")
        backend_proc = start_backend_server(project_root, backend_port, dev_mode=True)
        manager.add_process(backend_proc)

        # Wait for backend to be healthy
        health_url = f"http://localhost:{backend_port}/health"
        if not wait_for_server_health(health_url, backend_proc):
            print_msg("Backend failed to start", "red")
            if backend_proc.stdout:
                print_msg(backend_proc.stdout.read().decode(errors="replace"))
            raise click.Abort()

        print_msg("Starting frontend server...", "blue")
        frontend_proc = start_frontend_server(project_root, frontend_port, backend_port)
        manager.add_process(frontend_proc)

        # Wait for frontend process to stabilize
        if not wait_for_process_running(frontend_proc, max_attempts=20):
            print_msg("Frontend failed to start", "red")
            if frontend_proc.stdout:
                print_msg(frontend_proc.stdout.read().decode(errors="replace"))
            manager.cleanup(exit_code=1)

        print_msg("")
        print_panel("Development environment started!", "bold green")
        print_msg("")
        print_msg("Servers running:", "bold")
        print_msg(f"  Backend:  http://localhost:{backend_port}")
        print_msg(f"  Frontend: http://localhost:{frontend_port}")
        print_msg(f"  API docs: http://localhost:{backend_port}/docs")
        print_msg("")
        print_msg("Press Ctrl+C to stop all servers", "dim")
        print_msg("")

        def stream_output(proc, prefix, style):
            while proc.poll() is None:
                if proc.stdout:
                    line = proc.stdout.readline()
                    if line:
                        if HAS_RICH and console:
                            console.print(
                                f"[{style}]{prefix}[/{style}] {line.decode().rstrip()}"
                            )
                        else:
                            print(f"{prefix} {line.decode().rstrip()}")

        backend_thread = threading.Thread(
            target=stream_output, args=(backend_proc, "[BE]", "cyan"), daemon=True
        )
        frontend_thread = threading.Thread(
            target=stream_output, args=(frontend_proc, "[FE]", "magenta"), daemon=True
        )
        backend_thread.start()
        frontend_thread.start()

        # Monitor processes
        manager.monitor_processes(
            on_failure=lambda name: print_msg(f"{name} stopped unexpectedly", "red")
        )

    except click.Abort:
        raise
    except Exception as e:
        print_msg(f"Error: {e}", "red")
        manager.cleanup(exit_code=1)


@cli.command()
@click.option(
    "--backend-port",
    "-b",
    default=DEFAULT_BACKEND_PORT,
    envvar="BACKEND_PORT",
    help=f"Backend port (default: {DEFAULT_BACKEND_PORT}, or BACKEND_PORT env var)",
)
@click.option(
    "--frontend-port",
    "-f",
    default=DEFAULT_FRONTEND_PORT,
    envvar="FRONTEND_PORT",
    help=f"Frontend port (default: {DEFAULT_FRONTEND_PORT}, or FRONTEND_PORT env var)",
)
@click.option(
    "--build/--no-build",
    default=True,
    help="Build frontend before starting (default: True)",
)
def start(backend_port: int, frontend_port: int, build: bool):
    """Start both backend and frontend in production mode."""
    project_root = get_project_root()

    if not (project_root / "backend").exists():
        print_msg("Error: backend directory not found", "red")
        raise click.Abort()

    print_panel("Starting ADKFlow (Production Mode)")
    print_msg(f"  Backend port:  {backend_port}")
    print_msg(f"  Frontend port: {frontend_port}")
    print_msg("")

    manager = create_prod_manager()
    manager.setup_signal_handlers()

    try:
        print_msg("Starting backend server...", "blue")
        backend_proc = start_backend_server(project_root, backend_port)
        manager.add_process(backend_proc)

        # Wait for backend to be healthy
        health_url = f"http://localhost:{backend_port}/health"
        if not wait_for_server_health(health_url, backend_proc):
            print_msg("Backend failed to start", "red")
            if backend_proc.stdout:
                print_msg(backend_proc.stdout.read().decode(errors="replace"))
            raise click.Abort()

        frontend_dir = project_root / "frontend"
        if build or not (frontend_dir / ".next").exists():
            print_msg("Building frontend...", "blue")
            env_file = frontend_dir / ".env.local"
            env_file.write_text(
                f"NEXT_PUBLIC_API_URL=http://localhost:{backend_port}\n"
            )
            subprocess.run(["npm", "run", "build"], cwd=str(frontend_dir), check=True)

        print_msg("Starting frontend server...", "blue")
        frontend_proc = start_frontend_server(
            project_root, frontend_port, backend_port, dev_mode=False
        )
        manager.add_process(frontend_proc)

        # Wait for frontend process to stabilize
        if not wait_for_process_running(frontend_proc, max_attempts=20):
            print_msg("Frontend failed to start", "red")
            if frontend_proc.stdout:
                print_msg(frontend_proc.stdout.read().decode(errors="replace"))
            manager.cleanup(exit_code=1)

        print_msg("")
        print_panel("ADKFlow started!", "bold green")
        print_msg("")
        print_msg("Servers running:", "bold")
        print_msg(f"  Backend:  http://localhost:{backend_port}")
        print_msg(f"  Frontend: http://localhost:{frontend_port}")
        print_msg(f"  API docs: http://localhost:{backend_port}/docs")
        print_msg("")
        print_msg("Press Ctrl+C to stop all servers", "dim")

        # Monitor processes
        manager.monitor_processes(
            on_failure=lambda name: print_msg(f"{name} stopped unexpectedly", "red")
        )

    except click.Abort:
        raise
    except Exception as e:
        print_msg(f"Error: {e}", "red")
        manager.cleanup(exit_code=1)


@cli.command()
@click.option(
    "--port",
    "-p",
    default=DEFAULT_BACKEND_PORT,
    envvar="BACKEND_PORT",
    help=f"Backend port (default: {DEFAULT_BACKEND_PORT}, or BACKEND_PORT env var)",
)
def backend(port: int):
    """Start only the backend server."""
    project_root = get_project_root()

    if not (project_root / "backend").exists():
        print_msg("Error: backend directory not found", "red")
        raise click.Abort()

    print_panel("Starting ADKFlow Backend")
    print_msg(f"  Port: {port}")
    print_msg("")

    manager = create_backend_manager()
    manager.setup_signal_handlers()

    try:
        proc = start_backend_server(project_root, port)
        manager.add_process(proc)

        print_msg("")
        print_msg(f"Backend running at http://localhost:{port}", "green")
        print_msg(f"API docs at http://localhost:{port}/docs", "green")
        print_msg("")
        print_msg("Press Ctrl+C to stop", "dim")

        while proc.poll() is None:
            if proc.stdout:
                line = proc.stdout.readline()
                if line:
                    print(line.decode().rstrip())

    except click.Abort:
        raise
    except Exception as e:
        print_msg(f"Error: {e}", "red")
        manager.cleanup(exit_code=1)


@cli.command()
@click.option(
    "--port",
    "-p",
    default=DEFAULT_FRONTEND_PORT,
    envvar="FRONTEND_PORT",
    help=f"Frontend port (default: {DEFAULT_FRONTEND_PORT}, or FRONTEND_PORT env var)",
)
@click.option(
    "--backend-port",
    "-b",
    default=DEFAULT_BACKEND_PORT,
    envvar="BACKEND_PORT",
    help=f"Backend port to connect to (default: {DEFAULT_BACKEND_PORT}, or BACKEND_PORT env var)",
)
def frontend(port: int, backend_port: int):
    """Start only the frontend server."""
    project_root = get_project_root()

    if not (project_root / "frontend").exists():
        print_msg("Error: frontend directory not found", "red")
        raise click.Abort()

    print_panel("Starting ADKFlow Frontend")
    print_msg(f"  Port: {port}")
    print_msg(f"  Backend: http://localhost:{backend_port}")
    print_msg("")

    manager = create_frontend_manager()
    manager.setup_signal_handlers()

    try:
        proc = start_frontend_server(project_root, port, backend_port)
        manager.add_process(proc)

        print_msg("")
        print_msg(f"Frontend running at http://localhost:{port}", "green")
        print_msg("")
        print_msg("Press Ctrl+C to stop", "dim")

        while proc.poll() is None:
            if proc.stdout:
                line = proc.stdout.readline()
                if line:
                    print(line.decode().rstrip())

    except click.Abort:
        raise
    except Exception as e:
        print_msg(f"Error: {e}", "red")
        manager.cleanup(exit_code=1)


@cli.command()
def stop():
    """Stop any running ADKFlow servers."""
    print_msg("Stopping ADKFlow servers...", "yellow")

    result = subprocess.run(
        ["pkill", "-f", BACKEND_PROCESS_PATTERN], capture_output=True
    )
    if result.returncode == 0:
        print_msg("Backend stopped", "green")
    else:
        print_msg("No backend process found", "dim")

    result = subprocess.run(["pkill", "-f", FRONTEND_DEV_PATTERN], capture_output=True)
    if result.returncode == 0:
        print_msg("Frontend (dev) stopped", "green")
    else:
        result = subprocess.run(
            ["pkill", "-f", FRONTEND_PROD_PATTERN], capture_output=True
        )
        if result.returncode == 0:
            print_msg("Frontend (prod) stopped", "green")
        else:
            print_msg("No frontend process found", "dim")

    print_msg("Done", "green")


@cli.command()
def setup():
    """Set up the ADKFlow development environment."""
    project_root = get_project_root()

    print_panel("Setting up ADKFlow")

    backend_dir = project_root / "backend"
    if backend_dir.exists():
        print_msg("\nSetting up backend...", "bold")

        pyproject = backend_dir / "pyproject.toml"
        if pyproject.exists():
            print_msg("  Installing dependencies with uv...")
            subprocess.run(
                ["uv", "pip", "install", "-e", "."], cwd=str(backend_dir), check=True
            )
        else:
            venv_path = backend_dir / "venv"
            if not venv_path.exists():
                print_msg("  Creating virtual environment...")
                subprocess.run(
                    [sys.executable, "-m", "venv", str(venv_path)], check=True
                )

            pip_path = venv_path / "bin" / "pip"
            print_msg("  Installing dependencies...")
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
                    "python-multipart",
                ],
                check=True,
            )

        print_msg("  Backend ready", "green")
    else:
        print_msg("Backend directory not found, skipping", "yellow")

    frontend_dir = project_root / "frontend"
    if frontend_dir.exists():
        print_msg("\nSetting up frontend...", "bold")
        print_msg("  Installing dependencies...")
        subprocess.run(["npm", "install"], cwd=str(frontend_dir), check=True)
        print_msg("  Frontend ready", "green")
    else:
        print_msg("Frontend directory not found, skipping", "yellow")

    print_msg("")
    print_panel("Setup complete!", "bold green")
    print_msg("")
    print_msg("Run 'adkflow dev' to start the development servers", "bold")


cli.add_command(run_command, name="run")
cli.add_command(validate_command, name="validate")


def main():
    """Entry point."""
    cli()


if __name__ == "__main__":
    main()
