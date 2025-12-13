"""User Interaction Tools for ADKFlow Scanner

This module provides tools for interacting with users during the scanning
and analysis process. It enables agents to ask clarifying questions and
receive user input through the CLI interface.

The interaction pattern uses the ToolContext state as a communication channel:
1. Agent stores pending question in state
2. CLI detects pending question and prompts user
3. User provides response
4. CLI updates state with response
5. Agent reads response and continues
"""

from typing import Any

from google.adk.tools import ToolContext


def save_results(
    tool_context: ToolContext,
    key: str,
    value: str,
) -> dict[str, Any]:
    """Save results to session state for use by other agents.

    This tool allows agents to explicitly save their findings/summaries
    to session state so subsequent agents can access them.

    Args:
        tool_context: ToolContext for state management
        key: The state key to save under (e.g., "discovery_results", "analysis_results")
        value: The value to save (typically a summary string)

    Returns:
        dict with status and confirmation message

    Example:
        >>> save_results(context, "discovery_results", "Found 10 agents, 5 prompts...")
    """
    tool_context.state[key] = value
    return {
        "status": "success",
        "key": key,
        "message": f"Saved results to '{key}' ({len(value)} chars)",
    }


def get_results(
    tool_context: ToolContext,
    key: str,
) -> dict[str, Any]:
    """Retrieve results from session state saved by previous agents.

    Args:
        tool_context: ToolContext for state management
        key: The state key to retrieve (e.g., "discovery_results", "analysis_results")

    Returns:
        dict with status and value (or error if not found)

    Example:
        >>> result = get_results(context, "discovery_results")
        >>> print(result["value"])
    """
    if key in tool_context.state:
        value = tool_context.state[key]
        return {
            "status": "success",
            "key": key,
            "value": value,
        }
    return {
        "status": "not_found",
        "key": key,
        "error": f"No value found for key '{key}'",
        "value": None,
    }


def ask_user_question(
    tool_context: ToolContext,
    question: str,
    options: list[str] | None = None,
    allow_custom: bool = True,
) -> dict[str, Any]:
    """Ask the user a clarifying question via CLI prompt.

    This tool enables agents to request user input during execution. The question
    is stored in the context state, where the CLI can detect it and prompt the user.
    The CLI will update the state with the user's response.

    This is useful for:
    - Asking for clarification on ambiguous agent structures
    - Requesting confirmation before major actions
    - Getting user preferences for organization/grouping
    - Resolving conflicts or unclear relationships

    Args:
        tool_context: ToolContext for storing question state
        question: The question to ask the user (clear and specific)
        options: Optional list of predefined answer options
        allow_custom: If True, allow user to provide custom answer beyond options

    Returns:
        dict: {
            "status": "pending" | "answered" | "error",
            "awaiting": "user_input",  # When status="pending"
            "question": str,  # Echo of the question asked
            "answer": str | None,  # User's answer (when status="answered")
            "error": str  # Only present if status="error"
        }

    State Format:
        The tool stores the following in tool_context.state["pending_question"]:
        {
            "question": str,
            "options": list[str] | None,
            "allow_custom": bool,
            "timestamp": str,  # ISO format timestamp
        }

        When the user responds, the CLI should update:
        {
            "answer": str,
            "answered_at": str,  # ISO format timestamp
        }

    Example:
        >>> # Agent asks question
        >>> result = ask_user_question(
        ...     context,
        ...     question="Should 'researcher' and 'writer' be in the same group?",
        ...     options=["yes", "no", "create separate groups"],
        ...     allow_custom=False
        ... )
        >>> print(result)
        {
            "status": "pending",
            "awaiting": "user_input",
            "question": "Should 'researcher' and 'writer' be in the same group?"
        }

        >>> # Later, after user responds (CLI updates state)
        >>> # Agent checks for answer
        >>> answer = tool_context.state["pending_question"]["answer"]
        >>> print(answer)
        "yes"

    CLI Implementation Notes:
        The CLI should:
        1. Check tool_context.state["pending_question"] after each agent turn
        2. If found and no "answer" field, prompt user with the question
        3. Display options if provided
        4. Validate answer against options (unless allow_custom=True)
        5. Store answer in tool_context.state["pending_question"]["answer"]
        6. Resume agent execution

    Agent Implementation Notes:
        After calling this tool:
        1. The tool returns immediately with status="pending"
        2. Agent execution should pause/yield to allow CLI to prompt user
        3. When resumed, agent should check tool_context.state["pending_question"]["answer"]
        4. Clear the pending_question from state after reading answer
    """
    try:
        import datetime

        # Validate inputs
        if not question or not question.strip():
            return {
                "status": "error",
                "error": "Question cannot be empty",
                "awaiting": None,
                "question": "",
                "answer": None,
            }

        # Check if there's already a pending question
        if "pending_question" in tool_context.state:
            existing = tool_context.state["pending_question"]

            # If it has an answer, return it and clear the state
            if "answer" in existing:
                answer = existing["answer"]
                # Clear the pending question from state
                del tool_context.state["pending_question"]

                return {
                    "status": "answered",
                    "awaiting": None,
                    "question": existing.get("question", question),
                    "answer": answer,
                }

            # If it's a different question, replace it
            # (This handles case where agent asks new question before old one answered)
            if existing.get("question") != question:
                pass  # Will be overwritten below

        # Store pending question in state
        timestamp = datetime.datetime.now(datetime.UTC).isoformat()

        tool_context.state["pending_question"] = {
            "question": question.strip(),
            "options": options,
            "allow_custom": allow_custom,
            "timestamp": timestamp,
        }

        return {
            "status": "pending",
            "awaiting": "user_input",
            "question": question.strip(),
            "answer": None,
        }

    except Exception as e:
        return {
            "status": "error",
            "error": f"Unexpected error asking question: {str(e)}",
            "awaiting": None,
            "question": question if question else "",
            "answer": None,
        }


def get_pending_answer(tool_context: ToolContext) -> dict[str, Any]:
    """Check if there's a pending user answer available.

    This is a helper tool for agents to check if a previously asked question
    has been answered by the user. It's useful when the agent wants to
    explicitly poll for an answer rather than relying on the ask_user_question
    return value.

    Args:
        tool_context: ToolContext containing potential answer in state

    Returns:
        dict: {
            "status": "answered" | "pending" | "none",
            "question": str | None,  # The original question
            "answer": str | None,  # The user's answer (if answered)
            "asked_at": str | None,  # Timestamp when asked
            "answered_at": str | None,  # Timestamp when answered
        }

    Example:
        >>> result = get_pending_answer(context)
        >>> if result["status"] == "answered":
        ...     print(f"User said: {result['answer']}")
        ...     # Clear the answer from state
        ...     del tool_context.state["pending_question"]
    """
    try:
        if "pending_question" not in tool_context.state:
            return {
                "status": "none",
                "question": None,
                "answer": None,
                "asked_at": None,
                "answered_at": None,
            }

        pending = tool_context.state["pending_question"]

        if "answer" in pending:
            return {
                "status": "answered",
                "question": pending.get("question"),
                "answer": pending.get("answer"),
                "asked_at": pending.get("timestamp"),
                "answered_at": pending.get("answered_at"),
            }
        else:
            return {
                "status": "pending",
                "question": pending.get("question"),
                "answer": None,
                "asked_at": pending.get("timestamp"),
                "answered_at": None,
            }

    except Exception as e:
        return {
            "status": "error",
            "error": f"Unexpected error checking for answer: {str(e)}",
            "question": None,
            "answer": None,
            "asked_at": None,
            "answered_at": None,
        }


def clear_pending_question(tool_context: ToolContext) -> dict[str, Any]:
    """Clear any pending question from state.

    This tool allows agents to explicitly clear a pending question, either
    after receiving an answer or to cancel a question that's no longer relevant.

    Args:
        tool_context: ToolContext containing potential pending question

    Returns:
        dict: {
            "status": "success" | "none",
            "message": str,
            "cleared_question": str | None,  # The question that was cleared
        }

    Example:
        >>> clear_pending_question(context)
        {
            "status": "success",
            "message": "Cleared pending question",
            "cleared_question": "Should agents be grouped by module?"
        }
    """
    try:
        if "pending_question" not in tool_context.state:
            return {
                "status": "none",
                "message": "No pending question to clear",
                "cleared_question": None,
            }

        cleared = tool_context.state["pending_question"].get("question")
        del tool_context.state["pending_question"]

        return {
            "status": "success",
            "message": "Cleared pending question",
            "cleared_question": cleared,
        }

    except Exception as e:
        return {
            "status": "error",
            "error": f"Unexpected error clearing question: {str(e)}",
            "cleared_question": None,
        }
