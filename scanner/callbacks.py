"""Callbacks for ADKFlow Scanner agents.

Provides callbacks for detecting and handling issues like MAX_TOKENS.
"""

from google.genai import types


class MaxTokensExceededError(Exception):
    """Raised when an agent hits the max output token limit."""

    def __init__(self, agent_name: str, message: str = ""):
        self.agent_name = agent_name
        self.message = message or f"Agent '{agent_name}' hit MAX_TOKENS limit"
        super().__init__(self.message)


def check_max_tokens_callback(callback_context, llm_response):
    """After-model callback that raises exception on MAX_TOKENS.

    This callback checks if the model hit its output token limit and
    raises MaxTokensExceededError to fail fast instead of continuing
    with truncated output.

    Args:
        callback_context: The callback context with agent info
        llm_response: The response from the LLM

    Returns:
        None to accept the response, or raises MaxTokensExceededError

    Raises:
        MaxTokensExceededError: When finish_reason is MAX_TOKENS
    """
    if llm_response.finish_reason == types.FinishReason.MAX_TOKENS:
        agent_name = getattr(callback_context, "agent_name", "unknown")
        raise MaxTokensExceededError(
            agent_name=agent_name,
            message=f"Agent '{agent_name}' output was truncated (MAX_TOKENS). "
            f"The agent's output exceeded the maximum token limit. "
            f"Consider breaking the task into smaller pieces.",
        )

    # Also check for error responses
    if llm_response.error_code:
        agent_name = getattr(callback_context, "agent_name", "unknown")
        error_msg = llm_response.error_message or str(llm_response.error_code)
        raise RuntimeError(f"Agent '{agent_name}' encountered an error: {error_msg}")

    return None  # Accept the response
