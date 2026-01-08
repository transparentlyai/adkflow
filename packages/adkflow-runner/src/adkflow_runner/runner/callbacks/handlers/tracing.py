"""Handler for OpenTelemetry tracing integration.

Priority 200: Adds span attributes for agent configuration.
"""

from __future__ import annotations

from typing import Any

from google.adk.agents import Agent, LoopAgent, ParallelAgent, SequentialAgent
from opentelemetry import trace

from adkflow_runner.runner.agent_serialization import (
    flatten_agent_config,
    serialize_agent_config,
    serialize_workflow_agent_config,
)
from adkflow_runner.runner.callbacks.handlers.base import BaseHandler
from adkflow_runner.runner.callbacks.types import HandlerResult


class TracingHandler(BaseHandler):
    """Adds OpenTelemetry span attributes for agent execution.

    Serializes agent configuration and adds as span attributes for
    observability and debugging.

    Priority: 200
    """

    DEFAULT_PRIORITY = 200

    def before_agent(
        self,
        callback_context: Any,
        agent_name: str,
    ) -> HandlerResult | None:
        """Add agent config attributes to current span.

        Args:
            callback_context: ADK callback context
            agent_name: Name of the agent

        Returns:
            None (adds span attributes)
        """
        span = trace.get_current_span()
        if not span.is_recording():
            return None

        agent = callback_context._invocation_context.agent

        # Serialize based on agent type
        if isinstance(agent, (SequentialAgent, ParallelAgent, LoopAgent)):
            config = serialize_workflow_agent_config(agent)
        elif isinstance(agent, Agent):
            config = serialize_agent_config(agent)
        else:
            config = {}

        # Flatten and set attributes
        for key, value in flatten_agent_config(config).items():
            span.set_attribute(key, value)

        return None
