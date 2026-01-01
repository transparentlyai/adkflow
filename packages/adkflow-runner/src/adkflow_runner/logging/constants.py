"""Logging constants and defaults for adkflow-runner."""

from enum import IntEnum


class LogLevel(IntEnum):
    """Standard log levels with numeric values for comparison."""

    DEBUG = 10
    INFO = 20
    WARNING = 30
    ERROR = 40
    CRITICAL = 50


# Default category hierarchy
# Parent categories automatically enable their children
DEFAULT_CATEGORIES: dict[str, list[str]] = {
    "compiler": ["loader", "parser", "graph", "validator", "transformer"],
    "runner": ["workflow", "agent", "tool", "custom_node"],
    "api": ["request", "response"],
}

# Nested subcategories (dot notation)
NESTED_CATEGORIES: dict[str, list[str]] = {
    "runner.agent": ["config"],  # runner.agent.config
}

# Default levels for categories
DEFAULT_CATEGORY_LEVELS: dict[str, LogLevel] = {
    "compiler": LogLevel.INFO,
    "runner": LogLevel.INFO,
    "api": LogLevel.INFO,
    "api.request": LogLevel.DEBUG,  # Request/response are DEBUG by default
    "api.response": LogLevel.DEBUG,
    "runner.agent.config": LogLevel.DEBUG,  # Agent config is DEBUG by default
}

# Log file defaults
DEFAULT_LOG_FILE_NAME = "adkflow.log"
DEFAULT_JSON_LOG_FILE_NAME = "adkflow.jsonl"
DEFAULT_MAX_BYTES = 10 * 1024 * 1024  # 10MB
DEFAULT_BACKUP_COUNT = 5
DEFAULT_LOG_DIR = "logs"

# Console formatting
LEVEL_COLORS: dict[str, str] = {
    "DEBUG": "dim",
    "INFO": "cyan",
    "WARNING": "yellow",
    "ERROR": "red",
    "CRITICAL": "bold red",
}

# API payload limits
DEFAULT_SUMMARY_THRESHOLD = 200  # Characters before truncating in summary
DEFAULT_FULL_PAYLOAD_LEVEL = LogLevel.DEBUG
