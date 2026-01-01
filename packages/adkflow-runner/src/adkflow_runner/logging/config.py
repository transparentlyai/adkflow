"""Logging configuration loading and management."""

from __future__ import annotations

import os
import threading
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from adkflow_runner.logging.constants import (
    DEFAULT_BACKUP_COUNT,
    DEFAULT_FULL_PAYLOAD_LEVEL,
    DEFAULT_LOG_DIR,
    DEFAULT_SUMMARY_THRESHOLD,
    LogLevel,
)


@dataclass
class FileConfig:
    """File logging configuration."""

    enabled: bool = True
    path: str = DEFAULT_LOG_DIR  # Relative to project root
    rotation: str = "10MB"  # Size-based rotation
    retain: int = DEFAULT_BACKUP_COUNT  # Number of rotated files to keep
    format: str = "readable"  # readable | json

    @property
    def max_bytes(self) -> int:
        """Parse rotation size to bytes."""
        size_str = self.rotation.upper()
        if size_str.endswith("MB"):
            return int(size_str[:-2]) * 1024 * 1024
        elif size_str.endswith("KB"):
            return int(size_str[:-2]) * 1024
        elif size_str.endswith("GB"):
            return int(size_str[:-2]) * 1024 * 1024 * 1024
        else:
            return int(size_str)


@dataclass
class ConsoleConfig:
    """Console logging configuration."""

    enabled: bool = True
    colored: bool = True
    format: str = "readable"  # readable | json | compact


@dataclass
class ApiConfig:
    """API logging configuration."""

    summary_threshold: int = DEFAULT_SUMMARY_THRESHOLD
    full_payload_level: LogLevel = DEFAULT_FULL_PAYLOAD_LEVEL


def _is_dev_mode() -> bool:
    """Check if running in development mode."""
    return os.environ.get("ADKFLOW_DEV_MODE", "0") == "1"


def _get_default_level() -> LogLevel:
    """Get default log level based on environment."""
    # In dev mode, default to DEBUG for better visibility
    if _is_dev_mode():
        return LogLevel.DEBUG
    return LogLevel.INFO


def _get_default_categories() -> dict[str, LogLevel]:
    """Get default category levels based on environment."""
    if _is_dev_mode():
        # In dev mode, enable useful categories at INFO level
        return {
            "runner.workflow": LogLevel.INFO,
            "runner.agent.config": LogLevel.INFO,
            "compiler": LogLevel.INFO,
            "api": LogLevel.INFO,
        }
    return {}


@dataclass
class LogConfig:
    """Complete logging configuration."""

    level: LogLevel = field(default_factory=_get_default_level)
    categories: dict[str, LogLevel] = field(default_factory=_get_default_categories)
    file: FileConfig = field(default_factory=FileConfig)
    console: ConsoleConfig = field(default_factory=ConsoleConfig)
    api: ApiConfig = field(default_factory=ApiConfig)

    # Runtime state
    project_path: Path | None = None
    dev_mode: bool = field(default_factory=_is_dev_mode)

    @classmethod
    def load(
        cls,
        project_path: Path | None = None,
        config_file: Path | None = None,
    ) -> LogConfig:
        """Load configuration with precedence:
        1. Environment variables (highest)
        2. Config file
        3. Defaults (lowest)
        """
        config = cls()
        config.project_path = project_path

        # 1. Load from config file
        if config_file is None and project_path:
            config_file = project_path / ".adkflow" / "logging.yaml"

        if config_file and config_file.exists():
            config = cls._load_from_yaml(config_file, project_path)

        # 2. Override with environment variables
        config = cls._apply_env_overrides(config)

        return config

    @classmethod
    def _load_from_yaml(cls, path: Path, project_path: Path | None = None) -> LogConfig:
        """Load configuration from YAML file."""
        try:
            import yaml
        except ImportError:
            # yaml not available, return defaults
            return cls(project_path=project_path)

        with open(path) as f:
            data = yaml.safe_load(f) or {}

        config = cls(project_path=project_path)

        # Parse level
        if "level" in data:
            config.level = _parse_level(data["level"])

        # Parse categories
        if "categories" in data:
            for cat, level_str in data["categories"].items():
                config.categories[cat] = _parse_level(level_str)

        # Parse file config
        if "file" in data:
            fc = data["file"]
            config.file = FileConfig(
                enabled=fc.get("enabled", True),
                path=fc.get("path", DEFAULT_LOG_DIR),
                rotation=fc.get("rotation", "10MB"),
                retain=fc.get("retain", DEFAULT_BACKUP_COUNT),
                format=fc.get("format", "readable"),
            )

        # Parse console config
        if "console" in data:
            cc = data["console"]
            config.console = ConsoleConfig(
                enabled=cc.get("enabled", True),
                colored=cc.get("colored", True),
                format=cc.get("format", "readable"),
            )

        # Parse API config
        if "api" in data:
            ac = data["api"]
            config.api = ApiConfig(
                summary_threshold=ac.get(
                    "summary_threshold", DEFAULT_SUMMARY_THRESHOLD
                ),
                full_payload_level=_parse_level(ac.get("full_payload_level", "DEBUG")),
            )

        return config

    @classmethod
    def _apply_env_overrides(cls, config: LogConfig) -> LogConfig:
        """Apply environment variable overrides."""
        # ADKFLOW_LOG_LEVEL
        if level := os.environ.get("ADKFLOW_LOG_LEVEL"):
            config.level = _parse_level(level)

        # ADKFLOW_LOG_CATEGORIES (comma-separated with optional levels)
        # Format: "api.*,runner.agent=DEBUG,compiler=WARNING"
        if cats := os.environ.get("ADKFLOW_LOG_CATEGORIES"):
            for cat_spec in cats.split(","):
                cat_spec = cat_spec.strip()
                if not cat_spec:
                    continue
                if "=" in cat_spec:
                    cat, level = cat_spec.split("=", 1)
                    config.categories[cat.strip()] = _parse_level(level.strip())
                else:
                    # Enable at DEBUG by default
                    config.categories[cat_spec] = LogLevel.DEBUG

        # ADKFLOW_LOG_FILE
        if path := os.environ.get("ADKFLOW_LOG_FILE"):
            config.file.path = path

        # ADKFLOW_LOG_FORMAT
        if fmt := os.environ.get("ADKFLOW_LOG_FORMAT"):
            config.console.format = fmt

        # ADKFLOW_LOG_FILE_ENABLED
        if enabled := os.environ.get("ADKFLOW_LOG_FILE_ENABLED"):
            config.file.enabled = enabled.lower() in ("true", "1", "yes")

        # ADKFLOW_LOG_CONSOLE_ENABLED
        if enabled := os.environ.get("ADKFLOW_LOG_CONSOLE_ENABLED"):
            config.console.enabled = enabled.lower() in ("true", "1", "yes")

        return config

    def get_log_dir(self) -> Path:
        """Get the absolute log directory path."""
        if self.project_path:
            return self.project_path / self.file.path
        return Path(self.file.path)

    def to_dict(self) -> dict[str, Any]:
        """Convert config to dictionary for serialization."""
        return {
            "level": self.level.name,
            "categories": {k: v.name for k, v in self.categories.items()},
            "file": {
                "enabled": self.file.enabled,
                "path": self.file.path,
                "rotation": self.file.rotation,
                "retain": self.file.retain,
                "format": self.file.format,
            },
            "console": {
                "enabled": self.console.enabled,
                "colored": self.console.colored,
                "format": self.console.format,
            },
            "api": {
                "summary_threshold": self.api.summary_threshold,
                "full_payload_level": self.api.full_payload_level.name,
            },
        }


def _parse_level(level_str: str) -> LogLevel:
    """Parse a log level string to LogLevel enum."""
    level_str = level_str.upper().strip()
    try:
        return LogLevel[level_str]
    except KeyError:
        return LogLevel.INFO


# Global config singleton
_config: LogConfig | None = None
_config_lock = threading.Lock()


def get_config() -> LogConfig:
    """Get the global logging configuration."""
    global _config
    with _config_lock:
        if _config is None:
            _config = LogConfig.load()
        return _config


def set_config(config: LogConfig) -> None:
    """Set the global logging configuration."""
    global _config
    with _config_lock:
        _config = config


def configure_logging(
    project_path: Path | None = None,
    config: LogConfig | None = None,
) -> LogConfig:
    """Configure logging for a project.

    This should be called at the start of workflow execution to set up
    project-specific logging (file output to project/logs/).

    Args:
        project_path: Path to the project being executed
        config: Optional pre-loaded config, otherwise loads from project

    Returns:
        The active LogConfig
    """
    global _config
    with _config_lock:
        if config is not None:
            _config = config
            _config.project_path = project_path
        else:
            _config = LogConfig.load(project_path=project_path)

        # Apply category levels from config
        from adkflow_runner.logging.categories import get_registry

        registry = get_registry()
        registry.set_default_level(_config.level)

        for cat_pattern, level in _config.categories.items():
            registry.set_level(cat_pattern, level)

        return _config


def reset_config() -> None:
    """Reset the global config (for testing)."""
    global _config
    with _config_lock:
        _config = None
