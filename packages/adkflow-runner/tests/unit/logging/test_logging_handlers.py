"""Tests for log handlers.

Tests ConsoleHandler, NullHandler, and RotatingFileHandler.
"""

from __future__ import annotations

from datetime import datetime
from io import StringIO
from unittest.mock import MagicMock, Mock

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


class TestConsoleHandlerIsatty:
    """Tests for ConsoleHandler isatty() check behavior."""

    def test_non_tty_stream_no_rich_console(self):
        """Non-TTY stream should not initialize Rich Console even with colored=True."""
        from adkflow_runner.logging.handlers import LogRecord as HandlerRecord

        stream = StringIO()
        handler = ConsoleHandler(stream=stream, colored=True)

        # StringIO.isatty() returns False, so Rich Console should not be initialized
        assert handler._console is None

        # Emit should still work using print fallback
        record = HandlerRecord(
            level=LogLevel.INFO,
            category="test",
            message="Test message",
            timestamp=datetime.now(),
        )
        handler.emit(record)
        output = stream.getvalue()
        assert "Test message" in output

    def test_tty_stream_with_rich_available(self):
        """TTY stream with colored=True should initialize Rich Console."""
        from unittest.mock import patch

        from adkflow_runner.logging.handlers import LogRecord as HandlerRecord

        # Create a mock stream that reports as TTY
        mock_stream = Mock()
        mock_stream.isatty = Mock(return_value=True)

        # Mock Rich Console to verify it's used (import happens inside __init__)
        mock_console_instance = MagicMock()
        with patch("rich.console.Console") as MockConsole:
            MockConsole.return_value = mock_console_instance

            handler = ConsoleHandler(stream=mock_stream, colored=True)

            # With a TTY stream, Rich Console should be initialized
            assert handler._console is not None
            MockConsole.assert_called_once_with(file=mock_stream)

            # Test emission uses Rich console path
            record = HandlerRecord(
                level=LogLevel.INFO,
                category="test",
                message="Test message",
                timestamp=datetime.now(),
            )
            handler.emit(record)

            # Verify Rich Console's print was called
            mock_console_instance.print.assert_called_once()

    def test_colored_false_no_rich_console(self):
        """colored=False should not initialize Rich Console even for TTY."""
        mock_stream = Mock()
        mock_stream.isatty = Mock(return_value=True)

        handler = ConsoleHandler(stream=mock_stream, colored=False)

        # Even with TTY, colored=False means no Rich Console
        assert handler._console is None

    def test_strip_markup_fallback(self):
        """When colored=True but no Rich Console, markup should be stripped."""
        stream = StringIO()
        handler = ConsoleHandler(stream=stream, colored=True)

        # Force a scenario where formatter returns markup
        # The ConsoleFormatter may add Rich markup tags
        assert handler._console is None  # No Rich for StringIO

        # Test _strip_markup method directly
        marked_up = "[bold]Important[/bold] message with [red]color[/red]"
        stripped = handler._strip_markup(marked_up)
        assert "[bold]" not in stripped
        assert "[/bold]" not in stripped
        assert "[red]" not in stripped
        assert "[/red]" not in stripped
        assert "Important" in stripped
        assert "message with" in stripped
        assert "color" in stripped


class TestRotatingFileHandlerClearOnInit:
    """Tests for RotatingFileHandler clear_on_init functionality."""

    def test_clear_on_init_removes_existing_log(self, tmp_path):
        """clear_on_init=True should remove existing log file."""
        from adkflow_runner.logging.handlers import LogRecord as HandlerRecord

        log_dir = tmp_path / "logs"
        log_dir.mkdir()

        # Create an existing log file
        log_file = log_dir / "test.jsonl"
        log_file.write_text("Old content\n")

        # Create handler with clear_on_init=True
        handler = RotatingFileHandler(
            log_dir=log_dir,
            filename="test.jsonl",
            max_bytes=1024,
            backup_count=2,
            clear_on_init=True,
        )

        # Emit a new record
        record = HandlerRecord(
            level=LogLevel.INFO,
            category="test",
            message="New message",
            timestamp=datetime.now(),
        )
        handler.emit(record)
        handler.close()

        # Old content should be gone
        content = log_file.read_text()
        assert "Old content" not in content
        assert "New message" in content

    def test_clear_on_init_removes_rotated_files(self, tmp_path):
        """clear_on_init=True should remove rotated backup files."""
        log_dir = tmp_path / "logs"
        log_dir.mkdir()

        # Create existing log file and rotated backups
        (log_dir / "test.jsonl").write_text("Main log\n")
        (log_dir / "test.jsonl.1").write_text("Backup 1\n")
        (log_dir / "test.jsonl.2").write_text("Backup 2\n")

        # Create handler with clear_on_init=True
        handler = RotatingFileHandler(
            log_dir=log_dir,
            filename="test.jsonl",
            max_bytes=1024,
            backup_count=2,
            clear_on_init=True,
        )
        handler.close()

        # Backups should be removed
        assert not (log_dir / "test.jsonl.1").exists()
        assert not (log_dir / "test.jsonl.2").exists()

    def test_no_clear_on_init_preserves_existing_log(self, tmp_path):
        """clear_on_init=False (default) should preserve existing log file."""
        from adkflow_runner.logging.handlers import LogRecord as HandlerRecord

        log_dir = tmp_path / "logs"
        log_dir.mkdir()

        # Create an existing log file
        log_file = log_dir / "test.jsonl"
        log_file.write_text("Old content\n")

        # Create handler without clear_on_init
        handler = RotatingFileHandler(
            log_dir=log_dir,
            filename="test.jsonl",
            max_bytes=1024,
            backup_count=2,
        )

        # Emit a new record
        record = HandlerRecord(
            level=LogLevel.INFO,
            category="test",
            message="New message",
            timestamp=datetime.now(),
        )
        handler.emit(record)
        handler.close()

        # Both old and new content should exist
        content = log_file.read_text()
        assert "Old content" in content
        assert "New message" in content
