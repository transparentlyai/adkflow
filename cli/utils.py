"""CLI utility functions."""

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


def print_msg(msg: str, style: str | None = None) -> None:
    """Print message with optional styling."""
    if HAS_RICH and console:
        if style:
            console.print(f"[{style}]{msg}[/{style}]")
        else:
            console.print(msg)
    else:
        print(msg)


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
