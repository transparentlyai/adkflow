"""Tests for log explorer API routes."""

import json
from pathlib import Path

import pytest
from httpx import AsyncClient


@pytest.fixture
def logs_dir(tmp_path: Path) -> Path:
    """Create a logs directory with sample log files."""
    logs = tmp_path / "logs"
    logs.mkdir()
    return logs


@pytest.fixture
def sample_log_file(logs_dir: Path) -> Path:
    """Create a sample JSONL log file."""
    log_file = logs_dir / "adkflow.jsonl"
    entries = [
        {
            "timestamp": "2024-01-01T10:00:00Z",
            "level": "INFO",
            "category": "runner.workflow",
            "message": "Starting workflow",
            "run_id": "abc12345",
        },
        {
            "timestamp": "2024-01-01T10:00:01Z",
            "level": "DEBUG",
            "category": "runner.agent",
            "message": "Agent initialized",
            "run_id": "abc12345",
        },
        {
            "timestamp": "2024-01-01T10:00:02Z",
            "level": "ERROR",
            "category": "runner.workflow",
            "message": "Workflow failed",
            "run_id": "abc12345",
            "exception": {
                "type": "ValueError",
                "message": "Invalid input",
                "traceback": ["line 1", "line 2"],
            },
        },
        {
            "timestamp": "2024-01-01T11:00:00Z",
            "level": "INFO",
            "category": "runner.workflow",
            "message": "New run started",
            "run_id": "def67890",
        },
    ]
    with open(log_file, "w") as f:
        for entry in entries:
            f.write(json.dumps(entry) + "\n")
    return log_file


class TestListLogFiles:
    """Tests for list_log_files endpoint."""

    @pytest.mark.asyncio
    async def test_list_log_files(
        self, dev_client: AsyncClient, tmp_path: Path, sample_log_file: Path
    ):
        """List log files in the logs directory."""
        response = await dev_client.get(
            "/api/debug/logs", params={"project_path": str(tmp_path)}
        )
        assert response.status_code == 200

        data = response.json()
        assert len(data["files"]) == 1
        assert data["files"][0]["name"] == "adkflow.jsonl"
        assert data["files"][0]["format"] == "jsonl"

    @pytest.mark.asyncio
    async def test_list_no_logs_directory(
        self, dev_client: AsyncClient, tmp_path: Path
    ):
        """No logs directory returns empty list."""
        response = await dev_client.get(
            "/api/debug/logs", params={"project_path": str(tmp_path)}
        )
        assert response.status_code == 200

        data = response.json()
        assert data["files"] == []

    @pytest.mark.asyncio
    async def test_list_only_jsonl_files(
        self, dev_client: AsyncClient, tmp_path: Path, logs_dir: Path
    ):
        """Only .jsonl files are listed."""
        (logs_dir / "test.jsonl").write_text("{}")
        (logs_dir / "other.txt").write_text("not a log")

        response = await dev_client.get(
            "/api/debug/logs", params={"project_path": str(tmp_path)}
        )
        assert response.status_code == 200

        data = response.json()
        names = [f["name"] for f in data["files"]]
        assert "test.jsonl" in names
        assert "other.txt" not in names


class TestReadLogEntries:
    """Tests for read_log_entries endpoint."""

    @pytest.mark.asyncio
    async def test_read_entries_basic(
        self, dev_client: AsyncClient, tmp_path: Path, sample_log_file: Path
    ):
        """Read log entries from file."""
        response = await dev_client.get(
            "/api/debug/logs/entries",
            params={"project_path": str(tmp_path), "file_name": "adkflow.jsonl"},
        )
        assert response.status_code == 200

        data = response.json()
        assert data["total_count"] == 4
        assert len(data["entries"]) == 4

    @pytest.mark.asyncio
    async def test_read_entries_with_level_filter(
        self, dev_client: AsyncClient, tmp_path: Path, sample_log_file: Path
    ):
        """Filter entries by level."""
        response = await dev_client.get(
            "/api/debug/logs/entries",
            params={
                "project_path": str(tmp_path),
                "file_name": "adkflow.jsonl",
                "level": "ERROR",
            },
        )
        assert response.status_code == 200

        data = response.json()
        assert data["total_count"] == 1
        assert data["entries"][0]["level"] == "ERROR"

    @pytest.mark.asyncio
    async def test_read_entries_with_category_filter(
        self, dev_client: AsyncClient, tmp_path: Path, sample_log_file: Path
    ):
        """Filter entries by category wildcard."""
        response = await dev_client.get(
            "/api/debug/logs/entries",
            params={
                "project_path": str(tmp_path),
                "file_name": "adkflow.jsonl",
                "category": "runner.agent",
            },
        )
        assert response.status_code == 200

        data = response.json()
        assert data["total_count"] == 1
        assert data["entries"][0]["category"] == "runner.agent"

    @pytest.mark.asyncio
    async def test_read_entries_with_search(
        self, dev_client: AsyncClient, tmp_path: Path, sample_log_file: Path
    ):
        """Search in message content."""
        response = await dev_client.get(
            "/api/debug/logs/entries",
            params={
                "project_path": str(tmp_path),
                "file_name": "adkflow.jsonl",
                "search": "failed",
            },
        )
        assert response.status_code == 200

        data = response.json()
        assert data["total_count"] == 1
        assert "failed" in data["entries"][0]["message"].lower()

    @pytest.mark.asyncio
    async def test_read_entries_with_run_id(
        self, dev_client: AsyncClient, tmp_path: Path, sample_log_file: Path
    ):
        """Filter entries by run_id."""
        response = await dev_client.get(
            "/api/debug/logs/entries",
            params={
                "project_path": str(tmp_path),
                "file_name": "adkflow.jsonl",
                "run_id": "abc12345",
            },
        )
        assert response.status_code == 200

        data = response.json()
        assert data["total_count"] == 3

    @pytest.mark.asyncio
    async def test_read_entries_pagination(
        self, dev_client: AsyncClient, tmp_path: Path, sample_log_file: Path
    ):
        """Pagination with offset and limit."""
        response = await dev_client.get(
            "/api/debug/logs/entries",
            params={
                "project_path": str(tmp_path),
                "file_name": "adkflow.jsonl",
                "offset": 1,
                "limit": 2,
            },
        )
        assert response.status_code == 200

        data = response.json()
        assert len(data["entries"]) == 2
        assert data["has_more"] is True

    @pytest.mark.asyncio
    async def test_read_entries_file_not_found(
        self, dev_client: AsyncClient, tmp_path: Path, logs_dir: Path
    ):
        """Non-existent file returns 404."""
        response = await dev_client.get(
            "/api/debug/logs/entries",
            params={
                "project_path": str(tmp_path),
                "file_name": "nonexistent.jsonl",
            },
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_read_entries_with_exception(
        self, dev_client: AsyncClient, tmp_path: Path, sample_log_file: Path
    ):
        """Entry with exception info is parsed correctly."""
        response = await dev_client.get(
            "/api/debug/logs/entries",
            params={
                "project_path": str(tmp_path),
                "file_name": "adkflow.jsonl",
                "level": "ERROR",
            },
        )
        assert response.status_code == 200

        data = response.json()
        entry = data["entries"][0]
        assert entry["exception"] is not None
        assert entry["exception"]["type"] == "ValueError"

    @pytest.mark.asyncio
    async def test_read_entries_invalid_start_time(
        self, dev_client: AsyncClient, tmp_path: Path, sample_log_file: Path
    ):
        """Invalid start_time returns 400."""
        response = await dev_client.get(
            "/api/debug/logs/entries",
            params={
                "project_path": str(tmp_path),
                "file_name": "adkflow.jsonl",
                "start_time": "invalid",
            },
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_read_entries_invalid_end_time(
        self, dev_client: AsyncClient, tmp_path: Path, sample_log_file: Path
    ):
        """Invalid end_time returns 400."""
        response = await dev_client.get(
            "/api/debug/logs/entries",
            params={
                "project_path": str(tmp_path),
                "file_name": "adkflow.jsonl",
                "end_time": "invalid",
            },
        )
        assert response.status_code == 400


class TestGetLogStats:
    """Tests for get_log_stats endpoint."""

    @pytest.mark.asyncio
    async def test_get_stats(
        self, dev_client: AsyncClient, tmp_path: Path, sample_log_file: Path
    ):
        """Get statistics for a log file."""
        response = await dev_client.get(
            "/api/debug/logs/stats",
            params={"project_path": str(tmp_path), "file_name": "adkflow.jsonl"},
        )
        assert response.status_code == 200

        data = response.json()
        assert data["total_lines"] == 4
        assert data["level_counts"]["INFO"] == 2
        assert data["level_counts"]["DEBUG"] == 1
        assert data["level_counts"]["ERROR"] == 1

    @pytest.mark.asyncio
    async def test_get_stats_file_not_found(
        self, dev_client: AsyncClient, tmp_path: Path, logs_dir: Path
    ):
        """Non-existent file returns 404."""
        response = await dev_client.get(
            "/api/debug/logs/stats",
            params={
                "project_path": str(tmp_path),
                "file_name": "nonexistent.jsonl",
            },
        )
        assert response.status_code == 404


class TestListRuns:
    """Tests for list_runs endpoint."""

    @pytest.mark.asyncio
    async def test_list_runs(
        self, dev_client: AsyncClient, tmp_path: Path, sample_log_file: Path
    ):
        """List unique runs in log file."""
        response = await dev_client.get(
            "/api/debug/logs/runs",
            params={"project_path": str(tmp_path), "file_name": "adkflow.jsonl"},
        )
        assert response.status_code == 200

        data = response.json()
        assert len(data["runs"]) == 2
        run_ids = [r["run_id"] for r in data["runs"]]
        assert "abc12345" in run_ids
        assert "def67890" in run_ids

    @pytest.mark.asyncio
    async def test_list_runs_entry_count(
        self, dev_client: AsyncClient, tmp_path: Path, sample_log_file: Path
    ):
        """Run entry counts are correct."""
        response = await dev_client.get(
            "/api/debug/logs/runs",
            params={"project_path": str(tmp_path), "file_name": "adkflow.jsonl"},
        )
        assert response.status_code == 200

        data = response.json()
        for run in data["runs"]:
            if run["run_id"] == "abc12345":
                assert run["entry_count"] == 3
            elif run["run_id"] == "def67890":
                assert run["entry_count"] == 1

    @pytest.mark.asyncio
    async def test_list_runs_file_not_found(
        self, dev_client: AsyncClient, tmp_path: Path, logs_dir: Path
    ):
        """Non-existent file returns 404."""
        response = await dev_client.get(
            "/api/debug/logs/runs",
            params={
                "project_path": str(tmp_path),
                "file_name": "nonexistent.jsonl",
            },
        )
        assert response.status_code == 404


class TestLogExplorerModels:
    """Tests for model parsing and data handling."""

    @pytest.mark.asyncio
    async def test_log_entry_with_context(
        self, dev_client: AsyncClient, tmp_path: Path, logs_dir: Path
    ):
        """Log entry with context is parsed correctly."""
        log_file = logs_dir / "context.jsonl"
        entry = {
            "timestamp": "2024-01-01T10:00:00Z",
            "level": "INFO",
            "category": "test",
            "message": "Test message",
            "context": {"key": "value", "nested": {"a": 1}},
        }
        log_file.write_text(json.dumps(entry) + "\n")

        response = await dev_client.get(
            "/api/debug/logs/entries",
            params={"project_path": str(tmp_path), "file_name": "context.jsonl"},
        )
        assert response.status_code == 200

        data = response.json()
        assert data["entries"][0]["context"]["key"] == "value"

    @pytest.mark.asyncio
    async def test_log_entry_with_duration(
        self, dev_client: AsyncClient, tmp_path: Path, logs_dir: Path
    ):
        """Log entry with duration_ms is parsed correctly."""
        log_file = logs_dir / "duration.jsonl"
        entry = {
            "timestamp": "2024-01-01T10:00:00Z",
            "level": "INFO",
            "category": "test",
            "message": "Test message",
            "duration_ms": 123.45,
        }
        log_file.write_text(json.dumps(entry) + "\n")

        response = await dev_client.get(
            "/api/debug/logs/entries",
            params={"project_path": str(tmp_path), "file_name": "duration.jsonl"},
        )
        assert response.status_code == 200

        data = response.json()
        assert data["entries"][0]["duration_ms"] == 123.45

    @pytest.mark.asyncio
    async def test_search_in_context(
        self, dev_client: AsyncClient, tmp_path: Path, logs_dir: Path
    ):
        """Search also looks in context."""
        log_file = logs_dir / "search_context.jsonl"
        entry = {
            "timestamp": "2024-01-01T10:00:00Z",
            "level": "INFO",
            "category": "test",
            "message": "Basic message",
            "context": {"special_key": "findme_value"},
        }
        log_file.write_text(json.dumps(entry) + "\n")

        response = await dev_client.get(
            "/api/debug/logs/entries",
            params={
                "project_path": str(tmp_path),
                "file_name": "search_context.jsonl",
                "search": "findme",
            },
        )
        assert response.status_code == 200

        data = response.json()
        assert data["total_count"] == 1

    @pytest.mark.asyncio
    async def test_multiple_levels_filter(
        self, dev_client: AsyncClient, tmp_path: Path, sample_log_file: Path
    ):
        """Filter by multiple levels (comma-separated)."""
        response = await dev_client.get(
            "/api/debug/logs/entries",
            params={
                "project_path": str(tmp_path),
                "file_name": "adkflow.jsonl",
                "level": "INFO,ERROR",
            },
        )
        assert response.status_code == 200

        data = response.json()
        assert data["total_count"] == 3
        levels = [e["level"] for e in data["entries"]]
        assert "DEBUG" not in levels

    @pytest.mark.asyncio
    async def test_category_wildcard_filter(
        self, dev_client: AsyncClient, tmp_path: Path, sample_log_file: Path
    ):
        """Category filter supports wildcards."""
        response = await dev_client.get(
            "/api/debug/logs/entries",
            params={
                "project_path": str(tmp_path),
                "file_name": "adkflow.jsonl",
                "category": "runner.*",
            },
        )
        assert response.status_code == 200

        data = response.json()
        assert data["total_count"] == 4  # All entries match runner.*
