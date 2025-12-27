"""ADKFlow Extension System for Custom Nodes."""

from adkflow_runner.extensions.flow_unit import (
    EmitFn,
    FlowUnit,
    UISchema,
    PortDefinition,
    FieldDefinition,
    WidgetType,
    ExecutionContext,
)
from adkflow_runner.extensions.discovery import (
    ExtensionScope,
    ExtensionRegistry,
    GLOBAL_EXTENSIONS_PATH,
    get_registry,
    init_registry,
    init_global_extensions,
    init_project_extensions,
    clear_project_extensions,
)

__all__ = [
    # FlowUnit base classes and types
    "EmitFn",
    "FlowUnit",
    "UISchema",
    "PortDefinition",
    "FieldDefinition",
    "WidgetType",
    "ExecutionContext",
    # Extension scope
    "ExtensionScope",
    # Registry and paths
    "ExtensionRegistry",
    "GLOBAL_EXTENSIONS_PATH",
    # Registry functions
    "get_registry",
    "init_registry",
    "init_global_extensions",
    "init_project_extensions",
    "clear_project_extensions",
]
