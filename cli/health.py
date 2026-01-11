"""Health checks and auto-repair for ADKFlow dependencies."""

import subprocess
from pathlib import Path

from cli.utils import print_msg, debug_msg


def verify_frontend_deps(frontend_dir: Path) -> bool:
    """Verify frontend dependencies are properly installed.

    Checks:
    1. node_modules exists
    2. next binary exists and is executable
    3. Critical Next.js files are present

    Returns:
        True if dependencies are healthy, False otherwise.
    """
    # Use absolute paths to avoid cwd confusion
    frontend_dir = frontend_dir.resolve()
    node_modules = frontend_dir / "node_modules"

    if not node_modules.exists():
        debug_msg("node_modules directory missing", path=str(frontend_dir))
        return False

    # Check next binary
    next_bin = node_modules / ".bin" / "next"
    if not next_bin.exists():
        debug_msg("next binary missing", path=str(next_bin))
        return False

    # Check critical Next.js files that are required at runtime
    critical_files = [
        node_modules / "next" / "dist" / "server" / "require-hook.js",
        node_modules / "next" / "dist" / "bin" / "next",
        node_modules / "next" / "package.json",
    ]

    for f in critical_files:
        if not f.exists():
            debug_msg("Critical file missing", path=str(f))
            return False

    # Try to run next --version to verify it actually works
    try:
        result = subprocess.run(
            ["node", str(next_bin), "--version"],
            cwd=str(frontend_dir),
            capture_output=True,
            timeout=10,
        )
        if result.returncode != 0:
            debug_msg(
                "next --version failed",
                returncode=result.returncode,
                stderr=result.stderr.decode(errors="replace")[:200],
            )
            return False
    except (subprocess.TimeoutExpired, FileNotFoundError) as e:
        debug_msg("next --version error", error=str(e))
        return False

    return True


def repair_frontend_deps(frontend_dir: Path) -> bool:
    """Repair frontend dependencies by reinstalling.

    Returns:
        True if repair succeeded, False otherwise.
    """
    # Use absolute paths
    frontend_dir = frontend_dir.resolve()
    print_msg("Repairing frontend dependencies...", "yellow")

    node_modules = frontend_dir / "node_modules"

    # Remove corrupted node_modules
    if node_modules.exists():
        print_msg("  Removing corrupted node_modules...", "dim")
        try:
            subprocess.run(
                ["rm", "-rf", str(node_modules)],
                check=True,
                capture_output=True,
            )
        except subprocess.CalledProcessError as e:
            print_msg(f"  Failed to remove node_modules: {e}", "red")
            return False

    # Reinstall
    print_msg("  Installing dependencies...", "dim")
    try:
        result = subprocess.run(
            ["npm", "install"],
            cwd=str(frontend_dir),
            capture_output=True,
            timeout=300,  # 5 minute timeout
        )
        if result.returncode != 0:
            print_msg(
                f"  npm install failed: {result.stderr.decode(errors='replace')[:500]}",
                "red",
            )
            return False
    except subprocess.TimeoutExpired:
        print_msg("  npm install timed out", "red")
        return False
    except FileNotFoundError:
        print_msg("  npm not found. Please install Node.js and npm.", "red")
        return False

    # Verify the repair worked
    if not verify_frontend_deps(frontend_dir):
        print_msg("  Repair completed but verification failed", "red")
        return False

    print_msg("  Frontend dependencies restored", "green")
    return True


def ensure_frontend_deps(frontend_dir: Path) -> bool:
    """Ensure frontend dependencies are healthy, auto-repairing if needed.

    Returns:
        True if dependencies are healthy (possibly after repair), False if unfixable.
    """
    if verify_frontend_deps(frontend_dir):
        return True

    print_msg("Frontend dependencies are corrupted or missing", "yellow")
    return repair_frontend_deps(frontend_dir)
