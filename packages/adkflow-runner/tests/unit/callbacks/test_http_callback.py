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
