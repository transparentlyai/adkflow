"""Core Logger class with hierarchical category support."""

from __future__ import annotations

import threading
from datetime import datetime
from pathlib import Path
from typing import Any, Callable

from adkflow_runner.logging.categories import CategoryRegistry, get_registry
from adkflow_runner.logging.config import LogConfig, get_config
from adkflow_runner.logging.constants import LogLevel
from adkflow_runner.logging.handlers import (
    ConsoleHandler,
    Handler,
    JSONFileHandler,
    LogRecord,
    RotatingFileHandler,
)

# Lazy message callable type
LazyMessage = Callable[[], str]


class Logger:
    """Hierarchical logger with structured output.

    Features:
    - Hierarchical categories (e.g., "compiler.loader")
    - Lazy evaluation for expensive messages
    - Structured context (key=value pairs)
    - Multiple handlers (console, file, JSON)
    - Thread-safe operation

    Usage:
        from adkflow_runner.logging import get_logger

        log = get_logger("compiler.loader")
        log.info("Loading project", project_path=path)
        log.debug("Parsed nodes", count=len(nodes))

        # Lazy evaluation for expensive messages
        log.debug(lambda: f"Full IR: {expensive_serialize(ir)}")
    """

    _handlers: list[Handler] = []
    _lock = threading.Lock()
    _initialized = False
    _project_path: Path | None = None

    def __init__(
        self,
        category: str,
        registry: CategoryRegistry | None = None,
        config: LogConfig | None = None,
        parent_context: dict[str, Any] | None = None,
    ) -> None:
        self.category = category
        self._registry = registry or get_registry()
        self._config = config or get_config()
        self._context = parent_context or {}

        # Register this category
        self._registry.register(category)

    @classmethod
    def initialize(
        cls,
        config: LogConfig | None = None,
        project_path: Path | None = None,
    ) -> None:
        """Initialize handlers based on configuration.

        Call this at the start of workflow execution to set up
        project-specific logging.
        """
        with cls._lock:
            # Close existing handlers
            for handler in cls._handlers:
                handler.close()
            cls._handlers.clear()

            config = config or get_config()
            cls._project_path = project_path or config.project_path

            # Console handler
            if config.console.enabled:
                cls._handlers.append(
                    ConsoleHandler(
                        colored=config.console.colored,
                    )
                )

            # File handler (if enabled and project path is set)
            if config.file.enabled and cls._project_path:
                log_dir = cls._project_path / config.file.path

                if config.file.format == "json":
                    cls._handlers.append(
                        JSONFileHandler(
                            log_dir=log_dir,
                            max_bytes=config.file.max_bytes,
                            backup_count=config.file.retain,
                        )
                    )
                else:
                    cls._handlers.append(
                        RotatingFileHandler(
                            log_dir=log_dir,
                            max_bytes=config.file.max_bytes,
                            backup_count=config.file.retain,
                        )
                    )

            cls._initialized = True

    @classmethod
    def add_handler(cls, handler: Handler) -> None:
        """Add a custom handler."""
        with cls._lock:
            cls._handlers.append(handler)

    @classmethod
    def reset(cls) -> None:
        """Reset all handlers (for testing/reconfiguration)."""
        with cls._lock:
            for handler in cls._handlers:
                handler.close()
            cls._handlers.clear()
            cls._initialized = False
            cls._project_path = None

    def with_context(self, **context: Any) -> Logger:
        """Create a child logger with additional context."""
        merged = {**self._context, **context}
        logger = Logger(
            category=self.category,
            registry=self._registry,
            config=self._config,
            parent_context=merged,
        )
        return logger

    def _is_enabled(self, level: LogLevel) -> bool:
        """Check if logging is enabled for this level."""
        return self._registry.is_enabled(self.category, level)

    def _emit(
        self,
        level: LogLevel,
        message: str | LazyMessage,
        exception: BaseException | None = None,
        duration_ms: float | None = None,
        **context: Any,
    ) -> None:
        """Emit a log record to all handlers."""
        if not self._is_enabled(level):
            return

        # Lazy-initialize handlers if needed
        if not Logger._initialized:
            Logger.initialize()

        # Evaluate lazy message
        if callable(message):
            try:
                message = message()
            except Exception as e:
                message = f"<error evaluating message: {e}>"

        record = LogRecord(
            timestamp=datetime.now(),
            level=level,
            category=self.category,
            message=message,
            context={**self._context, **context},
            duration_ms=duration_ms,
            exception=exception,
        )

        with Logger._lock:
            for handler in Logger._handlers:
                try:
                    handler.emit(record)
                except Exception:
                    # Swallow handler errors to avoid log loops
                    pass

    def log(
        self,
        level: str | LogLevel,
        message: str | LazyMessage,
        **context: Any,
    ) -> None:
        """Log at specified level."""
        if isinstance(level, str):
            level = LogLevel[level.upper()]
        self._emit(level, message, **context)

    def debug(self, message: str | LazyMessage, **context: Any) -> None:
        """Log at DEBUG level."""
        self._emit(LogLevel.DEBUG, message, **context)

    def info(self, message: str | LazyMessage, **context: Any) -> None:
        """Log at INFO level."""
        self._emit(LogLevel.INFO, message, **context)

    def warning(self, message: str | LazyMessage, **context: Any) -> None:
        """Log at WARNING level."""
        self._emit(LogLevel.WARNING, message, **context)

    def error(
        self,
        message: str | LazyMessage,
        exception: BaseException | None = None,
        **context: Any,
    ) -> None:
        """Log at ERROR level with optional exception."""
        self._emit(LogLevel.ERROR, message, exception=exception, **context)

    def critical(
        self,
        message: str | LazyMessage,
        exception: BaseException | None = None,
        **context: Any,
    ) -> None:
        """Log at CRITICAL level with optional exception."""
        self._emit(LogLevel.CRITICAL, message, exception=exception, **context)

    # API-specific helpers

    def api_request(
        self,
        method: str,
        endpoint: str,
        payload: Any = None,
        **context: Any,
    ) -> None:
        """Log API request with summary at INFO, full payload at DEBUG."""
        config = self._config
        summary = f"{method} {endpoint}"

        self.info(f"API request: {summary}", **context)

        if payload is not None:
            payload_str = str(payload)
            threshold = config.api.summary_threshold

            if len(payload_str) > threshold:
                self.info(
                    "Request payload (truncated)",
                    payload=payload_str[:threshold] + "...",
                    **context,
                )

            # Full payload at DEBUG
            self.debug(
                "Request payload (full)",
                payload=payload,
                **context,
            )

    def api_response(
        self,
        status: int | str,
        payload: Any = None,
        duration_ms: float | None = None,
        **context: Any,
    ) -> None:
        """Log API response with summary at INFO, full payload at DEBUG."""
        self._emit(
            LogLevel.INFO,
            f"API response: {status}",
            duration_ms=duration_ms,
            status=status,
            **context,
        )

        if payload is not None:
            self.debug(
                "Response payload (full)",
                payload=payload,
                **context,
            )


# Logger cache
_loggers: dict[str, Logger] = {}
_logger_lock = threading.Lock()


def get_logger(category: str) -> Logger:
    """Get or create a logger for the given category.

    Usage:
        from adkflow_runner.logging import get_logger

        log = get_logger("compiler.loader")
        log.info("Loading project", project_path=path)
        log.debug("Parsed nodes", count=len(nodes), nodes=nodes)
    """
    with _logger_lock:
        if category not in _loggers:
            _loggers[category] = Logger(category)
        return _loggers[category]


def reset_loggers() -> None:
    """Reset all cached loggers (for testing)."""
    global _loggers
    with _logger_lock:
        _loggers.clear()
    Logger.reset()
