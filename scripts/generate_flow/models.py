"""Data classes for generate_flow module."""

import re
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ToolData:
    """Represents a tool parsed from agents.md"""

    name: str
    file_path: str


@dataclass
class AgentData:
    """Represents an agent parsed from agents.md"""

    name: str
    group: str
    model: str = "gemini-2.5-flash"
    temperature: float = 0.0
    description: str = ""
    output_key: Optional[str] = None
    output_schema: Optional[str] = None
    tools: list = field(default_factory=list)  # List of tool names
    tool_files: list = field(default_factory=list)  # List of ToolData objects
    planner_type: str = "none"
    thinking_budget: Optional[int] = None
    disallow_transfer_to_parent: bool = False
    disallow_transfer_to_peers: bool = False
    after_model_callback: Optional[str] = None
    http_timeout: int = 300000
    http_max_retries: int = 5
    http_retry_delay: float = 1.0
    http_retry_multiplier: float = 2.0
    prompt_file: Optional[str] = None
    additional_prompts: list = field(default_factory=list)


@dataclass
class TabDefinition:
    """Represents a tab/page in the ADKFlow project"""

    id: str
    name: str
    order: int
    groups: list[str]  # Group names that belong to this tab


# Known specialist names (23 total)
SPECIALIST_NAMES = [
    "altmanz",
    "assets",
    "benford",
    "business_model",
    "cash",
    "cf_dechow",
    "cf_jones",
    "credit",
    "governance",
    "growth",
    "gunny",
    "income",
    "interim",
    "investing",
    "jones",
    "margins",
    "miscellaneous",
    "mscore",
    "piotroski",
    "roychowdhury",
    "smoothing",
    "valuation",
    "working_capital",
]

# Tab definitions with their group mappings
TABS = [
    TabDefinition("page_docprep", "DocPrep", 0, ["DocPrep"]),
    TabDefinition("page_cagx", "CAGX", 1, ["CAGX"]),
    TabDefinition("page_srag", "SRAG", 2, ["SRAG"]),
    TabDefinition("page_specialists", "Specialists", 3, SPECIALIST_NAMES),
    TabDefinition("page_compiler", "Compiler", 4, ["Compiler"]),
    TabDefinition("page_lynxtool", "LynxTool", 5, ["LynxTool"]),
]


def generate_node_id(prefix: str, name: str) -> str:
    """Generate a unique node ID"""
    safe_name = re.sub(r"[^a-zA-Z0-9_]", "_", name.lower())
    return f"{prefix}_{safe_name}"
