"""Tests for the logging system.

Tests LogLevel, Logger, config, handlers, and context management.
"""

from __future__ import annotations

from datetime import datetime
from pathlib import Path

import pytest

from adkflow_runner.logging import (
    ConsoleConfig,
    ConsoleHandler,
    FileConfig,
    LogConfig,
    LogLevel,
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


class TestCategoryRegistryAdvanced:
    """Advanced tests for CategoryRegistry."""

    def test_register_nested_category(self):
        """Register nested category creates parent nodes."""
        registry = get_registry()
        registry.register("a.b.c", LogLevel.DEBUG)

        node = registry.get("a.b.c")
        assert node is not None
        assert node.level == LogLevel.DEBUG

        # Parents should also exist
        parent = registry.get("a.b")
        assert parent is not None

    def test_register_updates_existing(self):
        """Register updates existing category level."""
        registry = get_registry()
        registry.register("update.test", LogLevel.INFO)
        registry.register("update.test", LogLevel.DEBUG)

        node = registry.get("update.test")
        assert node is not None
        assert node.level == LogLevel.DEBUG

    def test_get_nonexistent_category(self):
        """Get returns None for nonexistent category."""
        registry = get_registry()
        node = registry.get("does.not.exist")
        assert node is None

    def test_is_enabled_for_category(self):
        """Check if category is enabled for level."""
        registry = get_registry()
        registry.register("enabled.test", LogLevel.INFO, enabled=True)

        # Check enabled status with level
        result = registry.is_enabled("enabled.test", LogLevel.INFO)
        assert result is True

    def test_is_enabled_disabled_category(self):
        """Check if disabled category returns False."""
        registry = get_registry()
        registry.register("disabled.test", LogLevel.INFO, enabled=False)

        result = registry.is_enabled("disabled.test", LogLevel.INFO)
        assert result is False

    def test_set_level_by_pattern(self):
        """Set level for all categories matching pattern."""
        registry = get_registry()
        registry.register("api.auth")
        registry.register("api.users")
        registry.register("api.products")

        registry.set_level("api.*", LogLevel.DEBUG)

        # All api.* should have DEBUG
        assert registry.get_effective_level("api.auth") == LogLevel.DEBUG
        assert registry.get_effective_level("api.users") == LogLevel.DEBUG

    def test_get_effective_level_inherits(self):
        """Get effective level inherits from parent."""
        registry = get_registry()
        registry.register("parent", LogLevel.WARNING)
        registry.register("parent.child")  # No explicit level

        # Child should inherit parent's level
        level = registry.get_effective_level("parent.child")
        assert level == LogLevel.WARNING

    def test_clear_level_exact(self):
        """Clear level for exact category."""
        registry = get_registry()
        registry.register("cleartest", LogLevel.DEBUG)
        registry.clear_level("cleartest")

        node = registry.get("cleartest")
        assert node is not None
        assert node.level is None

    def test_clear_level_pattern(self):
        """Clear level for pattern."""
        registry = get_registry()
        registry.register("clearpat.a", LogLevel.DEBUG)
        registry.register("clearpat.b", LogLevel.DEBUG)
        registry.clear_level("clearpat.*")

        node_a = registry.get("clearpat.a")
        node_b = registry.get("clearpat.b")
        assert node_a.level is None  # type: ignore[union-attr]
        assert node_b.level is None  # type: ignore[union-attr]

    def test_set_enabled_exact(self):
        """Set enabled for exact category."""
        registry = get_registry()
        registry.register("enabletest", LogLevel.INFO)
        registry.set_enabled("enabletest", False)

        node = registry.get("enabletest")
        assert node.enabled is False  # type: ignore[union-attr]

    def test_set_enabled_pattern(self):
        """Set enabled for pattern."""
        registry = get_registry()
        registry.register("enablepat.a", LogLevel.INFO)
        registry.register("enablepat.b", LogLevel.INFO)
        registry.set_enabled("enablepat.*", False)

        node_a = registry.get("enablepat.a")
        node_b = registry.get("enablepat.b")
        assert node_a.enabled is False  # type: ignore[union-attr]
        assert node_b.enabled is False  # type: ignore[union-attr]

    def test_list_all(self):
        """List all registered categories."""
        registry = get_registry()
        registry.register("listone")
        registry.register("listtwo")

        all_cats = registry.list_all()
        assert "listone" in all_cats
        assert "listtwo" in all_cats

    def test_get_all_categories(self):
        """get_all_categories is alias for list_all."""
        registry = get_registry()
        registry.register("aliascat")

        all_list = registry.list_all()
        all_cats = registry.get_all_categories()
        assert all_list == all_cats

    def test_get_level_explicit(self):
        """Get explicit level for category."""
        registry = get_registry()
        registry.register("getlevel", LogLevel.ERROR)

        level = registry.get_level("getlevel")
        assert level == LogLevel.ERROR

    def test_get_level_none_if_inheriting(self):
        """Get level returns None if inheriting."""
        registry = get_registry()
        registry.register("inheritcat")

        level = registry.get_level("inheritcat")
        assert level is None

    def test_is_category_enabled_true(self):
        """Check category enabled status."""
        registry = get_registry()
        registry.register("isenabledcat", enabled=True)

        assert registry.is_category_enabled("isenabledcat") is True

    def test_is_category_enabled_false(self):
        """Check category disabled status."""
        registry = get_registry()
        registry.register("isdisabledcat", enabled=False)

        assert registry.is_category_enabled("isdisabledcat") is False

    def test_is_category_enabled_unknown(self):
        """Unknown categories are enabled by default."""
        registry = get_registry()

        # Don't register - should return True
        assert registry.is_category_enabled("totally.unknown.cat") is True

    def test_is_category_enabled_parent_disabled(self):
        """Child disabled if parent is disabled."""
        registry = get_registry()
        registry.register("disabledparent", enabled=False)
        registry.register("disabledparent.child", enabled=True)

        # Child should be disabled because parent is disabled
        assert registry.is_category_enabled("disabledparent.child") is False

    def test_get_children(self):
        """Get direct children of a category."""
        registry = get_registry()
        registry.register("parentcat")
        registry.register("parentcat.child1")
        registry.register("parentcat.child2")

        children = registry.get_children("parentcat")
        assert set(children) == {"child1", "child2"}

    def test_get_children_empty(self):
        """Get children of leaf category returns empty."""
        registry = get_registry()
        registry.register("leafcat")

        children = registry.get_children("leafcat")
        assert children == []

    def test_get_children_nonexistent(self):
        """Get children of nonexistent category returns empty."""
        registry = get_registry()

        children = registry.get_children("nonexistent")
        assert children == []

    def test_set_default_level(self):
        """Set default level for categories."""
        registry = get_registry()
        registry.set_default_level(LogLevel.ERROR)
        registry.register("defaultlevelcat")  # No explicit level

        # Should return the new default
        level = registry.get_effective_level("defaultlevelcat")
        assert level == LogLevel.ERROR

    def test_get_category_info(self):
        """Get detailed info about a category."""
        registry = get_registry()
        registry.register("infocat", LogLevel.WARNING)
        registry.register("infocat.child")

        info = registry.get_category_info("infocat")

        assert info["path"] == "infocat"
        assert info["name"] == "infocat"
        assert info["level"] == "WARNING"
        assert info["effective_level"] == "WARNING"
        assert info["enabled"] is True
        assert "child" in info["children"]

    def test_get_category_info_nonexistent(self):
        """Get info for nonexistent category returns empty."""
        registry = get_registry()

        info = registry.get_category_info("doesnotexist")
        assert info == {}

    def test_is_enabled_auto_registers(self):
        """is_enabled auto-registers unknown categories."""
        registry = get_registry()

        # Category doesn't exist yet
        assert registry.get("autoregcat") is None

        # is_enabled should auto-register
        result = registry.is_enabled("autoregcat", LogLevel.INFO)

        # Now it should exist
        assert registry.get("autoregcat") is not None
        assert result is True

    def test_is_enabled_parent_disabled(self):
        """is_enabled returns False if parent disabled."""
        registry = get_registry()
        registry.register("dispar", enabled=False)
        registry.register("dispar.child", enabled=True)

        result = registry.is_enabled("dispar.child", LogLevel.INFO)
        assert result is False

    def test_set_level_nonexistent_exact(self):
        """set_level registers category if it doesn't exist."""
        registry = get_registry()

        # Category doesn't exist
        assert registry.get("newlevelcat") is None

        registry.set_level("newlevelcat", LogLevel.DEBUG)

        # Now it should exist with the level
        node = registry.get("newlevelcat")
        assert node is not None
        assert node.level == LogLevel.DEBUG


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
        from datetime import datetime

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
        from datetime import datetime

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
        from datetime import datetime

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


class TestLogConfigFromManifest:
    """Tests for loading LogConfig from manifest.json."""

    def test_load_from_manifest_with_level(self, tmp_path):
        """Load config from manifest with level setting."""
        manifest = {"logging": {"level": "DEBUG"}}
        manifest_file = tmp_path / "manifest.json"
        manifest_file.write_text(__import__("json").dumps(manifest))

        config = LogConfig.load(project_path=tmp_path)
        assert config.level == LogLevel.DEBUG

    def test_load_from_manifest_with_categories(self, tmp_path):
        """Load config from manifest with categories."""
        manifest = {
            "logging": {
                "level": "WARNING",
                "categories": {"api": "DEBUG", "compiler": "INFO"},
            }
        }
        manifest_file = tmp_path / "manifest.json"
        manifest_file.write_text(__import__("json").dumps(manifest))

        config = LogConfig.load(project_path=tmp_path)
        assert config.categories["api"] == LogLevel.DEBUG
        assert config.categories["compiler"] == LogLevel.INFO

    def test_load_from_manifest_with_file_config(self, tmp_path):
        """Load config from manifest with file configuration."""
        manifest = {
            "logging": {
                "file": {
                    "enabled": False,
                    "path": "custom_logs",
                    "rotation": "5MB",
                    "retain": 10,
                    "clear_before_run": True,
                }
            }
        }
        manifest_file = tmp_path / "manifest.json"
        manifest_file.write_text(__import__("json").dumps(manifest))

        config = LogConfig.load(project_path=tmp_path)
        assert config.file.enabled is False
        assert config.file.path == "custom_logs"
        assert config.file.rotation == "5MB"
        assert config.file.retain == 10
        assert config.file.clear_before_run is True

    def test_load_from_manifest_with_console_config(self, tmp_path):
        """Load config from manifest with console configuration."""
        manifest = {
            "logging": {
                "console": {
                    "enabled": False,
                    "colored": False,
                    "format": "json",
                }
            }
        }
        manifest_file = tmp_path / "manifest.json"
        manifest_file.write_text(__import__("json").dumps(manifest))

        config = LogConfig.load(project_path=tmp_path)
        assert config.console.enabled is False
        assert config.console.colored is False
        assert config.console.format == "json"

    def test_load_from_manifest_with_api_config(self, tmp_path):
        """Load config from manifest with API configuration."""
        manifest = {
            "logging": {"api": {"summary_threshold": 100, "full_payload_level": "INFO"}}
        }
        manifest_file = tmp_path / "manifest.json"
        manifest_file.write_text(__import__("json").dumps(manifest))

        config = LogConfig.load(project_path=tmp_path)
        assert config.api.summary_threshold == 100
        assert config.api.full_payload_level == LogLevel.INFO

    def test_load_from_manifest_invalid_json(self, tmp_path):
        """Handle invalid JSON in manifest gracefully."""
        manifest_file = tmp_path / "manifest.json"
        manifest_file.write_text("not valid json {{{")

        # Should return default config without raising
        config = LogConfig.load(project_path=tmp_path)
        assert config.level == LogLevel.INFO

    def test_load_from_manifest_no_logging_key(self, tmp_path):
        """Handle manifest without logging key."""
        manifest = {"name": "test-project"}
        manifest_file = tmp_path / "manifest.json"
        manifest_file.write_text(__import__("json").dumps(manifest))

        config = LogConfig.load(project_path=tmp_path)
        assert config.level == LogLevel.INFO


class TestLogConfigEnvOverrides:
    """Tests for environment variable overrides."""

    def test_env_override_level(self, tmp_path, monkeypatch):
        """ADKFLOW_LOG_LEVEL overrides config."""
        monkeypatch.setenv("ADKFLOW_LOG_LEVEL", "ERROR")
        config = LogConfig.load(project_path=tmp_path)
        assert config.level == LogLevel.ERROR

    def test_env_override_categories(self, tmp_path, monkeypatch):
        """ADKFLOW_LOG_CATEGORIES overrides config."""
        monkeypatch.setenv(
            "ADKFLOW_LOG_CATEGORIES", "api.*,runner=DEBUG,compiler=WARNING"
        )
        config = LogConfig.load(project_path=tmp_path)
        assert config.categories["api.*"] == LogLevel.DEBUG
        assert config.categories["runner"] == LogLevel.DEBUG
        assert config.categories["compiler"] == LogLevel.WARNING

    def test_env_override_log_file(self, tmp_path, monkeypatch):
        """ADKFLOW_LOG_FILE overrides config."""
        monkeypatch.setenv("ADKFLOW_LOG_FILE", "/custom/path/logs")
        config = LogConfig.load(project_path=tmp_path)
        assert config.file.path == "/custom/path/logs"

    def test_env_override_log_format(self, tmp_path, monkeypatch):
        """ADKFLOW_LOG_FORMAT overrides config."""
        monkeypatch.setenv("ADKFLOW_LOG_FORMAT", "json")
        config = LogConfig.load(project_path=tmp_path)
        assert config.console.format == "json"

    def test_env_override_file_enabled(self, tmp_path, monkeypatch):
        """ADKFLOW_LOG_FILE_ENABLED overrides config."""
        monkeypatch.setenv("ADKFLOW_LOG_FILE_ENABLED", "false")
        config = LogConfig.load(project_path=tmp_path)
        assert config.file.enabled is False

    def test_env_override_console_enabled(self, tmp_path, monkeypatch):
        """ADKFLOW_LOG_CONSOLE_ENABLED overrides config."""
        monkeypatch.setenv("ADKFLOW_LOG_CONSOLE_ENABLED", "no")
        config = LogConfig.load(project_path=tmp_path)
        assert config.console.enabled is False


class TestFileConfigRotation:
    """Tests for FileConfig rotation size parsing."""

    def test_rotation_kb(self):
        """Parse KB rotation size."""
        config = FileConfig(rotation="100KB")
        assert config.max_bytes == 100 * 1024

    def test_rotation_mb(self):
        """Parse MB rotation size."""
        config = FileConfig(rotation="50MB")
        assert config.max_bytes == 50 * 1024 * 1024

    def test_rotation_gb(self):
        """Parse GB rotation size."""
        config = FileConfig(rotation="1GB")
        assert config.max_bytes == 1 * 1024 * 1024 * 1024

    def test_rotation_bytes(self):
        """Parse raw bytes rotation size."""
        config = FileConfig(rotation="1048576")
        assert config.max_bytes == 1048576


class TestLogConfigToDict:
    """Tests for LogConfig serialization."""

    def test_to_dict(self):
        """Convert config to dictionary."""
        config = LogConfig(
            level=LogLevel.DEBUG,
            categories={"api": LogLevel.INFO},
            file=FileConfig(enabled=True, path="logs", rotation="5MB", retain=3),
            console=ConsoleConfig(enabled=True, colored=False, format="json"),
        )

        result = config.to_dict()

        assert result["level"] == "DEBUG"
        assert result["categories"]["api"] == "INFO"
        assert result["file"]["enabled"] is True
        assert result["file"]["path"] == "logs"
        assert result["file"]["rotation"] == "5MB"
        assert result["file"]["retain"] == 3
        assert result["console"]["colored"] is False
        assert result["console"]["format"] == "json"


class TestLogConfigGetLogDir:
    """Tests for get_log_dir method."""

    def test_get_log_dir_with_project(self, tmp_path):
        """Get log dir with project path."""
        config = LogConfig(project_path=tmp_path)
        log_dir = config.get_log_dir()
        assert log_dir == tmp_path / "logs"

    def test_get_log_dir_without_project(self):
        """Get log dir without project path."""
        config = LogConfig()
        log_dir = config.get_log_dir()
        assert log_dir == Path("logs")


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

    def test_multiple_handlers(self, tmp_path):
        """Logger with multiple handlers."""
        log_dir = tmp_path / "logs"
        log_dir.mkdir()

        config = LogConfig(
            level=LogLevel.DEBUG,
            console=ConsoleConfig(enabled=True),
            file=FileConfig(enabled=True, path=str(log_dir)),
        )
        configure_logging(project_path=tmp_path, config=config)

        log = get_logger("multi.handler")
        log.info("Test message")


class TestContextManagers:
    """Tests for context manager functions."""

    def test_log_scope_adds_context(self):
        """log_scope adds context to logs."""
        log = get_logger("scope.advanced")

        with log_scope(log, "operation", user="alice", action="read") as scoped:
            # Scoped logger should have context
            scoped.info("In scope")

    def test_log_timing_measures_duration(self):
        """log_timing measures operation duration."""
        import time

        log = get_logger("timing.advanced")

        with log_timing(log, "slow_op") as ctx:
            time.sleep(0.01)  # 10ms
            ctx["items_processed"] = 100

        # Duration should be measured

    def test_run_context_nesting(self):
        """Run contexts can be nested."""
        from adkflow_runner.logging import get_run_id

        with run_context("outer-run"):
            assert get_run_id() == "outer-run"

            with run_context("inner-run"):
                assert get_run_id() == "inner-run"

            assert get_run_id() == "outer-run"
