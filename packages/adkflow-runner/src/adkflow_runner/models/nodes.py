"""Node models for adkflow-runner.

This module contains data models for workflow nodes including CallbackNode
which represents user-defined callback functions in the workflow.
"""

from dataclasses import dataclass
from enum import Enum


class CallbackType(str, Enum):
    """Callback type enum defining when callbacks are invoked in the agent lifecycle.

    These correspond to ADK's agent callback hooks:
    - before_agent/after_agent: Around entire agent execution
    - before_model/after_model: Around LLM calls
    - before_tool/after_tool: Around tool invocations
    """

    BEFORE_AGENT = "before_agent"
    AFTER_AGENT = "after_agent"
    BEFORE_MODEL = "before_model"
    AFTER_MODEL = "after_model"
    BEFORE_TOOL = "before_tool"
    AFTER_TOOL = "after_tool"


@dataclass
class CallbackNode:
    """CallbackNode represents a user-defined callback function in the workflow.

    Callbacks connect to Agent nodes to provide custom lifecycle hooks.
    The code property contains Python code that executes at the specified
    callback_type point in the agent lifecycle.

    Attributes:
        id: Unique identifier for the callback node.
        name: Display name for the callback.
        callback_type: When this callback is invoked in the agent lifecycle.
        code: Python code implementing the callback function.

    Example:
        >>> callback = CallbackNode(
        ...     id="callback-1",
        ...     name="Log Agent Start",
        ...     callback_type=CallbackType.BEFORE_AGENT,
        ...     code="async def callback(callback_context):\\n    print('Agent starting')",
        ... )
    """

    id: str
    name: str
    callback_type: CallbackType
    code: str

    def __post_init__(self) -> None:
        """Validate callback_type is a valid CallbackType enum value."""
        if isinstance(self.callback_type, str):
            try:
                self.callback_type = CallbackType(self.callback_type)
            except ValueError as e:
                valid_types = [t.value for t in CallbackType]
                raise ValueError(
                    f"Invalid callback_type '{self.callback_type}'. "
                    f"Must be one of: {valid_types}"
                ) from e
