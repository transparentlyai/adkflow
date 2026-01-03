"""Tests for debug API routes.

Tests logging configuration endpoints (development mode only).
"""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest
from httpx import AsyncClient

from backend.src.api.routes.debug_routes import (
    _get_level_name,
    _parse_level,
    CategoryInfo,
    LoggingConfigResponse,
    LoggingConfigUpdate,
)
from adkflow_runner.logging import LogLevel


def create_manifest(tmp_path: Path, logging_config: dict | None = None) -> dict:
    """Create a manifest.json file in the given directory."""
    manifest = {
        "name": "test-project",
        "version": "3.0",
        "tabs": [{"id": "tab-1", "name": "Main", "order": 0}],
        "nodes": [],
        "edges": [],
    }
    if logging_config is not None:
        manifest["logging"] = logging_config
    (tmp_path / "manifest.json").write_text(json.dumps(manifest, indent=2))
    return manifest


class TestGetLevelName:
    """Tests for _get_level_name helper function."""

    def test_log_level_enum_debug(self):
        """Convert DEBUG enum to string."""
        assert _get_level_name(LogLevel.DEBUG) == "DEBUG"

    def test_log_level_enum_info(self):
        """Convert INFO enum to string."""
        assert _get_level_name(LogLevel.INFO) == "INFO"

    def test_log_level_enum_warning(self):
        """Convert WARNING enum to string."""
        assert _get_level_name(LogLevel.WARNING) == "WARNING"

    def test_log_level_enum_error(self):
        """Convert ERROR enum to string."""
        assert _get_level_name(LogLevel.ERROR) == "ERROR"

    def test_log_level_enum_off(self):
        """Convert OFF enum to string."""
        assert _get_level_name(LogLevel.OFF) == "OFF"

    def test_integer_level_debug(self):
        """Convert integer 10 to DEBUG."""
        assert _get_level_name(10) == "DEBUG"

    def test_integer_level_info(self):
        """Convert integer 20 to INFO."""
        assert _get_level_name(20) == "INFO"

    def test_integer_level_warning(self):
        """Convert integer 30 to WARNING."""
        assert _get_level_name(30) == "WARNING"

    def test_integer_level_error(self):
        """Convert integer 40 to ERROR."""
        assert _get_level_name(40) == "ERROR"

    def test_integer_level_critical(self):
        """Convert integer 50 to CRITICAL."""
        assert _get_level_name(50) == "CRITICAL"

    def test_integer_level_off(self):
        """Convert integer 100 to OFF."""
        assert _get_level_name(100) == "OFF"

    def test_unknown_integer_defaults_to_info(self):
        """Unknown integer defaults to INFO."""
        assert _get_level_name(42) == "INFO"


class TestParseLevel:
    """Tests for _parse_level helper function."""

    def test_parse_debug(self):
        """Parse DEBUG string."""
        assert _parse_level("DEBUG") == LogLevel.DEBUG

    def test_parse_info(self):
        """Parse INFO string."""
        assert _parse_level("INFO") == LogLevel.INFO

    def test_parse_warning(self):
        """Parse WARNING string."""
        assert _parse_level("WARNING") == LogLevel.WARNING

    def test_parse_error(self):
        """Parse ERROR string."""
        assert _parse_level("ERROR") == LogLevel.ERROR

    def test_parse_critical(self):
        """Parse CRITICAL string."""
        assert _parse_level("CRITICAL") == LogLevel.CRITICAL

    def test_parse_off(self):
        """Parse OFF string."""
        assert _parse_level("OFF") == LogLevel.OFF

    def test_parse_case_insensitive(self):
        """Parse handles different cases."""
        assert _parse_level("debug") == LogLevel.DEBUG
        assert _parse_level("Debug") == LogLevel.DEBUG
        assert _parse_level("dEbUg") == LogLevel.DEBUG

    def test_parse_unknown_defaults_to_info(self):
        """Unknown string defaults to INFO."""
        assert _parse_level("UNKNOWN") == LogLevel.INFO


class TestCategoryInfoModel:
    """Tests for CategoryInfo pydantic model."""

    def test_category_info_creation(self):
        """Create CategoryInfo with all fields."""
        info = CategoryInfo(
            name="api.request",
            level="DEBUG",
            enabled=True,
            children=["api.request.body"],
        )
        assert info.name == "api.request"
        assert info.level == "DEBUG"
        assert info.enabled is True
        assert info.children == ["api.request.body"]

    def test_category_info_default_children(self):
        """CategoryInfo has empty children by default."""
        info = CategoryInfo(name="test", level="INFO", enabled=True)
        assert info.children == []


class TestLoggingConfigResponse:
    """Tests for LoggingConfigResponse pydantic model."""

    def test_response_creation(self):
        """Create LoggingConfigResponse with all fields."""
        response = LoggingConfigResponse(
            global_level="DEBUG",
            categories={"api": "INFO"},
            file_enabled=True,
            file_path="/tmp/log.txt",
            file_clear_before_run=True,
            trace_clear_before_run=True,
            console_colored=False,
            console_format="json",
        )
        assert response.global_level == "DEBUG"
        assert response.categories == {"api": "INFO"}
        assert response.file_enabled is True
        assert response.file_path == "/tmp/log.txt"

    def test_response_defaults(self):
        """LoggingConfigResponse has sensible defaults."""
        response = LoggingConfigResponse(global_level="INFO")
        assert response.categories == {}
        assert response.file_enabled is False
        assert response.file_path is None
        assert response.console_colored is True
        assert response.console_format == "readable"


class TestLoggingConfigUpdate:
    """Tests for LoggingConfigUpdate pydantic model."""

    def test_update_all_fields(self):
        """Create update with all fields."""
        update = LoggingConfigUpdate(
            global_level="DEBUG",
            categories={"api": "WARNING"},
            file_enabled=True,
            file_clear_before_run=True,
            trace_clear_before_run=True,
            console_colored=False,
        )
        assert update.global_level == "DEBUG"
        assert update.categories == {"api": "WARNING"}
        assert update.file_enabled is True

    def test_update_defaults_to_none(self):
        """Update fields default to None (no change)."""
        update = LoggingConfigUpdate()
        assert update.global_level is None
        assert update.categories is None
        assert update.file_enabled is None


class TestGetLoggingConfig:
    """Tests for GET /api/debug/logging endpoint."""

    @pytest.mark.asyncio
    async def test_get_config_default(self, dev_client: AsyncClient, tmp_path: Path):
        """Return default config when no project config exists."""
        response = await dev_client.get("/api/debug/logging")
        assert response.status_code == 200
        data = response.json()
        assert "global_level" in data
        assert "categories" in data
        assert "file_enabled" in data
        assert "console_colored" in data

    @pytest.mark.asyncio
    async def test_get_config_with_project_path(
        self, dev_client: AsyncClient, tmp_path: Path
    ):
        """Return config for specific project path."""
        create_manifest(tmp_path, logging_config={"level": "DEBUG"})

        response = await dev_client.get(
            "/api/debug/logging",
            params={"project_path": str(tmp_path)},
        )

        assert response.status_code == 200
        data = response.json()
        # Config should be loaded from project
        assert "global_level" in data

    @pytest.mark.asyncio
    async def test_get_config_with_categories(
        self, dev_client: AsyncClient, tmp_path: Path
    ):
        """Return config with category overrides."""
        create_manifest(
            tmp_path,
            logging_config={
                "level": "INFO",
                "categories": {"api": "DEBUG", "runner": "WARNING"},
            },
        )

        response = await dev_client.get(
            "/api/debug/logging",
            params={"project_path": str(tmp_path)},
        )

        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_get_config_with_file_settings(
        self, dev_client: AsyncClient, tmp_path: Path
    ):
        """Return config with file logging settings."""
        create_manifest(
            tmp_path,
            logging_config={
                "level": "INFO",
                "file": {"enabled": False, "clear_before_run": True},
            },
        )

        response = await dev_client.get(
            "/api/debug/logging",
            params={"project_path": str(tmp_path)},
        )

        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_get_config_with_console_settings(
        self, dev_client: AsyncClient, tmp_path: Path
    ):
        """Return config with console settings."""
        create_manifest(
            tmp_path,
            logging_config={
                "level": "INFO",
                "console": {"colored": False, "format": "json"},
            },
        )

        response = await dev_client.get(
            "/api/debug/logging",
            params={"project_path": str(tmp_path)},
        )

        assert response.status_code == 200


class TestUpdateLoggingConfig:
    """Tests for PUT /api/debug/logging endpoint."""

    @pytest.mark.asyncio
    async def test_update_global_level(self, dev_client: AsyncClient, tmp_path: Path):
        """Update global log level."""
        create_manifest(tmp_path)

        response = await dev_client.put(
            "/api/debug/logging",
            params={"project_path": str(tmp_path)},
            json={"global_level": "DEBUG"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "config" in data

    @pytest.mark.asyncio
    async def test_update_categories(self, dev_client: AsyncClient, tmp_path: Path):
        """Update category-specific levels."""
        create_manifest(tmp_path)

        response = await dev_client.put(
            "/api/debug/logging",
            params={"project_path": str(tmp_path)},
            json={"categories": {"api": "DEBUG", "runner": "WARNING"}},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    @pytest.mark.asyncio
    async def test_update_file_settings(self, dev_client: AsyncClient, tmp_path: Path):
        """Update file logging settings."""
        create_manifest(tmp_path)

        response = await dev_client.put(
            "/api/debug/logging",
            params={"project_path": str(tmp_path)},
            json={"file_enabled": True, "file_clear_before_run": True},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    @pytest.mark.asyncio
    async def test_update_console_settings(self, dev_client: AsyncClient, tmp_path: Path):
        """Update console settings."""
        create_manifest(tmp_path)

        response = await dev_client.put(
            "/api/debug/logging",
            params={"project_path": str(tmp_path)},
            json={"console_colored": False},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    @pytest.mark.asyncio
    async def test_update_trace_settings(self, dev_client: AsyncClient, tmp_path: Path):
        """Update trace clear settings."""
        create_manifest(tmp_path)

        response = await dev_client.put(
            "/api/debug/logging",
            params={"project_path": str(tmp_path)},
            json={"trace_clear_before_run": True},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    @pytest.mark.asyncio
    async def test_update_saves_to_manifest(self, dev_client: AsyncClient, tmp_path: Path):
        """Update saves config to manifest.json."""
        create_manifest(tmp_path)

        await dev_client.put(
            "/api/debug/logging",
            params={"project_path": str(tmp_path)},
            json={"global_level": "DEBUG"},
        )

        # Verify manifest was updated
        manifest = json.loads((tmp_path / "manifest.json").read_text())
        assert "logging" in manifest
        assert manifest["logging"]["level"] == "DEBUG"


class TestListLoggingCategories:
    """Tests for GET /api/debug/logging/categories endpoint."""

    @pytest.mark.asyncio
    async def test_list_categories(self, dev_client: AsyncClient, tmp_path: Path):
        """List all available logging categories."""
        response = await dev_client.get("/api/debug/logging/categories")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_list_categories_with_project(
        self, dev_client: AsyncClient, tmp_path: Path
    ):
        """List categories with project-specific config loaded."""
        create_manifest(tmp_path, logging_config={"level": "DEBUG"})

        response = await dev_client.get(
            "/api/debug/logging/categories",
            params={"project_path": str(tmp_path)},
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestResetLoggingConfig:
    """Tests for POST /api/debug/logging/reset endpoint."""

    @pytest.mark.asyncio
    async def test_reset_config(self, dev_client: AsyncClient):
        """Reset logging config to defaults."""
        response = await dev_client.post("/api/debug/logging/reset")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "reset" in data["message"].lower()

    @pytest.mark.asyncio
    async def test_reset_removes_from_manifest(
        self, dev_client: AsyncClient, tmp_path: Path
    ):
        """Reset removes logging config from manifest."""
        create_manifest(tmp_path, logging_config={"level": "DEBUG"})

        response = await dev_client.post(
            "/api/debug/logging/reset",
            params={"project_path": str(tmp_path)},
        )

        assert response.status_code == 200

        # Verify logging config was removed from manifest
        manifest = json.loads((tmp_path / "manifest.json").read_text())
        assert manifest.get("logging") is None


class TestLoadProjectConfig:
    """Tests for _load_project_config helper function."""

    @pytest.mark.asyncio
    async def test_load_missing_manifest(self, dev_client: AsyncClient, tmp_path: Path):
        """Handle missing manifest gracefully."""
        # No manifest, should not raise
        response = await dev_client.get(
            "/api/debug/logging",
            params={"project_path": str(tmp_path)},
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_load_invalid_logging_config(
        self, dev_client: AsyncClient, tmp_path: Path
    ):
        """Handle invalid logging config gracefully."""
        # Create manifest with invalid logging config
        # Note: Pydantic validation catches this at manifest load time
        manifest = {
            "name": "test",
            "version": "3.0",
            "tabs": [],
            "nodes": [],
            "edges": [],
            "logging": {"level": "INVALID_LEVEL"},  # Invalid level value
        }
        (tmp_path / "manifest.json").write_text(json.dumps(manifest))

        response = await dev_client.get(
            "/api/debug/logging",
            params={"project_path": str(tmp_path)},
        )
        # Should handle gracefully - falls back to INFO for invalid level
        assert response.status_code == 200


class TestSaveProjectConfig:
    """Tests for _save_project_config helper function."""

    @pytest.mark.asyncio
    async def test_save_creates_logging_section(
        self, dev_client: AsyncClient, tmp_path: Path
    ):
        """Saving creates logging section in manifest."""
        create_manifest(tmp_path)  # No logging section

        await dev_client.put(
            "/api/debug/logging",
            params={"project_path": str(tmp_path)},
            json={"global_level": "WARNING"},
        )

        manifest = json.loads((tmp_path / "manifest.json").read_text())
        assert "logging" in manifest
        assert manifest["logging"]["level"] == "WARNING"

    @pytest.mark.asyncio
    async def test_save_preserves_other_manifest_fields(
        self, dev_client: AsyncClient, tmp_path: Path
    ):
        """Saving preserves other manifest fields."""
        manifest = create_manifest(tmp_path)

        await dev_client.put(
            "/api/debug/logging",
            params={"project_path": str(tmp_path)},
            json={"global_level": "DEBUG"},
        )

        updated = json.loads((tmp_path / "manifest.json").read_text())
        assert updated["name"] == manifest["name"]
        assert updated["version"] == manifest["version"]
        # Tabs may have additional fields added (like viewport), check core fields
        assert len(updated["tabs"]) == len(manifest["tabs"])
        assert updated["tabs"][0]["id"] == manifest["tabs"][0]["id"]
        assert updated["tabs"][0]["name"] == manifest["tabs"][0]["name"]

    @pytest.mark.asyncio
    async def test_save_with_categories(self, dev_client: AsyncClient, tmp_path: Path):
        """Saving includes category overrides."""
        create_manifest(tmp_path)

        await dev_client.put(
            "/api/debug/logging",
            params={"project_path": str(tmp_path)},
            json={"categories": {"api": "DEBUG"}},
        )

        manifest = json.loads((tmp_path / "manifest.json").read_text())
        assert "categories" in manifest.get("logging", {})
