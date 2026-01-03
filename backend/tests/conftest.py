"""Conftest for backend API tests."""

from __future__ import annotations

import json
from collections.abc import AsyncGenerator
from pathlib import Path
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient


@pytest.fixture
async def app():
    """Create FastAPI app instance for testing."""
    from backend.src.main import app

    yield app


@pytest.fixture
async def client(app: Any) -> AsyncGenerator[AsyncClient, None]:
    """Create async HTTP client for testing API endpoints."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac


@pytest.fixture
def api_headers() -> dict[str, str]:
    """Return common headers for API requests."""
    return {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


@pytest.fixture
def tmp_project(tmp_path: Path) -> Path:
    """Create a temporary project with valid manifest structure."""
    manifest = {
        "name": "test-project",
        "version": "3.0",
        "tabs": [{"id": "tab-1", "name": "Main"}],
        "nodes": [
            {
                "id": "start-1",
                "type": "start",
                "position": {"x": 0, "y": 0},
                "data": {"tabId": "tab-1"},
            },
            {
                "id": "agent-1",
                "type": "agent",
                "position": {"x": 200, "y": 0},
                "data": {
                    "tabId": "tab-1",
                    "config": {"name": "TestAgent", "description": "Test agent"},
                },
            },
        ],
        "edges": [
            {"id": "e1", "source": "start-1", "target": "agent-1"},
        ],
        "settings": {},
    }
    (tmp_path / "manifest.json").write_text(json.dumps(manifest, indent=2))
    (tmp_path / "prompts").mkdir()
    (tmp_path / "tools").mkdir()
    (tmp_path / "static").mkdir()
    return tmp_path
