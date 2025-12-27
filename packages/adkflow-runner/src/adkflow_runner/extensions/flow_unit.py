"""FlowUnit base class for custom ADKFlow nodes."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Protocol
import hashlib


class WidgetType(str, Enum):
    """Available widget types for custom node UI."""

    TEXT_INPUT = "text_input"
    TEXT_AREA = "text_area"
    NUMBER_INPUT = "number_input"
    SELECT = "select"
    CHECKBOX = "checkbox"
    SLIDER = "slider"
    FILE_PICKER = "file_picker"
    CODE_EDITOR = "code_editor"
    JSON_TREE = "json_tree"
    CHAT_LOG = "chat_log"


@dataclass
class PortDefinition:
    """Defines an input or output port on a node."""

    id: str
    label: str
    source_type: str  # e.g., 'prompt', 'agent', 'custom_mynode'
    data_type: str  # Python type: 'str', 'dict', 'list', 'callable'
    # For inputs only - if None, uses source_type/data_type as single accepted
    accepted_sources: list[str] | None = None
    accepted_types: list[str] | None = None
    required: bool = True
    multiple: bool = False  # Allow multiple connections
    # UI organization
    tab: str | None = None  # Tab name (e.g., "General", "Advanced")
    section: str | None = None  # Section within tab (e.g., "Authentication")
    # Visual customization
    handle_color: str | None = None  # Custom handle color (hex, e.g., "#ff6b6b")
    # For inputs only - manual input behavior
    # When True: only accepts connections (no manual input)
    # When False: shows editable field, disabled when connected
    connection_only: bool = True
    # Widget configuration for manual input (when connection_only=False)
    widget: "WidgetType | None" = None  # Defaults to TEXT_INPUT if not specified
    default: Any = None
    placeholder: str | None = None
    options: list[dict[str, str]] | None = None  # For SELECT widget
    # Execution control
    lazy: bool = False  # Defer evaluation until check_lazy_status() requests it


@dataclass
class FieldDefinition:
    """Defines a configuration field in the node's UI."""

    id: str
    label: str
    widget: WidgetType
    default: Any = None
    options: list[dict[str, str]] | None = (
        None  # For SELECT: [{"value": "x", "label": "X"}]
    )
    min_value: float | None = None
    max_value: float | None = None
    step: float | None = None
    placeholder: str | None = None
    help_text: str | None = None
    # Conditional visibility
    show_if: dict[str, Any] | None = None  # e.g., {"field_id": "value"}
    # UI organization
    tab: str | None = None  # Tab name (e.g., "General", "Advanced")
    section: str | None = None  # Section within tab (e.g., "Retry")


@dataclass
class UISchema:
    """Complete UI schema for a custom node."""

    inputs: list[PortDefinition] = field(default_factory=list)
    outputs: list[PortDefinition] = field(default_factory=list)
    fields: list[FieldDefinition] = field(default_factory=list)
    # Appearance
    color: str = "#6366f1"  # Header color (hex)
    icon: str | None = None  # Lucide icon name
    expandable: bool = True
    default_width: int = 250
    default_height: int = 150


class EmitFn(Protocol):
    """Protocol for event emission function."""

    async def __call__(self, event: Any) -> None: ...


@dataclass
class ExecutionContext:
    """Context passed to FlowUnit during execution."""

    session_id: str
    run_id: str
    node_id: str
    node_name: str
    state: dict[str, Any]  # Shared state across nodes in this run
    emit: EmitFn  # Emit events for real-time updates
    project_path: Path

    def get_state(self, key: str, default: Any = None) -> Any:
        """Get a value from shared state."""
        return self.state.get(key, default)

    def set_state(self, key: str, value: Any) -> None:
        """Set a value in shared state."""
        self.state[key] = value


class FlowUnit(ABC):
    """Base class for custom ADKFlow nodes.

    Subclass this to create custom nodes that integrate with
    the ADKFlow visual editor and execution pipeline.

    Example:
        class MyNode(FlowUnit):
            UNIT_ID = "my_category.my_node"
            UI_LABEL = "My Node"
            MENU_LOCATION = "Custom/My Category"

            @classmethod
            def setup_interface(cls) -> UISchema:
                return UISchema(
                    inputs=[PortDefinition(id="input", label="Input", source_type="*", data_type="str")],
                    outputs=[PortDefinition(id="output", label="Output", source_type="my_node", data_type="str")],
                    fields=[FieldDefinition(id="prefix", label="Prefix", widget=WidgetType.TEXT_INPUT)],
                )

            async def run_process(self, inputs, config, context):
                prefix = config.get("prefix", "")
                return {"output": prefix + inputs.get("input", "")}
    """

    # Required class attributes - must be defined by subclass
    UNIT_ID: str  # Unique identifier: "category.node_name"
    UI_LABEL: str  # Display name in UI
    MENU_LOCATION: str  # Category path: "Custom/My Category"

    # Optional class attributes
    DESCRIPTION: str = ""
    VERSION: str = "1.0.0"

    # Execution control (ComfyUI-style)
    OUTPUT_NODE: bool = False  # True = sink node (writes file, sends API, etc.)
    ALWAYS_EXECUTE: bool = False  # True = skip cache, always run

    @classmethod
    @abstractmethod
    def setup_interface(cls) -> UISchema:
        """Define the node's UI schema.

        Returns:
            UISchema defining inputs, outputs, and config fields
        """
        pass

    @abstractmethod
    async def run_process(
        self,
        inputs: dict[str, Any],
        config: dict[str, Any],
        context: ExecutionContext,
    ) -> dict[str, Any]:
        """Execute the node's logic.

        Args:
            inputs: Values from connected input ports, keyed by port ID
            config: Values from configuration fields, keyed by field ID
            context: Execution context with session state, emit, etc.

        Returns:
            Dict mapping output port IDs to their values
        """
        pass

    # Optional lifecycle hooks
    async def on_before_execute(self, context: ExecutionContext) -> None:
        """Called before run_process. Override for setup logic."""
        pass

    async def on_after_execute(
        self, context: ExecutionContext, outputs: dict[str, Any]
    ) -> None:
        """Called after run_process completes. Override for cleanup logic."""
        pass

    @classmethod
    def compute_state_hash(cls, inputs: dict[str, Any], config: dict[str, Any]) -> str:
        """Compute a hash of inputs and config for caching.

        Override this method for custom caching behavior.
        Return the same hash for inputs/config that should use cached results.

        Args:
            inputs: Input values
            config: Configuration values

        Returns:
            Hash string for cache lookup
        """
        # Default implementation: hash the string representation
        data = str((sorted(inputs.items()), sorted(config.items())))
        return hashlib.sha256(data.encode()).hexdigest()

    @classmethod
    def validate_config(cls, config: dict[str, Any]) -> list[str]:
        """Validate configuration values.

        Override to add custom validation logic.

        Args:
            config: Configuration values to validate

        Returns:
            List of error messages (empty if valid)
        """
        return []

    @classmethod
    def is_changed(cls, config: dict[str, Any], inputs: dict[str, Any]) -> Any:
        """Control when the node should re-execute.

        Override to implement custom change detection. The return value is
        compared to the previous run's return value. If different, the node
        re-executes even if inputs/config hash matches.

        Special values:
            - Return float('nan') to always execute (NaN != NaN)
            - Return None to rely solely on input/config hash (default)

        Args:
            config: Configuration values
            inputs: Input values from connected ports

        Returns:
            Any value for comparison with previous run
        """
        return None

    @classmethod
    def check_lazy_status(
        cls, config: dict[str, Any], available_inputs: dict[str, Any]
    ) -> list[str]:
        """Determine which lazy inputs are actually needed.

        Called when some inputs are marked as lazy and haven't been evaluated.
        Override to implement conditional input evaluation.

        Args:
            config: Configuration values
            available_inputs: Dict of inputs where lazy unevaluated inputs are None

        Returns:
            List of input port IDs that must be evaluated.
            Return [] if all currently available inputs are sufficient.
        """
        return []
