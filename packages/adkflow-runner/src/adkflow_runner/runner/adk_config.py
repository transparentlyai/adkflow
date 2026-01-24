"""ADK configuration building utilities.

Functions for building ADK RunConfig from adkflow RunConfig settings.
"""

from google.adk.agents.run_config import RunConfig as AdkRunConfig, StreamingMode
from google.genai import types

from adkflow_runner.runner.types import RunConfig


def build_adk_run_config(config: RunConfig) -> AdkRunConfig:
    """Build ADK RunConfig from our RunConfig settings.

    Args:
        config: Our RunConfig with ADK settings

    Returns:
        ADK RunConfig for runner.run_async()
    """
    # Map streaming mode string to ADK enum
    streaming_mode_map = {
        "none": StreamingMode.NONE,
        "sse": StreamingMode.SSE,
        "bidi": StreamingMode.BIDI,
    }
    streaming_mode = streaming_mode_map.get(config.streaming_mode, StreamingMode.NONE)

    # Build base ADK RunConfig
    # Note: max_llm_calls=0 means use default (500), positive values set the limit
    adk_config = AdkRunConfig(
        max_llm_calls=config.max_llm_calls if config.max_llm_calls > 0 else 500,
        streaming_mode=streaming_mode,
    )

    # Enable context window compression if requested
    if config.context_window_compression:
        adk_config.context_window_compression = types.ContextWindowCompressionConfig()

    return adk_config
