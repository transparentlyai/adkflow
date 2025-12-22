"""CLI interface for ADKFlow development server management."""

import click
import os
import signal
import subprocess
import sys
import threading
import time
from pathlib import Path

from dotenv import load_dotenv

try:
    from rich.console import Console
    from rich.panel import Panel

    console = Console()
    HAS_RICH = True
except ImportError:
    HAS_RICH = False
    console = None
    Panel = None  # type: ignore[assignment]


# Default ports (used when not set in environment)
DEFAULT_BACKEND_PORT = 8000
DEFAULT_FRONTEND_PORT = 3000


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


def get_project_root() -> Path:
    """Find the ADKFlow project root directory."""
    current = Path.cwd()

    # Check if we're already in the project root
    if (current / "backend").exists() and (current / "frontend").exists():
        return current

    # Check if we're in cli directory
    if current.name == "cli" and (current.parent / "backend").exists():
        return current.parent

    # Check parent directories
    for parent in current.parents:
        if (parent / "backend").exists() and (parent / "frontend").exists():
            return parent

    return current


def load_env():
    """Load .env file from project root."""
    project_root = get_project_root()
    env_file = project_root / ".env"
    if env_file.exists():
        load_dotenv(env_file)


def start_backend_server(project_root: Path, port: int) -> subprocess.Popen:
    """Start the backend server."""
    env = os.environ.copy()
    env["PYTHONPATH"] = str(project_root)
    env["BACKEND_PORT"] = str(port)

    return subprocess.Popen(
        [sys.executable, "-m", "backend.src.main"],
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
        print_msg("Installing frontend dependencies...", "blue")
        subprocess.run(["npm", "install"], cwd=str(frontend_dir), check=True)

    # Write .env.local
    env_file = frontend_dir / ".env.local"
    env_file.write_text(f"NEXT_PUBLIC_API_URL=http://localhost:{backend_port}\n")

    if dev_mode:
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
            print_msg("Building frontend...", "blue")
            subprocess.run(["npm", "run", "build"], cwd=str(frontend_dir), check=True)

        return subprocess.Popen(
            ["npm", "run", "start", "--", "-p", str(frontend_port)],
            cwd=str(frontend_dir),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )


@click.group()
@click.version_option(version="0.1.0")
def cli():
    """ADKFlow - Visual workflow builder for Google ADK agents."""
    # Load .env file before any command runs
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
    """Start both backend and frontend development servers.

    Example:
        adkflow dev
        adkflow dev --backend-port 8080 --frontend-port 3001
    """
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
        # Start backend
        print_msg("Starting backend server...", "blue")
        backend_proc = start_backend_server(project_root, backend_port)
        time.sleep(3)

        if backend_proc.poll() is not None:
            print_msg("Backend failed to start", "red")
            if backend_proc.stdout:
                print_msg(backend_proc.stdout.read().decode())
            raise click.Abort()

        # Start frontend
        print_msg("Starting frontend server...", "blue")
        frontend_proc = start_frontend_server(project_root, frontend_port, backend_port)
        time.sleep(3)

        if frontend_proc.poll() is not None:
            print_msg("Frontend failed to start", "red")
            if frontend_proc.stdout:
                print_msg(frontend_proc.stdout.read().decode())
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

        # Stream logs from both processes
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

        # Wait for processes
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
    """Start both backend and frontend in production mode.

    Example:
        adkflow start
        adkflow start --backend-port 8080 --frontend-port 3001
        adkflow start --no-build
    """
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
        # Start backend
        print_msg("Starting backend server...", "blue")
        backend_proc = start_backend_server(project_root, backend_port)
        time.sleep(3)

        if backend_proc.poll() is not None:
            print_msg("Backend failed to start", "red")
            if backend_proc.stdout:
                print_msg(backend_proc.stdout.read().decode())
            raise click.Abort()

        # Build and start frontend
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
        time.sleep(3)

        if frontend_proc.poll() is not None:
            print_msg("Frontend failed to start", "red")
            if frontend_proc.stdout:
                print_msg(frontend_proc.stdout.read().decode())
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

        # Wait for processes
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
    """Start only the backend server.

    Example:
        adkflow backend
        adkflow backend --port 8080
    """
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
    """Start only the frontend server.

    Example:
        adkflow frontend
        adkflow frontend --port 3001 --backend-port 8080
    """
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
    """Stop any running ADKFlow servers.

    Example:
        adkflow stop
    """
    print_msg("Stopping ADKFlow servers...", "yellow")

    # Kill backend processes
    result = subprocess.run(
        ["pkill", "-f", "python -m backend.src.main"], capture_output=True
    )
    if result.returncode == 0:
        print_msg("Backend stopped", "green")
    else:
        print_msg("No backend process found", "dim")

    # Kill frontend processes (both dev and production)
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
    """Set up the ADKFlow development environment.

    Installs backend and frontend dependencies.

    Example:
        adkflow setup
    """
    project_root = get_project_root()

    print_panel("Setting up ADKFlow")

    # Setup backend
    backend_dir = project_root / "backend"
    if backend_dir.exists():
        print_msg("\nSetting up backend...", "bold")

        # Check if using uv
        pyproject = backend_dir / "pyproject.toml"
        if pyproject.exists():
            print_msg("  Installing dependencies with uv...")
            subprocess.run(
                ["uv", "pip", "install", "-e", "."], cwd=str(backend_dir), check=True
            )
        else:
            # Fallback to venv + pip
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

    # Setup frontend
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


def main():
    """Entry point."""
    cli()


if __name__ == "__main__":
    main()
