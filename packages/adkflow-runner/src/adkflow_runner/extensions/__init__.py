"""ADKFlow Extension System for Custom Nodes."""

from adkflow_runner.extensions.flow_unit import (
    EmitFn,
    FlowUnit,
    UISchema,
    PortDefinition,
    FieldDefinition,
    WidgetType,
    ExecutionContext,
    # Layout configuration
    NodeLayout,
    CollapsedDisplay,
    HandleLayout,
    AdditionalHandle,
)
from adkflow_runner.extensions.discovery import (
    ExtensionScope,
    ExtensionRegistry,
    SHIPPED_EXTENSIONS_PATH,
    GLOBAL_EXTENSIONS_PATH,
    get_registry,
    init_registry,
    init_shipped_extensions,
    init_global_extensions,
    init_project_extensions,
    init_builtin_units,
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
    # Layout configuration
    "NodeLayout",
    "CollapsedDisplay",
    "HandleLayout",
    "AdditionalHandle",
    # Extension scope
    "ExtensionScope",
    # Registry and paths
    "ExtensionRegistry",
    "SHIPPED_EXTENSIONS_PATH",
    "GLOBAL_EXTENSIONS_PATH",
    # Registry functions
    "get_registry",
    "init_registry",
    "init_shipped_extensions",
    "init_global_extensions",
    "init_project_extensions",
    "init_builtin_units",
    "clear_project_extensions",
]
