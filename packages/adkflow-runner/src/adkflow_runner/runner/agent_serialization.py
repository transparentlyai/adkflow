"""Serialization utilities for ADK agent configurations.

Provides functions to serialize agent configs for logging and debugging.
"""

from __future__ import annotations

from typing import Any

from google.adk.agents import Agent, LoopAgent, ParallelAgent, SequentialAgent
from google.adk.planners import BuiltInPlanner


def serialize_agent_config(agent: Agent) -> dict[str, Any]:
    """Serialize an ADK Agent's configuration for logging.

    Captures exactly what was passed to the Agent constructor,
    preserving the full hierarchy of nested Pydantic models.
    """
    config: dict[str, Any] = {
        # BaseAgent fields
        "name": agent.name,
        "description": agent.description,
        "sub_agents": [sa.name for sa in agent.sub_agents] if agent.sub_agents else [],
        # LlmAgent fields
        "model": agent.model if isinstance(agent.model, str) else str(agent.model),
        "instruction": agent.instruction
        if isinstance(agent.instruction, str)
        else "<callable>",
        "global_instruction": (
            agent.global_instruction
            if isinstance(agent.global_instruction, str)
            else "<callable>"
            if agent.global_instruction
            else ""
        ),
        "tools": [getattr(t, "name", str(t)) for t in agent.tools]
        if agent.tools
        else [],
        "disallow_transfer_to_parent": agent.disallow_transfer_to_parent,
        "disallow_transfer_to_peers": agent.disallow_transfer_to_peers,
        "include_contents": agent.include_contents,
        "output_key": agent.output_key,
        "input_schema": agent.input_schema.__name__ if agent.input_schema else None,
        "output_schema": agent.output_schema.__name__ if agent.output_schema else None,
    }

    # Serialize generate_content_config with full hierarchy
    if agent.generate_content_config:
        gcc = agent.generate_content_config
        gcc_dict: dict[str, Any] = {
            "temperature": gcc.temperature,
            "top_p": gcc.top_p,
            "top_k": gcc.top_k,
            "max_output_tokens": gcc.max_output_tokens,
            "stop_sequences": gcc.stop_sequences,
            "presence_penalty": gcc.presence_penalty,
            "frequency_penalty": gcc.frequency_penalty,
            "seed": gcc.seed,
            "response_mime_type": gcc.response_mime_type,
        }

        # Nested http_options
        if gcc.http_options:
            http_opts = gcc.http_options
            http_dict: dict[str, Any] = {
                "base_url": http_opts.base_url,
                "timeout": http_opts.timeout,
            }

            # Nested retry_options
            if http_opts.retry_options:
                retry = http_opts.retry_options
                http_dict["retry_options"] = {
                    "attempts": retry.attempts,
                    "initial_delay": retry.initial_delay,
                    "max_delay": retry.max_delay,
                    "exp_base": retry.exp_base,
                    "jitter": retry.jitter,
                    "http_status_codes": list(retry.http_status_codes)
                    if retry.http_status_codes
                    else None,
                }
            else:
                http_dict["retry_options"] = None

            gcc_dict["http_options"] = http_dict
        else:
            gcc_dict["http_options"] = None

        # Nested thinking_config
        if gcc.thinking_config:
            tc = gcc.thinking_config
            gcc_dict["thinking_config"] = {
                "thinking_budget": tc.thinking_budget,
                "thinking_level": str(tc.thinking_level) if tc.thinking_level else None,
                "include_thoughts": tc.include_thoughts,
            }
        else:
            gcc_dict["thinking_config"] = None

        config["generate_content_config"] = gcc_dict
    else:
        config["generate_content_config"] = None

    # Serialize planner
    if agent.planner:
        planner = agent.planner
        planner_dict: dict[str, Any] = {
            "type": type(planner).__name__,
        }
        # BuiltInPlanner has thinking_config
        if isinstance(planner, BuiltInPlanner) and planner.thinking_config:
            tc = planner.thinking_config
            planner_dict["thinking_config"] = {
                "thinking_budget": tc.thinking_budget,
                "thinking_level": str(tc.thinking_level) if tc.thinking_level else None,
                "include_thoughts": tc.include_thoughts,
            }
        config["planner"] = planner_dict
    else:
        config["planner"] = None

    # Serialize code_executor
    if agent.code_executor:
        config["code_executor"] = {
            "type": type(agent.code_executor).__name__,
        }
    else:
        config["code_executor"] = None

    # Callbacks - log presence (not serializable)
    config["before_agent_callback"] = agent.before_agent_callback is not None
    config["after_agent_callback"] = agent.after_agent_callback is not None
    config["before_model_callback"] = agent.before_model_callback is not None
    config["after_model_callback"] = agent.after_model_callback is not None
    config["before_tool_callback"] = agent.before_tool_callback is not None
    config["after_tool_callback"] = agent.after_tool_callback is not None

    return config


def serialize_workflow_agent_config(
    agent: SequentialAgent | ParallelAgent | LoopAgent,
) -> dict[str, Any]:
    """Serialize a workflow agent's configuration for logging."""
    config: dict[str, Any] = {
        "name": agent.name,
        "description": agent.description,
        "sub_agents": [sa.name for sa in agent.sub_agents] if agent.sub_agents else [],
        "before_agent_callback": agent.before_agent_callback is not None,
        "after_agent_callback": agent.after_agent_callback is not None,
    }

    # LoopAgent-specific
    if isinstance(agent, LoopAgent):
        config["max_iterations"] = agent.max_iterations

    return config
