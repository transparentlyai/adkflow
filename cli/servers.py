"""Server management functions for ADKFlow CLI."""

import os
import subprocess
import sys
from pathlib import Path

from cli.utils import print_msg


def start_backend_server(
    project_root: Path, port: int, dev_mode: bool = False
) -> subprocess.Popen:
    """Start the backend server."""
    env = os.environ.copy()
    env["PYTHONPATH"] = str(project_root)
    env["BACKEND_PORT"] = str(port)
    if dev_mode:
        env["ADKFLOW_DEV_MODE"] = "1"

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

    if not (frontend_dir / "node_modules" / ".bin" / "next").exists():
        print_msg("Installing frontend dependencies...", "blue")
        subprocess.run(["npm", "install"], cwd=str(frontend_dir), check=True)

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
