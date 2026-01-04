"""Tests for trace explorer API routes.

Tests OpenTelemetry trace file reading endpoints (development mode only).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest
from httpx import AsyncClient

from backend.src.api.routes.trace_explorer_routes import (
    _get_trace_file,
    _parse_span,
    _build_span_tree,
    _read_all_spans,
    _group_spans_by_trace,
    TraceSpan,
    TraceInfo,
    TraceListResponse,
    TraceDetailResponse,
    TraceStats,
)


def create_trace_file(
    tmp_path: Path, spans: list[dict], file_name: str = "traces.jsonl"
) -> Path:
    """Create a trace file with the given spans."""
    logs_dir = tmp_path / "logs"
    logs_dir.mkdir(exist_ok=True)
    trace_file = logs_dir / file_name

    lines = [json.dumps(span) for span in spans]
    trace_file.write_text("\n".join(lines) + "\n")
    return trace_file


def make_span(
    trace_id: str = "abc123",
    span_id: str = "span1",
    parent_span_id: str | None = None,
    name: str = "test_span",
    start_time: str = "2024-01-01T10:00:00Z",
    end_time: str | None = "2024-01-01T10:00:01Z",
    duration_ms: float | None = 1000.0,
    status: str = "OK",
    attributes: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Create a span dictionary for testing."""
    span: dict[str, Any] = {
        "trace_id": trace_id,
        "span_id": span_id,
        "name": name,
        "start_time": start_time,
        "status": status,
    }
    if parent_span_id:
        span["parent_span_id"] = parent_span_id
    if end_time:
        span["end_time"] = end_time
    if duration_ms is not None:
        span["duration_ms"] = duration_ms
    if attributes:
        span["attributes"] = attributes
    return span


class TestGetTraceFile:
    """Tests for _get_trace_file helper function."""

    def test_returns_default_trace_file_path(self, tmp_path: Path):
        """Returns path to default traces.jsonl file."""
        path = _get_trace_file(str(tmp_path))
        assert path == tmp_path / "logs" / "traces.jsonl"

    def test_returns_custom_file_name(self, tmp_path: Path):
        """Returns path with custom file name."""
        path = _get_trace_file(str(tmp_path), "custom.jsonl")
        assert path == tmp_path / "logs" / "custom.jsonl"


class TestParseSpan:
    """Tests for _parse_span helper function."""

    def test_parse_valid_json(self):
        """Parse valid JSON span."""
        line = '{"trace_id": "abc", "span_id": "123", "name": "test"}'
        result = _parse_span(line)
        assert result == {"trace_id": "abc", "span_id": "123", "name": "test"}

    def test_parse_invalid_json_returns_none(self):
        """Return None for invalid JSON."""
        result = _parse_span("not valid json")
        assert result is None

    def test_parse_empty_string_returns_none(self):
        """Return None for empty string."""
        result = _parse_span("")
        assert result is None


class TestBuildSpanTree:
    """Tests for _build_span_tree helper function."""

    def test_build_tree_single_span(self):
        """Build tree with single root span."""
        spans = [make_span()]
        tree = _build_span_tree(spans)

        assert len(tree) == 1
        assert tree[0].span_id == "span1"
        assert tree[0].children == []

    def test_build_tree_parent_child(self):
        """Build tree with parent-child relationship."""
        spans = [
            make_span(span_id="parent", name="parent_span"),
            make_span(span_id="child", parent_span_id="parent", name="child_span"),
        ]
        tree = _build_span_tree(spans)

        assert len(tree) == 1  # Only root
        assert tree[0].span_id == "parent"
        assert len(tree[0].children) == 1
        assert tree[0].children[0].span_id == "child"

    def test_build_tree_multiple_children(self):
        """Build tree with multiple children."""
        spans = [
            make_span(span_id="parent"),
            make_span(
                span_id="child1",
                parent_span_id="parent",
                start_time="2024-01-01T10:00:01Z",
            ),
            make_span(
                span_id="child2",
                parent_span_id="parent",
                start_time="2024-01-01T10:00:02Z",
            ),
        ]
        tree = _build_span_tree(spans)

        assert len(tree) == 1
        assert len(tree[0].children) == 2
        # Children should be sorted by start_time
        assert tree[0].children[0].span_id == "child1"
        assert tree[0].children[1].span_id == "child2"

    def test_build_tree_nested_hierarchy(self):
        """Build tree with nested hierarchy."""
        spans = [
            make_span(span_id="root"),
            make_span(span_id="level1", parent_span_id="root"),
            make_span(span_id="level2", parent_span_id="level1"),
        ]
        tree = _build_span_tree(spans)

        assert len(tree) == 1
        assert tree[0].span_id == "root"
        assert tree[0].children[0].span_id == "level1"
        assert tree[0].children[0].children[0].span_id == "level2"

    def test_build_tree_orphan_becomes_root(self):
        """Span with missing parent becomes root."""
        spans = [
            make_span(span_id="orphan", parent_span_id="nonexistent"),
        ]
        tree = _build_span_tree(spans)

        assert len(tree) == 1
        assert tree[0].span_id == "orphan"

    def test_build_tree_multiple_roots(self):
        """Handle multiple root spans."""
        spans = [
            make_span(span_id="root1", start_time="2024-01-01T10:00:00Z"),
            make_span(span_id="root2", start_time="2024-01-01T10:00:01Z"),
        ]
        tree = _build_span_tree(spans)

        assert len(tree) == 2
        # Roots should be sorted by start_time
        assert tree[0].span_id == "root1"
        assert tree[1].span_id == "root2"


class TestReadAllSpans:
    """Tests for _read_all_spans helper function."""

    def test_read_existing_file(self, tmp_path: Path):
        """Read spans from existing file."""
        spans = [make_span(span_id="s1"), make_span(span_id="s2")]
        create_trace_file(tmp_path, spans)

        result = _read_all_spans(tmp_path / "logs" / "traces.jsonl")

        assert len(result) == 2
        assert result[0]["span_id"] == "s1"
        assert result[1]["span_id"] == "s2"

    def test_read_nonexistent_file(self, tmp_path: Path):
        """Return empty list for nonexistent file."""
        result = _read_all_spans(tmp_path / "logs" / "missing.jsonl")
        assert result == []

    def test_read_skips_empty_lines(self, tmp_path: Path):
        """Skip empty lines in file."""
        logs_dir = tmp_path / "logs"
        logs_dir.mkdir()
        trace_file = logs_dir / "traces.jsonl"
        trace_file.write_text('{"span_id": "s1"}\n\n\n{"span_id": "s2"}\n')

        result = _read_all_spans(trace_file)
        assert len(result) == 2

    def test_read_skips_invalid_json(self, tmp_path: Path):
        """Skip invalid JSON lines."""
        logs_dir = tmp_path / "logs"
        logs_dir.mkdir()
        trace_file = logs_dir / "traces.jsonl"
        trace_file.write_text('{"span_id": "s1"}\nnot valid json\n{"span_id": "s2"}\n')

        result = _read_all_spans(trace_file)
        assert len(result) == 2


class TestGroupSpansByTrace:
    """Tests for _group_spans_by_trace helper function."""

    def test_group_single_trace(self):
        """Group spans from single trace."""
        spans = [
            make_span(trace_id="t1", span_id="s1"),
            make_span(trace_id="t1", span_id="s2"),
        ]
        result = _group_spans_by_trace(spans)

        assert len(result) == 1
        assert "t1" in result
        assert len(result["t1"]) == 2

    def test_group_multiple_traces(self):
        """Group spans from multiple traces."""
        spans = [
            make_span(trace_id="t1", span_id="s1"),
            make_span(trace_id="t2", span_id="s2"),
            make_span(trace_id="t1", span_id="s3"),
        ]
        result = _group_spans_by_trace(spans)

        assert len(result) == 2
        assert len(result["t1"]) == 2
        assert len(result["t2"]) == 1

    def test_group_empty_list(self):
        """Handle empty span list."""
        result = _group_spans_by_trace([])
        assert result == {}

    def test_group_missing_trace_id(self):
        """Handle span with missing trace_id."""
        spans = [{"span_id": "s1", "name": "test"}]
        result = _group_spans_by_trace(spans)

        assert "unknown" in result


class TestTraceSpanModel:
    """Tests for TraceSpan pydantic model."""

    def test_span_creation(self):
        """Create TraceSpan with all fields."""
        span = TraceSpan(
            trace_id="abc123",
            span_id="span1",
            parent_span_id="parent1",
            name="test_span",
            start_time="2024-01-01T10:00:00Z",
            end_time="2024-01-01T10:00:01Z",
            duration_ms=1000.0,
            status="OK",
            attributes={"key": "value"},
            children=[],
        )
        assert span.trace_id == "abc123"
        assert span.parent_span_id == "parent1"
        assert span.duration_ms == 1000.0

    def test_span_defaults(self):
        """TraceSpan has sensible defaults."""
        span = TraceSpan(  # type: ignore[call-arg]
            trace_id="abc",
            span_id="123",
            name="test",
            start_time="2024-01-01T10:00:00Z",
        )
        assert span.parent_span_id is None
        assert span.end_time is None
        assert span.duration_ms is None
        assert span.status == "UNSET"
        assert span.attributes == {}
        assert span.children == []


class TestTraceInfoModel:
    """Tests for TraceInfo pydantic model."""

    def test_info_creation(self):
        """Create TraceInfo with all fields."""
        info = TraceInfo(
            trace_id="abc123",
            span_count=5,
            root_span_name="main",
            start_time="2024-01-01T10:00:00Z",
            end_time="2024-01-01T10:00:10Z",
            duration_ms=10000.0,
            status="OK",
            has_errors=False,
        )
        assert info.trace_id == "abc123"
        assert info.span_count == 5
        assert info.has_errors is False

    def test_info_defaults(self):
        """TraceInfo has sensible defaults."""
        info = TraceInfo(  # type: ignore[call-arg]
            trace_id="abc",
            span_count=1,
            root_span_name="root",
            start_time="2024-01-01T10:00:00Z",
        )
        assert info.end_time is None
        assert info.duration_ms is None
        assert info.status == "OK"
        assert info.has_errors is False


class TestListTraces:
    """Tests for GET /api/debug/traces endpoint."""

    @pytest.mark.asyncio
    async def test_list_traces_no_file(self, dev_client: AsyncClient, tmp_path: Path):
        """Return empty list when trace file doesn't exist."""
        response = await dev_client.get(
            "/api/debug/traces",
            params={"project_path": str(tmp_path)},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["traces"] == []
        assert data["total_count"] == 0
        assert data["has_more"] is False

    @pytest.mark.asyncio
    async def test_list_traces_with_spans(
        self, dev_client: AsyncClient, tmp_path: Path
    ):
        """List traces from file."""
        spans = [
            make_span(trace_id="t1", span_id="s1"),
            make_span(trace_id="t1", span_id="s2", parent_span_id="s1"),
            make_span(trace_id="t2", span_id="s3"),
        ]
        create_trace_file(tmp_path, spans)

        response = await dev_client.get(
            "/api/debug/traces",
            params={"project_path": str(tmp_path)},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_count"] == 2
        assert len(data["traces"]) == 2

    @pytest.mark.asyncio
    async def test_list_traces_pagination(
        self, dev_client: AsyncClient, tmp_path: Path
    ):
        """Pagination works correctly."""
        # Create 5 traces
        spans = [make_span(trace_id=f"t{i}") for i in range(5)]
        create_trace_file(tmp_path, spans)

        response = await dev_client.get(
            "/api/debug/traces",
            params={"project_path": str(tmp_path), "offset": 2, "limit": 2},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["traces"]) == 2
        assert data["total_count"] == 5
        assert data["has_more"] is True

    @pytest.mark.asyncio
    async def test_list_traces_custom_file_name(
        self, dev_client: AsyncClient, tmp_path: Path
    ):
        """Use custom trace file name."""
        spans = [make_span(trace_id="t1")]
        create_trace_file(tmp_path, spans, file_name="custom.jsonl")

        response = await dev_client.get(
            "/api/debug/traces",
            params={"project_path": str(tmp_path), "file_name": "custom.jsonl"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_count"] == 1
        assert data["file_name"] == "custom.jsonl"

    @pytest.mark.asyncio
    async def test_list_traces_shows_error_status(
        self, dev_client: AsyncClient, tmp_path: Path
    ):
        """Trace with error span shows error status."""
        spans = [
            make_span(trace_id="t1", span_id="s1", status="OK"),
            make_span(trace_id="t1", span_id="s2", parent_span_id="s1", status="ERROR"),
        ]
        create_trace_file(tmp_path, spans)

        response = await dev_client.get(
            "/api/debug/traces",
            params={"project_path": str(tmp_path)},
        )

        assert response.status_code == 200
        data = response.json()
        trace = data["traces"][0]
        assert trace["has_errors"] is True
        assert trace["status"] == "ERROR"

    @pytest.mark.asyncio
    async def test_list_traces_sorted_by_time(
        self, dev_client: AsyncClient, tmp_path: Path
    ):
        """Traces sorted by start_time descending (newest first)."""
        spans = [
            make_span(trace_id="older", start_time="2024-01-01T10:00:00Z"),
            make_span(trace_id="newer", start_time="2024-01-01T11:00:00Z"),
        ]
        create_trace_file(tmp_path, spans)

        response = await dev_client.get(
            "/api/debug/traces",
            params={"project_path": str(tmp_path)},
        )

        assert response.status_code == 200
        data = response.json()
        # Newest first
        assert data["traces"][0]["trace_id"] == "newer"
        assert data["traces"][1]["trace_id"] == "older"


class TestGetTrace:
    """Tests for GET /api/debug/traces/{trace_id} endpoint."""

    @pytest.mark.asyncio
    async def test_get_trace_not_found_file(
        self, dev_client: AsyncClient, tmp_path: Path
    ):
        """Return 404 when trace file doesn't exist."""
        response = await dev_client.get(
            "/api/debug/traces/abc123",
            params={"project_path": str(tmp_path)},
        )

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_get_trace_not_found_id(
        self, dev_client: AsyncClient, tmp_path: Path
    ):
        """Return 404 when trace ID doesn't exist."""
        spans = [make_span(trace_id="other")]
        create_trace_file(tmp_path, spans)

        response = await dev_client.get(
            "/api/debug/traces/nonexistent",
            params={"project_path": str(tmp_path)},
        )

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_get_trace_success(self, dev_client: AsyncClient, tmp_path: Path):
        """Get trace with full span tree."""
        spans = [
            make_span(trace_id="t1", span_id="root", name="root_span"),
            make_span(
                trace_id="t1", span_id="child", parent_span_id="root", name="child_span"
            ),
        ]
        create_trace_file(tmp_path, spans)

        response = await dev_client.get(
            "/api/debug/traces/t1",
            params={"project_path": str(tmp_path)},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["trace_id"] == "t1"
        assert data["span_count"] == 2
        assert len(data["spans"]) == 1  # Only root
        assert data["spans"][0]["name"] == "root_span"
        assert len(data["spans"][0]["children"]) == 1
        assert len(data["flat_spans"]) == 2

    @pytest.mark.asyncio
    async def test_get_trace_calculates_duration(
        self, dev_client: AsyncClient, tmp_path: Path
    ):
        """Calculate trace duration from span times."""
        spans = [
            make_span(
                trace_id="t1",
                start_time="2024-01-01T10:00:00+00:00",
                end_time="2024-01-01T10:00:05+00:00",
            ),
        ]
        create_trace_file(tmp_path, spans)

        response = await dev_client.get(
            "/api/debug/traces/t1",
            params={"project_path": str(tmp_path)},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["duration_ms"] == 5000.0


class TestGetTraceStats:
    """Tests for GET /api/debug/traces/stats endpoint."""

    @pytest.mark.asyncio
    async def test_stats_no_file(self, dev_client: AsyncClient, tmp_path: Path):
        """Return zero stats when file doesn't exist."""
        response = await dev_client.get(
            "/api/debug/traces/stats",
            params={"project_path": str(tmp_path)},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_traces"] == 0
        assert data["total_spans"] == 0
        assert data["file_size_bytes"] == 0

    @pytest.mark.asyncio
    async def test_stats_with_spans(self, dev_client: AsyncClient, tmp_path: Path):
        """Calculate stats from spans."""
        spans = [
            make_span(trace_id="t1", span_id="s1", name="call_llm", status="OK"),
            make_span(trace_id="t1", span_id="s2", name="call_llm", status="OK"),
            make_span(trace_id="t2", span_id="s3", name="execute_tool", status="ERROR"),
        ]
        create_trace_file(tmp_path, spans)

        response = await dev_client.get(
            "/api/debug/traces/stats",
            params={"project_path": str(tmp_path)},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_traces"] == 2
        assert data["total_spans"] == 3
        assert data["span_name_counts"]["call_llm"] == 2
        assert data["span_name_counts"]["execute_tool"] == 1
        assert data["status_counts"]["OK"] == 2
        assert data["status_counts"]["ERROR"] == 1
        assert data["file_size_bytes"] > 0

    @pytest.mark.asyncio
    async def test_stats_time_range(self, dev_client: AsyncClient, tmp_path: Path):
        """Stats include time range."""
        spans = [
            make_span(trace_id="t1", start_time="2024-01-01T10:00:00Z"),
            make_span(trace_id="t2", start_time="2024-01-01T12:00:00Z"),
        ]
        create_trace_file(tmp_path, spans)

        response = await dev_client.get(
            "/api/debug/traces/stats",
            params={"project_path": str(tmp_path)},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["time_range"]["start"] == "2024-01-01T10:00:00Z"
        assert data["time_range"]["end"] == "2024-01-01T12:00:00Z"


class TestTraceListResponse:
    """Tests for TraceListResponse pydantic model."""

    def test_response_creation(self):
        """Create response with all fields."""
        response = TraceListResponse(
            traces=[],
            total_count=0,
            has_more=False,
            file_name="traces.jsonl",
        )
        assert response.total_count == 0
        assert response.file_name == "traces.jsonl"


class TestTraceDetailResponse:
    """Tests for TraceDetailResponse pydantic model."""

    def test_response_creation(self):
        """Create response with all fields."""
        response = TraceDetailResponse(
            trace_id="abc123",
            spans=[],
            flat_spans=[],
            span_count=0,
            duration_ms=1000.0,
            start_time="2024-01-01T10:00:00Z",
            end_time="2024-01-01T10:00:01Z",
        )
        assert response.trace_id == "abc123"
        assert response.duration_ms == 1000.0


class TestTraceStats:
    """Tests for TraceStats pydantic model."""

    def test_stats_creation(self):
        """Create stats with all fields."""
        stats = TraceStats(
            total_traces=10,
            total_spans=50,
            span_name_counts={"call_llm": 30, "execute_tool": 20},
            status_counts={"OK": 45, "ERROR": 5},
            time_range={"start": "2024-01-01", "end": "2024-01-02"},
            file_size_bytes=1024,
        )
        assert stats.total_traces == 10
        assert stats.total_spans == 50
        assert stats.file_size_bytes == 1024
