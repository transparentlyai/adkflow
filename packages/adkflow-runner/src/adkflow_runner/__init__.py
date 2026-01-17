"""ADKFlow Runner - Standalone workflow runner for Google ADK agents.

This package provides:
- Compiler: Transform ReactFlow JSON → IR → ADK agents
- Runner: Execute ADK agents with callbacks
- Callbacks: Real-time execution updates
"""

from adkflow_runner.ir import (
    AgentIR,
    CallbackConfig,
    HttpOptionsConfig,
    OutputFileIR,
    PlannerConfig,
    PromptIR,
    ToolIR,
    WorkflowIR,
)
from adkflow_runner.errors import (
    CompilationError,
    ExecutionError,
    ValidationError,
)
from adkflow_runner.compiler import Compiler
from adkflow_runner.runner import (
    WorkflowRunner,
    RunConfig,
    RunResult,
    RunEvent,
    RunStatus,
    EventType,
    UserInputRequest,
    UserInputProvider,
)
from adkflow_runner.callbacks import (
    ConsoleCallbacks,
    CompositeCallbacks,
    HttpCallbacks,
)
from adkflow_runner.codegen import (
    CallbackCodeGenerator,
    CallbackLoadError,
    generate_callback_code,
)

__version__ = "0.1.0"

__all__ = [
    # IR
    "AgentIR",
    "CallbackConfig",
    "HttpOptionsConfig",
    "OutputFileIR",
    "PlannerConfig",
    "PromptIR",
    "ToolIR",
    "WorkflowIR",
    # Errors
    "CompilationError",
    "ExecutionError",
    "ValidationError",
    # Compiler
    "Compiler",
    # Runner
    "WorkflowRunner",
    "RunConfig",
    "RunResult",
    "RunEvent",
    "RunStatus",
    "EventType",
    "UserInputRequest",
    "UserInputProvider",
    # Callbacks
    "ConsoleCallbacks",
    "CompositeCallbacks",
    "HttpCallbacks",
    # Code generation
    "CallbackCodeGenerator",
    "CallbackLoadError",
    "generate_callback_code",
]
