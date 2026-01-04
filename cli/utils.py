"""CLI utility functions."""

import functools
import sys
from pathlib import Path
from types import TracebackType
from typing import Callable, TypeVar

import click
from adkflow_runner.logging import LogLevel, get_logger, get_registry
from dotenv import load_dotenv

F = TypeVar("F", bound=Callable[..., object])

try:
    from rich.console import Console
    from rich.panel import Panel

    console = Console()
    HAS_RICH = True
except ImportError:
    HAS_RICH = False
    console = None
    Panel = None  # type: ignore[assignment]


def print_msg(msg: str, style: str | None = None) -> None:
    """Print message with optional styling."""
    if HAS_RICH and console:
        if style:
            console.print(f"[{style}]{msg}[/{style}]")
        else:
            console.print(msg)
    else:
        print(msg)


def debug_msg(msg: str, category: str = "cli", **context) -> None:
    """Log a debug message through the logging system.

    Args:
        msg: The message to log
        category: Logger category (default: "cli")
        **context: Additional context key-value pairs
    """
    log = get_logger(category)
    log.debug(msg, **context)


def info_msg(msg: str, category: str = "cli", **context) -> None:
    """Log an info message through the logging system.

    Args:
        msg: The message to log
        category: Logger category (default: "cli")
        **context: Additional context key-value pairs
    """
    log = get_logger(category)
    log.info(msg, **context)


def set_cli_verbose(verbose: bool) -> None:
    """Enable verbose/debug logging for CLI categories.

    Args:
        verbose: If True, set CLI categories to DEBUG level
    """
    if verbose:
        registry = get_registry()
        registry.set_level("cli", LogLevel.DEBUG)
        registry.set_level("cli.*", LogLevel.DEBUG)


def print_panel(msg: str, style: str = "bold blue") -> None:
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

    if (current / "backend").exists() and (current / "frontend").exists():
        return current

    if current.name == "cli" and (current.parent / "backend").exists():
        return current.parent

    for parent in current.parents:
        if (parent / "backend").exists() and (parent / "frontend").exists():
            return parent

    return current


def load_env() -> None:
    """Load .env file from project root."""
    project_root = get_project_root()
    env_file = project_root / ".env"
    if env_file.exists():
        load_dotenv(env_file)


# Exception handling utilities

_original_excepthook = sys.excepthook


def _cli_exception_hook(
    exc_type: type[BaseException],
    exc_value: BaseException,
    exc_tb: TracebackType | None,
) -> None:
    """Global exception hook that logs unhandled exceptions.

    This catches any exception that bubbles up to the top level,
    logs it through the logging system, then calls the original hook.
    """
    # Don't log KeyboardInterrupt or SystemExit
    if issubclass(exc_type, (KeyboardInterrupt, SystemExit)):
        _original_excepthook(exc_type, exc_value, exc_tb)
        return

    # Don't log click exceptions (Abort, Exit, etc.) - they're control flow
    if issubclass(exc_type, click.exceptions.ClickException):
        _original_excepthook(exc_type, exc_value, exc_tb)
        return

    log = get_logger("cli")
    log.critical(
        f"Unhandled exception: {exc_type.__name__}: {exc_value}",
        exception=exc_value,
        exc_type=exc_type.__name__,
    )

    # Call original hook to show traceback
    _original_excepthook(exc_type, exc_value, exc_tb)


def install_exception_hook() -> None:
    """Install the global CLI exception hook.

    Call this once at CLI startup to ensure all unhandled exceptions
    are logged through the logging system.
    """
    sys.excepthook = _cli_exception_hook
    debug_msg("Installed global exception hook", category="cli")


def log_exceptions(
    command_name: str | None = None,
    reraise: bool = True,
) -> Callable[[F], F]:
    """Decorator to log exceptions from CLI commands.

    Args:
        command_name: Name to use in log messages (defaults to function name)
        reraise: Whether to reraise the exception after logging (default: True)

    Usage:
        @cli.command()
        @log_exceptions()
        def my_command():
            ...

        @cli.command()
        @log_exceptions("custom-name", reraise=False)
        def another_command():
            ...
    """

    def decorator(func: F) -> F:
        name = command_name or func.__name__

        @functools.wraps(func)
        def wrapper(*args: object, **kwargs: object) -> object:
            try:
                return func(*args, **kwargs)
            except click.exceptions.ClickException:
                # Let click handle its own exceptions (Abort, Exit, etc.)
                raise
            except KeyboardInterrupt:
                # Don't log keyboard interrupt
                raise
            except Exception as e:
                log = get_logger("cli")
                log.error(
                    f"Command '{name}' failed: {type(e).__name__}: {e}",
                    exception=e,
                    command=name,
                    exc_type=type(e).__name__,
                )
                if reraise:
                    raise
                return None

        return wrapper  # type: ignore[return-value]

    return decorator
