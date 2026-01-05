"""Tests for logging configuration.

Tests LogConfig, ConsoleConfig, FileConfig, and related loading/serialization.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from adkflow_runner.logging import (
    ConsoleConfig,
    FileConfig,
    LogConfig,
    LogLevel,
    configure_logging,
    get_config,
    reset_config,
    reset_loggers,
    reset_registry,
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
