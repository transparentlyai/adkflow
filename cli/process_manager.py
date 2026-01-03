"""Process management utilities for ADKFlow CLI."""

import signal
import subprocess
import sys
import time
from dataclasses import dataclass, field
from typing import Callable

import requests

from cli.utils import print_msg


# Process patterns for pkill
BACKEND_PROCESS_PATTERN = "python -m backend.src.main"
FRONTEND_DEV_PATTERN = "next dev"
FRONTEND_PROD_PATTERN = "next start"

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
    for _ in range(max_attempts):
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
    """Wait for process to stabilize (for servers without health endpoint).

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


@dataclass
class ProcessManager:
    """Manages server processes with proper cleanup and signal handling.

    Consolidates process lifecycle management to avoid code duplication.
    """

    processes: list[subprocess.Popen] = field(default_factory=list)
    pkill_patterns: list[str] = field(default_factory=list)
    shutdown_message: str = "Shutting down servers..."
    stopped_message: str = "Servers stopped"
    _cleanup_registered: bool = field(default=False, init=False)

    def add_process(self, proc: subprocess.Popen) -> None:
        """Add a process to be managed."""
        self.processes.append(proc)

    def add_pkill_pattern(self, pattern: str) -> None:
        """Add a pkill pattern for fallback cleanup."""
        self.pkill_patterns.append(pattern)

    def setup_signal_handlers(self) -> None:
        """Set up SIGINT and SIGTERM handlers for graceful shutdown."""
        if self._cleanup_registered:
            return

        def handler(signum: int, frame) -> None:
            self.cleanup()

        signal.signal(signal.SIGINT, handler)
        signal.signal(signal.SIGTERM, handler)
        self._cleanup_registered = True

    def cleanup(self, exit_code: int = 0) -> None:
        """Terminate all managed processes gracefully.

        Args:
            exit_code: Exit code to use when exiting (default: 0)
        """
        print_msg(f"\n{self.shutdown_message}", "yellow")

        # Graceful termination
        for proc in self.processes:
            if proc and proc.poll() is None:
                proc.terminate()
                try:
                    proc.wait(timeout=PROCESS_TERMINATION_TIMEOUT)
                except subprocess.TimeoutExpired:
                    proc.kill()

        # Fallback pkill for orphaned processes
        for pattern in self.pkill_patterns:
            subprocess.run(["pkill", "-f", pattern], capture_output=True)

        print_msg(self.stopped_message, "green")
        sys.exit(exit_code)

    def monitor_processes(
        self, on_failure: Callable[[str], None] | None = None
    ) -> None:
        """Monitor processes and call cleanup if any die unexpectedly.

        Args:
            on_failure: Optional callback when a process dies (receives process name)
        """
        while True:
            for i, proc in enumerate(self.processes):
                if proc.poll() is not None:
                    name = f"Process {i + 1}"
                    if on_failure:
                        on_failure(name)
                    else:
                        print_msg(f"{name} stopped unexpectedly", "red")
                    self.cleanup(exit_code=1)
            time.sleep(1)

    def all_running(self) -> bool:
        """Check if all managed processes are still running."""
        return all(proc.poll() is None for proc in self.processes)


def create_backend_manager() -> ProcessManager:
    """Create a ProcessManager configured for backend-only mode."""
    return ProcessManager(
        pkill_patterns=[BACKEND_PROCESS_PATTERN],
        shutdown_message="Shutting down backend...",
        stopped_message="Backend stopped",
    )


def create_frontend_manager() -> ProcessManager:
    """Create a ProcessManager configured for frontend-only mode."""
    return ProcessManager(
        pkill_patterns=[FRONTEND_DEV_PATTERN, FRONTEND_PROD_PATTERN],
        shutdown_message="Shutting down frontend...",
        stopped_message="Frontend stopped",
    )


def create_dev_manager() -> ProcessManager:
    """Create a ProcessManager configured for dev mode (both servers)."""
    return ProcessManager(
        pkill_patterns=[BACKEND_PROCESS_PATTERN, FRONTEND_DEV_PATTERN],
        shutdown_message="Shutting down servers...",
        stopped_message="Servers stopped",
    )


def create_prod_manager() -> ProcessManager:
    """Create a ProcessManager configured for production mode."""
    return ProcessManager(
        pkill_patterns=[BACKEND_PROCESS_PATTERN, FRONTEND_PROD_PATTERN],
        shutdown_message="Shutting down servers...",
        stopped_message="Servers stopped",
    )
