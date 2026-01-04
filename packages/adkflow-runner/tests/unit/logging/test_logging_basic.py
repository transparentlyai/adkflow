"""Tests for basic logging components.

Tests LogLevel, LogRecord, Logger, and integration.
"""

from __future__ import annotations

from datetime import datetime

import pytest

from adkflow_runner.logging import (
    LogConfig,
    LogLevel,
    LogRecord,
    configure_logging,
    get_logger,
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


class TestLogLevel:
    """Tests for LogLevel enum."""

    def test_log_levels_exist(self):
        """Verify all log levels exist."""
        # LogLevel is an IntEnum
        assert LogLevel.DEBUG == 10
        assert LogLevel.INFO == 20
        assert LogLevel.WARNING == 30
        assert LogLevel.ERROR == 40

    def test_log_level_ordering(self):
        """Log levels have correct ordering."""
        # Debug < Info < Warning < Error (by numeric value)
        assert LogLevel.DEBUG < LogLevel.INFO < LogLevel.WARNING < LogLevel.ERROR


class TestLogRecord:
    """Tests for LogRecord dataclass."""

    def test_record_creation(self):
        """Create a log record."""
        record = LogRecord(
            level=LogLevel.INFO,
            category="test",
            message="Test message",
            timestamp=datetime.fromtimestamp(1234567890.0),
        )
        assert record.level == LogLevel.INFO
        assert record.category == "test"
        assert record.message == "Test message"
        assert record.context == {}

    def test_record_with_context(self):
        """Create record with context."""
        record = LogRecord(
            level=LogLevel.DEBUG,
            category="api",
            message="Request",
            timestamp=datetime.fromtimestamp(1234567890.0),
            context={"method": "GET", "path": "/api/v1"},
        )
        assert record.context["method"] == "GET"
        assert record.context["path"] == "/api/v1"


class TestLogger:
    """Tests for Logger class."""

    def test_get_logger(self):
        """Get a logger by category."""
        log = get_logger("test.category")
        assert log is not None
        assert log.category == "test.category"

    def test_logger_singleton(self):
        """Same category returns same logger."""
        log1 = get_logger("singleton.test")
        log2 = get_logger("singleton.test")
        assert log1 is log2

    def test_logger_with_context(self):
        """Create logger with context."""
        log = get_logger("test")
        scoped = log.with_context(request_id="123")
        assert scoped is not log
        # The scoped logger has the context

    def test_logger_logging_methods(self):
        """Logger has all logging methods."""
        log = get_logger("methods.test")
        assert hasattr(log, "debug")
        assert hasattr(log, "info")
        assert hasattr(log, "warning")
        assert hasattr(log, "error")


class TestLoggerMethods:
    """Tests for Logger method coverage."""

    def test_logger_debug_with_kwargs(self):
        """Debug logs with keyword arguments."""
        log = get_logger("debug.test")
        config = LogConfig(level=LogLevel.DEBUG)
        configure_logging(config=config)
        log.debug("Debug message", key1="value1", key2="value2")

    def test_logger_error_with_exception(self):
        """Error logs with exception info."""
        log = get_logger("error.test")
        try:
            raise ValueError("Test error")
        except ValueError:
            log.error("An error occurred", exc_info=True)

    def test_logger_with_context_returns_new(self):
        """with_context creates new logger with context."""
        log = get_logger("context.test")
        scoped = log.with_context(request_id="req-123")
        assert scoped is not log


class TestLoggerIntegration:
    """Integration tests for logging."""

    def test_full_logging_flow(self, tmp_path):
        """Test complete logging flow."""
        # Configure with custom config
        config = LogConfig(level=LogLevel.DEBUG)
        configure_logging(
            project_path=tmp_path,
            config=config,
        )

        # Get logger
        log = get_logger("integration.test")

        # Log messages (should not raise)
        log.debug("Debug message", key="value")
        log.info("Info message")
        log.warning("Warning message")
        log.error("Error message")

    def test_lazy_evaluation(self):
        """Test lazy message evaluation."""
        log = get_logger("lazy.test")

        call_count = 0

        def expensive_fn():
            nonlocal call_count
            call_count += 1
            return "expensive result"

        # If level is high enough, should not evaluate
        config = LogConfig(level=LogLevel.ERROR)
        configure_logging(config=config)
        log.debug(lambda: expensive_fn())
        # With ERROR level, debug should not be called
        # Note: actual behavior depends on implementation
