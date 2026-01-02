"""ADKFlow Logging - Hierarchical logging with structured output.

A feature-rich logging system with selective filtering, file output,
and runtime configuration. Special focus on ADK integration for API
visibility and agent debugging.

Usage:
    from adkflow_runner.logging import get_logger, log_timing, LogLevel

    # Basic logging
    log = get_logger("compiler.loader")
    log.info("Loading project", project_path=path)
    log.debug("Parsed nodes", count=len(nodes))

    # Lazy evaluation for expensive messages
    log.debug(lambda: f"Node details: {expensive_serialization()}")

    # Context scoping
    with log_scope(log, "transform", tab_id=tab.id) as scoped:
        scoped.info("Transforming tab")

    # Timing
    with log_timing(log, "compile", project=path) as ctx:
        result = compile(project)
        ctx["agent_count"] = len(result.agents)

Configuration:
    Environment variables:
    - ADKFLOW_LOG_LEVEL: Global level (DEBUG/INFO/WARNING/ERROR)
    - ADKFLOW_LOG_CATEGORIES: Comma-separated categories with levels
    - ADKFLOW_LOG_FILE: Log file path override
    - ADKFLOW_LOG_FORMAT: Console format (readable/json)

    Config file (project/.adkflow/logging.yaml):
        level: INFO
        categories:
          api: DEBUG
          compiler: WARNING
        file:
          enabled: true
          path: logs
        console:
          colored: true

Category Hierarchy:
    compiler
    ├── loader
    ├── parser
    ├── graph
    ├── validator
    └── transformer
    runner
    ├── workflow
    ├── agent
    │   └── config
    └── tool
    api
    ├── request
    └── response
"""

from adkflow_runner.logging.categories import (
    CategoryRegistry,
    get_registry,
    reset_registry,
)
from adkflow_runner.logging.config import (
    ApiConfig,
    ConsoleConfig,
    FileConfig,
    LogConfig,
    configure_logging,
    get_config,
    reset_config,
    set_config,
)
from adkflow_runner.logging.constants import LogLevel
from adkflow_runner.logging.context import LogContext, log_scope, log_timing
from adkflow_runner.logging.handlers import (
    ConsoleHandler,
    Handler,
    LogRecord,
    NullHandler,
    RotatingFileHandler,
)
from adkflow_runner.logging.logger import Logger, get_logger, reset_loggers

__all__ = [
    # Core
    "Logger",
    "get_logger",
    "LogLevel",
    "LogRecord",
    # Config
    "LogConfig",
    "FileConfig",
    "ConsoleConfig",
    "ApiConfig",
    "get_config",
    "set_config",
    "reset_config",
    "configure_logging",
    # Context
    "log_timing",
    "log_scope",
    "LogContext",
    # Registry
    "CategoryRegistry",
    "get_registry",
    "reset_registry",
    # Handlers
    "Handler",
    "ConsoleHandler",
    "RotatingFileHandler",
    "NullHandler",
    # Testing
    "reset_loggers",
]
