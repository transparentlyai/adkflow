"""Builtin FlowUnit nodes for ADKFlow.

These are core nodes that are always available, not loaded from extensions.
They are registered with the extension registry at startup.

Note: ContextAggregator was moved to a built-in node executed directly by
the workflow runner (see runner/context_aggregator_executor.py) and is no
longer registered as a FlowUnit.
"""

# All builtin FlowUnit classes
BUILTIN_UNITS: list = []

__all__ = [
    "BUILTIN_UNITS",
]
