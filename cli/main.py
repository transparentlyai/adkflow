"""CLI interface for ADKFlow development server management."""

import signal
import subprocess
import sys
import threading
import time

import click
import requests
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


# Server configuration constants
DEFAULT_BACKEND_PORT = 6000
DEFAULT_FRONTEND_PORT = 6006

# Health check configuration
HEALTH_CHECK_MAX_ATTEMPTS = 30  # Max attempts (30 * 0.5s = 15s timeout)
HEALTH_CHECK_INTERVAL = 0.5  # Seconds between attempts
PROCESS_TERMINATION_TIMEOUT = 5  # Seconds to wait for graceful shutdown


def wait_for_server_health(
    url: str,
    proc: subprocess.Popen,
    max_attempts: int = HEALTH_CHECK_MAX_ATTEMPTS,
    interval: float = HEALTH_CHECK_INTERVAL,
) -> bool:
    """Wait for server to become healthy by polling health endpoint.

    Args:
        url: Health check URL (e.g., http://localhost:6000/health)
        proc: The server process to monitor
        max_attempts: Maximum number of health check attempts
        interval: Seconds between attempts

    Returns:
        True if server is healthy, False if it failed to start
    """
    for attempt in range(max_attempts):
        # Check if process crashed
        if proc.poll() is not None:
            return False

        try:
            response = requests.get(url, timeout=1)
            if response.status_code == 200:
                return True
        except requests.RequestException:
            pass  # Server not ready yet

        time.sleep(interval)

    return False


def wait_for_process_running(
    proc: subprocess.Popen,
    max_attempts: int = HEALTH_CHECK_MAX_ATTEMPTS,
    interval: float = HEALTH_CHECK_INTERVAL,
) -> bool:
    """Wait for process to stabilize (for frontend without health endpoint).

    Args:
        proc: The server process to monitor
        max_attempts: Maximum number of attempts
        interval: Seconds between attempts

    Returns:
        True if process is still running, False if it crashed
    """
    for _ in range(max_attempts):
        if proc.poll() is not None:
            return False
        time.sleep(interval)
        if proc.poll() is None:
            return True
    return proc.poll() is None


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

    backend_proc = None
    frontend_proc = None

    def cleanup(signum=None, frame=None):
        print_msg("\nShutting down servers...", "yellow")
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
        subprocess.run(["pkill", "-f", "next dev"], capture_output=True)
        print_msg("Servers stopped", "green")
        sys.exit(0)

    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    try:
        print_msg("Starting backend server...", "blue")
        backend_proc = start_backend_server(project_root, backend_port, dev_mode=True)

        # Wait for backend to be healthy
        health_url = f"http://localhost:{backend_port}/health"
        if not wait_for_server_health(health_url, backend_proc):
            print_msg("Backend failed to start", "red")
            if backend_proc.stdout:
                print_msg(backend_proc.stdout.read().decode(errors="replace"))
            raise click.Abort()

        print_msg("Starting frontend server...", "blue")
        frontend_proc = start_frontend_server(project_root, frontend_port, backend_port)

        # Wait for frontend process to stabilize
        if not wait_for_process_running(frontend_proc, max_attempts=20):
            print_msg("Frontend failed to start", "red")
            if frontend_proc.stdout:
                print_msg(frontend_proc.stdout.read().decode(errors="replace"))
            cleanup()
            raise click.Abort()

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

        while True:
            if backend_proc.poll() is not None:
                print_msg("Backend server stopped unexpectedly", "red")
                cleanup()
            if frontend_proc.poll() is not None:
                print_msg("Frontend server stopped unexpectedly", "red")
                cleanup()
            time.sleep(1)

    except Exception as e:
        print_msg(f"Error: {e}", "red")
        cleanup()


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

    backend_proc = None
    frontend_proc = None

    def cleanup(signum=None, frame=None):
        print_msg("\nShutting down servers...", "yellow")
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
        print_msg("Servers stopped", "green")
        sys.exit(0)

    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    try:
        print_msg("Starting backend server...", "blue")
        backend_proc = start_backend_server(project_root, backend_port)

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

        # Wait for frontend process to stabilize
        if not wait_for_process_running(frontend_proc, max_attempts=20):
            print_msg("Frontend failed to start", "red")
            if frontend_proc.stdout:
                print_msg(frontend_proc.stdout.read().decode(errors="replace"))
            cleanup()
            raise click.Abort()

        print_msg("")
        print_panel("ADKFlow started!", "bold green")
        print_msg("")
        print_msg("Servers running:", "bold")
        print_msg(f"  Backend:  http://localhost:{backend_port}")
        print_msg(f"  Frontend: http://localhost:{frontend_port}")
        print_msg(f"  API docs: http://localhost:{backend_port}/docs")
        print_msg("")
        print_msg("Press Ctrl+C to stop all servers", "dim")

        while True:
            if backend_proc.poll() is not None:
                print_msg("Backend server stopped unexpectedly", "red")
                cleanup()
            if frontend_proc.poll() is not None:
                print_msg("Frontend server stopped unexpectedly", "red")
                cleanup()
            time.sleep(1)

    except Exception as e:
        print_msg(f"Error: {e}", "red")
        cleanup()


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

    proc = None

    def cleanup(signum=None, frame=None):
        print_msg("\nShutting down backend...", "yellow")
        if proc and proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
        print_msg("Backend stopped", "green")
        sys.exit(0)

    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    try:
        proc = start_backend_server(project_root, port)
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

    except Exception as e:
        print_msg(f"Error: {e}", "red")
        cleanup()


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

    proc = None

    def cleanup(signum=None, frame=None):
        print_msg("\nShutting down frontend...", "yellow")
        if proc and proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
        print_msg("Frontend stopped", "green")
        sys.exit(0)

    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    try:
        proc = start_frontend_server(project_root, port, backend_port)
        print_msg("")
        print_msg(f"Frontend running at http://localhost:{port}", "green")
        print_msg("")
        print_msg("Press Ctrl+C to stop", "dim")

        while proc.poll() is None:
            if proc.stdout:
                line = proc.stdout.readline()
                if line:
                    print(line.decode().rstrip())

    except Exception as e:
        print_msg(f"Error: {e}", "red")
        cleanup()


@cli.command()
def stop():
    """Stop any running ADKFlow servers."""
    print_msg("Stopping ADKFlow servers...", "yellow")

    result = subprocess.run(
        ["pkill", "-f", "python -m backend.src.main"], capture_output=True
    )
    if result.returncode == 0:
        print_msg("Backend stopped", "green")
    else:
        print_msg("No backend process found", "dim")

    result = subprocess.run(["pkill", "-f", "next dev"], capture_output=True)
    if result.returncode == 0:
        print_msg("Frontend (dev) stopped", "green")
    else:
        result = subprocess.run(["pkill", "-f", "next start"], capture_output=True)
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
