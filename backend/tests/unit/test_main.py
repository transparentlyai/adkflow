"""Tests for main application endpoints.

Tests root, health, and dev info endpoints from backend/src/main.py.
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch

from httpx import AsyncClient


class TestRootEndpoint:
    """Tests for GET / endpoint."""

    async def test_root_returns_ok_status(self, client: AsyncClient):
        """Return OK status with service name."""
        response = await client.get("/")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "ADKFlow Backend API"

    async def test_root_supports_head_method(self, client: AsyncClient):
        """Support HEAD method for root endpoint."""
        response = await client.request("HEAD", "/")

        assert response.status_code == 200


class TestHealthCheck:
    """Tests for GET /health endpoint."""

    async def test_health_check_returns_healthy(self, client: AsyncClient):
        """Return healthy status."""
        response = await client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"


class TestDevInfo:
    """Tests for GET /api/dev/info endpoint."""

    async def test_dev_info_returns_false_in_normal_mode(self, client: AsyncClient):
        """Return devMode false when not in dev mode."""
        response = await client.get("/api/dev/info")

        assert response.status_code == 200
        data = response.json()
        assert data["devMode"] is False
        assert data["branch"] is None

    async def test_dev_info_returns_true_in_dev_mode(self, dev_client: AsyncClient):
        """Return devMode true when in dev mode."""
        response = await dev_client.get("/api/dev/info")

        assert response.status_code == 200
        data = response.json()
        assert data["devMode"] is True
        # branch could be None or a string depending on git availability
        assert "branch" in data

    async def test_dev_info_returns_git_branch_when_available(
        self, dev_client: AsyncClient
    ):
        """Return git branch when available in dev mode."""
        # Mock subprocess to return a branch name
        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_result.stdout = "main\n"

        with patch("subprocess.run", return_value=mock_result) as mock_run:
            response = await dev_client.get("/api/dev/info")

            assert response.status_code == 200
            data = response.json()
            assert data["devMode"] is True
            assert data["branch"] == "main"

            # Verify subprocess was called correctly
            mock_run.assert_called_once()
            args = mock_run.call_args[0][0]
            assert args == ["git", "rev-parse", "--abbrev-ref", "HEAD"]

    async def test_dev_info_handles_git_error_gracefully(self, dev_client: AsyncClient):
        """Return None for branch when git command fails."""
        # Mock subprocess to raise an exception
        with patch("subprocess.run", side_effect=Exception("Git not found")):
            response = await dev_client.get("/api/dev/info")

            assert response.status_code == 200
            data = response.json()
            assert data["devMode"] is True
            assert data["branch"] is None

    async def test_dev_info_handles_git_non_zero_exit(self, dev_client: AsyncClient):
        """Return None for branch when git returns non-zero exit code."""
        # Mock subprocess to return non-zero exit code
        mock_result = MagicMock()
        mock_result.returncode = 128
        mock_result.stdout = ""

        with patch("subprocess.run", return_value=mock_result):
            response = await dev_client.get("/api/dev/info")

            assert response.status_code == 200
            data = response.json()
            assert data["devMode"] is True
            assert data["branch"] is None
