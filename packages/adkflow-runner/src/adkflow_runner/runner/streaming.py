"""Streaming execution utilities for workflow runner.

Provides async generator support for streaming workflow execution events.
"""

import asyncio
from typing import AsyncIterator, TYPE_CHECKING

from adkflow_runner.runner.types import (
    RunConfig,
    RunEvent,
    RunResult,
)

if TYPE_CHECKING:
    from adkflow_runner.runner.workflow_runner import WorkflowRunner


class QueueCallbacks:
    """Callbacks that push events to an asyncio queue."""

    def __init__(self, queue: asyncio.Queue[RunEvent | None]) -> None:
        self._queue = queue

    async def on_event(self, event: RunEvent) -> None:
        """Push event to the queue."""
        await self._queue.put(event)


async def run_workflow_generator(
    runner: "WorkflowRunner",
    config: RunConfig,
) -> AsyncIterator[RunEvent | RunResult]:
    """Run a workflow and yield events as they occur.

    Args:
        runner: The workflow runner instance
        config: Run configuration

    Yields:
        RunEvent objects as execution progresses, RunResult at end
    """
    event_queue: asyncio.Queue[RunEvent | None] = asyncio.Queue()

    config_with_callbacks = RunConfig(
        project_path=config.project_path,
        tab_id=config.tab_id,
        input_data=config.input_data,
        callbacks=QueueCallbacks(event_queue),
        timeout_seconds=config.timeout_seconds,
        validate=config.validate,
        user_input_provider=config.user_input_provider,
        max_llm_calls=config.max_llm_calls,
        context_window_compression=config.context_window_compression,
        streaming_mode=config.streaming_mode,
    )

    # Start run in background
    run_task = asyncio.create_task(runner.run(config_with_callbacks))

    try:
        while True:
            # Wait for event or task completion
            done, _ = await asyncio.wait(
                [
                    asyncio.create_task(event_queue.get()),
                    run_task,
                ],
                return_when=asyncio.FIRST_COMPLETED,
            )

            for task in done:
                if task == run_task:
                    # Drain remaining events
                    while not event_queue.empty():
                        event = await event_queue.get()
                        if event:
                            yield event
                    return
                else:
                    event = task.result()
                    if event:
                        yield event

    except asyncio.CancelledError:
        run_task.cancel()
        raise
