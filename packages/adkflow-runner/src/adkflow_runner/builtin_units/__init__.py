"""Builtin FlowUnit nodes for ADKFlow.

These are core nodes that are always available, not loaded from extensions.
They are registered with the extension registry at startup.

Note: ContextAggregator was moved to a built-in node executed directly by
the workflow runner (see runner/context_aggregator_executor.py) and is no
longer registered as a FlowUnit.

Note: MonitorUnit is registered for execution only (no schema exposure) since
its UI schema is defined in the frontend. This prevents it from appearing
in the extensions menu.
"""

from adkflow_runner.builtin_units.monitor_unit import MonitorUnit

# Builtin FlowUnit classes that expose schemas via the extensions API
BUILTIN_UNITS: list = []

# Builtin FlowUnit classes registered for execution only (no schema)
# These have their UI schemas defined in the frontend
EXECUTION_ONLY_UNITS: list = [
    MonitorUnit,
]

__all__ = [
    "BUILTIN_UNITS",
    "EXECUTION_ONLY_UNITS",
    "MonitorUnit",
]
