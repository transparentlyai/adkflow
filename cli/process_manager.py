"""Process management utilities for ADKFlow CLI."""

import signal
import subprocess
import sys
import time
from dataclasses import dataclass, field
from typing import Callable

import requests

from cli.utils import debug_msg, print_msg


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
    debug_msg(
        "Waiting for server health",
        category="cli.process",
        url=url,
        max_attempts=max_attempts,
        interval=interval,
    )

    for attempt in range(max_attempts):
        if proc.poll() is not None:
            debug_msg(
                "Process exited during health check",
                category="cli.process",
                returncode=proc.returncode,
            )
            return False

        try:
            response = requests.get(url, timeout=1)
            if response.status_code == 200:
                debug_msg(
                    "Server healthy",
                    category="cli.process",
                    url=url,
                    attempts=attempt + 1,
                )
                return True
        except requests.RequestException as e:
            debug_msg(
                "Health check attempt failed",
                category="cli.process",
                attempt=attempt + 1,
                error=str(e),
            )

        time.sleep(interval)

    debug_msg(
        "Health check timed out",
        category="cli.process",
        url=url,
        max_attempts=max_attempts,
    )
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
    debug_msg(
        "Waiting for process to stabilize",
        category="cli.process",
        pid=proc.pid,
        max_attempts=max_attempts,
    )

    for attempt in range(max_attempts):
        if proc.poll() is not None:
            debug_msg(
                "Process exited unexpectedly",
                category="cli.process",
                pid=proc.pid,
                returncode=proc.returncode,
                attempt=attempt + 1,
            )
            return False
        time.sleep(interval)
        if proc.poll() is None:
            debug_msg(
                "Process stabilized",
                category="cli.process",
                pid=proc.pid,
                attempts=attempt + 1,
            )
            return True

    is_running = proc.poll() is None
    debug_msg(
        "Process check complete",
        category="cli.process",
        pid=proc.pid,
        is_running=is_running,
    )
    return is_running


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
        debug_msg(
            "Added process to manager",
            category="cli.process",
            pid=proc.pid,
            total_processes=len(self.processes),
        )

    def add_pkill_pattern(self, pattern: str) -> None:
        """Add a pkill pattern for fallback cleanup."""
        self.pkill_patterns.append(pattern)
        debug_msg(
            "Added pkill pattern",
            category="cli.process",
            pattern=pattern,
        )

    def setup_signal_handlers(self) -> None:
        """Set up SIGINT and SIGTERM handlers for graceful shutdown."""
        if self._cleanup_registered:
            return

        def handler(signum: int, frame) -> None:
            debug_msg(
                "Signal received",
                category="cli.process",
                signal=signum,
            )
            self.cleanup()

        signal.signal(signal.SIGINT, handler)
        signal.signal(signal.SIGTERM, handler)
        self._cleanup_registered = True
        debug_msg("Signal handlers registered", category="cli.process")

    def cleanup(self, exit_code: int = 0) -> None:
        """Terminate all managed processes gracefully.

        Args:
            exit_code: Exit code to use when exiting (default: 0)
        """
        print_msg(f"\n{self.shutdown_message}", "yellow")
        debug_msg(
            "Starting cleanup",
            category="cli.process",
            process_count=len(self.processes),
            exit_code=exit_code,
        )

        # Graceful termination
        for i, proc in enumerate(self.processes):
            if proc and proc.poll() is None:
                debug_msg(
                    "Terminating process",
                    category="cli.process",
                    pid=proc.pid,
                    index=i,
                )
                proc.terminate()
                try:
                    proc.wait(timeout=PROCESS_TERMINATION_TIMEOUT)
                    debug_msg(
                        "Process terminated gracefully",
                        category="cli.process",
                        pid=proc.pid,
                    )
                except subprocess.TimeoutExpired:
                    debug_msg(
                        "Process did not terminate, killing",
                        category="cli.process",
                        pid=proc.pid,
                    )
                    proc.kill()

        # Fallback pkill for orphaned processes
        for pattern in self.pkill_patterns:
            debug_msg(
                "Running pkill fallback",
                category="cli.process",
                pattern=pattern,
            )
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
        debug_msg(
            "Starting process monitoring",
            category="cli.process",
            process_count=len(self.processes),
        )

        while True:
            for i, proc in enumerate(self.processes):
                if proc.poll() is not None:
                    name = f"Process {i + 1}"
                    debug_msg(
                        "Process died unexpectedly",
                        category="cli.process",
                        name=name,
                        pid=proc.pid,
                        returncode=proc.returncode,
                    )
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
