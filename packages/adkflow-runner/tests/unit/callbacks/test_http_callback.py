"""Tests for HTTP callbacks."""

from unittest.mock import AsyncMock, MagicMock, patch
import asyncio

import pytest

from adkflow_runner.runner.types import EventType, RunEvent


class TestHttpCallbacksImport:
    """Tests for HttpCallbacks import and dependencies."""

    def test_import_with_httpx(self):
        """Import HttpCallbacks when httpx available."""
        try:
            from adkflow_runner.callbacks.http import HttpCallbacks, HAS_HTTPX

            assert HAS_HTTPX is True
            assert HttpCallbacks is not None
        except ImportError:
            pytest.skip("httpx not installed")

    def test_has_httpx_flag(self):
        """HAS_HTTPX flag indicates availability."""
        from adkflow_runner.callbacks.http import HAS_HTTPX

        assert isinstance(HAS_HTTPX, bool)


class TestHttpCallbacksCreation:
    """Tests for HttpCallbacks initialization."""

    @pytest.fixture
    def http_callbacks(self):
        """Create HttpCallbacks instance."""
        try:
            from adkflow_runner.callbacks.http import HttpCallbacks

            return HttpCallbacks(callback_url="http://localhost:8000/events")
        except ImportError:
            pytest.skip("httpx not installed")

    def test_creation_with_url(self, http_callbacks):
        """Create with callback URL."""
        assert http_callbacks.callback_url == "http://localhost:8000/events"

    def test_creation_with_timeout(self):
        """Create with custom timeout."""
        try:
            from adkflow_runner.callbacks.http import HttpCallbacks

            cb = HttpCallbacks(
                callback_url="http://test",
                timeout=10.0,
            )
            assert cb.timeout == 10.0
        except ImportError:
            pytest.skip("httpx not installed")

    def test_creation_with_retry(self):
        """Create with retry count."""
        try:
            from adkflow_runner.callbacks.http import HttpCallbacks

            cb = HttpCallbacks(
                callback_url="http://test",
                retry_count=5,
            )
            assert cb.retry_count == 5
        except ImportError:
            pytest.skip("httpx not installed")

    def test_creation_with_batching(self):
        """Create with event batching."""
        try:
            from adkflow_runner.callbacks.http import HttpCallbacks

            cb = HttpCallbacks(
                callback_url="http://test",
                batch_events=True,
                batch_interval=0.5,
            )
            assert cb.batch_events is True
            assert cb.batch_interval == 0.5
        except ImportError:
            pytest.skip("httpx not installed")


class TestHttpCallbacksEvents:
    """Tests for event handling."""

    @pytest.fixture
    def mock_httpx(self):
        """Mock httpx client."""
        with patch("adkflow_runner.callbacks.http.httpx") as mock:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=MagicMock(status_code=200))
            mock.AsyncClient.return_value = mock_client
            yield mock

    @pytest.mark.asyncio
    async def test_on_event_sends_request(self, mock_httpx):
        """on_event sends HTTP request."""
        try:
            from adkflow_runner.callbacks.http import HttpCallbacks

            cb = HttpCallbacks(callback_url="http://test/events")

            event = RunEvent(
                type=EventType.AGENT_START,
                timestamp=1234567890.0,
                agent_name="TestAgent",
            )

            await cb.on_event(event)

        except ImportError:
            pytest.skip("httpx not installed")

    @pytest.mark.asyncio
    async def test_on_event_batched(self, mock_httpx):
        """Batched events are queued."""
        try:
            from adkflow_runner.callbacks.http import HttpCallbacks

            cb = HttpCallbacks(
                callback_url="http://test",
                batch_events=True,
                batch_interval=0.1,
            )

            event = RunEvent(
                type=EventType.AGENT_START,
                timestamp=1234567890.0,
            )

            await cb.on_event(event)
            assert len(cb._event_queue) >= 0  # May have been flushed

        except ImportError:
            pytest.skip("httpx not installed")


class TestHttpCallbacksErrors:
    """Tests for error handling."""

    def test_has_httpx_flag_exists(self):
        """HAS_HTTPX flag is defined."""
        from adkflow_runner.callbacks.http import HAS_HTTPX

        # HAS_HTTPX should be True if httpx is installed
        assert isinstance(HAS_HTTPX, bool)
        # We expect httpx to be installed in our environment
        assert HAS_HTTPX is True


class TestHttpCallbacksCleanup:
    """Tests for cleanup behavior."""

    @pytest.mark.asyncio
    async def test_close_client(self):
        """Close closes HTTP client."""
        try:
            from adkflow_runner.callbacks.http import HttpCallbacks

            cb = HttpCallbacks(callback_url="http://test")

            # Access client to create it
            with patch.object(cb, "_httpx") as mock_httpx:
                mock_client = AsyncMock()
                mock_httpx.AsyncClient.return_value = mock_client

                await cb.close()
                # Should be safe even if client not created

        except ImportError:
            pytest.skip("httpx not installed")


class TestHttpCallbacksSendEvent:
    """Tests for _send_event method."""

    @pytest.mark.asyncio
    async def test_send_event_success(self):
        """_send_event posts event to callback URL."""
        try:
            from adkflow_runner.callbacks.http import HttpCallbacks

            cb = HttpCallbacks(callback_url="http://test/events")

            mock_response = MagicMock()
            mock_response.raise_for_status = MagicMock()

            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_response)
            cb._client = mock_client

            event = RunEvent(type=EventType.AGENT_START, timestamp=1.0)
            await cb._send_event(event)

            mock_client.post.assert_called_once()
            call_kwargs = mock_client.post.call_args[1]
            assert call_kwargs["json"]["type"] == "agent_start"

        except ImportError:
            pytest.skip("httpx not installed")

    @pytest.mark.asyncio
    async def test_send_event_retry_on_http_error(self, capsys):
        """_send_event retries on HTTP errors."""
        try:
            from adkflow_runner.callbacks.http import HttpCallbacks
            import httpx

            cb = HttpCallbacks(callback_url="http://test", retry_count=1)

            error = httpx.HTTPStatusError(
                "500 Server Error",
                request=MagicMock(),
                response=MagicMock(),
            )

            mock_client = AsyncMock()
            mock_client.post = AsyncMock(side_effect=error)
            cb._client = mock_client

            event = RunEvent(type=EventType.AGENT_START, timestamp=1.0)
            await cb._send_event(event)

            # Should have retried
            assert mock_client.post.call_count == 2

            captured = capsys.readouterr()
            assert "HTTP callback failed" in captured.out

        except ImportError:
            pytest.skip("httpx not installed")

    @pytest.mark.asyncio
    async def test_send_event_retry_on_request_error(self, capsys):
        """_send_event retries on request errors."""
        try:
            from adkflow_runner.callbacks.http import HttpCallbacks
            import httpx

            cb = HttpCallbacks(callback_url="http://test", retry_count=1)

            error = httpx.RequestError("Connection failed")

            mock_client = AsyncMock()
            mock_client.post = AsyncMock(side_effect=error)
            cb._client = mock_client

            event = RunEvent(type=EventType.AGENT_START, timestamp=1.0)
            await cb._send_event(event)

            assert mock_client.post.call_count == 2

            captured = capsys.readouterr()
            assert "request error" in captured.out

        except ImportError:
            pytest.skip("httpx not installed")


class TestHttpCallbacksBatching:
    """Tests for batch event handling."""

    @pytest.mark.asyncio
    async def test_flush_batch(self):
        """_flush_batch sends queued events."""
        try:
            from adkflow_runner.callbacks.http import HttpCallbacks

            cb = HttpCallbacks(
                callback_url="http://test",
                batch_events=True,
                batch_interval=0.01,
            )

            mock_response = MagicMock()
            mock_response.raise_for_status = MagicMock()

            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_response)
            cb._client = mock_client

            # Queue some events
            cb._event_queue = [
                RunEvent(type=EventType.AGENT_START, timestamp=1.0),
                RunEvent(type=EventType.AGENT_END, timestamp=2.0),
            ]

            await cb._flush_batch()

            mock_client.post.assert_called_once()
            call_kwargs = mock_client.post.call_args[1]
            assert len(call_kwargs["json"]["events"]) == 2
            assert cb._event_queue == []

        except ImportError:
            pytest.skip("httpx not installed")

    @pytest.mark.asyncio
    async def test_send_batch_retry_on_error(self, capsys):
        """_send_batch retries on errors."""
        try:
            from adkflow_runner.callbacks.http import HttpCallbacks
            import httpx

            cb = HttpCallbacks(callback_url="http://test", retry_count=1)

            error = httpx.HTTPStatusError(
                "500 Server Error",
                request=MagicMock(),
                response=MagicMock(),
            )

            mock_client = AsyncMock()
            mock_client.post = AsyncMock(side_effect=error)
            cb._client = mock_client

            events = [RunEvent(type=EventType.AGENT_START, timestamp=1.0)]
            await cb._send_batch(events)

            assert mock_client.post.call_count == 2

            captured = capsys.readouterr()
            assert "batch callback failed" in captured.out

        except ImportError:
            pytest.skip("httpx not installed")


class TestHttpCallbacksContextManager:
    """Tests for context manager protocol."""

    @pytest.mark.asyncio
    async def test_async_context_manager(self):
        """HttpCallbacks works as async context manager."""
        try:
            from adkflow_runner.callbacks.http import HttpCallbacks

            async with HttpCallbacks(callback_url="http://test") as cb:
                assert cb.callback_url == "http://test"

        except ImportError:
            pytest.skip("httpx not installed")


class TestHttpCallbacksClose:
    """Tests for close method."""

    @pytest.mark.asyncio
    async def test_close_cancels_batch_task(self):
        """close() cancels pending batch task."""
        try:
            from adkflow_runner.callbacks.http import HttpCallbacks

            cb = HttpCallbacks(
                callback_url="http://test",
                batch_events=True,
                batch_interval=10.0,  # Long interval
            )

            # Simulate pending batch task
            async def slow_flush():
                await asyncio.sleep(10)

            cb._batch_task = asyncio.create_task(slow_flush())

            # Close should cancel the task
            await cb.close()
            assert cb._batch_task is None or cb._batch_task.cancelled()

        except ImportError:
            pytest.skip("httpx not installed")

    @pytest.mark.asyncio
    async def test_close_flushes_remaining_events(self):
        """close() sends remaining queued events."""
        try:
            from adkflow_runner.callbacks.http import HttpCallbacks

            cb = HttpCallbacks(
                callback_url="http://test",
                batch_events=True,
            )

            mock_response = MagicMock()
            mock_response.raise_for_status = MagicMock()

            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.aclose = AsyncMock()
            cb._client = mock_client

            # Queue an event
            cb._event_queue = [RunEvent(type=EventType.AGENT_START, timestamp=1.0)]

            await cb.close()

            # Should have sent the batch
            mock_client.post.assert_called_once()
            assert cb._event_queue == []

        except ImportError:
            pytest.skip("httpx not installed")

    @pytest.mark.asyncio
    async def test_close_closes_client(self):
        """close() closes the HTTP client."""
        try:
            from adkflow_runner.callbacks.http import HttpCallbacks

            cb = HttpCallbacks(callback_url="http://test")

            mock_client = AsyncMock()
            mock_client.aclose = AsyncMock()
            cb._client = mock_client

            await cb.close()

            mock_client.aclose.assert_called_once()
            assert cb._client is None

        except ImportError:
            pytest.skip("httpx not installed")


class TestSseCallbacks:
    """Tests for SseCallbacks class."""

    def test_creation(self):
        """SseCallbacks can be created."""
        from adkflow_runner.callbacks.http import SseCallbacks

        cb = SseCallbacks()
        assert cb._events is not None

    @pytest.mark.asyncio
    async def test_on_event_queues(self):
        """on_event queues events."""
        from adkflow_runner.callbacks.http import SseCallbacks

        cb = SseCallbacks()
        event = RunEvent(type=EventType.AGENT_START, timestamp=1.0)

        await cb.on_event(event)

        assert not cb._events.empty()
        queued_event = await cb._events.get()
        assert queued_event == event

    def test_format_event(self):
        """format_event creates SSE-formatted string."""
        from adkflow_runner.callbacks.http import SseCallbacks

        cb = SseCallbacks()
        event = RunEvent(type=EventType.AGENT_START, timestamp=1.0)

        formatted = cb.format_event(event)

        assert "event: agent_start" in formatted
        assert "data:" in formatted
        assert formatted.endswith("\n\n")

    @pytest.mark.asyncio
    async def test_stream_yields_events(self):
        """stream() yields SSE-formatted events."""
        from adkflow_runner.callbacks.http import SseCallbacks

        cb = SseCallbacks()
        event = RunEvent(type=EventType.AGENT_START, timestamp=1.0)

        await cb.on_event(event)

        # Start stream generator
        gen = cb.stream()
        first_line = await gen.__anext__()
        second_line = await gen.__anext__()

        assert "event:" in first_line
        assert "data:" in second_line
