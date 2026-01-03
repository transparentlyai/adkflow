"""Tests for project API routes.

Tests project loading, saving, and tools endpoints.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from httpx import AsyncClient


class TestGetTools:
    """Tests for GET /api/tools endpoint."""

    async def test_get_tools_returns_list(self, client: AsyncClient):
        """Return list of available tools."""
        response = await client.get("/api/tools")

        assert response.status_code == 200
        data = response.json()
        assert "tools" in data
        assert len(data["tools"]) > 0

    async def test_get_tools_has_common_tools(self, client: AsyncClient):
        """Return list includes common ADK tools."""
        response = await client.get("/api/tools")

        data = response.json()
        tool_names = {t["name"] for t in data["tools"]}

        assert "google_search" in tool_names
        assert "code_execution" in tool_names

    async def test_tool_has_required_fields(self, client: AsyncClient):
        """Each tool has name, description, and category."""
        response = await client.get("/api/tools")

        data = response.json()
        for tool in data["tools"]:
            assert "name" in tool
            assert "description" in tool
            assert "category" in tool


class TestLoadProject:
    """Tests for GET /api/project/load endpoint."""

    async def test_load_nonexistent_project(self, client: AsyncClient, tmp_path: Path):
        """Loading a path without flow.json returns exists=False."""
        response = await client.get(
            "/api/project/load",
            params={"path": str(tmp_path)},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["exists"] is False
        assert data["flow"] is None

    async def test_load_project_with_flow(self, client: AsyncClient, tmp_path: Path):
        """Loading a project with flow.json returns the flow data."""
        # Create a flow.json file (ReactFlowJSON has nodes, edges, viewport)
        flow_data = {
            "nodes": [
                {"id": "n1", "type": "agent", "position": {"x": 0, "y": 0}, "data": {}}
            ],
            "edges": [],
            "viewport": {"x": 0, "y": 0, "zoom": 1},
        }
        (tmp_path / "flow.json").write_text(json.dumps(flow_data))

        response = await client.get(
            "/api/project/load",
            params={"path": str(tmp_path)},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["exists"] is True
        assert len(data["flow"]["nodes"]) == 1

    async def test_load_project_invalid_json(self, client: AsyncClient, tmp_path: Path):
        """Loading project with invalid JSON returns error."""
        (tmp_path / "flow.json").write_text("not valid json")

        response = await client.get(
            "/api/project/load",
            params={"path": str(tmp_path)},
        )

        # May return 400 or 500 depending on error handling
        assert response.status_code in (400, 500)
        assert "Invalid JSON" in response.json()["detail"] or "Failed to load" in response.json()["detail"]


class TestSaveProject:
    """Tests for POST /api/project/save endpoint."""

    async def test_save_project_creates_directory(
        self, client: AsyncClient, tmp_path: Path
    ):
        """Saving creates project directory if needed."""
        new_project = tmp_path / "new_project"

        flow_data = {
            "nodes": [],
            "edges": [],
            "viewport": {"x": 0, "y": 0, "zoom": 1},
        }

        response = await client.post(
            "/api/project/save",
            json={"path": str(new_project), "flow": flow_data},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert (new_project / "flow.json").exists()

    async def test_save_project_writes_flow(
        self, client: AsyncClient, tmp_path: Path
    ):
        """Saving writes flow data to flow.json."""
        flow_data = {
            "nodes": [
                {
                    "id": "node1",
                    "type": "agent",
                    "position": {"x": 100, "y": 200},
                    "data": {},
                }
            ],
            "edges": [],
            "viewport": {"x": 0, "y": 0, "zoom": 1},
        }

        response = await client.post(
            "/api/project/save",
            json={"path": str(tmp_path), "flow": flow_data},
        )

        assert response.status_code == 200

        # Verify file contents
        saved_data = json.loads((tmp_path / "flow.json").read_text())
        assert len(saved_data["nodes"]) == 1
        assert saved_data["nodes"][0]["id"] == "node1"

    async def test_save_project_overwrites_existing(
        self, client: AsyncClient, tmp_path: Path
    ):
        """Saving overwrites existing flow.json."""
        # Create initial file with old data
        old_data = {"nodes": [{"id": "old", "type": "start", "position": {"x": 0, "y": 0}, "data": {}}], "edges": [], "viewport": {"x": 0, "y": 0, "zoom": 1}}
        (tmp_path / "flow.json").write_text(json.dumps(old_data))

        flow_data = {
            "nodes": [{"id": "new", "type": "agent", "position": {"x": 0, "y": 0}, "data": {}}],
            "edges": [],
            "viewport": {"x": 0, "y": 0, "zoom": 1},
        }

        response = await client.post(
            "/api/project/save",
            json={"path": str(tmp_path), "flow": flow_data},
        )

        assert response.status_code == 200
        saved_data = json.loads((tmp_path / "flow.json").read_text())
        assert saved_data["nodes"][0]["id"] == "new"
