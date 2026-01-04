"""Builtin FlowUnit nodes for ADKFlow.

These are core nodes that are always available, not loaded from extensions.
They are registered with the extension registry at startup.
"""

from adkflow_runner.builtin_units.context_aggregator import ContextAggregatorUnit

# All builtin FlowUnit classes
BUILTIN_UNITS = [
    ContextAggregatorUnit,
]

__all__ = [
    "ContextAggregatorUnit",
    "BUILTIN_UNITS",
]
