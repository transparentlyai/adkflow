"""
ADKFlow Codebase Scanner - Main Agent Entry Point

Scan any codebase and generate ADKFlow projects.

Usage:
    python -m scanner.cli /path/to/codebase --output /path/to/project
"""

from scanner.orchestrator import ScannerOrchestrator

# Root agent for ADK (ScannerOrchestrator is already a SequentialAgent instance)
root_agent = ScannerOrchestrator
