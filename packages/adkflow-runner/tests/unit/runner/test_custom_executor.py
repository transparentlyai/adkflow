"""Tests for custom node executor."""

import pytest
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

from adkflow_runner.runner.custom_executor import LLMCache, CustomNodeExecutor
from adkflow_runner.ir import CustomNodeIR
from adkflow_runner.errors import ExecutionError


class TestLLMCache:
    """Tests for LLMCache class."""

    def test_creation(self, tmp_path):
        """LLMCache creates cache directory."""
        cache_dir = tmp_path / "cache"
        cache = LLMCache(cache_dir)
        assert cache_dir.exists()
        assert cache.cache_dir == cache_dir

    def test_creation_existing_dir(self, tmp_path):
        """LLMCache works with existing directory."""
        cache_dir = tmp_path / "cache"
        cache_dir.mkdir()
        cache = LLMCache(cache_dir)
        assert cache.cache_dir == cache_dir

    def test_get_nonexistent(self, tmp_path):
        """get() returns None for nonexistent key."""
        cache = LLMCache(tmp_path)
        result = cache.get("nonexistent")
        assert result is None

    def test_set_and_get(self, tmp_path):
        """set() stores value that can be retrieved with get()."""
        cache = LLMCache(tmp_path)
        cache.set("test_key", {"result": "value"})
        result = cache.get("test_key")
        assert result == {"result": "value"}

    def test_set_complex_value(self, tmp_path):
        """set() handles complex nested values."""
        cache = LLMCache(tmp_path)
        value = {
            "outputs": {"port1": "value1", "port2": 42},
            "metadata": {"duration": 1.5},
        }
        cache.set("complex", value)
        result = cache.get("complex")
        assert result == value

    def test_set_with_default_serializer(self, tmp_path):
        """set() uses default str serializer for non-JSON types."""
        cache = LLMCache(tmp_path)
        from datetime import datetime

        # datetime is serialized using default=str
        cache.set("date", {"time": datetime(2024, 1, 1)})
        result = cache.get("date")
        assert result is not None
        assert "2024" in result["time"]

    def test_get_corrupted_cache(self, tmp_path):
        """get() returns None for corrupted cache file."""
        cache = LLMCache(tmp_path)
        cache_file = tmp_path / "corrupted.json"
        cache_file.write_text("not valid json")
        result = cache.get("corrupted")
        assert result is None

    def test_clear(self, tmp_path):
        """clear() removes all cached values."""
        cache = LLMCache(tmp_path)
        cache.set("key1", {"a": 1})
        cache.set("key2", {"b": 2})

        cache.clear()

        assert cache.get("key1") is None
        assert cache.get("key2") is None
        assert len(list(tmp_path.glob("*.json"))) == 0


class TestCustomNodeExecutor:
    """Tests for CustomNodeExecutor class."""

    def test_creation_default(self):
        """CustomNodeExecutor can be created with defaults."""
        executor = CustomNodeExecutor()
        assert executor.emit is None
        assert executor._cache is None

    def test_creation_with_emit(self):
        """CustomNodeExecutor can be created with emit function."""
        emit = AsyncMock()
        executor = CustomNodeExecutor(emit=emit)
        assert executor.emit == emit

    def test_creation_with_cache(self, tmp_path):
        """CustomNodeExecutor can be created with cache enabled."""
        executor = CustomNodeExecutor(enable_cache=True, cache_dir=tmp_path)
        assert executor._cache is not None

    def test_creation_cache_disabled(self, tmp_path):
        """CustomNodeExecutor cache is disabled by default."""
        executor = CustomNodeExecutor(enable_cache=False, cache_dir=tmp_path)
        assert executor._cache is None

    def test_creation_cache_no_dir(self):
        """CustomNodeExecutor cache disabled without cache_dir."""
        executor = CustomNodeExecutor(enable_cache=True, cache_dir=None)
        assert executor._cache is None

    @pytest.mark.asyncio
    async def test_execute_unknown_unit(self):
        """execute() raises for unknown unit type."""
        executor = CustomNodeExecutor()

        node_ir = CustomNodeIR(
            id="node1",
            name="Test Node",
            unit_id="unknown_unit",
            config={},
            source_node_id="rf_node1",
        )

        with patch(
            "adkflow_runner.runner.custom_executor.get_registry"
        ) as mock_get_registry:
            mock_registry = MagicMock()
            mock_registry.get_unit.return_value = None
            mock_get_registry.return_value = mock_registry

            with pytest.raises(ExecutionError, match="Unknown custom node type"):
                await executor.execute(
                    node_ir,
                    inputs={},
                    session_state={},
                    project_path=Path("/test"),
                )

    @pytest.mark.asyncio
    async def test_execute_success(self, tmp_path):
        """execute() runs unit and returns outputs."""
        executor = CustomNodeExecutor()

        node_ir = CustomNodeIR(
            id="node1",
            name="Test Node",
            unit_id="test_unit",
            config={"key": "value"},
            source_node_id="rf_node1",
        )

        mock_unit = AsyncMock()
        mock_unit.run_process = AsyncMock(return_value={"output": "result"})
        mock_unit.on_before_execute = AsyncMock()
        mock_unit.on_after_execute = AsyncMock()

        mock_unit_cls = MagicMock(return_value=mock_unit)

        with patch(
            "adkflow_runner.runner.custom_executor.get_registry"
        ) as mock_get_registry:
            mock_registry = MagicMock()
            mock_registry.get_unit.return_value = mock_unit_cls
            mock_get_registry.return_value = mock_registry

            result = await executor.execute(
                node_ir,
                inputs={"input1": "data"},
                session_state={},
                project_path=tmp_path,
            )

            assert result == {"output": "result"}
            mock_unit.on_before_execute.assert_called_once()
            mock_unit.run_process.assert_called_once()
            mock_unit.on_after_execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_execute_with_emit(self, tmp_path):
        """execute() emits lifecycle events."""
        events = []

        async def emit(event):
            events.append(event)

        executor = CustomNodeExecutor(emit=emit)

        node_ir = CustomNodeIR(
            id="node1",
            name="Test Node",
            unit_id="test_unit",
            config={},
            source_node_id="rf_node1",
        )

        mock_unit = AsyncMock()
        mock_unit.run_process = AsyncMock(return_value={"output": "result"})
        mock_unit.on_before_execute = AsyncMock()
        mock_unit.on_after_execute = AsyncMock()

        mock_unit_cls = MagicMock(return_value=mock_unit)

        with patch(
            "adkflow_runner.runner.custom_executor.get_registry"
        ) as mock_get_registry:
            mock_registry = MagicMock()
            mock_registry.get_unit.return_value = mock_unit_cls
            mock_get_registry.return_value = mock_registry

            await executor.execute(
                node_ir,
                inputs={},
                session_state={},
                project_path=tmp_path,
            )

            # Should emit start and end events
            event_types = [e["type"] for e in events]
            assert "custom_node_start" in event_types
            assert "custom_node_end" in event_types

    @pytest.mark.asyncio
    async def test_execute_with_cache_hit(self, tmp_path):
        """execute() returns cached result on cache hit."""
        events = []

        async def emit(event):
            events.append(event)

        executor = CustomNodeExecutor(emit=emit, enable_cache=True, cache_dir=tmp_path)

        node_ir = CustomNodeIR(
            id="node1",
            name="Test Node",
            unit_id="test_unit",
            config={},
            source_node_id="rf_node1",
        )

        cached_result = {"output": "cached_value"}

        mock_unit_cls = MagicMock()
        mock_unit_cls.compute_state_hash.return_value = "hash123"

        # Pre-populate cache
        executor._cache.set("hash123", cached_result)  # type: ignore[union-attr]

        with patch(
            "adkflow_runner.runner.custom_executor.get_registry"
        ) as mock_get_registry:
            mock_registry = MagicMock()
            mock_registry.get_unit.return_value = mock_unit_cls
            mock_get_registry.return_value = mock_registry

            result = await executor.execute(
                node_ir,
                inputs={},
                session_state={},
                project_path=tmp_path,
            )

            assert result == cached_result
            # Should emit cache hit event
            event_types = [e["type"] for e in events]
            assert "custom_node_cache_hit" in event_types

    @pytest.mark.asyncio
    async def test_execute_caches_result(self, tmp_path):
        """execute() caches result after successful execution."""
        executor = CustomNodeExecutor(enable_cache=True, cache_dir=tmp_path)

        node_ir = CustomNodeIR(
            id="node1",
            name="Test Node",
            unit_id="test_unit",
            config={},
            source_node_id="rf_node1",
        )

        mock_unit = AsyncMock()
        mock_unit.run_process = AsyncMock(return_value={"output": "result"})
        mock_unit.on_before_execute = AsyncMock()
        mock_unit.on_after_execute = AsyncMock()

        mock_unit_cls = MagicMock(return_value=mock_unit)
        mock_unit_cls.compute_state_hash.return_value = "newhash"

        with patch(
            "adkflow_runner.runner.custom_executor.get_registry"
        ) as mock_get_registry:
            mock_registry = MagicMock()
            mock_registry.get_unit.return_value = mock_unit_cls
            mock_get_registry.return_value = mock_registry

            await executor.execute(
                node_ir,
                inputs={},
                session_state={},
                project_path=tmp_path,
            )

            # Verify cache was populated
            cached = executor._cache.get("newhash")  # type: ignore[union-attr]
            assert cached == {"output": "result"}

    @pytest.mark.asyncio
    async def test_execute_error_handling(self, tmp_path):
        """execute() handles execution errors gracefully."""
        events = []

        async def emit(event):
            events.append(event)

        executor = CustomNodeExecutor(emit=emit)

        node_ir = CustomNodeIR(
            id="node1",
            name="Test Node",
            unit_id="test_unit",
            config={},
            source_node_id="rf_node1",
        )

        mock_unit = AsyncMock()
        mock_unit.on_before_execute = AsyncMock()
        mock_unit.run_process = AsyncMock(side_effect=ValueError("Test error"))

        mock_unit_cls = MagicMock(return_value=mock_unit)

        with patch(
            "adkflow_runner.runner.custom_executor.get_registry"
        ) as mock_get_registry:
            mock_registry = MagicMock()
            mock_registry.get_unit.return_value = mock_unit_cls
            mock_get_registry.return_value = mock_registry

            with pytest.raises(ExecutionError, match="Custom node execution failed"):
                await executor.execute(
                    node_ir,
                    inputs={},
                    session_state={},
                    project_path=tmp_path,
                )

            # Should emit error event
            event_types = [e["type"] for e in events]
            assert "custom_node_error" in event_types

    @pytest.mark.asyncio
    async def test_emit_wrapper_wraps_events(self, tmp_path):
        """_create_emit_wrapper creates proper wrapper."""
        events = []

        async def emit(event):
            events.append(event)

        executor = CustomNodeExecutor(emit=emit)

        node_ir = CustomNodeIR(
            id="node1",
            name="Test Node",
            unit_id="test_unit",
            config={},
            source_node_id="rf_node1",
        )

        wrapper = executor._create_emit_wrapper(node_ir)
        await wrapper({"custom": "event"})

        assert len(events) == 1
        assert events[0]["type"] == "custom_node_event"
        assert events[0]["node_id"] == "node1"
        assert events[0]["event"] == {"custom": "event"}

    @pytest.mark.asyncio
    async def test_emit_event_no_emit(self, tmp_path):
        """_emit_event does nothing when emit is None."""
        executor = CustomNodeExecutor(emit=None)

        node_ir = CustomNodeIR(
            id="node1",
            name="Test Node",
            unit_id="test_unit",
            config={},
            source_node_id="rf_node1",
        )

        # Should not raise
        await executor._emit_event("test_event", node_ir, {"data": "value"})

    @pytest.mark.asyncio
    async def test_emit_event_handles_error(self, tmp_path, capsys):
        """_emit_event handles emit errors gracefully."""

        async def bad_emit(event):
            raise RuntimeError("Emit failed")

        executor = CustomNodeExecutor(emit=bad_emit)

        node_ir = CustomNodeIR(
            id="node1",
            name="Test Node",
            unit_id="test_unit",
            config={},
            source_node_id="rf_node1",
        )

        # Should not raise
        await executor._emit_event("test_event", node_ir, {})

        captured = capsys.readouterr()
        assert "Failed to emit event" in captured.out
