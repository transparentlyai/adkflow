"""Project generation functions."""

import json
import os

from scripts.generate_flow.models import AgentData, TABS
from scripts.generate_flow.page_generator import generate_page_json, generate_manifest


def generate_project(agents: list[AgentData], output_dir: str):
    """Generate the complete multi-page ADKFlow project"""
    # Create output directories
    pages_dir = os.path.join(output_dir, "pages")
    os.makedirs(pages_dir, exist_ok=True)

    # Generate manifest.json
    manifest = generate_manifest("Lynx Agents")
    manifest_path = os.path.join(output_dir, "manifest.json")
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"Generated {manifest_path}")

    # For each tab, filter agents and generate page JSON
    total_nodes = 0
    total_edges = 0

    for tab in TABS:
        # Filter agents that belong to this tab's groups
        tab_agents = [a for a in agents if a.group in tab.groups]

        if not tab_agents:
            print(f"Skipping {tab.name} (no agents)")
            continue

        # Generate page JSON
        page_json = generate_page_json(tab_agents, tab)

        # Write page file
        page_path = os.path.join(pages_dir, f"{tab.id}.json")
        with open(page_path, "w") as f:
            json.dump(page_json, f, indent=2)

        # Count stats
        num_nodes = len(page_json["nodes"])
        num_edges = len(page_json["edges"])
        num_groups = len([n for n in page_json["nodes"] if n["type"] == "group"])
        num_agents = len([n for n in page_json["nodes"] if n["type"] == "agent"])

        total_nodes += num_nodes
        total_edges += num_edges

        print(
            f"Generated {page_path}: {num_groups} groups, {num_agents} agents, "
            f"{num_nodes} total nodes, {num_edges} edges"
        )

    print(f"\nTotal: {total_nodes} nodes, {total_edges} edges across {len(TABS)} tabs")
