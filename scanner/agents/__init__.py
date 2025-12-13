"""ADKFlow Scanner Agents Package

This package contains the agents for the ADKFlow scanner pipeline:
- DiscoveryAgent: Scans codebases to find agents, prompts, tools, and configs
- AnalysisAgent: Analyzes relationships and proposes project organization

Note: Generation is done directly in Python (not via LLM agent) for reliability.
"""

from scanner.agents.analysis import analysis_agent
from scanner.agents.discovery import discovery_agent

__all__ = [
    "discovery_agent",
    "analysis_agent",
]
