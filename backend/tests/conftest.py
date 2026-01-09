"""Conftest for backend API tests."""

from __future__ import annotations

import json
import os
from collections.abc import AsyncGenerator
from pathlib import Path
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient


@pytest.fixture(autouse=True)
def reset_chat_service():
    """Reset chat service singleton before each test."""
    from backend.src.services.chat_service import chat_service

    # Clear all sessions
    chat_service._sessions.clear()
    yield
    # Cleanup after test
    chat_service._sessions.clear()


@pytest.fixture
async def app():
    """Create FastAPI app instance for testing."""
    from backend.src.main import app

    yield app


@pytest.fixture
async def dev_app():
    """Create FastAPI app with dev mode enabled for testing debug routes."""
    import importlib
    import sys

    # Set dev mode before importing
    os.environ["ADKFLOW_DEV_MODE"] = "1"

    # Remove cached module to force re-import with dev mode
    modules_to_remove = [k for k in sys.modules if k.startswith("backend.src.main")]
    for mod in modules_to_remove:
        del sys.modules[mod]

    # Import with dev mode enabled
    import backend.src.main

    importlib.reload(backend.src.main)
    yield backend.src.main.app

    # Cleanup: restore original state
    os.environ.pop("ADKFLOW_DEV_MODE", None)
    for mod in modules_to_remove:
        if mod in sys.modules:
            del sys.modules[mod]


@pytest.fixture
async def dev_client(dev_app: Any) -> AsyncGenerator[AsyncClient, None]:
    """Create async HTTP client for testing debug API endpoints."""
    async with AsyncClient(
        transport=ASGITransport(app=dev_app),
        base_url="http://test",
    ) as ac:
        yield ac


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
