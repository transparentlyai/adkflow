"""Analysis Agent for ADKFlow Scanner

This agent analyzes the discovered ADK components to identify relationships,
logical groupings, and propose an organizational structure for the ADKFlow project.
"""

import os

from google.adk.agents import Agent

from scanner.callbacks import check_max_tokens_callback
from scanner.tools.analysis import analyze_agent_code, extract_relationships


def get_model() -> str:
    """Get the model to use from environment or default."""
    return os.environ.get("SCANNER_MODEL", "gemini-2.5-flash")


analysis_agent = Agent(
    name="analysis_agent",
    model=get_model(),
    instruction="""You are an agent architecture analyst.

The discovery results are: {discovery_results}

Based on these findings:
1. Identify logical groupings by module/directory
2. Propose tab organization (one tab per major module)
3. Map which prompts belong to which agents

Output a CONCISE analysis:
- TABS: List proposed tab names (one per module)
- For each tab: list the agents that belong there

Keep it brief and structured.""",
    tools=[analyze_agent_code, extract_relationships],
    output_key="analysis_results",
    after_model_callback=check_max_tokens_callback,
)
