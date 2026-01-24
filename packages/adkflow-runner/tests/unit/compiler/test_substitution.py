"""Tests for global variable substitution module.

Tests the substitution of {var} patterns in workflow graph string fields
using global variables (unconnected Variable nodes).
"""

from __future__ import annotations


from adkflow_runner.compiler.graph import WorkflowGraph
from adkflow_runner.compiler.substitution import (
    substitute_global_variables,
    _substitute_in_dict,
    _substitute_in_list,
    _substitute_in_string,
)


class TestSubstituteInString:
    """Tests for _substitute_in_string function."""

    def test_substitute_single_variable(self):
        """Substitute a single variable in a string."""
        result, count = _substitute_in_string("Hello {name}!", {"name": "World"})
        assert result == "Hello World!"
        assert count == 1

    def test_substitute_multiple_variables(self):
        """Substitute multiple variables in a string."""
        result, count = _substitute_in_string(
            "Hello {name}, you are {age} years old.",
            {"name": "Alice", "age": "25"},
        )
        assert result == "Hello Alice, you are 25 years old."
        assert count == 2

    def test_leave_unknown_variables_unchanged(self):
        """Leave {var} patterns unchanged if not in global_vars."""
        result, count = _substitute_in_string(
            "Hello {name}, output is {output_key}",
            {"name": "Bob"},
        )
        assert result == "Hello Bob, output is {output_key}"
        assert count == 1

    def test_no_substitution_when_empty_dict(self):
        """No substitution when global_vars is empty."""
        result, count = _substitute_in_string("Hello {name}!", {})
        assert result == "Hello {name}!"
        assert count == 0

    def test_no_substitution_when_no_patterns(self):
        """No substitution when string has no {var} patterns."""
        result, count = _substitute_in_string("Hello World!", {"name": "Alice"})
        assert result == "Hello World!"
        assert count == 0

    def test_substitute_with_underscores(self):
        """Substitute variables with underscores."""
        result, count = _substitute_in_string(
            "API key: {api_key}",
            {"api_key": "secret123"},
        )
        assert result == "API key: secret123"
        assert count == 1

    def test_substitute_with_numbers(self):
        """Substitute variables with numbers."""
        result, count = _substitute_in_string(
            "Value: {var1}, {var2}",
            {"var1": "first", "var2": "second"},
        )
        assert result == "Value: first, second"
        assert count == 2

    def test_ignore_invalid_variable_names(self):
        """Ignore patterns that don't match valid variable names."""
        result, count = _substitute_in_string(
            "Invalid: {123}, {-invalid}, {space name}",
            {"123": "num", "invalid": "test"},
        )
        # These should not match the pattern
        assert result == "Invalid: {123}, {-invalid}, {space name}"
        assert count == 0

    def test_substitute_same_variable_multiple_times(self):
        """Substitute the same variable appearing multiple times."""
        result, count = _substitute_in_string(
            "{name} said hello to {name}",
            {"name": "Alice"},
        )
        assert result == "Alice said hello to Alice"
        assert count == 2


class TestSubstituteInDict:
    """Tests for _substitute_in_dict function."""

    def test_substitute_in_flat_dict(self):
        """Substitute variables in flat dictionary."""
        data = {
            "title": "Hello {name}",
            "message": "Welcome {name}!",
            "count": 42,
        }
        count = _substitute_in_dict(data, {"name": "Bob"})
        assert data["title"] == "Hello Bob"
        assert data["message"] == "Welcome Bob!"
        assert data["count"] == 42
        assert count == 2

    def test_substitute_in_nested_dict(self):
        """Substitute variables in nested dictionary."""
        data = {
            "config": {
                "name": "{agent_name}",
                "description": "{agent_desc}",
            },
            "settings": {
                "model": "gemini",
            },
        }
        count = _substitute_in_dict(
            data,
            {"agent_name": "MyAgent", "agent_desc": "Test agent"},
        )
        assert data["config"]["name"] == "MyAgent"
        assert data["config"]["description"] == "Test agent"
        assert data["settings"]["model"] == "gemini"
        assert count == 2

    def test_substitute_in_dict_with_lists(self):
        """Substitute variables in dictionary containing lists."""
        data = {
            "items": ["{var1}", "{var2}", "static"],
            "name": "{var3}",
        }
        count = _substitute_in_dict(
            data,
            {"var1": "first", "var2": "second", "var3": "third"},
        )
        assert data["items"] == ["first", "second", "static"]
        assert data["name"] == "third"
        assert count == 3

    def test_no_substitution_in_empty_dict(self):
        """No substitution in empty dictionary."""
        data = {}
        count = _substitute_in_dict(data, {"name": "test"})
        assert count == 0
        assert data == {}

    def test_dict_modified_in_place(self):
        """Dictionary is modified in place."""
        original = {"text": "{var}"}
        result = _substitute_in_dict(original, {"var": "value"})
        assert original is not None
        assert original["text"] == "value"
        assert result == 1


class TestSubstituteInList:
    """Tests for _substitute_in_list function."""

    def test_substitute_in_flat_list(self):
        """Substitute variables in flat list."""
        data = ["{var1}", "static", "{var2}"]
        count = _substitute_in_list(data, {"var1": "first", "var2": "second"})
        assert data == ["first", "static", "second"]
        assert count == 2

    def test_substitute_in_nested_list(self):
        """Substitute variables in nested list."""
        data = ["{var1}", ["nested {var2}", "{var3}"]]
        count = _substitute_in_list(
            data,
            {"var1": "first", "var2": "second", "var3": "third"},
        )
        assert data == ["first", ["nested second", "third"]]
        assert count == 3

    def test_substitute_in_list_with_dicts(self):
        """Substitute variables in list containing dictionaries."""
        data = [
            {"name": "{agent1}"},
            {"name": "{agent2}"},
        ]
        count = _substitute_in_list(data, {"agent1": "Agent1", "agent2": "Agent2"})
        assert data[0]["name"] == "Agent1"
        assert data[1]["name"] == "Agent2"
        assert count == 2

    def test_no_substitution_in_empty_list(self):
        """No substitution in empty list."""
        data = []
        count = _substitute_in_list(data, {"var": "value"})
        assert count == 0
        assert data == []

    def test_list_modified_in_place(self):
        """List is modified in place."""
        original = ["{var}"]
        result = _substitute_in_list(original, {"var": "value"})
        assert original is not None
        assert original[0] == "value"
        assert result == 1


class TestSubstituteGlobalVariables:
    """Tests for substitute_global_variables function."""

    def test_substitute_in_single_node(self, make_graph_node):
        """Substitute variables in a single node's data."""
        node = make_graph_node("n1", "agent", "Agent")
        node.data = {
            "config": {
                "name": "{agent_name}",
                "description": "Agent with {feature}",
            }
        }

        graph = WorkflowGraph(
            nodes={"n1": node},
            edges=[],
            teleporter_pairs=[],
            entry_nodes=[],
        )

        result = substitute_global_variables(
            graph,
            {"agent_name": "MyAgent", "feature": "superpowers"},
        )

        assert result is graph  # Modified in place
        assert node.data["config"]["name"] == "MyAgent"
        assert node.data["config"]["description"] == "Agent with superpowers"

    def test_substitute_in_multiple_nodes(self, make_graph_node):
        """Substitute variables across multiple nodes."""
        node1 = make_graph_node("n1", "agent", "Agent1")
        node1.data = {"config": {"name": "{prefix}_agent1"}}

        node2 = make_graph_node("n2", "prompt", "Prompt1")
        node2.data = {"config": {"content": "Hello {user_name}"}}

        graph = WorkflowGraph(
            nodes={"n1": node1, "n2": node2},
            edges=[],
            teleporter_pairs=[],
            entry_nodes=[],
        )

        substitute_global_variables(
            graph,
            {"prefix": "Test", "user_name": "Alice"},
        )

        assert node1.data["config"]["name"] == "Test_agent1"
        assert node2.data["config"]["content"] == "Hello Alice"

    def test_no_substitution_with_empty_variables(self, make_graph_node):
        """No substitution when global_vars is empty."""
        node = make_graph_node("n1", "agent", "Agent")
        node.data = {"config": {"name": "{agent_name}"}}

        graph = WorkflowGraph(
            nodes={"n1": node},
            edges=[],
            teleporter_pairs=[],
            entry_nodes=[],
        )

        result = substitute_global_variables(graph, {})

        assert result is graph
        assert node.data["config"]["name"] == "{agent_name}"

    def test_partial_substitution(self, make_graph_node):
        """Only substitute known variables, leave others unchanged."""
        node = make_graph_node("n1", "agent", "Agent")
        node.data = {
            "config": {
                "instruction": "Use {api_key} to access {service_name}. Output to {output_key}.",
            }
        }

        graph = WorkflowGraph(
            nodes={"n1": node},
            edges=[],
            teleporter_pairs=[],
            entry_nodes=[],
        )

        substitute_global_variables(
            graph,
            {"api_key": "sk-123", "service_name": "Weather API"},
        )

        # api_key and service_name are substituted, output_key is left unchanged
        expected = "Use sk-123 to access Weather API. Output to {output_key}."
        assert node.data["config"]["instruction"] == expected

    def test_substitute_in_complex_nested_structure(self, make_graph_node):
        """Substitute variables in complex nested data structures."""
        node = make_graph_node("n1", "agent", "Agent")
        node.data = {
            "config": {
                "name": "{name}",
                "tools": [
                    {"name": "{tool1}", "config": {"api_key": "{key}"}},
                    {"name": "{tool2}", "config": {"timeout": 30}},
                ],
                "settings": {
                    "model": "{model}",
                    "temperature": 0.7,
                },
            }
        }

        graph = WorkflowGraph(
            nodes={"n1": node},
            edges=[],
            teleporter_pairs=[],
            entry_nodes=[],
        )

        substitute_global_variables(
            graph,
            {
                "name": "TestAgent",
                "tool1": "SearchTool",
                "tool2": "WriteTool",
                "key": "secret",
                "model": "gemini-2.0-flash",
            },
        )

        assert node.data["config"]["name"] == "TestAgent"
        assert node.data["config"]["tools"][0]["name"] == "SearchTool"
        assert node.data["config"]["tools"][0]["config"]["api_key"] == "secret"
        assert node.data["config"]["tools"][1]["name"] == "WriteTool"
        assert node.data["config"]["settings"]["model"] == "gemini-2.0-flash"
        assert node.data["config"]["settings"]["temperature"] == 0.7

    def test_no_substitution_in_non_string_values(self, make_graph_node):
        """Non-string values are not affected by substitution."""
        node = make_graph_node("n1", "agent", "Agent")
        node.data = {
            "config": {
                "name": "{name}",
                "count": 42,
                "enabled": True,
                "ratio": 3.14,
                "items": [1, 2, 3],
            }
        }

        graph = WorkflowGraph(
            nodes={"n1": node},
            edges=[],
            teleporter_pairs=[],
            entry_nodes=[],
        )

        substitute_global_variables(graph, {"name": "Test"})

        assert node.data["config"]["name"] == "Test"
        assert node.data["config"]["count"] == 42
        assert node.data["config"]["enabled"] is True
        assert node.data["config"]["ratio"] == 3.14
        assert node.data["config"]["items"] == [1, 2, 3]

    def test_empty_graph(self):
        """Handle empty graph gracefully."""
        graph = WorkflowGraph(
            nodes={},
            edges=[],
            teleporter_pairs=[],
            entry_nodes=[],
        )

        result = substitute_global_variables(graph, {"var": "value"})

        assert result is graph
        assert len(graph.nodes) == 0
