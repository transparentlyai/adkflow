"""OpenTelemetry tracing for ADKFlow.

This module provides local tracing support using ADK's built-in OpenTelemetry
instrumentation. Traces are exported to JSONL files for visualization in the
Trace Explorer.

Usage:
    from adkflow_runner.telemetry import setup_tracing

    # Call before running workflows
    setup_tracing(project_path)
"""

from .setup import setup_tracing

__all__ = ["setup_tracing"]
