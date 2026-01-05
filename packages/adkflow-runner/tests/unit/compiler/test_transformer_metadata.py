"""Tests for WorkflowIR metadata.

Tests for project metadata extraction during transformation.
"""

from __future__ import annotations

import json

from adkflow_runner.compiler.graph import GraphBuilder
from adkflow_runner.compiler.loader import ProjectLoader
from adkflow_runner.compiler.parser import FlowParser
from adkflow_runner.compiler.transformer import IRTransformer


class TestWorkflowIRMetadata:
    """Tests for WorkflowIR metadata."""

    def test_metadata_includes_project_info(self, tmp_path):
        """WorkflowIR includes project metadata."""
        manifest = {
            "name": "my-project",
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
                        "config": {"name": "Agent", "description": "Test"},
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

        assert ir.metadata["project_name"] == "my-project"
        assert ir.metadata["version"] == "3.0"
        assert ir.project_path == str(tmp_path)
        assert "tab1" in ir.tab_ids

    def test_has_start_end_nodes(self, tmp_path):
        """Detect presence of start/end nodes."""
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
                        "config": {"name": "Agent", "description": "Test"},
                    },
                },
                {
                    "id": "end",
                    "type": "end",
                    "position": {"x": 200, "y": 0},
                    "data": {"tabId": "tab1"},
                },
            ],
            "edges": [
                {"id": "e1", "source": "start", "target": "a1"},
                {
                    "id": "e2",
                    "source": "a1",
                    "target": "end",
                    "sourceHandle": "output",
                    "targetHandle": "agent-input",
                },
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

        assert ir.has_start_node is True
        assert ir.has_end_node is True
