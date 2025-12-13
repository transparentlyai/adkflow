"""
Output generation for ADKFlow scanner.

This module provides the generate_project_from_state function for generating
ADKFlow project files including manifest.json and page JSON files.
"""

import json
import re
from pathlib import Path
from typing import Any

from scanner.layout.calculator import (
    AGENT_HEIGHT,
    AGENT_WIDTH,
    COL_GAP,
    GROUP_HEADER,
    PADDING,
    PAIR_GAP,
    PROMPT_HEIGHT,
    PROMPT_WIDTH,
    ROW_GAP,
    generate_node_id,
)


def generate_project_from_state(
    output_path: str,
    discovery_results: str,
    analysis_results: str,
) -> dict[str, Any]:
    """Generate complete ADKFlow project from discovery results.

    This function is called directly from Python (not via LLM tool call)
    to ensure reliable file generation.

    Args:
        output_path: Directory path where project files should be written
        discovery_results: Text summary of discovered agents, prompts, tools
        analysis_results: Text analysis with proposed organization

    Returns:
        dict with success status and details of generated files
    """
    try:
        if not output_path:
            return {"success": False, "error": "output_path is required"}

        all_results = f"{discovery_results}\n{analysis_results}"

        if not all_results.strip():
            return {"success": False, "error": "No discovery or analysis results provided"}

        agents_by_module = _parse_agents_from_text(all_results)

        if not agents_by_module:
            return {
                "success": False,
                "error": "Could not parse any agents from results",
                "hint": "Check that discovery found agents in the codebase",
                "results_preview": all_results[:500] if all_results else "(empty)",
            }

        output_dir = Path(output_path)
        output_dir.mkdir(parents=True, exist_ok=True)
        pages_dir = output_dir / "pages"
        pages_dir.mkdir(exist_ok=True)

        tabs = []
        for i, module_name in enumerate(sorted(agents_by_module.keys())):
            tab_id = f"page_{_sanitize_id(module_name)}"
            tabs.append({"id": tab_id, "name": module_name, "order": i})

        manifest = {"version": "2.0", "name": Path(output_path).name, "tabs": tabs}

        manifest_path = output_dir / "manifest.json"
        with open(manifest_path, "w") as f:
            json.dump(manifest, f, indent=2)

        written_files = [str(manifest_path)]

        for tab in tabs:
            tab_id = tab["id"]
            module_name = tab["name"]
            agents = agents_by_module.get(module_name, [])

            page_data = _generate_page(module_name, agents)

            page_path = pages_dir / f"{tab_id}.json"
            with open(page_path, "w") as f:
                json.dump(page_data, f, indent=2)

            written_files.append(str(page_path))

        return {
            "success": True,
            "output_path": str(output_dir),
            "written_files": written_files,
            "file_count": len(written_files),
            "tabs_created": len(tabs),
            "agents_processed": sum(len(a) for a in agents_by_module.values()),
            "message": f"Generated ADKFlow project with {len(tabs)} tabs at {output_path}",
        }

    except Exception as e:
        import traceback

        return {
            "success": False,
            "error": f"Failed to generate project: {str(e)}",
            "traceback": traceback.format_exc(),
        }


def _sanitize_id(name: str) -> str:
    """Convert name to valid ID (lowercase, underscores)."""
    return re.sub(r"[^a-z0-9_]", "_", name.lower())


def _parse_agents_from_text(text: str) -> dict[str, list[dict]]:
    """Parse agent information from discovery/analysis text."""
    agents_by_module: dict[str, list[dict]] = {}

    agent_pattern = re.compile(
        r"([a-zA-Z_][a-zA-Z0-9_/]*\.py)(?:\s*\(line\s*(\d+)\)|\s*:\s*(\d+))?.*?"
        r"(?:Agent|LlmAgent|SequentialAgent|ParallelAgent|LoopAgent)",
        re.IGNORECASE,
    )

    bullet_pattern = re.compile(
        r"[•\-\*]\s*(?:\*\*)?([a-zA-Z_][a-zA-Z0-9_/]*(?:/[a-zA-Z_][a-zA-Z0-9_]*)*\.py)"
        r"(?:\*\*)?.*?(?:Agent|LlmAgent|SequentialAgent|ParallelAgent|LoopAgent)",
        re.IGNORECASE,
    )

    found_files: set[str] = set()

    for match in agent_pattern.finditer(text):
        found_files.add(match.group(1))

    for match in bullet_pattern.finditer(text):
        found_files.add(match.group(1))

    file_line_pattern = re.compile(r"([a-zA-Z_][a-zA-Z0-9_/]*\.py)\s*(?:\(lines?\s*[\d,\s]+\))?")
    for match in file_line_pattern.finditer(text):
        file_path = match.group(1)
        if "agent" in file_path.lower():
            found_files.add(file_path)

    for file_path in found_files:
        parts = Path(file_path).parts
        module = parts[0] if len(parts) > 1 else "root"

        if module.lower() in ("test", "tests", "example", "examples", "__pycache__"):
            continue

        if module not in agents_by_module:
            agents_by_module[module] = []

        agent_name = Path(file_path).stem
        agents_by_module[module].append(
            {
                "file": file_path,
                "name": agent_name,
                "type": "llm",
            }
        )

    if not agents_by_module:
        header_pattern = re.compile(r"(?:^|\n)#+\s*(\w+)|\*\*(\w+)\*\*", re.MULTILINE)
        for match in header_pattern.finditer(text):
            module = match.group(1) or match.group(2)
            if module and len(module) > 2:
                module_lower = module.lower()
                skip_words = ("agents", "prompts", "tools", "configs", "the", "and", "for")
                if module_lower not in skip_words and module not in agents_by_module:
                    agents_by_module[module] = [
                        {"file": f"{module}/agent.py", "name": module, "type": "llm"}
                    ]

    return agents_by_module


def _generate_page(module_name: str, agents: list[dict]) -> dict:
    """Generate page JSON with nodes and edges for a module."""
    nodes = []
    edges = []

    group_id = generate_node_id("group", module_name)

    num_agents = max(len(agents), 1)
    agents_per_row = min(num_agents, 3)
    num_rows = (num_agents + agents_per_row - 1) // agents_per_row

    group_width = (
        PADDING * 2
        + agents_per_row * (PROMPT_WIDTH + PAIR_GAP + AGENT_WIDTH)
        + (agents_per_row - 1) * COL_GAP
    )
    group_height = GROUP_HEADER + PADDING * 2 + num_rows * (AGENT_HEIGHT + ROW_GAP)

    group_node = {
        "id": group_id,
        "type": "group",
        "position": {"x": 100, "y": 100},
        "data": {"label": module_name},
        "style": {"width": group_width, "height": group_height},
        "measured": {"width": group_width, "height": group_height},
        "selected": False,
        "dragging": False,
    }
    nodes.append(group_node)

    for i, agent in enumerate(agents):
        row = i // agents_per_row
        col = i % agents_per_row

        x_offset = PADDING + col * (PROMPT_WIDTH + PAIR_GAP + AGENT_WIDTH + COL_GAP)
        y_offset = GROUP_HEADER + PADDING + row * (AGENT_HEIGHT + ROW_GAP)

        prompt_id = generate_node_id("prompt", f"{agent['name']}_prompt")
        prompt_node = {
            "id": prompt_id,
            "type": "prompt",
            "position": {"x": x_offset, "y": y_offset},
            "data": {
                "prompt": {
                    "id": prompt_id,
                    "name": f"{agent['name']}.prompt.md",
                    "file": f"{agent['name']}.prompt.md",
                }
            },
            "parentId": group_id,
            "extent": "parent",
            "measured": {"width": PROMPT_WIDTH, "height": PROMPT_HEIGHT},
            "selected": False,
            "dragging": False,
        }
        nodes.append(prompt_node)

        agent_id = generate_node_id("agent", agent["name"])
        agent_node = {
            "id": agent_id,
            "type": "agent",
            "position": {"x": x_offset + PROMPT_WIDTH + PAIR_GAP, "y": y_offset},
            "data": {
                "agent": {
                    "id": agent_id,
                    "name": agent["name"],
                    "type": agent.get("type", "llm"),
                    "model": "gemini-2.5-flash",
                }
            },
            "parentId": group_id,
            "extent": "parent",
            "measured": {"width": AGENT_WIDTH, "height": AGENT_HEIGHT},
            "selected": False,
            "dragging": False,
        }
        nodes.append(agent_node)

        edge_id = f"xy-edge__{prompt_id}output-{agent_id}input"
        edge = {
            "id": edge_id,
            "source": prompt_id,
            "target": agent_id,
            "sourceHandle": "output",
            "targetHandle": "input",
            "animated": False,
            "style": {"strokeWidth": 1.5, "stroke": "#64748b"},
        }
        edges.append(edge)

    return {"nodes": nodes, "edges": edges, "viewport": {"x": 0, "y": 0, "zoom": 0.5}}
