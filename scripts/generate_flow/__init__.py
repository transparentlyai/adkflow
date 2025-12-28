"""Generate ADKFlow multi-page project from agents.md.

This package provides functions to parse agent definitions from markdown
and generate complete ADKFlow projects with multiple tabs/pages.
"""

from scripts.generate_flow.models import AgentData, ToolData, TabDefinition
from scripts.generate_flow.parser import parse_agents_md
from scripts.generate_flow.node_builders import (
    create_agent_node_data,
    create_prompt_node_data,
    create_tool_node_data,
)
from scripts.generate_flow.layout import (
    calc_text_width,
    calc_agent_left_width,
    calc_group_max_left_widths,
    get_agents_per_row,
    calc_group_content_size,
)
from scripts.generate_flow.page_generator import generate_page_json, generate_manifest
from scripts.generate_flow.project_generator import generate_project

__all__ = [
    # Models
    "AgentData",
    "ToolData",
    "TabDefinition",
    # Parser
    "parse_agents_md",
    # Node builders
    "create_agent_node_data",
    "create_prompt_node_data",
    "create_tool_node_data",
    # Layout
    "calc_text_width",
    "calc_agent_left_width",
    "calc_group_max_left_widths",
    "get_agents_per_row",
    "calc_group_content_size",
    # Generators
    "generate_page_json",
    "generate_manifest",
    "generate_project",
]
