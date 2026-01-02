"""Log handlers for console and file output."""

from __future__ import annotations

import sys
import threading
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import TYPE_CHECKING, Any, TextIO

from adkflow_runner.logging.constants import (
    DEFAULT_BACKUP_COUNT,
    DEFAULT_LOG_FILE_NAME,
    DEFAULT_MAX_BYTES,
    LogLevel,
)
from adkflow_runner.logging.formatters import (
    ConsoleFormatter,
    JSONFormatter,
    LogFormatter,
)

if TYPE_CHECKING:
    from rich.console import Console


@dataclass
class LogRecord:
    """A single log record."""

    timestamp: datetime
    level: LogLevel
    category: str
    message: str
    context: dict[str, Any] = field(default_factory=dict)
    duration_ms: float | None = None
    exception: BaseException | None = None


class Handler(ABC):
    """Base handler interface."""

    @abstractmethod
    def emit(self, record: LogRecord) -> None:
        """Emit a log record."""
        ...

    @abstractmethod
    def close(self) -> None:
        """Close the handler and release resources."""
        ...


class ConsoleHandler(Handler):
    """Console output handler with optional colored output via Rich."""

    def __init__(
        self,
        stream: TextIO | None = None,
        colored: bool = True,
        formatter: LogFormatter | None = None,
    ) -> None:
        self.stream = stream or sys.stderr
        self.colored = colored
        self.formatter = formatter or ConsoleFormatter(colored=colored)
        self._lock = threading.Lock()

        # Attempt to use Rich for colored output
        self._console: Console | None = None
        if colored:
            try:
                from rich.console import Console

                self._console = Console(file=self.stream, force_terminal=True)
            except ImportError:
                pass

    def emit(self, record: LogRecord) -> None:
        """Emit a log record to console."""
        formatted = self.formatter.format(record)

        with self._lock:
            if self._console and self.colored:
                self._console.print(formatted, markup=True, highlight=False)
            else:
                # Strip Rich markup if not using Rich
                if self.colored:
                    formatted = self._strip_markup(formatted)
                print(formatted, file=self.stream)

    def _strip_markup(self, text: str) -> str:
        """Strip Rich markup tags from text."""
        import re

        return re.sub(r"\[/?[^\]]+\]", "", text)

    def close(self) -> None:
        """Close the handler."""
        pass


class RotatingFileHandler(Handler):
    """File handler with size-based rotation.

    Outputs JSON format (one object per line) by default.
    """

    def __init__(
        self,
        log_dir: Path,
        filename: str = DEFAULT_LOG_FILE_NAME,
        max_bytes: int = DEFAULT_MAX_BYTES,
        backup_count: int = DEFAULT_BACKUP_COUNT,
        formatter: LogFormatter | None = None,
        clear_on_init: bool = False,
    ) -> None:
        self.log_dir = Path(log_dir)
        self.filename = filename
        self.max_bytes = max_bytes
        self.backup_count = backup_count
        self.formatter = formatter or JSONFormatter()
        self._lock = threading.Lock()

        self._file: TextIO | None = None
        self._current_size = 0

        # Ensure directory exists
        self.log_dir.mkdir(parents=True, exist_ok=True)

        # Clear log file if requested
        if clear_on_init:
            self._clear_file()

        self._open_file()

    def _clear_file(self) -> None:
        """Clear the log file and its rotated backups."""
        file_path = self.log_dir / self.filename
        if file_path.exists():
            file_path.unlink()

        # Also remove rotated files
        for i in range(1, self.backup_count + 1):
            rotated = self.log_dir / f"{self.filename}.{i}"
            if rotated.exists():
                rotated.unlink()

    def _open_file(self) -> None:
        """Open the log file for appending."""
        file_path = self.log_dir / self.filename
        self._file = open(file_path, "a", encoding="utf-8")
        self._current_size = file_path.stat().st_size if file_path.exists() else 0

    def _rotate(self) -> None:
        """Rotate log files."""
        if self._file:
            self._file.close()

        file_path = self.log_dir / self.filename

        # Rotate existing files
        for i in range(self.backup_count - 1, 0, -1):
            src = self.log_dir / f"{self.filename}.{i}"
            dst = self.log_dir / f"{self.filename}.{i + 1}"
            if src.exists():
                src.rename(dst)

        if file_path.exists():
            file_path.rename(self.log_dir / f"{self.filename}.1")

        self._open_file()

    def emit(self, record: LogRecord) -> None:
        """Emit a log record to file."""
        if self._file is None:
            return

        formatted = self.formatter.format(record)
        line = formatted + "\n"
        line_bytes = len(line.encode("utf-8"))

        with self._lock:
            if self._current_size + line_bytes > self.max_bytes:
                self._rotate()

            self._file.write(line)
            self._file.flush()
            self._current_size += line_bytes

    def close(self) -> None:
        """Close the handler."""
        with self._lock:
            if self._file:
                self._file.close()
                self._file = None


class NullHandler(Handler):
    """Handler that discards all records (for testing or disabling logging)."""

    def emit(self, record: LogRecord) -> None:
        """Discard the record."""
        pass

    def close(self) -> None:
        """Nothing to close."""
        pass
