"""Executor for custom FlowUnit nodes."""

import json
import time
from pathlib import Path
from typing import Any, Callable

from adkflow_runner.extensions import get_registry, ExecutionContext
from adkflow_runner.ir import CustomNodeIR
from adkflow_runner.errors import ExecutionError


class LLMCache:
    """Simple file-based cache for LLM results.

    Caches results based on input/config hash to avoid
    redundant API calls.
    """

    def __init__(self, cache_dir: Path):
        self.cache_dir = cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def get(self, hash_key: str) -> Any | None:
        """Get cached value by hash key."""
        cache_file = self.cache_dir / f"{hash_key}.json"
        if cache_file.exists():
            try:
                return json.loads(cache_file.read_text())
            except (json.JSONDecodeError, IOError):
                return None
        return None

    def set(self, hash_key: str, value: Any) -> None:
        """Store value in cache."""
        cache_file = self.cache_dir / f"{hash_key}.json"
        try:
            cache_file.write_text(json.dumps(value, default=str))
        except (TypeError, IOError) as e:
            print(f"[LLMCache] Failed to cache: {e}")

    def clear(self) -> None:
        """Clear all cached values."""
        for cache_file in self.cache_dir.glob("*.json"):
            cache_file.unlink()


class CustomNodeExecutor:
    """Executes custom FlowUnit nodes during workflow runs.

    Handles:
    - Loading FlowUnit classes from the registry
    - Creating execution context
    - Running lifecycle hooks
    - Emitting events for real-time updates
    - Caching LLM results
    """

    def __init__(
        self,
        emit: Callable | None = None,
        enable_cache: bool = True,
        cache_dir: Path | None = None,
    ):
        self.emit = emit
        self._cache: LLMCache | None = None

        if enable_cache and cache_dir:
            self._cache = LLMCache(cache_dir)

    async def execute(
        self,
        node_ir: CustomNodeIR,
        inputs: dict[str, Any],
        session_state: dict[str, Any],
        project_path: Path,
        session_id: str = "",
        run_id: str = "",
    ) -> dict[str, Any]:
        """Execute a custom node.

        Args:
            node_ir: The custom node IR
            inputs: Input values from connected nodes
            session_state: Shared state across the run
            project_path: Path to the project
            session_id: Current session ID
            run_id: Current run ID

        Returns:
            Dict mapping output port IDs to their values

        Raises:
            ExecutionError: If the node type is not found or execution fails
        """
        registry = get_registry()
        unit_cls = registry.get_unit(node_ir.unit_id)

        if not unit_cls:
            raise ExecutionError(
                message=f"Unknown custom node type: {node_ir.unit_id}",
                agent_id=node_ir.id,
            )

        # Check cache first
        if self._cache:
            hash_key = unit_cls.compute_state_hash(inputs, node_ir.config)
            cached = self._cache.get(hash_key)
            if cached is not None:
                await self._emit_event(
                    "custom_node_cache_hit", node_ir, {"cached": True}
                )
                return cached

        # Create instance
        unit = unit_cls()

        # Build execution context
        context = ExecutionContext(
            session_id=session_id,
            run_id=run_id,
            node_id=node_ir.id,
            node_name=node_ir.name,
            state=session_state,
            emit=self._create_emit_wrapper(node_ir),
            project_path=project_path,
        )

        # Execute with lifecycle hooks
        try:
            await self._emit_event("custom_node_start", node_ir, {})

            await unit.on_before_execute(context)

            start_time = time.time()
            outputs = await unit.run_process(inputs, node_ir.config, context)
            duration_ms = (time.time() - start_time) * 1000

            await unit.on_after_execute(context, outputs)

            await self._emit_event(
                "custom_node_end",
                node_ir,
                {
                    "duration_ms": duration_ms,
                    "output_keys": list(outputs.keys()),
                },
            )

            # Cache the result
            if self._cache:
                hash_key = unit_cls.compute_state_hash(inputs, node_ir.config)
                self._cache.set(hash_key, outputs)

            return outputs

        except Exception as e:
            await self._emit_event(
                "custom_node_error",
                node_ir,
                {
                    "error": str(e),
                    "error_type": type(e).__name__,
                },
            )
            raise ExecutionError(
                message=f"Custom node execution failed: {e}",
                agent_id=node_ir.id,
            ) from e

    def _create_emit_wrapper(self, node_ir: CustomNodeIR) -> Callable:
        """Create an emit function for the execution context."""

        async def emit_wrapper(event: Any) -> None:
            if self.emit:
                # Wrap the event with node context
                wrapped_event = {
                    "type": "custom_node_event",
                    "node_id": node_ir.id,
                    "unit_id": node_ir.unit_id,
                    "event": event,
                }
                await self.emit(wrapped_event)

        return emit_wrapper

    async def _emit_event(
        self,
        event_type: str,
        node_ir: CustomNodeIR,
        data: dict[str, Any],
    ) -> None:
        """Emit a lifecycle event."""
        if self.emit:
            event = {
                "type": event_type,
                "timestamp": time.time(),
                "node_id": node_ir.id,
                "unit_id": node_ir.unit_id,
                "node_name": node_ir.name,
                "data": data,
            }
            try:
                await self.emit(event)
            except Exception as e:
                print(f"[CustomNodeExecutor] Failed to emit event: {e}")
