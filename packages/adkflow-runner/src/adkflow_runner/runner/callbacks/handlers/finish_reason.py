"""Finish reason validation handler.

Validates LLM response finish_reason and optionally fails fast on non-STOP reasons.

Priority 350: Runs after LoggingHandler (300) to ensure logging happens
before potential failure, but before EmitHandler (400).
"""

from __future__ import annotations

from typing import Any

from adkflow_runner.runner.callbacks.handlers.base import BaseHandler
from adkflow_runner.runner.callbacks.types import ErrorPolicy, HandlerResult


# Human-readable descriptions for finish reasons
# Based on: https://cloud.google.com/vertex-ai/generative-ai/docs/reference/rest/v1/GenerateContentResponse
FINISH_REASON_DESCRIPTIONS: dict[str, str] = {
    "STOP": "Natural completion",
    "MAX_TOKENS": "Response truncated due to token limit",
    "SAFETY": "Response blocked by safety filters",
    "RECITATION": "Response blocked due to potential recitation",
    "BLOCKLIST": "Response contained a term from configured blocklist",
    "PROHIBITED_CONTENT": "Response may contain prohibited content",
    "SPII": "Response may contain sensitive personally identifiable information",
    "MALFORMED_FUNCTION_CALL": "Generated function call is syntactically invalid",
    "UNEXPECTED_TOOL_CALL": "Generated function call is semantically invalid",
    "MODEL_ARMOR": "Response blocked by Model Armor",
    "IMAGE_SAFETY": "Generated image potentially violates safety policies",
    "OTHER": "Response stopped for unspecified reason",
}


class FinishReasonError(Exception):
    """Raised when finish_reason is not STOP and fail_fast is enabled.

    Attributes:
        finish_reason: The finish reason that triggered the error
        description: Human-readable description of the finish reason
    """

    def __init__(self, message: str, finish_reason: str, description: str):
        """Initialize the error.

        Args:
            message: The error message
            finish_reason: The finish reason code (e.g., "MAX_TOKENS")
            description: Human-readable description
        """
        super().__init__(message)
        self.finish_reason = finish_reason
        self.description = description


class FinishReasonHandler(BaseHandler):
    """Handler that validates finish_reason and optionally fails fast.

    When fail_fast is enabled, any finish_reason other than STOP will raise
    a FinishReasonError, terminating the flow execution.

    Also stores the finish_reason data for potential use by output handles.

    Priority: 350 (after LoggingHandler at 300, before EmitHandler at 400)

    Example:
        # Enable fail-fast for strict response validation
        handler = FinishReasonHandler(fail_fast=True)
        registry.register(handler)
    """

    DEFAULT_PRIORITY = 350

    def __init__(
        self,
        fail_fast: bool = False,
        priority: int | None = None,
        on_error: str = ErrorPolicy.ABORT,  # Default to abort on error
    ):
        """Initialize the finish reason handler.

        Args:
            fail_fast: If True, raise error on any finish_reason != STOP
            priority: Execution priority (default 350)
            on_error: Error handling policy (default ABORT)
        """
        super().__init__(priority=priority, on_error=on_error)
        self.fail_fast = fail_fast
        self._last_finish_reason: dict[str, str] | None = None

    @property
    def last_finish_reason(self) -> dict[str, str] | None:
        """Get the last finish reason data.

        Returns:
            Dict with 'name' and 'description' keys, or None if not yet set.
            Example: {"name": "STOP", "description": "Natural completion"}
        """
        return self._last_finish_reason

    def after_model(
        self,
        callback_context: Any,
        llm_response: Any,
        agent_name: str,
    ) -> HandlerResult | None:
        """Check finish_reason and fail fast if enabled.

        Also stores finish_reason data for output handle retrieval.

        Args:
            callback_context: ADK callback context
            llm_response: The LLM response object
            agent_name: Name of the agent

        Returns:
            None on success

        Raises:
            FinishReasonError: If fail_fast is enabled and finish_reason != STOP
        """
        # Extract finish reason from response
        finish_reason = getattr(llm_response, "finish_reason", None)
        finish_reason_str = finish_reason.name if finish_reason else None

        # Get human-readable description
        description = FINISH_REASON_DESCRIPTIONS.get(
            finish_reason_str or "", "Unknown reason"
        )

        # Store for output handle
        self._last_finish_reason = {
            "name": finish_reason_str or "UNKNOWN",
            "description": description,
        }

        # Check fail-fast condition
        if self.fail_fast and finish_reason_str and finish_reason_str != "STOP":
            raise FinishReasonError(
                f"Agent '{agent_name}' execution failed: "
                f"finish_reason was {finish_reason_str} - {description}",
                finish_reason=finish_reason_str,
                description=description,
            )

        return None
