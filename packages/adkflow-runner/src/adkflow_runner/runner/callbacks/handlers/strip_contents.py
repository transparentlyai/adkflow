"""Handler for stripping injected ADK context from LLM requests.

Priority 100: Runs first to clean contents before other handlers process them.
"""

from __future__ import annotations

import re
from typing import Any

from adkflow_runner.runner.callbacks.handlers.base import BaseHandler
from adkflow_runner.runner.callbacks.types import HandlerResult

# Patterns for stripping injected context from ADK
# See: https://github.com/google/adk-python/issues/2207
_CONTEXT_PATTERNS = [
    re.compile(r"^For context:\s*", re.IGNORECASE),
    # [Agent Name] said: or [agent_name] said:
    re.compile(r"^\[[^\]]+\]\s+said:\s*", re.IGNORECASE),
    # Agent Name said: or agent_name said: (with optional spaces in name)
    re.compile(r"^[\w\s_-]+\s+said:\s*", re.IGNORECASE),
    # Agent Name says: or agent_name says: (alternate form)
    re.compile(r"^[\w\s_-]+\s+says:\s*", re.IGNORECASE),
]


class StripContentsHandler(BaseHandler):
    """Strips injected agent context from LLM requests.

    ADK injects "[agent] said:" context even when include_contents='none'.
    This handler removes that pollution to achieve true context isolation.

    Priority: 100 (runs first)

    See: https://github.com/google/adk-python/issues/2207
    """

    DEFAULT_PRIORITY = 100

    def __init__(
        self,
        enabled: bool = True,
        priority: int | None = None,
        on_error: str = "continue",
    ):
        """Initialize the strip contents handler.

        Args:
            enabled: Whether to enable stripping (default True)
            priority: Execution priority (default 100)
            on_error: Error handling policy
        """
        super().__init__(priority=priority, on_error=on_error)
        self.enabled = enabled

    def before_model(
        self,
        callback_context: Any,
        llm_request: Any,
        agent_name: str,
    ) -> HandlerResult | None:
        """Strip injected context from LLM request contents.

        Args:
            callback_context: ADK callback context
            llm_request: The LLM request object
            agent_name: Name of the agent

        Returns:
            None (modifies llm_request in place)
        """
        if not self.enabled:
            return None

        if not hasattr(llm_request, "contents") or not llm_request.contents:
            return None

        cleaned_contents = []
        for content in llm_request.contents:
            if not hasattr(content, "parts") or not content.parts:
                cleaned_contents.append(content)
                continue

            # Check if this content has injected context patterns
            cleaned_parts = []
            for part in content.parts:
                if not hasattr(part, "text") or not part.text:
                    cleaned_parts.append(part)
                    continue

                text = part.text
                # Check for and strip injected patterns
                is_injected = False
                for pattern in _CONTEXT_PATTERNS:
                    if pattern.match(text):
                        is_injected = True
                        break

                if not is_injected:
                    cleaned_parts.append(part)

            # Only include content if it has remaining parts
            if cleaned_parts:
                # Create new content with cleaned parts
                content.parts = cleaned_parts
                cleaned_contents.append(content)

        llm_request.contents = cleaned_contents
        return None
