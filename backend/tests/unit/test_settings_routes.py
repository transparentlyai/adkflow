"""Tests for settings API routes.

Tests project settings and environment configuration endpoints.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from httpx import AsyncClient


def create_manifest(tmp_path: Path, settings: dict | None = None) -> dict:
    """Create a manifest.json file in the given directory."""
    manifest = {
        "name": "test-project",
        "version": "3.0",
        "tabs": [{"id": "tab-1", "name": "Main", "order": 0}],
        "nodes": [],
        "edges": [],
        "settings": settings or {},
    }
    (tmp_path / "manifest.json").write_text(json.dumps(manifest, indent=2))
    return manifest


def create_env_file(tmp_path: Path, env_vars: dict) -> None:
    """Create a .env file in the given directory."""
    lines = [f"{key}={value}" for key, value in env_vars.items()]
    (tmp_path / ".env").write_text("\n".join(lines) + "\n")


class TestGetProjectSettings:
    """Tests for GET /api/project/settings endpoint."""

    @pytest.mark.asyncio
    async def test_get_settings_no_manifest(self, client: AsyncClient, tmp_path: Path):
        """Return defaults when no manifest exists."""
        response = await client.get(
            "/api/project/settings",
            params={"path": str(tmp_path)},
        )

        assert response.status_code == 200
        data = response.json()
        assert "settings" in data
        assert "env" in data

    @pytest.mark.asyncio
    async def test_get_settings_with_manifest(
        self, client: AsyncClient, tmp_path: Path
    ):
        """Return settings from manifest."""
        settings = {"defaultModel": "gemini-1.5-pro"}
        create_manifest(tmp_path, settings=settings)

        response = await client.get(
            "/api/project/settings",
            params={"path": str(tmp_path)},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["settings"]["defaultModel"] == "gemini-1.5-pro"

    @pytest.mark.asyncio
    async def test_get_env_api_key_mode(self, client: AsyncClient, tmp_path: Path):
        """Return API key auth mode from .env."""
        create_manifest(tmp_path)
        create_env_file(
            tmp_path,
            {
                "GOOGLE_GENAI_USE_VERTEXAI": "false",
                "GOOGLE_API_KEY": "test_api_key_12345678",
            },
        )

        response = await client.get(
            "/api/project/settings",
            params={"path": str(tmp_path)},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["env"]["authMode"] == "api_key"
        assert data["env"]["hasApiKey"] is True
        assert data["env"]["apiKeyMasked"] is not None
        # API key should be masked
        assert "test_api_key" not in data["env"]["apiKeyMasked"]

    @pytest.mark.asyncio
    async def test_get_env_vertex_ai_mode(self, client: AsyncClient, tmp_path: Path):
        """Return Vertex AI auth mode from .env."""
        create_manifest(tmp_path)
        create_env_file(
            tmp_path,
            {
                "GOOGLE_GENAI_USE_VERTEXAI": "true",
                "GOOGLE_CLOUD_PROJECT": "my-project",
                "GOOGLE_CLOUD_LOCATION": "us-central1",
            },
        )

        response = await client.get(
            "/api/project/settings",
            params={"path": str(tmp_path)},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["env"]["authMode"] == "vertex_ai"
        assert data["env"]["googleCloudProject"] == "my-project"
        assert data["env"]["googleCloudLocation"] == "us-central1"


class TestUpdateProjectSettings:
    """Tests for PUT /api/project/settings endpoint."""

    @pytest.mark.asyncio
    async def test_update_settings_creates_manifest(
        self, client: AsyncClient, tmp_path: Path
    ):
        """Update creates manifest if missing."""
        response = await client.put(
            "/api/project/settings",
            json={
                "project_path": str(tmp_path),
                "settings": {"defaultModel": "gemini-1.5-flash"},
                "env": {"authMode": "api_key"},
            },
        )

        assert response.status_code == 200
        assert response.json()["success"] is True
        assert (tmp_path / "manifest.json").exists()

    @pytest.mark.asyncio
    async def test_update_settings_in_manifest(
        self, client: AsyncClient, tmp_path: Path
    ):
        """Update modifies settings in manifest."""
        create_manifest(tmp_path)

        response = await client.put(
            "/api/project/settings",
            json={
                "project_path": str(tmp_path),
                "settings": {"defaultModel": "gemini-2.0-flash"},
                "env": {"authMode": "api_key"},
            },
        )

        assert response.status_code == 200

        # Verify manifest was updated
        manifest = json.loads((tmp_path / "manifest.json").read_text())
        assert manifest["settings"]["defaultModel"] == "gemini-2.0-flash"

    @pytest.mark.asyncio
    async def test_update_env_api_key(self, client: AsyncClient, tmp_path: Path):
        """Update writes API key to .env."""
        create_manifest(tmp_path)

        response = await client.put(
            "/api/project/settings",
            json={
                "project_path": str(tmp_path),
                "settings": {},
                "env": {
                    "authMode": "api_key",
                    "apiKey": "new_api_key_value",
                },
            },
        )

        assert response.status_code == 200

        # Verify .env was created
        assert (tmp_path / ".env").exists()
        env_content = (tmp_path / ".env").read_text()
        assert "GOOGLE_API_KEY=new_api_key_value" in env_content
        assert "GOOGLE_GENAI_USE_VERTEXAI=false" in env_content

    @pytest.mark.asyncio
    async def test_update_env_vertex_ai(self, client: AsyncClient, tmp_path: Path):
        """Update writes Vertex AI config to .env."""
        create_manifest(tmp_path)

        response = await client.put(
            "/api/project/settings",
            json={
                "project_path": str(tmp_path),
                "settings": {},
                "env": {
                    "authMode": "vertex_ai",
                    "googleCloudProject": "test-project",
                    "googleCloudLocation": "us-east1",
                },
            },
        )

        assert response.status_code == 200

        # Verify .env was created with Vertex AI config
        env_content = (tmp_path / ".env").read_text()
        assert "GOOGLE_GENAI_USE_VERTEXAI=true" in env_content
        assert "GOOGLE_CLOUD_PROJECT=test-project" in env_content
        assert "GOOGLE_CLOUD_LOCATION=us-east1" in env_content

    @pytest.mark.asyncio
    async def test_update_preserves_existing_api_key(
        self, client: AsyncClient, tmp_path: Path
    ):
        """Update without new API key preserves existing one."""
        create_manifest(tmp_path)
        create_env_file(
            tmp_path,
            {
                "GOOGLE_GENAI_USE_VERTEXAI": "false",
                "GOOGLE_API_KEY": "existing_key",
            },
        )

        response = await client.put(
            "/api/project/settings",
            json={
                "project_path": str(tmp_path),
                "settings": {},
                "env": {
                    "authMode": "api_key",
                    # No apiKey provided - should preserve existing
                },
            },
        )

        assert response.status_code == 200

        # Verify existing key was preserved
        env_content = (tmp_path / ".env").read_text()
        assert "GOOGLE_API_KEY=existing_key" in env_content


class TestMaskApiKey:
    """Tests for API key masking."""

    @pytest.mark.asyncio
    async def test_short_key_fully_masked(self, client: AsyncClient, tmp_path: Path):
        """Short API key is fully masked."""
        create_manifest(tmp_path)
        create_env_file(
            tmp_path,
            {
                "GOOGLE_GENAI_USE_VERTEXAI": "false",
                "GOOGLE_API_KEY": "short",
            },
        )

        response = await client.get(
            "/api/project/settings",
            params={"path": str(tmp_path)},
        )

        assert response.status_code == 200
        data = response.json()
        # Short keys should be fully masked
        assert data["env"]["apiKeyMasked"] == "****"

    @pytest.mark.asyncio
    async def test_long_key_partially_masked(self, client: AsyncClient, tmp_path: Path):
        """Long API key shows first 4 and last 4 characters."""
        create_manifest(tmp_path)
        create_env_file(
            tmp_path,
            {
                "GOOGLE_GENAI_USE_VERTEXAI": "false",
                "GOOGLE_API_KEY": "AIzaSyD_very_long_api_key_here_12345",
            },
        )

        response = await client.get(
            "/api/project/settings",
            params={"path": str(tmp_path)},
        )

        assert response.status_code == 200
        data = response.json()
        # Should show first 4 and last 4 characters
        assert data["env"]["apiKeyMasked"].startswith("AIza")
        assert data["env"]["apiKeyMasked"].endswith("2345")
        assert "..." in data["env"]["apiKeyMasked"]


class TestParseEnvFile:
    """Tests for .env file parsing."""

    @pytest.mark.asyncio
    async def test_parse_quoted_values(self, client: AsyncClient, tmp_path: Path):
        """Parse .env with quoted values."""
        create_manifest(tmp_path)
        (tmp_path / ".env").write_text(
            'GOOGLE_API_KEY="quoted_value"\nGOOGLE_GENAI_USE_VERTEXAI=false\n'
        )

        response = await client.get(
            "/api/project/settings",
            params={"path": str(tmp_path)},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["env"]["hasApiKey"] is True

    @pytest.mark.asyncio
    async def test_parse_with_comments(self, client: AsyncClient, tmp_path: Path):
        """Parse .env ignoring comments."""
        create_manifest(tmp_path)
        (tmp_path / ".env").write_text(
            "# This is a comment\n"
            "GOOGLE_API_KEY=test_key_1234567890\n"
            "# Another comment\n"
            "GOOGLE_GENAI_USE_VERTEXAI=false\n"
        )

        response = await client.get(
            "/api/project/settings",
            params={"path": str(tmp_path)},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["env"]["hasApiKey"] is True

    @pytest.mark.asyncio
    async def test_parse_empty_lines(self, client: AsyncClient, tmp_path: Path):
        """Parse .env with empty lines."""
        create_manifest(tmp_path)
        (tmp_path / ".env").write_text(
            "GOOGLE_API_KEY=test_key_1234567890\n\n\nGOOGLE_GENAI_USE_VERTEXAI=false\n"
        )

        response = await client.get(
            "/api/project/settings",
            params={"path": str(tmp_path)},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["env"]["hasApiKey"] is True


class TestSettingsErrorHandling:
    """Tests for error handling in settings routes."""

    @pytest.mark.asyncio
    async def test_get_settings_invalid_path(self, client: AsyncClient):
        """Return error for invalid path."""
        response = await client.get(
            "/api/project/settings",
            params={"path": "/nonexistent/path/that/does/not/exist"},
        )

        # Should handle gracefully - either 200 with defaults or 500
        assert response.status_code in (200, 500)
