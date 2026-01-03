"""Tests for execution API routes.

Tests the workflow execution endpoints.
"""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient


@pytest.fixture
async def app():
    """Create FastAPI app for testing."""
    from backend.src.main import app
    return app


@pytest.fixture
async def client(app) -> AsyncClient:
    """Create async HTTP client."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac


class TestStartRun:
    """Tests for POST /api/execution/run endpoint."""

    async def test_start_run_project_not_found(self, client: AsyncClient):
        """Return 404 when project path doesn't exist."""
        response = await client.post(
            "/api/execution/run",
            json={
                "project_path": "/nonexistent/path",
                "input_data": {},
            },
        )
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    async def test_start_run_no_manifest(self, client: AsyncClient, tmp_path: Path):
        """Return 400 when manifest.json is missing."""
        response = await client.post(
            "/api/execution/run",
            json={
                "project_path": str(tmp_path),
                "input_data": {},
            },
        )
        assert response.status_code == 400
        assert "manifest.json" in response.json()["detail"]

    @patch("backend.src.api.execution_routes.run_manager")
    async def test_start_run_success(
        self, mock_run_manager, client: AsyncClient, tmp_project: Path
    ):
        """Successfully start a run."""
        mock_run_manager.start_run = AsyncMock(return_value="test-run-123")

        response = await client.post(
            "/api/execution/run",
            json={
                "project_path": str(tmp_project),
                "input_data": {"query": "test"},
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["run_id"] == "test-run-123"
        assert data["status"] == "running"


class TestGetRunStatus:
    """Tests for GET /api/execution/run/{run_id}/status endpoint."""

    @patch("backend.src.api.execution_routes.run_manager")
    async def test_status_run_not_found(self, mock_run_manager, client: AsyncClient):
        """Return 404 when run doesn't exist."""
        mock_run_manager.get_run.return_value = None

        response = await client.get("/api/execution/run/nonexistent/status")

        assert response.status_code == 404

    @patch("backend.src.api.execution_routes.run_manager")
    async def test_status_running(self, mock_run_manager, client: AsyncClient):
        """Return running status for active run."""
        mock_run = MagicMock()
        mock_run.result = None
        mock_run.events = []
        mock_run_manager.get_run.return_value = mock_run

        response = await client.get("/api/execution/run/test-123/status")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "running"
        assert data["run_id"] == "test-123"

    @patch("backend.src.api.execution_routes.run_manager")
    async def test_status_completed(self, mock_run_manager, client: AsyncClient):
        """Return completed status with output."""
        mock_result = MagicMock()
        mock_result.status.value = "completed"
        mock_result.output = "Test output"
        mock_result.error = None
        mock_result.duration_ms = 1500

        mock_run = MagicMock()
        mock_run.result = mock_result
        mock_run.events = [MagicMock(), MagicMock()]
        mock_run_manager.get_run.return_value = mock_run

        response = await client.get("/api/execution/run/test-123/status")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["output"] == "Test output"
        assert data["duration_ms"] == 1500
        assert data["event_count"] == 2


class TestCancelRun:
    """Tests for POST /api/execution/run/{run_id}/cancel endpoint."""

    @patch("backend.src.api.execution_routes.run_manager")
    async def test_cancel_run_not_found(self, mock_run_manager, client: AsyncClient):
        """Return 404 when run doesn't exist."""
        mock_run_manager.get_run.return_value = None

        response = await client.post("/api/execution/run/nonexistent/cancel")

        assert response.status_code == 404

    @patch("backend.src.api.execution_routes.run_manager")
    async def test_cancel_success(self, mock_run_manager, client: AsyncClient):
        """Successfully cancel a run."""
        mock_run_manager.get_run.return_value = MagicMock()
        mock_run_manager.cancel_run = AsyncMock(return_value=True)

        response = await client.post("/api/execution/run/test-123/cancel")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    @patch("backend.src.api.execution_routes.run_manager")
    async def test_cancel_already_completed(self, mock_run_manager, client: AsyncClient):
        """Cancel fails when run already completed."""
        mock_run_manager.get_run.return_value = MagicMock()
        mock_run_manager.cancel_run = AsyncMock(return_value=False)

        response = await client.post("/api/execution/run/test-123/cancel")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False


class TestValidateWorkflow:
    """Tests for POST /api/execution/validate endpoint."""

    async def test_validate_project_not_found(self, client: AsyncClient):
        """Return 404 when project doesn't exist."""
        response = await client.post(
            "/api/execution/validate",
            json={"project_path": "/nonexistent"},
        )
        assert response.status_code == 404

    async def test_validate_valid_project(self, client: AsyncClient, tmp_project: Path):
        """Validate a valid project."""
        response = await client.post(
            "/api/execution/validate",
            json={"project_path": str(tmp_project)},
        )

        assert response.status_code == 200
        data = response.json()
        assert "valid" in data
        assert "errors" in data
        assert "warnings" in data


class TestListRuns:
    """Tests for GET /api/execution/runs endpoint."""

    @patch("backend.src.api.execution_routes.run_manager")
    async def test_list_runs_empty(self, mock_run_manager, client: AsyncClient):
        """Return empty list when no runs."""
        mock_run_manager.runs = {}

        response = await client.get("/api/execution/runs")

        assert response.status_code == 200
        data = response.json()
        assert data["runs"] == []

    @patch("backend.src.api.execution_routes.run_manager")
    async def test_list_runs_with_filter(self, mock_run_manager, client: AsyncClient):
        """Filter runs by status."""
        mock_run_completed = MagicMock()
        mock_run_completed.result = MagicMock()
        mock_run_completed.result.status.value = "completed"
        mock_run_completed.config.project_path = Path("/test")
        mock_run_completed.events = []

        mock_run_running = MagicMock()
        mock_run_running.result = None
        mock_run_running.config.project_path = Path("/test2")
        mock_run_running.events = []

        mock_run_manager.runs = {
            "run-1": mock_run_completed,
            "run-2": mock_run_running,
        }

        response = await client.get("/api/execution/runs?status=completed")

        assert response.status_code == 200
        data = response.json()
        assert len(data["runs"]) == 1
        assert data["runs"][0]["status"] == "completed"


class TestSubmitUserInput:
    """Tests for POST /api/execution/run/{run_id}/input endpoint."""

    @patch("backend.src.api.execution_routes.run_manager")
    async def test_submit_input_run_not_found(self, mock_run_manager, client: AsyncClient):
        """Return 404 when run doesn't exist."""
        mock_run_manager.get_run.return_value = None

        response = await client.post(
            "/api/execution/run/nonexistent/input",
            json={"request_id": "req-1", "user_input": "test input"},
        )

        assert response.status_code == 404

    @patch("backend.src.api.execution_routes.run_manager")
    async def test_submit_input_no_pending(self, mock_run_manager, client: AsyncClient):
        """Return 400 when no pending input request."""
        mock_run = MagicMock()
        mock_run.pending_inputs = {}
        mock_run_manager.get_run.return_value = mock_run

        response = await client.post(
            "/api/execution/run/test-123/input",
            json={"request_id": "req-1", "user_input": "test input"},
        )

        assert response.status_code == 400

    @patch("backend.src.api.execution_routes.run_manager")
    async def test_submit_input_timed_out(self, mock_run_manager, client: AsyncClient):
        """Return 410 when input request timed out."""
        mock_pending = MagicMock()
        mock_pending.timed_out = True

        mock_run = MagicMock()
        mock_run.pending_inputs = {"req-1": mock_pending}
        mock_run_manager.get_run.return_value = mock_run

        response = await client.post(
            "/api/execution/run/test-123/input",
            json={"request_id": "req-1", "user_input": "test input"},
        )

        assert response.status_code == 410

    @patch("backend.src.api.execution_routes.run_manager")
    async def test_submit_input_success(self, mock_run_manager, client: AsyncClient):
        """Successfully submit user input."""
        mock_pending = MagicMock()
        mock_pending.timed_out = False
        mock_pending.input_event = MagicMock()

        mock_run = MagicMock()
        mock_run.pending_inputs = {"req-1": mock_pending}
        mock_run_manager.get_run.return_value = mock_run

        response = await client.post(
            "/api/execution/run/test-123/input",
            json={"request_id": "req-1", "user_input": "test input"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert mock_pending.input_value == "test input"
        mock_pending.input_event.set.assert_called_once()
