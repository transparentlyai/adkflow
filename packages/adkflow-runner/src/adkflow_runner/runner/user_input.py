"""User input handling for workflow execution."""

import asyncio
import time
import uuid
from typing import Any

from adkflow_runner.runner.types import (
    RunConfig,
    RunEvent,
    EventType,
    UserInputRequest,
)


async def handle_user_input(
    user_input: Any,  # UserInputIR
    previous_output: str | None,
    config: RunConfig,
    emit: Any,
) -> str | None:
    """Handle a user input pause point.

    Emits USER_INPUT_REQUIRED event, waits for response (or timeout),
    and returns the user's input.

    Args:
        user_input: The UserInputIR to handle
        previous_output: Output from previous agent (None for triggers)
        config: Run configuration
        emit: Event emitter function

    Returns:
        User's input string, or None if skipped/cancelled
    """
    request_id = str(uuid.uuid4())[:8]

    # Create request
    request = UserInputRequest(
        request_id=request_id,
        node_id=user_input.id,
        node_name=user_input.name,
        variable_name=user_input.variable_name,
        previous_output=previous_output,
        is_trigger=user_input.is_trigger,
        timeout_seconds=user_input.timeout_seconds,
        timeout_behavior=user_input.timeout_behavior,
        predefined_text=user_input.predefined_text,
    )

    # Emit USER_INPUT_REQUIRED event
    await emit(
        RunEvent(
            type=EventType.USER_INPUT_REQUIRED,
            timestamp=time.time(),
            data=request.to_dict(),
        )
    )

    # If we have a user input provider, use it
    if config.user_input_provider:
        try:
            response = await config.user_input_provider.request_input(request)

            # Emit received event
            await emit(
                RunEvent(
                    type=EventType.USER_INPUT_RECEIVED,
                    timestamp=time.time(),
                    data={
                        "request_id": request_id,
                        "node_id": user_input.id,
                        "node_name": user_input.name,
                    },
                )
            )

            return response

        except TimeoutError:
            # Emit timeout event
            await emit(
                RunEvent(
                    type=EventType.USER_INPUT_TIMEOUT,
                    timestamp=time.time(),
                    data={
                        "request_id": request_id,
                        "node_id": user_input.id,
                        "behavior": user_input.timeout_behavior,
                    },
                )
            )

            # Handle timeout based on configured behavior
            if user_input.timeout_behavior == "pass_through":
                return previous_output
            elif user_input.timeout_behavior == "predefined_text":
                return user_input.predefined_text
            else:  # "error"
                raise RuntimeError(f"User input timeout for '{user_input.name}'")

        except asyncio.CancelledError:
            raise

    else:
        # No user input provider configured
        # Use timeout behavior immediately
        if user_input.timeout_behavior == "pass_through":
            return previous_output
        elif user_input.timeout_behavior == "predefined_text":
            return user_input.predefined_text
        else:
            # For trigger inputs without a provider, we can't proceed
            if user_input.is_trigger:
                raise RuntimeError(
                    f"No user input provider configured and trigger "
                    f"'{user_input.name}' requires input"
                )
            return previous_output
