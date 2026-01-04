"""Server management functions for ADKFlow CLI."""

import os
import subprocess
import sys
from pathlib import Path

from cli.utils import debug_msg, print_msg


def start_backend_server(
    project_root: Path, port: int, dev_mode: bool = False
) -> subprocess.Popen:
    """Start the backend server."""
    env = os.environ.copy()
    env["PYTHONPATH"] = str(project_root)
    env["BACKEND_PORT"] = str(port)
    if dev_mode:
        env["ADKFLOW_DEV_MODE"] = "1"

    cmd = [sys.executable, "-m", "backend.src.main"]
    debug_msg(
        "Starting backend server",
        category="cli.servers",
        cmd=" ".join(cmd),
        port=port,
        dev_mode=dev_mode,
        cwd=str(project_root),
    )

    return subprocess.Popen(
        cmd,
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

    debug_msg(
        "Starting frontend server",
        category="cli.servers",
        frontend_port=frontend_port,
        backend_port=backend_port,
        dev_mode=dev_mode,
        frontend_dir=str(frontend_dir),
    )

    if not (frontend_dir / "node_modules" / ".bin" / "next").exists():
        print_msg("Installing frontend dependencies...", "blue")
        debug_msg("Running npm install", category="cli.servers")
        subprocess.run(["npm", "install"], cwd=str(frontend_dir), check=True)

    env_file = frontend_dir / ".env.local"
    env_file.write_text(f"NEXT_PUBLIC_API_URL=http://localhost:{backend_port}\n")
    debug_msg(
        "Wrote .env.local",
        category="cli.servers",
        env_file=str(env_file),
        api_url=f"http://localhost:{backend_port}",
    )

    if dev_mode:
        cmd = ["npm", "run", "dev", "--", "-p", str(frontend_port)]
        debug_msg("Starting frontend (dev)", category="cli.servers", cmd=" ".join(cmd))
        return subprocess.Popen(
            cmd,
            cwd=str(frontend_dir),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
    else:
        next_dir = frontend_dir / ".next"
        if not next_dir.exists():
            print_msg("Building frontend...", "blue")
            debug_msg("Running npm build", category="cli.servers")
            subprocess.run(["npm", "run", "build"], cwd=str(frontend_dir), check=True)

        cmd = ["npm", "run", "start", "--", "-p", str(frontend_port)]
        debug_msg("Starting frontend (prod)", category="cli.servers", cmd=" ".join(cmd))
        return subprocess.Popen(
            cmd,
            cwd=str(frontend_dir),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
