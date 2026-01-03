"""Tracing setup for ADKFlow.

Configures ADK's built-in OpenTelemetry instrumentation to export traces
to a local JSONL file for visualization.

Configuration priority (highest to lowest):
1. Function arguments
2. Environment variables (ADKFLOW_TRACING_ENABLED, ADKFLOW_TRACE_FILE)
3. manifest.json (logging.tracing.enabled, logging.tracing.file)
4. Defaults (enabled=True, file="traces.jsonl")
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING

from opentelemetry.sdk.trace.export import BatchSpanProcessor

from .jsonl_exporter import JsonlSpanExporter

if TYPE_CHECKING:
    pass


# Track if tracing has been initialized to avoid duplicate setup
_tracing_initialized = False

# Default trace file name
DEFAULT_TRACE_FILE = "traces.jsonl"


@dataclass
class TracingConfig:
    """Tracing configuration."""

    enabled: bool = True
    file: str = DEFAULT_TRACE_FILE
    clear_before_run: bool = False

    @classmethod
    def load(cls, project_path: Path | None = None) -> TracingConfig:
        """Load tracing configuration with precedence:
        1. Environment variables (highest)
        2. manifest.json logging.tracing config
        3. Defaults (lowest)
        """
        config = cls()

        # 1. Load from manifest.json
        if project_path:
            manifest_file = project_path / "manifest.json"
            if manifest_file.exists():
                config = cls._load_from_manifest(manifest_file)

        # 2. Override with environment variables
        config = cls._apply_env_overrides(config)

        return config

    @classmethod
    def _load_from_manifest(cls, manifest_path: Path) -> TracingConfig:
        """Load tracing config from manifest.json's 'logging.tracing' key."""
        config = cls()

        try:
            with open(manifest_path, encoding="utf-8") as f:
                manifest = json.load(f)
        except (json.JSONDecodeError, OSError):
            return config

        # Look for logging.tracing section
        logging_config = manifest.get("logging", {})
        tracing_config = logging_config.get("tracing", {})

        if not tracing_config:
            return config

        if "enabled" in tracing_config:
            config.enabled = bool(tracing_config["enabled"])

        if "file" in tracing_config:
            config.file = str(tracing_config["file"])

        if "clear_before_run" in tracing_config:
            config.clear_before_run = bool(tracing_config["clear_before_run"])

        return config

    @classmethod
    def _apply_env_overrides(cls, config: TracingConfig) -> TracingConfig:
        """Apply environment variable overrides."""
        # ADKFLOW_TRACING_ENABLED
        env_enabled = os.getenv("ADKFLOW_TRACING_ENABLED")
        if env_enabled is not None:
            config.enabled = env_enabled.lower() in ("true", "1", "yes")

        # ADKFLOW_TRACE_FILE
        env_file = os.getenv("ADKFLOW_TRACE_FILE")
        if env_file:
            config.file = env_file

        return config


def setup_tracing(
    project_path: Path,
    trace_file: str | None = None,
    enabled: bool | None = None,
) -> bool:
    """Configure ADK tracing with local JSONL export.

    This function sets up OpenTelemetry tracing using ADK's built-in
    instrumentation. Once configured, ADK automatically creates spans for:
    - invoke_agent: Agent invocations
    - execute_tool: Tool executions
    - call_llm: LLM API calls

    Configuration is loaded from (in order of precedence):
    1. Function arguments (if provided)
    2. Environment variables (ADKFLOW_TRACING_ENABLED, ADKFLOW_TRACE_FILE)
    3. manifest.json (logging.tracing.enabled, logging.tracing.file)
    4. Defaults (enabled=True, file="traces.jsonl")

    Args:
        project_path: Path to the project directory. Traces will be written
            to {project_path}/logs/{trace_file}.
        trace_file: Name of the trace file. If None, uses config or default.
        enabled: Whether tracing is enabled. If None, uses config or default.

    Returns:
        True if tracing was successfully configured, False otherwise.
    """
    global _tracing_initialized

    # Check if already initialized
    if _tracing_initialized:
        return True

    # Load configuration
    config = TracingConfig.load(project_path)

    # Apply function argument overrides
    if enabled is not None:
        config.enabled = enabled
    if trace_file is not None:
        config.file = trace_file

    if not config.enabled:
        return False

    try:
        # Import ADK telemetry setup
        from google.adk.telemetry.setup import OTelHooks, maybe_set_otel_providers

        # Create the JSONL exporter
        trace_path = Path(project_path) / "logs" / config.file
        exporter = JsonlSpanExporter(trace_path)

        # Create a batch processor for efficient export
        span_processor = BatchSpanProcessor(
            exporter,
            max_queue_size=2048,
            max_export_batch_size=512,
            schedule_delay_millis=5000,  # Export every 5 seconds
        )

        # Configure OTel with our exporter
        hooks = OTelHooks(span_processors=[span_processor])
        maybe_set_otel_providers(otel_hooks_to_setup=[hooks])

        _tracing_initialized = True
        return True

    except ImportError as e:
        # ADK telemetry not available
        print(f"Warning: Could not initialize tracing: {e}")
        return False
    except Exception as e:
        # Other errors during setup
        print(f"Warning: Tracing setup failed: {e}")
        return False


def is_tracing_enabled() -> bool:
    """Check if tracing has been initialized.

    Returns:
        True if tracing is enabled and initialized.
    """
    return _tracing_initialized
