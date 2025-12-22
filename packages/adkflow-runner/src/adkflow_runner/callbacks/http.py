"""HTTP callbacks for UI integration.

Posts events to a callback URL for real-time UI updates.
"""

import asyncio
import json
from typing import TYPE_CHECKING, Any

from adkflow_runner.runner.workflow_runner import RunEvent

if TYPE_CHECKING:
    import httpx as httpx_types

try:
    import httpx

    HAS_HTTPX = True
except ImportError:
    HAS_HTTPX = False
    httpx = None  # type: ignore[assignment]


class HttpCallbacks:
    """HTTP POST callbacks for UI integration.

    Posts events to a callback URL as they occur.
    """

    _client: "httpx_types.AsyncClient | None"

    def __init__(
        self,
        callback_url: str,
        timeout: float = 5.0,
        retry_count: int = 2,
        batch_events: bool = False,
        batch_interval: float = 0.1,
    ):
        if not HAS_HTTPX or httpx is None:
            raise ImportError(
                "httpx is required for HTTP callbacks. Install with: pip install httpx"
            )

        self.callback_url = callback_url
        self.timeout = timeout
        self.retry_count = retry_count
        self.batch_events = batch_events
        self.batch_interval = batch_interval

        self._client = None
        self._event_queue: list[RunEvent] = []
        self._batch_task: asyncio.Task[None] | None = None
        self._httpx = httpx

    async def _get_client(self) -> "httpx_types.AsyncClient":
        """Get or create HTTP client."""
        if self._client is None:
            self._client = self._httpx.AsyncClient(timeout=self.timeout)
        return self._client

    async def on_event(self, event: RunEvent) -> None:
        """Handle an execution event."""
        if self.batch_events:
            self._event_queue.append(event)
            if self._batch_task is None:
                self._batch_task = asyncio.create_task(self._flush_batch())
        else:
            await self._send_event(event)

    async def _send_event(self, event: RunEvent) -> None:
        """Send a single event to the callback URL."""
        client = await self._get_client()

        for attempt in range(self.retry_count + 1):
            try:
                response = await client.post(
                    self.callback_url,
                    json=event.to_dict(),
                    headers={"Content-Type": "application/json"},
                )
                response.raise_for_status()
                return

            except self._httpx.HTTPStatusError as e:
                if attempt < self.retry_count:
                    await asyncio.sleep(0.1 * (attempt + 1))
                else:
                    print(f"HTTP callback failed: {e}")

            except self._httpx.RequestError as e:
                if attempt < self.retry_count:
                    await asyncio.sleep(0.1 * (attempt + 1))
                else:
                    print(f"HTTP callback request error: {e}")

    async def _send_batch(self, events: list[RunEvent]) -> None:
        """Send a batch of events."""
        client = await self._get_client()

        for attempt in range(self.retry_count + 1):
            try:
                response = await client.post(
                    self.callback_url,
                    json={"events": [e.to_dict() for e in events]},
                    headers={"Content-Type": "application/json"},
                )
                response.raise_for_status()
                return

            except (self._httpx.HTTPStatusError, self._httpx.RequestError) as e:
                if attempt < self.retry_count:
                    await asyncio.sleep(0.1 * (attempt + 1))
                else:
                    print(f"HTTP batch callback failed: {e}")

    async def _flush_batch(self) -> None:
        """Flush batched events."""
        await asyncio.sleep(self.batch_interval)

        if self._event_queue:
            events = self._event_queue.copy()
            self._event_queue.clear()
            await self._send_batch(events)

        self._batch_task = None

    async def close(self) -> None:
        """Close the HTTP client."""
        if self._batch_task:
            self._batch_task.cancel()
            try:
                await self._batch_task
            except asyncio.CancelledError:
                pass

        if self._event_queue:
            await self._send_batch(self._event_queue)
            self._event_queue.clear()

        if self._client:
            await self._client.aclose()
            self._client = None

    async def __aenter__(self) -> "HttpCallbacks":
        return self

    async def __aexit__(self, *args: Any) -> None:
        await self.close()


class SseCallbacks:
    """Server-Sent Events (SSE) style callbacks.

    Formats events for SSE streaming.
    """

    def __init__(self):
        self._events: asyncio.Queue[RunEvent] = asyncio.Queue()

    async def on_event(self, event: RunEvent) -> None:
        """Queue event for SSE streaming."""
        await self._events.put(event)

    async def stream(self):
        """Yield SSE-formatted events."""
        while True:
            event = await self._events.get()
            yield f"event: {event.type.value}\n"
            yield f"data: {json.dumps(event.to_dict())}\n\n"

    def format_event(self, event: RunEvent) -> str:
        """Format a single event as SSE."""
        return f"event: {event.type.value}\ndata: {json.dumps(event.to_dict())}\n\n"
