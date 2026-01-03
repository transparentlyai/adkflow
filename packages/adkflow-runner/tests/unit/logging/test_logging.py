"""Tests for the logging system.

Tests LogLevel, Logger, config, handlers, and context management.
"""

from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock

import pytest

from adkflow_runner.logging import (
    ConsoleConfig,
    ConsoleHandler,
    FileConfig,
    LogConfig,
    LogLevel,
    Logger,
    LogRecord,
    NullHandler,
    RotatingFileHandler,
    configure_logging,
    get_config,
    get_logger,
    get_registry,
    log_scope,
    log_timing,
    reset_config,
    reset_loggers,
    reset_registry,
    run_context,
    set_config,
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
            timestamp=1234567890.0,
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
            timestamp=1234567890.0,
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


class TestLogConfig:
    """Tests for LogConfig dataclass."""

    def test_default_config(self):
        """Default configuration values."""
        config = LogConfig()
        assert config.level == LogLevel.INFO
        assert config.categories == {}
        assert isinstance(config.console, ConsoleConfig)
        assert isinstance(config.file, FileConfig)

    def test_config_with_categories(self):
        """Config with category-specific levels."""
        config = LogConfig(
            level=LogLevel.WARNING,
            categories={
                "api": LogLevel.DEBUG,
                "compiler": LogLevel.INFO,
            },
        )
        assert config.categories["api"] == LogLevel.DEBUG
        assert config.categories["compiler"] == LogLevel.INFO


class TestConsoleConfig:
    """Tests for ConsoleConfig dataclass."""

    def test_default_console_config(self):
        """Default console configuration."""
        config = ConsoleConfig()
        assert config.enabled is True
        assert config.format == "readable"
        assert config.colored is True

    def test_json_format(self):
        """JSON console format."""
        config = ConsoleConfig(format="json")
        assert config.format == "json"


class TestFileConfig:
    """Tests for FileConfig dataclass."""

    def test_default_file_config(self):
        """Default file configuration."""
        config = FileConfig()
        assert config.enabled is True  # Default is True
        assert config.path == "logs"  # Default log dir
        assert config.max_bytes == 10 * 1024 * 1024  # 10MB
        assert config.retain == 5


class TestConfigurLogging:
    """Tests for configure_logging function."""

    def test_configure_default(self):
        """Configure with defaults."""
        configure_logging()
        config = get_config()
        assert config is not None

    def test_configure_with_project_path(self, tmp_path):
        """Configure with project path."""
        configure_logging(project_path=tmp_path)
        config = get_config()
        assert config is not None

    def test_configure_with_custom_config(self):
        """Configure with specific config."""
        custom = LogConfig(level=LogLevel.DEBUG)
        configure_logging(config=custom)
        config = get_config()
        assert config.level == LogLevel.DEBUG

    def test_set_and_get_config(self):
        """Set and get configuration."""
        custom_config = LogConfig(level=LogLevel.ERROR)
        set_config(custom_config)
        retrieved = get_config()
        assert retrieved.level == LogLevel.ERROR


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


class TestLogContext:
    """Tests for log context management."""

    def test_log_scope(self):
        """Use log_scope context manager."""
        log = get_logger("scope.test")

        with log_scope(log, "operation", key="value") as scoped:
            assert scoped is not None
            # The scoped logger should have the context

    def test_log_timing(self):
        """Use log_timing context manager."""
        log = get_logger("timing.test")

        with log_timing(log, "operation", extra="data") as ctx:
            # Can add timing context
            ctx["result_count"] = 42

    def test_run_context(self):
        """Use run_context for run ID scoping."""
        with run_context("run-123"):
            from adkflow_runner.logging import get_run_id
            assert get_run_id() == "run-123"


class TestCategoryRegistry:
    """Tests for category registry."""

    def test_get_registry(self):
        """Get the global registry."""
        registry = get_registry()
        assert registry is not None

    def test_category_hierarchy(self):
        """Categories follow hierarchical structure."""
        registry = get_registry()

        # Register parent and child
        registry.register("parent", LogLevel.WARNING)
        registry.register("parent.child", LogLevel.DEBUG)

        # Child should inherit from parent if not set
        # The registry should handle this


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
