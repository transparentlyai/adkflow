"""Error types for the execution layer.

These errors provide structured information about failures
during compilation, validation, and execution.
"""

from dataclasses import dataclass, field
from typing import Any


@dataclass
class ErrorLocation:
    """Location information for an error."""

    tab_id: str | None = None
    node_id: str | None = None
    node_type: str | None = None
    node_name: str | None = None
    file_path: str | None = None
    line: int | None = None

    def __str__(self) -> str:
        parts = []
        if self.tab_id:
            parts.append(f"tab={self.tab_id}")
        if self.node_name:
            parts.append(f"node={self.node_name}")
        elif self.node_id:
            parts.append(f"node_id={self.node_id}")
        if self.file_path:
            parts.append(f"file={self.file_path}")
        if self.line:
            parts.append(f"line={self.line}")
        return ", ".join(parts) if parts else "unknown location"


class ExecutionLayerError(Exception):
    """Base class for all execution layer errors."""

    def __init__(
        self,
        message: str,
        location: ErrorLocation | None = None,
        details: dict[str, Any] | None = None,
    ):
        self.message = message
        self.location = location or ErrorLocation()
        self.details = details or {}
        super().__init__(self._format_message())

    def _format_message(self) -> str:
        loc_str = str(self.location)
        if loc_str != "unknown location":
            return f"{self.message} [{loc_str}]"
        return self.message


class CompilationError(ExecutionLayerError):
    """Error during workflow compilation."""

    pass


class ValidationError(ExecutionLayerError):
    """Error during workflow validation."""

    pass


class ExecutionError(ExecutionLayerError):
    """Error during workflow execution."""

    agent_id: str | None = None

    def __init__(
        self,
        message: str,
        location: ErrorLocation | None = None,
        details: dict[str, Any] | None = None,
        agent_id: str | None = None,
    ):
        self.agent_id = agent_id
        super().__init__(message, location, details)


class ToolLoadError(CompilationError):
    """Error loading a tool from file."""

    pass


class PromptLoadError(CompilationError):
    """Error loading a prompt from file."""

    pass


class CycleDetectedError(ValidationError):
    """Cycle detected in workflow graph (outside of LoopAgent)."""

    def __init__(self, cycle_nodes: list[str], location: ErrorLocation | None = None):
        self.cycle_nodes = cycle_nodes
        message = f"Cycle detected: {' -> '.join(cycle_nodes)}"
        super().__init__(message, location)


class MissingReferenceError(ValidationError):
    """Referenced resource not found."""

    def __init__(
        self,
        reference_type: str,
        reference_name: str,
        location: ErrorLocation | None = None,
    ):
        self.reference_type = reference_type
        self.reference_name = reference_name
        message = f"Missing {reference_type}: '{reference_name}'"
        super().__init__(message, location)


class TeleporterError(CompilationError):
    """Error with teleporter connections."""

    pass


@dataclass
class ValidationResult:
    """Result of workflow validation."""

    valid: bool
    errors: list[ValidationError] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def add_error(self, error: ValidationError) -> None:
        self.errors.append(error)
        self.valid = False

    def add_warning(self, warning: str) -> None:
        self.warnings.append(warning)

    def raise_if_invalid(self) -> None:
        """Raise the first error if validation failed."""
        if not self.valid and self.errors:
            raise self.errors[0]
