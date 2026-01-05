"""Tests for log handlers.

Tests ConsoleHandler, NullHandler, and RotatingFileHandler.
"""

from __future__ import annotations

from datetime import datetime

import pytest

from adkflow_runner.logging import (
    ConsoleHandler,
    LogLevel,
    LogRecord,
    NullHandler,
    RotatingFileHandler,
    reset_config,
    reset_loggers,
    reset_registry,
)


@pytest.fixture(autouse=True)
def reset_logging_state():
    """Reset logging state before each test."""
    reset_config()
    reset_loggers()
    reset_registry()
    yield
    reset_config()
    reset_loggers()
    reset_registry()


class TestHandlers:
    """Tests for log handlers."""

    def test_console_handler_creation(self):
        """Create console handler."""
        handler = ConsoleHandler()
        assert handler is not None

    def test_null_handler(self):
        """Null handler does nothing."""
        handler = NullHandler()
        # NullHandler has an emit method (discards all records)
        assert hasattr(handler, "emit")

    def test_rotating_file_handler(self, tmp_path):
        """Create rotating file handler."""
        log_dir = tmp_path / "logs"
        log_dir.mkdir()
        handler = RotatingFileHandler(
            log_dir=log_dir,
            filename="test.jsonl",
            max_bytes=1024,
            backup_count=3,
        )
        assert handler is not None


class TestLogHandlerEmit:
    """Tests for handler emit methods."""

    def test_null_handler_emit(self):
        """Null handler discards records."""
        handler = NullHandler()
        record = LogRecord(
            level=LogLevel.INFO,
            category="test",
            message="Discarded",
            timestamp=datetime.fromtimestamp(1234567890.0),
        )
        # Should not raise
        handler.emit(record)

    def test_console_handler_emit(self):
        """Console handler formats and emits records."""
        from io import StringIO

        from adkflow_runner.logging.handlers import LogRecord as HandlerRecord

        stream = StringIO()
        handler = ConsoleHandler(stream=stream, colored=False)
        record = HandlerRecord(
            level=LogLevel.INFO,
            category="test",
            message="Test message",
            timestamp=datetime.now(),
        )
        handler.emit(record)
        output = stream.getvalue()
        assert "Test message" in output

    def test_console_handler_close(self):
        """Console handler close method."""
        handler = ConsoleHandler(colored=False)
        handler.close()  # Should not raise

    def test_rotating_file_handler_emit(self, tmp_path):
        """Rotating file handler writes to file."""
        from adkflow_runner.logging.handlers import LogRecord as HandlerRecord

        log_dir = tmp_path / "logs"
        log_dir.mkdir()
        handler = RotatingFileHandler(
            log_dir=log_dir,
            filename="test.jsonl",
            max_bytes=1024,
            backup_count=2,
        )
        record = HandlerRecord(
            level=LogLevel.INFO,
            category="test",
            message="Test file message",
            timestamp=datetime.now(),
        )
        handler.emit(record)
        handler.close()

        log_file = log_dir / "test.jsonl"
        assert log_file.exists()
        content = log_file.read_text()
        assert "Test file message" in content

    def test_rotating_file_handler_rotation(self, tmp_path):
        """File handler rotates when max_bytes exceeded."""
        from adkflow_runner.logging.handlers import LogRecord as HandlerRecord

        log_dir = tmp_path / "logs"
        log_dir.mkdir()
        handler = RotatingFileHandler(
            log_dir=log_dir,
            filename="rotate.jsonl",
            max_bytes=100,  # Very small to trigger rotation
            backup_count=2,
        )

        # Write enough to trigger rotation
        for i in range(20):
            record = HandlerRecord(
                level=LogLevel.INFO,
                category="test",
                message=f"Message number {i} with some extra padding",
                timestamp=datetime.now(),
            )
            handler.emit(record)

        handler.close()

        # Check files exist
        main_file = log_dir / "rotate.jsonl"
        assert main_file.exists()
