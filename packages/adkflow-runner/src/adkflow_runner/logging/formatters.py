"""Log formatters for console and file output."""

from __future__ import annotations

import json
import traceback
from abc import ABC, abstractmethod
from typing import TYPE_CHECKING, Any

from adkflow_runner.logging.constants import LEVEL_COLORS

if TYPE_CHECKING:
    from adkflow_runner.logging.handlers import LogRecord


class LogFormatter(ABC):
    """Base formatter interface."""

    @abstractmethod
    def format(self, record: "LogRecord") -> str:
        """Format a log record to string."""
        ...


class ConsoleFormatter(LogFormatter):
    """Human-readable console format with optional Rich colors."""

    def __init__(self, colored: bool = True, show_context: bool = True) -> None:
        self.colored = colored
        self.show_context = show_context

    def format(self, record: "LogRecord") -> str:
        timestamp = record.timestamp.strftime("%H:%M:%S.%f")[:-3]
        level = record.level.name
        category = record.category
        message = record.message

        # Format context as key=value pairs
        ctx_str = ""
        if self.show_context and record.context:
            ctx_parts = []
            for k, v in record.context.items():
                formatted_value = self._format_value(v)
                ctx_parts.append(f"{k}={formatted_value}")
            ctx_str = " ".join(ctx_parts)

        # Duration suffix
        duration_str = ""
        if record.duration_ms is not None:
            duration_str = f" ({record.duration_ms:.0f}ms)"

        if self.colored:
            color = LEVEL_COLORS.get(level, "white")
            base = (
                f"[dim]{timestamp}[/dim] "
                f"[{color}]{level:8}[/{color}] "
                f"[bold]{category}[/bold] "
                f"{message}{duration_str}"
            )
            if ctx_str:
                base += f" [dim]{ctx_str}[/dim]"
            return base
        else:
            base = f"{timestamp} {level:8} {category} {message}{duration_str}"
            if ctx_str:
                base += f" {ctx_str}"
            return base

    def _format_value(self, value: Any, max_len: int = 100) -> str:
        """Format a value for display, truncating if needed."""
        if isinstance(value, str):
            if len(value) > max_len:
                return repr(value[:max_len] + "...")
            return repr(value)
        elif isinstance(value, (dict, list)):
            s = json.dumps(value, default=str)
            if len(s) > max_len:
                return s[:max_len] + "..."
            return s
        else:
            s = repr(value)
            if len(s) > max_len:
                return s[:max_len] + "..."
            return s


class JSONFormatter(LogFormatter):
    """Structured JSON format for machine parsing (one object per line)."""

    def __init__(self, include_exception: bool = True) -> None:
        self.include_exception = include_exception

    def format(self, record: "LogRecord") -> str:
        data: dict[str, Any] = {
            "timestamp": record.timestamp.isoformat(),
            "level": record.level.name,
            "category": record.category,
            "message": record.message,
        }

        # Add context
        if record.context:
            data["context"] = record.context

        # Add duration
        if record.duration_ms is not None:
            data["duration_ms"] = record.duration_ms

        # Add exception
        if self.include_exception and record.exception:
            data["exception"] = {
                "type": type(record.exception).__name__,
                "message": str(record.exception),
                "traceback": traceback.format_exception(
                    type(record.exception),
                    record.exception,
                    record.exception.__traceback__,
                ),
            }

        return json.dumps(data, default=str, ensure_ascii=False)


class CompactFormatter(LogFormatter):
    """Compact format for high-volume logs."""

    def format(self, record: "LogRecord") -> str:
        level_char = record.level.name[0]
        timestamp = record.timestamp.strftime("%H:%M:%S")
        duration = f" {record.duration_ms:.0f}ms" if record.duration_ms else ""
        return (
            f"{level_char} {timestamp} [{record.category}] {record.message}{duration}"
        )


def get_formatter(format_name: str, colored: bool = True) -> LogFormatter:
    """Get a formatter by name."""
    if format_name == "json":
        return JSONFormatter()
    elif format_name == "compact":
        return CompactFormatter()
    else:  # readable
        return ConsoleFormatter(colored=colored)
