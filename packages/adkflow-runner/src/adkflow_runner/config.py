"""Configuration for the execution layer.

This module defines edge interpretation rules and other
configurable aspects of the compiler and runner.
"""

from dataclasses import dataclass, field
from enum import Enum


class EdgeSemantics(Enum):
    """How an edge should be interpreted."""

    # Data flow
    INSTRUCTION = "instruction"  # Source provides instruction to target agent
    TOOL = "tool"  # Source provides tool to target agent
    CONTEXT = "context"  # Source provides context to target agent

    # Agent relationships
    SEQUENTIAL = "sequential"  # Source runs before target
    PARALLEL = "parallel"  # Source and target run concurrently
    SUBAGENT = "subagent"  # Source is a subagent of target

    # Output handling
    OUTPUT_FILE = "output_file"  # Agent output should be written to file

    # Cross-tab
    TELEPORT = "teleport"  # Cross-tab connection via named teleporter

    # Custom nodes
    CUSTOM = "custom"  # Custom node connections

    # Unknown/ignored
    UNKNOWN = "unknown"


@dataclass
class EdgeRule:
    """Rule for interpreting an edge based on node types and handles."""

    source_type: str
    target_type: str
    source_handle: str | None = None  # None = any handle
    target_handle: str | None = None  # None = any handle
    semantics: EdgeSemantics = EdgeSemantics.UNKNOWN
    priority: int = 0  # Higher priority rules are checked first


# Default edge interpretation rules
DEFAULT_EDGE_RULES: list[EdgeRule] = [
    # Prompt/Context → Agent: instruction
    EdgeRule(
        source_type="prompt",
        target_type="agent",
        semantics=EdgeSemantics.INSTRUCTION,
        priority=10,
    ),
    EdgeRule(
        source_type="context",
        target_type="agent",
        semantics=EdgeSemantics.CONTEXT,
        priority=10,
    ),
    # Tool → Agent: tool
    EdgeRule(
        source_type="tool",
        target_type="agent",
        semantics=EdgeSemantics.TOOL,
        priority=10,
    ),
    EdgeRule(
        source_type="agentTool",
        target_type="agent",
        semantics=EdgeSemantics.TOOL,
        priority=10,
    ),
    # Agent → Agent (output → input): sequential
    EdgeRule(
        source_type="agent",
        target_type="agent",
        source_handle="output",
        target_handle="input",
        semantics=EdgeSemantics.SEQUENTIAL,
        priority=10,
    ),
    # Agent ↔ Agent (link handles): parallel/subagent
    EdgeRule(
        source_type="agent",
        target_type="agent",
        source_handle="link-top",
        target_handle="link-bottom",
        semantics=EdgeSemantics.PARALLEL,
        priority=10,
    ),
    EdgeRule(
        source_type="agent",
        target_type="agent",
        source_handle="link-bottom",
        target_handle="link-top",
        semantics=EdgeSemantics.PARALLEL,
        priority=10,
    ),
    # Agent → OutputFile: write output to file
    EdgeRule(
        source_type="agent",
        target_type="outputFile",
        semantics=EdgeSemantics.OUTPUT_FILE,
        priority=10,
    ),
    # Teleporter connections
    EdgeRule(
        source_type="teleportOut",
        target_type="teleportIn",
        semantics=EdgeSemantics.TELEPORT,
        priority=10,
    ),
    # Variable → Agent: adds to instruction context
    EdgeRule(
        source_type="variable",
        target_type="agent",
        semantics=EdgeSemantics.CONTEXT,
        priority=5,
    ),
    # Start → Agent: entry point (sequential)
    EdgeRule(
        source_type="start",
        target_type="agent",
        semantics=EdgeSemantics.SEQUENTIAL,
        priority=10,
    ),
    # Agent → End: termination point (sequential)
    EdgeRule(
        source_type="agent",
        target_type="end",
        semantics=EdgeSemantics.SEQUENTIAL,
        priority=10,
    ),
    # Agent → UserInput: pause point (sequential)
    EdgeRule(
        source_type="agent",
        target_type="userInput",
        source_handle="output",
        target_handle="input",
        semantics=EdgeSemantics.SEQUENTIAL,
        priority=10,
    ),
    # UserInput → Agent: resume flow (sequential)
    EdgeRule(
        source_type="userInput",
        target_type="agent",
        source_handle="output",
        target_handle="input",
        semantics=EdgeSemantics.SEQUENTIAL,
        priority=10,
    ),
]


@dataclass
class ExecutionConfig:
    """Configuration for workflow execution."""

    # Edge interpretation
    edge_rules: list[EdgeRule] = field(
        default_factory=lambda: DEFAULT_EDGE_RULES.copy()
    )

    # Execution defaults
    default_model: str = "gemini-2.5-flash"
    default_temperature: float = 0.7
    default_timeout: int = 30000
    default_max_retries: int = 3

    # Behavior
    strict_validation: bool = True  # Fail on warnings
    load_tool_code: bool = True  # Load tool code at compile time
    load_prompt_content: bool = True  # Load prompt content at compile time

    def get_edge_semantics(
        self,
        source_type: str,
        target_type: str,
        source_handle: str | None = None,
        target_handle: str | None = None,
    ) -> EdgeSemantics:
        """Get the semantics for an edge based on rules."""
        # Sort by priority (descending)
        sorted_rules = sorted(self.edge_rules, key=lambda r: -r.priority)

        for rule in sorted_rules:
            if self._rule_matches(
                rule, source_type, target_type, source_handle, target_handle
            ):
                return rule.semantics

        return EdgeSemantics.UNKNOWN

    def _rule_matches(
        self,
        rule: EdgeRule,
        source_type: str,
        target_type: str,
        source_handle: str | None,
        target_handle: str | None,
    ) -> bool:
        """Check if a rule matches the given edge."""
        if rule.source_type != source_type:
            return False
        if rule.target_type != target_type:
            return False
        if rule.source_handle is not None and rule.source_handle != source_handle:
            return False
        if rule.target_handle is not None and rule.target_handle != target_handle:
            return False
        return True

    def add_rule(self, rule: EdgeRule) -> None:
        """Add a custom edge rule."""
        self.edge_rules.append(rule)

    def remove_rules_for(self, source_type: str, target_type: str) -> None:
        """Remove all rules for a specific source/target combination."""
        self.edge_rules = [
            r
            for r in self.edge_rules
            if not (r.source_type == source_type and r.target_type == target_type)
        ]


# Global default configuration
_default_config: ExecutionConfig | None = None


def get_default_config() -> ExecutionConfig:
    """Get the default execution configuration."""
    global _default_config
    if _default_config is None:
        _default_config = ExecutionConfig()
    return _default_config


def set_default_config(config: ExecutionConfig) -> None:
    """Set the default execution configuration."""
    global _default_config
    _default_config = config
