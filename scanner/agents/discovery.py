"""Discovery Agents for ADKFlow Scanner

This module uses a Fan-out/Gather pattern to discover Google ADK patterns.
Each discovery agent focuses on one category to prevent token overflow.
"""

import os

from google.adk.agents import Agent, ParallelAgent, SequentialAgent

from scanner.callbacks import check_max_tokens_callback
from scanner.tools.codebase import (
    find_adk_patterns,
    list_directory,
    read_file,
    search_codebase,
)


def get_model() -> str:
    """Get the model to use from environment or default."""
    return os.environ.get("SCANNER_MODEL", "gemini-2.5-flash")


# Individual discovery agents - each focuses on ONE category
agent_discoverer = Agent(
    name="agent_discoverer",
    model=get_model(),
    instruction="""You discover AGENT definitions in the codebase at {codebase_path}.

Use find_adk_patterns with patterns=["agents"] to find all agent definitions.

Output a CONCISE summary (max 20 items):
- File path and line number
- Agent type (LlmAgent, SequentialAgent, etc.)
- Agent name if visible

Be brief. Only list the most important agents.""",
    tools=[find_adk_patterns, search_codebase, read_file],
    output_key="agent_findings",
    after_model_callback=check_max_tokens_callback,
)

prompt_discoverer = Agent(
    name="prompt_discoverer",
    model=get_model(),
    instruction="""You discover PROMPT files in the codebase at {codebase_path}.

Use find_adk_patterns with patterns=["prompts"] to find all .prompt.md files.

Output a CONCISE summary (max 20 items):
- File path
- Prompt name

Be brief.""",
    tools=[find_adk_patterns, list_directory],
    output_key="prompt_findings",
    after_model_callback=check_max_tokens_callback,
)

tool_discoverer = Agent(
    name="tool_discoverer",
    model=get_model(),
    instruction="""You discover TOOL functions in the codebase at {codebase_path}.

Use find_adk_patterns with patterns=["tools"] to find tool function definitions.

Output a CONCISE summary (max 20 items):
- File path and function name

Be brief.""",
    tools=[find_adk_patterns, search_codebase],
    output_key="tool_findings",
    after_model_callback=check_max_tokens_callback,
)

config_discoverer = Agent(
    name="config_discoverer",
    model=get_model(),
    instruction="""You discover CONFIGURATION files in the codebase at {codebase_path}.

Use find_adk_patterns with patterns=["configs"] to find config files.
Also use list_directory to understand the project structure.

Output a CONCISE summary:
- Config files found
- Main directories/modules

Be brief.""",
    tools=[find_adk_patterns, list_directory],
    output_key="config_findings",
    after_model_callback=check_max_tokens_callback,
)

# Parallel discovery - all run concurrently
parallel_discovery = ParallelAgent(
    name="parallel_discovery",
    sub_agents=[agent_discoverer, prompt_discoverer, tool_discoverer, config_discoverer],
)

# Synthesis agent - combines all findings into one summary
synthesis_agent = Agent(
    name="synthesis_agent",
    model=get_model(),
    instruction="""You synthesize discovery findings into a unified summary.

You have access to:
- {agent_findings} - discovered agents
- {prompt_findings} - discovered prompts
- {tool_findings} - discovered tools
- {config_findings} - discovered configs

Create a CONCISE structured summary that lists:
1. AGENTS: List each agent with file, type, name
2. PROMPTS: List each prompt file
3. TOOLS: List each tool function
4. STRUCTURE: Main modules/directories

Keep it brief and structured. This will be used to generate an ADKFlow project.""",
    output_key="discovery_results",
    after_model_callback=check_max_tokens_callback,
)

# Combined discovery pipeline
discovery_agent = SequentialAgent(
    name="discovery_pipeline",
    sub_agents=[parallel_discovery, synthesis_agent],
)
