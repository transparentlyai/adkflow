"""Utility functions for agent name processing and content handling.

Provides text sanitization and ADK content stripping utilities.
"""

from __future__ import annotations

import re
from typing import Any, Callable

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


def sanitize_agent_name(name: str) -> str:
    """Convert agent name to valid Python identifier.

    ADK requires agent names to be valid identifiers:
    - Start with letter or underscore
    - Only letters, digits, underscores
    """
    # Replace spaces and hyphens with underscores
    sanitized = re.sub(r"[\s\-]+", "_", name)
    # Remove any other invalid characters
    sanitized = re.sub(r"[^a-zA-Z0-9_]", "", sanitized)
    # Ensure it starts with letter or underscore
    if sanitized and not sanitized[0].isalpha() and sanitized[0] != "_":
        sanitized = "_" + sanitized
    # Default if empty
    if not sanitized:
        sanitized = "agent"
    return sanitized


def create_strip_contents_callback() -> Callable[..., None]:
    """Create a before_model_callback that strips injected agent context.

    ADK injects "[agent] said:" context even when include_contents='none'.
    This callback removes that pollution to achieve true context isolation.

    See: https://github.com/google/adk-python/issues/2207
    """

    def before_model_callback(callback_context: Any, llm_request: Any) -> None:
        """Strip injected context from LLM request contents."""
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

    return before_model_callback
