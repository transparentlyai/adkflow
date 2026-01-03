"""Root pytest configuration with shared fixtures for all tests."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


# =============================================================================
# Project Fixtures
# =============================================================================


@pytest.fixture
def tmp_project(tmp_path: Path) -> Path:
    """Create a temporary project with valid structure.

    Returns a path to a temporary directory containing:
    - manifest.json with valid v3.0 structure
    - prompts/ directory
    - tools/ directory
    - contexts/ directory
    """
    manifest = {
        "name": "test-project",
        "version": "3.0",
        "tabs": [{"id": "tab1", "name": "Main", "isDefault": True}],
        "nodes": [],
        "edges": [],
        "settings": {
            "model": "gemini-2.0-flash",
            "temperature": 0.7,
        },
    }
    (tmp_path / "manifest.json").write_text(json.dumps(manifest, indent=2))
    (tmp_path / "prompts").mkdir()
    (tmp_path / "tools").mkdir()
    (tmp_path / "contexts").mkdir()
    return tmp_path


@pytest.fixture
def sample_manifest() -> dict[str, Any]:
    """Return a sample manifest dictionary for testing."""
    return {
        "name": "sample-project",
        "version": "3.0",
        "tabs": [
            {"id": "tab1", "name": "Main", "isDefault": True},
            {"id": "tab2", "name": "Secondary", "isDefault": False},
        ],
        "nodes": [
            {
                "id": "agent-1",
                "type": "agent",
                "position": {"x": 100, "y": 100},
                "data": {
                    "agent": {
                        "name": "TestAgent",
                        "type": "llm",
                        "model": "gemini-2.0-flash",
                    }
                },
            },
            {
                "id": "prompt-1",
                "type": "prompt",
                "position": {"x": 50, "y": 100},
                "data": {"prompt": {"name": "TestPrompt", "content": "Hello, world!"}},
            },
        ],
        "edges": [
            {
                "id": "edge-1",
                "source": "prompt-1",
                "target": "agent-1",
                "sourceHandle": "output",
                "targetHandle": "instruction",
            }
        ],
        "settings": {},
    }


@pytest.fixture
def project_with_workflow(tmp_path: Path) -> Path:
    """Create a project with a simple sequential workflow.

    Workflow: Start → Agent A → Agent B
    """
    manifest = {
        "name": "workflow-project",
        "version": "3.0",
        "tabs": [{"id": "tab1", "name": "Main", "isDefault": True}],
        "nodes": [
            {
                "id": "start-1",
                "type": "start",
                "position": {"x": 0, "y": 100},
                "data": {},
            },
            {
                "id": "agent-a",
                "type": "agent",
                "position": {"x": 200, "y": 100},
                "data": {
                    "agent": {
                        "name": "AgentA",
                        "type": "llm",
                        "model": "gemini-2.0-flash",
                    }
                },
            },
            {
                "id": "agent-b",
                "type": "agent",
                "position": {"x": 400, "y": 100},
                "data": {
                    "agent": {
                        "name": "AgentB",
                        "type": "llm",
                        "model": "gemini-2.0-flash",
                    }
                },
            },
        ],
        "edges": [
            {
                "id": "edge-1",
                "source": "start-1",
                "target": "agent-a",
                "sourceHandle": "output",
                "targetHandle": "sequential",
            },
            {
                "id": "edge-2",
                "source": "agent-a",
                "target": "agent-b",
                "sourceHandle": "sequential",
                "targetHandle": "sequential",
            },
        ],
        "settings": {},
    }
    (tmp_path / "manifest.json").write_text(json.dumps(manifest, indent=2))
    (tmp_path / "prompts").mkdir()
    (tmp_path / "tools").mkdir()
    (tmp_path / "contexts").mkdir()
    return tmp_path


# =============================================================================
# Google ADK Mocks
# =============================================================================


@pytest.fixture
def mock_adk_runner():
    """Mock google.adk.runners.Runner for testing without real API calls."""
    with patch("google.adk.runners.Runner") as mock:
        mock_runner = MagicMock()
        mock_runner.run_async = AsyncMock(
            return_value=MagicMock(
                content="Mock response from ADK",
                model_dump=MagicMock(return_value={"content": "Mock response"}),
            )
        )
        mock.return_value = mock_runner
        yield mock_runner


@pytest.fixture
def mock_genai_client():
    """Mock google.genai.Client for testing without real API calls."""
    with patch("google.genai.Client") as mock:
        mock_client = MagicMock()
        mock.return_value = mock_client
        yield mock_client


@pytest.fixture
def mock_session_service():
    """Mock InMemorySessionService for testing."""
    with patch("google.adk.sessions.InMemorySessionService") as mock:
        mock_service = MagicMock()
        mock_service.create_session = MagicMock(return_value=MagicMock(id="test-session"))
        mock.return_value = mock_service
        yield mock_service


# =============================================================================
# IR Fixtures
# =============================================================================


@pytest.fixture
def sample_agent_ir():
    """Create a sample AgentIR for testing."""
    from adkflow_runner.ir import AgentIR

    return AgentIR(
        id="test-agent",
        name="TestAgent",
        type="llm",
        model="gemini-2.0-flash",
        temperature=0.7,
    )


@pytest.fixture
def sample_sequential_ir():
    """Create a sample sequential AgentIR with subagents."""
    from adkflow_runner.ir import AgentIR

    return AgentIR(
        id="sequential-agent",
        name="SequentialAgent",
        type="sequential",
        subagents=[
            AgentIR(id="sub-1", name="SubAgent1", type="llm"),
            AgentIR(id="sub-2", name="SubAgent2", type="llm"),
        ],
    )


@pytest.fixture
def sample_parallel_ir():
    """Create a sample parallel AgentIR with subagents."""
    from adkflow_runner.ir import AgentIR

    return AgentIR(
        id="parallel-agent",
        name="ParallelAgent",
        type="parallel",
        subagents=[
            AgentIR(id="par-1", name="ParAgent1", type="llm"),
            AgentIR(id="par-2", name="ParAgent2", type="llm"),
        ],
    )


# =============================================================================
# Test Data Generators
# =============================================================================


@pytest.fixture
def make_node():
    """Factory fixture to create ReactFlow nodes for testing."""

    def _make_node(
        node_id: str,
        node_type: str = "agent",
        name: str | None = None,
        position: tuple[float, float] = (100, 100),
        **data_kwargs: Any,
    ) -> dict[str, Any]:
        name = name or f"Node-{node_id}"
        node = {
            "id": node_id,
            "type": node_type,
            "position": {"x": position[0], "y": position[1]},
            "data": {},
        }

        if node_type == "agent":
            node["data"]["agent"] = {
                "name": name,
                "type": data_kwargs.get("agent_type", "llm"),
                "model": data_kwargs.get("model", "gemini-2.0-flash"),
                **{k: v for k, v in data_kwargs.items() if k not in ("agent_type", "model")},
            }
        elif node_type == "prompt":
            node["data"]["prompt"] = {
                "name": name,
                "content": data_kwargs.get("content", "Default prompt content"),
            }
        elif node_type == "tool":
            node["data"]["tool"] = {
                "name": name,
                "code": data_kwargs.get("code", "def tool(): pass"),
            }
        else:
            node["data"] = data_kwargs

        return node

    return _make_node


@pytest.fixture
def make_edge():
    """Factory fixture to create ReactFlow edges for testing."""

    def _make_edge(
        source: str,
        target: str,
        source_handle: str = "output",
        target_handle: str = "input",
        edge_id: str | None = None,
    ) -> dict[str, Any]:
        return {
            "id": edge_id or f"{source}-{target}",
            "source": source,
            "target": target,
            "sourceHandle": source_handle,
            "targetHandle": target_handle,
        }

    return _make_edge


# =============================================================================
# Async Helpers
# =============================================================================


@pytest.fixture
def event_loop_policy():
    """Provide a consistent event loop policy for async tests."""
    import asyncio

    return asyncio.DefaultEventLoopPolicy()
