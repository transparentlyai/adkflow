"""Tests for file operations API routes.

Tests prompt, context, tool creation and file reading endpoints.
"""

from __future__ import annotations

import asyncio
import json
from pathlib import Path

from httpx import AsyncClient


class TestCreatePrompt:
    """Tests for POST /api/project/prompt/create endpoint."""

    async def test_create_prompt_success(self, client: AsyncClient, tmp_project: Path):
        """Create a new prompt file."""
        response = await client.post(
            "/api/project/prompt/create",
            json={"project_path": str(tmp_project), "prompt_name": "My Prompt"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "prompts/my-prompt.prompt.md" in data["file_path"]
        assert (tmp_project / "prompts" / "my-prompt.prompt.md").exists()

    async def test_create_prompt_sanitizes_name(
        self, client: AsyncClient, tmp_project: Path
    ):
        """Prompt name is sanitized for filesystem."""
        response = await client.post(
            "/api/project/prompt/create",
            json={
                "project_path": str(tmp_project),
                "prompt_name": "My Cool Prompt!!!",
            },
        )

        assert response.status_code == 200
        data = response.json()
        # Special chars replaced with dashes
        assert "my-cool-prompt.prompt.md" in data["file_path"]

    async def test_create_prompt_already_exists(
        self, client: AsyncClient, tmp_project: Path
    ):
        """Return 409 when prompt file already exists."""
        (tmp_project / "prompts" / "existing.prompt.md").touch()

        response = await client.post(
            "/api/project/prompt/create",
            json={"project_path": str(tmp_project), "prompt_name": "existing"},
        )

        assert response.status_code == 409
        assert "already exists" in response.json()["detail"]

    async def test_create_prompt_invalid_name(
        self, client: AsyncClient, tmp_project: Path
    ):
        """Return 400 for invalid prompt name."""
        response = await client.post(
            "/api/project/prompt/create",
            json={"project_path": str(tmp_project), "prompt_name": "!!!"},
        )

        assert response.status_code == 400
        assert "Invalid" in response.json()["detail"]


class TestCreateContext:
    """Tests for POST /api/project/context/create endpoint."""

    async def test_create_context_success(self, client: AsyncClient, tmp_project: Path):
        """Create a new context file."""
        response = await client.post(
            "/api/project/context/create",
            json={"project_path": str(tmp_project), "context_name": "My Context"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "static/my-context.context.md" in data["file_path"]
        assert (tmp_project / "static" / "my-context.context.md").exists()

    async def test_create_context_already_exists(
        self, client: AsyncClient, tmp_project: Path
    ):
        """Return 409 when context file already exists."""
        (tmp_project / "static" / "existing.context.md").touch()

        response = await client.post(
            "/api/project/context/create",
            json={"project_path": str(tmp_project), "context_name": "existing"},
        )

        assert response.status_code == 409


class TestCreateTool:
    """Tests for POST /api/project/tool/create endpoint."""

    async def test_create_tool_success(self, client: AsyncClient, tmp_project: Path):
        """Create a new tool file."""
        response = await client.post(
            "/api/project/tool/create",
            json={"project_path": str(tmp_project), "tool_name": "my_tool"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "tools/my_tool.py" in data["file_path"]
        assert (tmp_project / "tools" / "my_tool.py").exists()

    async def test_create_tool_has_template(
        self, client: AsyncClient, tmp_project: Path
    ):
        """Created tool file contains Python template."""
        response = await client.post(
            "/api/project/tool/create",
            json={"project_path": str(tmp_project), "tool_name": "calculator"},
        )

        assert response.status_code == 200

        content = (tmp_project / "tools" / "calculator.py").read_text()
        assert "def calculator(" in content
        assert "return" in content

    async def test_create_tool_already_exists(
        self, client: AsyncClient, tmp_project: Path
    ):
        """Return 409 when tool file already exists."""
        (tmp_project / "tools" / "existing.py").touch()

        response = await client.post(
            "/api/project/tool/create",
            json={"project_path": str(tmp_project), "tool_name": "existing"},
        )

        assert response.status_code == 409


class TestReadPrompt:
    """Tests for POST /api/project/prompt/read endpoint."""

    async def test_read_prompt_success(self, client: AsyncClient, tmp_project: Path):
        """Read prompt file content."""
        prompt_content = "# My Prompt\n\nThis is my prompt content."
        (tmp_project / "prompts" / "test.prompt.md").write_text(prompt_content)

        response = await client.post(
            "/api/project/prompt/read",
            json={
                "project_path": str(tmp_project),
                "file_path": "prompts/test.prompt.md",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["content"] == prompt_content

    async def test_read_prompt_not_found(self, client: AsyncClient, tmp_project: Path):
        """Return 404 when prompt file not found."""
        response = await client.post(
            "/api/project/prompt/read",
            json={
                "project_path": str(tmp_project),
                "file_path": "prompts/nonexistent.prompt.md",
            },
        )

        assert response.status_code == 404

    async def test_read_prompt_absolute_path(
        self, client: AsyncClient, tmp_project: Path
    ):
        """Read prompt using absolute path."""
        prompt_file = tmp_project / "prompts" / "absolute.prompt.md"
        prompt_file.write_text("Absolute path content")

        response = await client.post(
            "/api/project/prompt/read",
            json={
                "project_path": str(tmp_project),
                "file_path": str(prompt_file),
            },
        )

        assert response.status_code == 200
        assert response.json()["content"] == "Absolute path content"


class TestSavePrompt:
    """Tests for POST /api/project/prompt/save endpoint."""

    async def test_save_prompt_success(self, client: AsyncClient, tmp_project: Path):
        """Save content to prompt file."""
        response = await client.post(
            "/api/project/prompt/save",
            json={
                "project_path": str(tmp_project),
                "file_path": "prompts/new.prompt.md",
                "content": "# New Prompt\n\nContent here.",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

        saved = (tmp_project / "prompts" / "new.prompt.md").read_text()
        assert saved == "# New Prompt\n\nContent here."

    async def test_save_prompt_overwrites(self, client: AsyncClient, tmp_project: Path):
        """Save overwrites existing content."""
        prompt_file = tmp_project / "prompts" / "existing.prompt.md"
        prompt_file.write_text("Old content")

        response = await client.post(
            "/api/project/prompt/save",
            json={
                "project_path": str(tmp_project),
                "file_path": "prompts/existing.prompt.md",
                "content": "New content",
            },
        )

        assert response.status_code == 200
        assert prompt_file.read_text() == "New content"

    async def test_save_prompt_creates_directories(
        self, client: AsyncClient, tmp_project: Path
    ):
        """Save creates parent directories if needed."""
        response = await client.post(
            "/api/project/prompt/save",
            json={
                "project_path": str(tmp_project),
                "file_path": "new_dir/nested.prompt.md",
                "content": "Nested content",
            },
        )

        assert response.status_code == 200
        assert (tmp_project / "new_dir" / "nested.prompt.md").exists()


class TestReadFileChunk:
    """Tests for POST /api/project/file/chunk endpoint."""

    async def test_read_chunk_normal_mode(self, client: AsyncClient, tmp_project: Path):
        """Read file chunk from start."""
        # Create a file with multiple lines
        content = "\n".join([f"Line {i}" for i in range(100)])
        (tmp_project / "logs" / "test.log").parent.mkdir(parents=True, exist_ok=True)
        (tmp_project / "logs" / "test.log").write_text(content)

        response = await client.post(
            "/api/project/file/chunk",
            json={
                "project_path": str(tmp_project),
                "file_path": "logs/test.log",
                "offset": 0,
                "limit": 10,
                "reverse": False,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["total_lines"] == 100
        assert data["has_more"] is True
        assert "Line 0" in data["content"]
        assert "Line 9" in data["content"]

    async def test_read_chunk_reverse_mode(
        self, client: AsyncClient, tmp_project: Path
    ):
        """Read file chunk from end (reverse mode)."""
        content = "\n".join([f"Line {i}" for i in range(100)])
        (tmp_project / "logs").mkdir(parents=True, exist_ok=True)
        (tmp_project / "logs" / "test.log").write_text(content)

        response = await client.post(
            "/api/project/file/chunk",
            json={
                "project_path": str(tmp_project),
                "file_path": "logs/test.log",
                "offset": 0,
                "limit": 10,
                "reverse": True,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["has_more"] is True
        # In reverse mode, we get last lines first
        assert "Line 99" in data["content"]

    async def test_read_chunk_file_not_found(
        self, client: AsyncClient, tmp_project: Path
    ):
        """Return 404 when file doesn't exist."""
        response = await client.post(
            "/api/project/file/chunk",
            json={
                "project_path": str(tmp_project),
                "file_path": "nonexistent.log",
                "offset": 0,
                "limit": 100,
                "reverse": False,
            },
        )

        assert response.status_code == 404

    async def test_read_chunk_empty_file(self, client: AsyncClient, tmp_project: Path):
        """Handle empty file gracefully."""
        (tmp_project / "empty.txt").touch()

        response = await client.post(
            "/api/project/file/chunk",
            json={
                "project_path": str(tmp_project),
                "file_path": "empty.txt",
                "offset": 0,
                "limit": 100,
                "reverse": False,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_lines"] == 0
        assert data["has_more"] is False

    async def test_read_chunk_offset_beyond_file(
        self, client: AsyncClient, tmp_project: Path
    ):
        """Handle offset beyond file length."""
        (tmp_project / "small.txt").write_text("Line 1\nLine 2")

        response = await client.post(
            "/api/project/file/chunk",
            json={
                "project_path": str(tmp_project),
                "file_path": "small.txt",
                "offset": 1000,
                "limit": 100,
                "reverse": False,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["content"] == ""
        assert data["has_more"] is False


class TestErrorHandling:
    """Tests for error handling in file routes."""

    async def test_create_prompt_permission_error(
        self, client: AsyncClient, tmp_project: Path, monkeypatch
    ):
        """Handle permission errors when creating prompt."""
        from pathlib import Path as PathlibPath

        # Mock Path.touch to raise PermissionError
        original_touch = PathlibPath.touch

        def mock_touch(self, *args, **kwargs):
            if "prompt.md" in str(self):
                raise PermissionError("No write permission")
            return original_touch(self, *args, **kwargs)

        monkeypatch.setattr(PathlibPath, "touch", mock_touch)

        response = await client.post(
            "/api/project/prompt/create",
            json={"project_path": str(tmp_project), "prompt_name": "test"},
        )

        assert response.status_code == 403
        assert "Permission denied" in response.json()["detail"]

    async def test_create_context_permission_error(
        self, client: AsyncClient, tmp_project: Path, monkeypatch
    ):
        """Handle permission errors when creating context."""
        from pathlib import Path as PathlibPath

        # Mock Path.touch to raise PermissionError
        original_touch = PathlibPath.touch

        def mock_touch(self, *args, **kwargs):
            if "context.md" in str(self):
                raise PermissionError("No write permission")
            return original_touch(self, *args, **kwargs)

        monkeypatch.setattr(PathlibPath, "touch", mock_touch)

        response = await client.post(
            "/api/project/context/create",
            json={"project_path": str(tmp_project), "context_name": "test"},
        )

        assert response.status_code == 403
        assert "Permission denied" in response.json()["detail"]


class TestFileWatcherIntegration:
    """Tests for file watcher integration with file routes."""


class TestSavePromptNotifiesWatcher:
    """Tests that save endpoint notifies file watcher."""

    async def test_save_prompt_notifies_watcher(
        self, client: AsyncClient, tmp_project: Path
    ):
        """Save prompt notifies file watcher of change."""
        from backend.src.api.file_watcher import file_watcher_manager

        project_path = str(tmp_project.resolve())

        # Subscribe to file changes
        queue = await file_watcher_manager.subscribe(project_path)

        # Save a file via API
        await client.post(
            "/api/project/prompt/save",
            json={
                "project_path": str(tmp_project),
                "file_path": "prompts/notified.md",
                "content": "Test content",
            },
        )

        # Should receive notification
        event = await asyncio.wait_for(queue.get(), timeout=1.0)
        assert event.file_path == "prompts/notified.md"
        assert event.change_type == "modified"

        await file_watcher_manager.unsubscribe(project_path, queue)
