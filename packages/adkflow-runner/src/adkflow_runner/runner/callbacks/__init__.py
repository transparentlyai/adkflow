"""Callback registry system for ADK agent callbacks.

Provides a per-agent registry for callback handlers with priority-based
execution and flow control.
"""

from adkflow_runner.runner.callbacks.executor import CallbackExecutor
from adkflow_runner.runner.callbacks.handlers import (
    BaseHandler,
    EmitHandler,
    ExtensionHooksHandler,
    FinishReasonHandler,
    LoggingHandler,
    ResponseHandler,
    StripContentsHandler,
    TracingHandler,
    UserCallbackHandler,
)
from adkflow_runner.runner.callbacks.loader import UserCallbackLoader
from adkflow_runner.runner.callbacks.registry import CallbackRegistry
from adkflow_runner.runner.callbacks.types import (
    CallbackHandler,
    ErrorPolicy,
    FlowControl,
    HandlerResult,
)

__all__ = [
    # Core
    "CallbackExecutor",
    "CallbackHandler",
    "CallbackRegistry",
    "ErrorPolicy",
    "FlowControl",
    "HandlerResult",
    # Handlers
    "BaseHandler",
    "EmitHandler",
    "ExtensionHooksHandler",
    "FinishReasonHandler",
    "LoggingHandler",
    "ResponseHandler",
    "StripContentsHandler",
    "TracingHandler",
    "UserCallbackHandler",
    # Loader
    "UserCallbackLoader",
]
