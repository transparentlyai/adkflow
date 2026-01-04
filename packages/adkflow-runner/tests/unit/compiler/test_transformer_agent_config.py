"""Tests for agent configuration transformation.

Tests for extracting planner, code executor, HTTP options, and callback configurations.
"""

from __future__ import annotations

import json

from adkflow_runner.compiler.graph import GraphBuilder
from adkflow_runner.compiler.loader import ProjectLoader
from adkflow_runner.compiler.parser import FlowParser
from adkflow_runner.compiler.transformer import IRTransformer


class TestAgentConfiguration:
    """Tests for agent configuration extraction."""

    def test_extract_planner_config(self, tmp_path):
        """Extract planner configuration from agent."""
        manifest = {
            "name": "test",
            "version": "3.0",
            "tabs": [{"id": "tab1", "name": "Main"}],
            "nodes": [
                {
                    "id": "start",
                    "type": "start",
                    "position": {"x": 0, "y": 0},
                    "data": {"tabId": "tab1"},
                },
                {
                    "id": "a1",
                    "type": "agent",
                    "position": {"x": 100, "y": 0},
                    "data": {
                        "tabId": "tab1",
                        "config": {
                            "name": "Planner",
                            "description": "Test",
                            "planner_type": "builtin",
                            "thinking_budget": 1000,
                            "include_thoughts": True,
                        },
                    },
                },
            ],
            "edges": [
                {"id": "e1", "source": "start", "target": "a1"},
            ],
        }
        (tmp_path / "manifest.json").write_text(json.dumps(manifest))

        loader = ProjectLoader()
        parser = FlowParser()
        builder = GraphBuilder()
        transformer = IRTransformer()

        project = loader.load(tmp_path)
        parsed = parser.parse_project(project)
        graph = builder.build(parsed)
        ir = transformer.transform(graph, project)

        assert ir.root_agent.planner.type == "builtin"
        assert ir.root_agent.planner.thinking_budget == 1000
        assert ir.root_agent.planner.include_thoughts is True

    def test_extract_code_executor_config(self, tmp_path):
        """Extract code executor configuration from agent."""
        manifest = {
            "name": "test",
            "version": "3.0",
            "tabs": [{"id": "tab1", "name": "Main"}],
            "nodes": [
                {
                    "id": "start",
                    "type": "start",
                    "position": {"x": 0, "y": 0},
                    "data": {"tabId": "tab1"},
                },
                {
                    "id": "a1",
                    "type": "agent",
                    "position": {"x": 100, "y": 0},
                    "data": {
                        "tabId": "tab1",
                        "config": {
                            "name": "Coder",
                            "description": "Test",
                            "code_executor_enabled": True,
                            "code_executor_stateful": True,
                        },
                    },
                },
            ],
            "edges": [
                {"id": "e1", "source": "start", "target": "a1"},
            ],
        }
        (tmp_path / "manifest.json").write_text(json.dumps(manifest))

        loader = ProjectLoader()
        parser = FlowParser()
        builder = GraphBuilder()
        transformer = IRTransformer()

        project = loader.load(tmp_path)
        parsed = parser.parse_project(project)
        graph = builder.build(parsed)
        ir = transformer.transform(graph, project)

        assert ir.root_agent.code_executor.enabled is True
        assert ir.root_agent.code_executor.stateful is True

    def test_extract_http_options(self, tmp_path):
        """Extract HTTP options from agent."""
        manifest = {
            "name": "test",
            "version": "3.0",
            "tabs": [{"id": "tab1", "name": "Main"}],
            "nodes": [
                {
                    "id": "start",
                    "type": "start",
                    "position": {"x": 0, "y": 0},
                    "data": {"tabId": "tab1"},
                },
                {
                    "id": "a1",
                    "type": "agent",
                    "position": {"x": 100, "y": 0},
                    "data": {
                        "tabId": "tab1",
                        "config": {
                            "name": "Agent",
                            "description": "Test",
                            "http_timeout": 60000,
                            "http_max_retries": 5,
                        },
                    },
                },
            ],
            "edges": [
                {"id": "e1", "source": "start", "target": "a1"},
            ],
        }
        (tmp_path / "manifest.json").write_text(json.dumps(manifest))

        loader = ProjectLoader()
        parser = FlowParser()
        builder = GraphBuilder()
        transformer = IRTransformer()

        project = loader.load(tmp_path)
        parsed = parser.parse_project(project)
        graph = builder.build(parsed)
        ir = transformer.transform(graph, project)

        assert ir.root_agent.http_options.timeout == 60000
        assert ir.root_agent.http_options.max_retries == 5

    def test_extract_output_key(self, tmp_path):
        """Extract output_key from agent."""
        manifest = {
            "name": "test",
            "version": "3.0",
            "tabs": [{"id": "tab1", "name": "Main"}],
            "nodes": [
                {
                    "id": "start",
                    "type": "start",
                    "position": {"x": 0, "y": 0},
                    "data": {"tabId": "tab1"},
                },
                {
                    "id": "a1",
                    "type": "agent",
                    "position": {"x": 100, "y": 0},
                    "data": {
                        "tabId": "tab1",
                        "config": {
                            "name": "Agent",
                            "description": "Test",
                            "output_key": "result",
                        },
                    },
                },
            ],
            "edges": [
                {"id": "e1", "source": "start", "target": "a1"},
            ],
        }
        (tmp_path / "manifest.json").write_text(json.dumps(manifest))

        loader = ProjectLoader()
        parser = FlowParser()
        builder = GraphBuilder()
        transformer = IRTransformer()

        project = loader.load(tmp_path)
        parsed = parser.parse_project(project)
        graph = builder.build(parsed)
        ir = transformer.transform(graph, project)

        assert ir.root_agent.output_key == "result"


class TestIncludeContentsResolution:
    """Tests for include_contents resolution."""

    def test_include_contents_true(self, tmp_path):
        """Boolean true resolves to 'default'."""
        manifest = {
            "name": "test",
            "version": "3.0",
            "tabs": [{"id": "tab1", "name": "Main"}],
            "nodes": [
                {
                    "id": "start",
                    "type": "start",
                    "position": {"x": 0, "y": 0},
                    "data": {"tabId": "tab1"},
                },
                {
                    "id": "a1",
                    "type": "agent",
                    "position": {"x": 100, "y": 0},
                    "data": {
                        "tabId": "tab1",
                        "config": {
                            "name": "Agent",
                            "description": "Test",
                            "include_contents": True,
                        },
                    },
                },
            ],
            "edges": [
                {"id": "e1", "source": "start", "target": "a1"},
            ],
        }
        (tmp_path / "manifest.json").write_text(json.dumps(manifest))

        loader = ProjectLoader()
        parser = FlowParser()
        builder = GraphBuilder()
        transformer = IRTransformer()

        project = loader.load(tmp_path)
        parsed = parser.parse_project(project)
        graph = builder.build(parsed)
        ir = transformer.transform(graph, project)

        assert ir.root_agent.include_contents == "default"

    def test_include_contents_false(self, tmp_path):
        """Boolean false resolves to 'none'."""
        manifest = {
            "name": "test",
            "version": "3.0",
            "tabs": [{"id": "tab1", "name": "Main"}],
            "nodes": [
                {
                    "id": "start",
                    "type": "start",
                    "position": {"x": 0, "y": 0},
                    "data": {"tabId": "tab1"},
                },
                {
                    "id": "a1",
                    "type": "agent",
                    "position": {"x": 100, "y": 0},
                    "data": {
                        "tabId": "tab1",
                        "config": {
                            "name": "Agent",
                            "description": "Test",
                            "include_contents": False,
                        },
                    },
                },
            ],
            "edges": [
                {"id": "e1", "source": "start", "target": "a1"},
            ],
        }
        (tmp_path / "manifest.json").write_text(json.dumps(manifest))

        loader = ProjectLoader()
        parser = FlowParser()
        builder = GraphBuilder()
        transformer = IRTransformer()

        project = loader.load(tmp_path)
        parsed = parser.parse_project(project)
        graph = builder.build(parsed)
        ir = transformer.transform(graph, project)

        assert ir.root_agent.include_contents == "none"

    def test_include_contents_none_string(self, tmp_path):
        """String 'none' resolves to 'none'."""
        manifest = {
            "name": "test",
            "version": "3.0",
            "tabs": [{"id": "tab1", "name": "Main"}],
            "nodes": [
                {
                    "id": "start",
                    "type": "start",
                    "position": {"x": 0, "y": 0},
                    "data": {"tabId": "tab1"},
                },
                {
                    "id": "a1",
                    "type": "agent",
                    "position": {"x": 100, "y": 0},
                    "data": {
                        "tabId": "tab1",
                        "config": {
                            "name": "Agent",
                            "description": "Test",
                            "include_contents": "none",
                        },
                    },
                },
            ],
            "edges": [
                {"id": "e1", "source": "start", "target": "a1"},
            ],
        }
        (tmp_path / "manifest.json").write_text(json.dumps(manifest))

        loader = ProjectLoader()
        parser = FlowParser()
        builder = GraphBuilder()
        transformer = IRTransformer()

        project = loader.load(tmp_path)
        parsed = parser.parse_project(project)
        graph = builder.build(parsed)
        ir = transformer.transform(graph, project)

        assert ir.root_agent.include_contents == "none"


class TestNestedPlannerConfig:
    """Tests for nested planner config format."""

    def test_nested_planner_config(self, tmp_path):
        """Extract planner from nested config."""
        manifest = {
            "name": "test",
            "version": "3.0",
            "tabs": [{"id": "tab1", "name": "Main"}],
            "nodes": [
                {
                    "id": "start",
                    "type": "start",
                    "position": {"x": 0, "y": 0},
                    "data": {"tabId": "tab1"},
                },
                {
                    "id": "a1",
                    "type": "agent",
                    "position": {"x": 100, "y": 0},
                    "data": {
                        "tabId": "tab1",
                        "config": {
                            "name": "Planner",
                            "description": "Test",
                            "planner": {
                                "type": "custom",
                                "thinking_budget": 500,
                                "include_thoughts": True,
                            },
                        },
                    },
                },
            ],
            "edges": [
                {"id": "e1", "source": "start", "target": "a1"},
            ],
        }
        (tmp_path / "manifest.json").write_text(json.dumps(manifest))

        loader = ProjectLoader()
        parser = FlowParser()
        builder = GraphBuilder()
        transformer = IRTransformer()

        project = loader.load(tmp_path)
        parsed = parser.parse_project(project)
        graph = builder.build(parsed)
        ir = transformer.transform(graph, project)

        assert ir.root_agent.planner.type == "custom"
        assert ir.root_agent.planner.thinking_budget == 500


class TestNestedCodeExecutorConfig:
    """Tests for nested code executor config format."""

    def test_nested_code_executor_config(self, tmp_path):
        """Extract code executor from nested config."""
        manifest = {
            "name": "test",
            "version": "3.0",
            "tabs": [{"id": "tab1", "name": "Main"}],
            "nodes": [
                {
                    "id": "start",
                    "type": "start",
                    "position": {"x": 0, "y": 0},
                    "data": {"tabId": "tab1"},
                },
                {
                    "id": "a1",
                    "type": "agent",
                    "position": {"x": 100, "y": 0},
                    "data": {
                        "tabId": "tab1",
                        "config": {
                            "name": "Coder",
                            "description": "Test",
                            "code_executor": {
                                "enabled": True,
                                "stateful": True,
                                "error_retry_attempts": 5,
                                "optimize_data_file": True,
                            },
                        },
                    },
                },
            ],
            "edges": [
                {"id": "e1", "source": "start", "target": "a1"},
            ],
        }
        (tmp_path / "manifest.json").write_text(json.dumps(manifest))

        loader = ProjectLoader()
        parser = FlowParser()
        builder = GraphBuilder()
        transformer = IRTransformer()

        project = loader.load(tmp_path)
        parsed = parser.parse_project(project)
        graph = builder.build(parsed)
        ir = transformer.transform(graph, project)

        assert ir.root_agent.code_executor.enabled is True
        assert ir.root_agent.code_executor.stateful is True
        assert ir.root_agent.code_executor.error_retry_attempts == 5
        assert ir.root_agent.code_executor.optimize_data_file is True


class TestNestedHttpOptionsConfig:
    """Tests for nested HTTP options config format."""

    def test_nested_http_options_config(self, tmp_path):
        """Extract HTTP options from nested config."""
        manifest = {
            "name": "test",
            "version": "3.0",
            "tabs": [{"id": "tab1", "name": "Main"}],
            "nodes": [
                {
                    "id": "start",
                    "type": "start",
                    "position": {"x": 0, "y": 0},
                    "data": {"tabId": "tab1"},
                },
                {
                    "id": "a1",
                    "type": "agent",
                    "position": {"x": 100, "y": 0},
                    "data": {
                        "tabId": "tab1",
                        "config": {
                            "name": "Agent",
                            "description": "Test",
                            "http_options": {
                                "timeout": 90000,
                                "max_retries": 10,
                                "retry_delay": 2000,
                                "retry_backoff_multiplier": 3.0,
                            },
                        },
                    },
                },
            ],
            "edges": [
                {"id": "e1", "source": "start", "target": "a1"},
            ],
        }
        (tmp_path / "manifest.json").write_text(json.dumps(manifest))

        loader = ProjectLoader()
        parser = FlowParser()
        builder = GraphBuilder()
        transformer = IRTransformer()

        project = loader.load(tmp_path)
        parsed = parser.parse_project(project)
        graph = builder.build(parsed)
        ir = transformer.transform(graph, project)

        assert ir.root_agent.http_options.timeout == 90000
        assert ir.root_agent.http_options.max_retries == 10
        assert ir.root_agent.http_options.retry_delay == 2000
        assert ir.root_agent.http_options.retry_backoff_multiplier == 3.0


class TestCallbacksConfig:
    """Tests for callbacks configuration."""

    def test_extract_callbacks(self, tmp_path):
        """Extract callback configuration from agent."""
        manifest = {
            "name": "test",
            "version": "3.0",
            "tabs": [{"id": "tab1", "name": "Main"}],
            "nodes": [
                {
                    "id": "start",
                    "type": "start",
                    "position": {"x": 0, "y": 0},
                    "data": {"tabId": "tab1"},
                },
                {
                    "id": "a1",
                    "type": "agent",
                    "position": {"x": 100, "y": 0},
                    "data": {
                        "tabId": "tab1",
                        "config": {
                            "name": "Agent",
                            "description": "Test",
                            "before_model_callback": "my_before_model",
                            "after_model_callback": "my_after_model",
                            "before_tool_callback": "my_before_tool",
                            "after_tool_callback": "my_after_tool",
                        },
                    },
                },
            ],
            "edges": [
                {"id": "e1", "source": "start", "target": "a1"},
            ],
        }
        (tmp_path / "manifest.json").write_text(json.dumps(manifest))

        loader = ProjectLoader()
        parser = FlowParser()
        builder = GraphBuilder()
        transformer = IRTransformer()

        project = loader.load(tmp_path)
        parsed = parser.parse_project(project)
        graph = builder.build(parsed)
        ir = transformer.transform(graph, project)

        assert ir.root_agent.callbacks.before_model == "my_before_model"
        assert ir.root_agent.callbacks.after_model == "my_after_model"
        assert ir.root_agent.callbacks.before_tool == "my_before_tool"
        assert ir.root_agent.callbacks.after_tool == "my_after_tool"
