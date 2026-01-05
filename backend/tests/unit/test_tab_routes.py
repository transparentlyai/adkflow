"""Tests for tab API routes.

Tests tab CRUD operations and file content handling.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from httpx import AsyncClient


def create_manifest(
    tmp_path: Path,
    tabs: list[dict] | None = None,
    nodes: list[dict] | None = None,
    edges: list[dict] | None = None,
) -> dict:
    """Create a manifest.json file in the given directory."""
    if tabs is None:
        tabs = [{"id": "tab-1", "name": "Main", "order": 0}]
    if nodes is None:
        nodes = []
    if edges is None:
        edges = []

    manifest = {
        "name": "test-project",
        "version": "3.0",
        "tabs": tabs,
        "nodes": nodes,
        "edges": edges,
        "settings": {},
    }
    (tmp_path / "manifest.json").write_text(json.dumps(manifest, indent=2))
    return manifest


class TestListTabs:
    """Tests for GET /api/project/tabs endpoint."""

    @pytest.mark.asyncio
    async def test_list_tabs_empty_project(self, client: AsyncClient, tmp_path: Path):
        """Return empty list for project without manifest."""
        response = await client.get(
            "/api/project/tabs",
            params={"path": str(tmp_path)},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["tabs"] == []

    @pytest.mark.asyncio
    async def test_list_tabs_with_tabs(self, client: AsyncClient, tmp_path: Path):
        """Return list of tabs from manifest."""
        tabs = [
            {"id": "tab-1", "name": "Main", "order": 0},
            {"id": "tab-2", "name": "Secondary", "order": 1},
        ]
        create_manifest(tmp_path, tabs=tabs)

        response = await client.get(
            "/api/project/tabs",
            params={"path": str(tmp_path)},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["tabs"]) == 2
        assert data["tabs"][0]["id"] == "tab-1"
        assert data["tabs"][1]["id"] == "tab-2"


class TestCreateTab:
    """Tests for POST /api/project/tabs endpoint."""

    @pytest.mark.asyncio
    async def test_create_tab_new_project(self, client: AsyncClient, tmp_path: Path):
        """Create tab in new project creates manifest."""
        response = await client.post(
            "/api/project/tabs",
            json={
                "project_path": str(tmp_path),
                "name": "New Tab",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["tab"]["name"] == "New Tab"
        assert "id" in data["tab"]

        # Verify manifest was created
        assert (tmp_path / "manifest.json").exists()

    @pytest.mark.asyncio
    async def test_create_tab_existing_project(
        self, client: AsyncClient, tmp_path: Path
    ):
        """Create tab in existing project adds to list."""
        create_manifest(tmp_path)

        response = await client.post(
            "/api/project/tabs",
            json={
                "project_path": str(tmp_path),
                "name": "Second Tab",
            },
        )

        assert response.status_code == 200

        # Verify tab was added
        manifest = json.loads((tmp_path / "manifest.json").read_text())
        assert len(manifest["tabs"]) == 2


class TestLoadTab:
    """Tests for GET /api/project/tabs/{tab_id} endpoint."""

    @pytest.mark.asyncio
    async def test_load_tab_not_found(self, client: AsyncClient, tmp_path: Path):
        """Load nonexistent tab returns 404."""
        create_manifest(tmp_path)

        response = await client.get(
            "/api/project/tabs/nonexistent",
            params={"path": str(tmp_path)},
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_load_tab_success(self, client: AsyncClient, tmp_path: Path):
        """Load existing tab returns flow data."""
        nodes = [
            {
                "id": "node-1",
                "type": "agent",
                "position": {"x": 100, "y": 100},
                "data": {"tabId": "tab-1"},
            }
        ]
        create_manifest(tmp_path, nodes=nodes)

        response = await client.get(
            "/api/project/tabs/tab-1",
            params={"path": str(tmp_path)},
        )

        assert response.status_code == 200
        data = response.json()
        assert "flow" in data
        assert len(data["flow"]["nodes"]) == 1


class TestSaveTab:
    """Tests for PUT /api/project/tabs/{tab_id} endpoint."""

    @pytest.mark.asyncio
    async def test_save_tab_not_found(self, client: AsyncClient, tmp_path: Path):
        """Save to nonexistent tab returns 404."""
        create_manifest(tmp_path)

        response = await client.put(
            "/api/project/tabs/nonexistent",
            json={
                "project_path": str(tmp_path),
                "flow": {
                    "nodes": [],
                    "edges": [],
                    "viewport": {"x": 0, "y": 0, "zoom": 1},
                },
            },
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_save_tab_success(self, client: AsyncClient, tmp_path: Path):
        """Save tab updates manifest."""
        create_manifest(tmp_path)

        flow_data = {
            "nodes": [
                {
                    "id": "new-node",
                    "type": "agent",
                    "position": {"x": 200, "y": 200},
                    "data": {"tabId": "tab-1"},
                }
            ],
            "edges": [],
            "viewport": {"x": 0, "y": 0, "zoom": 1},
        }

        response = await client.put(
            "/api/project/tabs/tab-1",
            json={
                "project_path": str(tmp_path),
                "flow": flow_data,
            },
        )

        assert response.status_code == 200
        assert response.json()["success"] is True

        # Verify manifest was updated
        manifest = json.loads((tmp_path / "manifest.json").read_text())
        assert len(manifest["nodes"]) == 1


class TestDeleteTab:
    """Tests for DELETE /api/project/tabs/{tab_id} endpoint."""

    @pytest.mark.asyncio
    async def test_delete_last_tab_fails(self, client: AsyncClient, tmp_path: Path):
        """Cannot delete the last remaining tab."""
        create_manifest(tmp_path)

        response = await client.delete(
            "/api/project/tabs/tab-1",
            params={"path": str(tmp_path)},
        )

        assert response.status_code == 400
        assert "last remaining tab" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_delete_tab_not_found(self, client: AsyncClient, tmp_path: Path):
        """Delete nonexistent tab returns 404."""
        tabs = [
            {"id": "tab-1", "name": "First", "order": 0},
            {"id": "tab-2", "name": "Second", "order": 1},
        ]
        create_manifest(tmp_path, tabs=tabs)

        response = await client.delete(
            "/api/project/tabs/nonexistent",
            params={"path": str(tmp_path)},
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_tab_success(self, client: AsyncClient, tmp_path: Path):
        """Delete tab removes it from manifest."""
        tabs = [
            {"id": "tab-1", "name": "First", "order": 0},
            {"id": "tab-2", "name": "Second", "order": 1},
        ]
        create_manifest(tmp_path, tabs=tabs)

        response = await client.delete(
            "/api/project/tabs/tab-2",
            params={"path": str(tmp_path)},
        )

        assert response.status_code == 200

        # Verify tab was removed
        manifest = json.loads((tmp_path / "manifest.json").read_text())
        assert len(manifest["tabs"]) == 1
        assert manifest["tabs"][0]["id"] == "tab-1"


class TestRenameTab:
    """Tests for PATCH /api/project/tabs/{tab_id}/rename endpoint."""

    @pytest.mark.asyncio
    async def test_rename_tab_not_found(self, client: AsyncClient, tmp_path: Path):
        """Rename nonexistent tab returns 404."""
        create_manifest(tmp_path)

        response = await client.patch(
            "/api/project/tabs/nonexistent/rename",
            json={
                "project_path": str(tmp_path),
                "name": "New Name",
            },
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_rename_tab_success(self, client: AsyncClient, tmp_path: Path):
        """Rename tab updates name in manifest."""
        create_manifest(tmp_path)

        response = await client.patch(
            "/api/project/tabs/tab-1/rename",
            json={
                "project_path": str(tmp_path),
                "name": "Renamed Tab",
            },
        )

        assert response.status_code == 200

        # Verify name was updated
        manifest = json.loads((tmp_path / "manifest.json").read_text())
        assert manifest["tabs"][0]["name"] == "Renamed Tab"


class TestReorderTabs:
    """Tests for PUT /api/project/tabs/reorder endpoint."""

    @pytest.mark.asyncio
    async def test_reorder_invalid_ids(self, client: AsyncClient, tmp_path: Path):
        """Reorder with mismatched IDs returns error."""
        tabs = [
            {"id": "tab-1", "name": "First", "order": 0},
            {"id": "tab-2", "name": "Second", "order": 1},
        ]
        create_manifest(tmp_path, tabs=tabs)

        response = await client.put(
            "/api/project/tabs/reorder",
            json={
                "project_path": str(tmp_path),
                "tab_ids": ["tab-1", "nonexistent"],
            },
        )

        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_reorder_tabs_success(self, client: AsyncClient, tmp_path: Path):
        """Reorder tabs updates order in manifest."""
        tabs = [
            {"id": "tab-1", "name": "First", "order": 0},
            {"id": "tab-2", "name": "Second", "order": 1},
        ]
        create_manifest(tmp_path, tabs=tabs)

        response = await client.put(
            "/api/project/tabs/reorder",
            json={
                "project_path": str(tmp_path),
                "tab_ids": ["tab-2", "tab-1"],
            },
        )

        assert response.status_code == 200

        # Verify order was updated
        manifest = json.loads((tmp_path / "manifest.json").read_text())
        assert manifest["tabs"][0]["id"] == "tab-2"
        assert manifest["tabs"][1]["id"] == "tab-1"


class TestDuplicateTab:
    """Tests for POST /api/project/tabs/{tab_id}/duplicate endpoint."""

    @pytest.mark.asyncio
    async def test_duplicate_tab_not_found(self, client: AsyncClient, tmp_path: Path):
        """Duplicate nonexistent tab returns 404."""
        create_manifest(tmp_path)

        response = await client.post(
            "/api/project/tabs/nonexistent/duplicate",
            params={"path": str(tmp_path)},
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_duplicate_tab_success(self, client: AsyncClient, tmp_path: Path):
        """Duplicate tab creates copy with nodes."""
        nodes = [
            {
                "id": "node-1",
                "type": "agent",
                "position": {"x": 100, "y": 100},
                "data": {"tabId": "tab-1"},
            }
        ]
        create_manifest(tmp_path, nodes=nodes)

        response = await client.post(
            "/api/project/tabs/tab-1/duplicate",
            params={"path": str(tmp_path)},
        )

        assert response.status_code == 200
        data = response.json()
        assert "(Copy)" in data["tab"]["name"]

        # Verify nodes were copied
        manifest = json.loads((tmp_path / "manifest.json").read_text())
        assert len(manifest["tabs"]) == 2
        assert len(manifest["nodes"]) == 2
