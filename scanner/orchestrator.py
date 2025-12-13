from google.adk.agents import SequentialAgent

from scanner.agents.analysis import analysis_agent
from scanner.agents.discovery import discovery_agent

# Two-phase orchestrator: LLM handles discovery/analysis, Python handles generation
# This removes LLM unreliability from the file generation step
ScannerOrchestrator = SequentialAgent(
    name="scanner_orchestrator",
    sub_agents=[discovery_agent, analysis_agent],
    # Note: generator_agent removed - generation is done directly in Python
    # after this agent completes, to ensure files are actually written
)
