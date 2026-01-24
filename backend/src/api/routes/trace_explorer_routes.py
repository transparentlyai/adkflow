"""Trace Explorer API routes for development mode only.

These routes are only registered when ADKFLOW_DEV_MODE=1.
They provide read access to OpenTelemetry trace JSONL files from the project's logs/ directory.
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/debug/traces", tags=["trace-explorer"])


class TraceSpan(BaseModel):
    """A single span from a trace."""

    trace_id: str = Field(..., description="Trace identifier (32 hex chars)")
    span_id: str = Field(..., description="Span identifier (16 hex chars)")
    parent_span_id: str | None = Field(None, description="Parent span ID")
    name: str = Field(..., description="Span name (e.g., 'call_llm', 'execute_tool')")
    start_time: str = Field(..., description="Start timestamp (ISO format)")
    end_time: str | None = Field(None, description="End timestamp (ISO format)")
    duration_ms: float | None = Field(None, description="Duration in milliseconds")
    status: str = Field("UNSET", description="Status: OK, ERROR, or UNSET")
    attributes: dict[str, Any] = Field(
        default_factory=dict, description="Span attributes"
    )
    children: list["TraceSpan"] = Field(default_factory=list, description="Child spans")


class TraceInfo(BaseModel):
    """Summary information about a trace."""

    trace_id: str = Field(..., description="Trace identifier")
    span_count: int = Field(..., description="Number of spans in trace")
    root_span_name: str = Field(..., description="Name of the root span")
    start_time: str = Field(..., description="Trace start time")
    end_time: str | None = Field(None, description="Trace end time")
    duration_ms: float | None = Field(None, description="Total trace duration")
    status: str = Field("OK", description="Overall trace status")
    has_errors: bool = Field(False, description="Whether any span has error status")


class TraceListResponse(BaseModel):
    """Response for listing traces."""

    traces: list[TraceInfo] = Field(default_factory=list)
    total_count: int = Field(..., description="Total number of traces")
    has_more: bool = Field(False, description="Whether more traces exist")
    file_name: str = Field(..., description="Name of the trace file")


class TraceDetailResponse(BaseModel):
    """Response for getting a single trace with full span tree."""

    trace_id: str = Field(..., description="Trace identifier")
    spans: list[TraceSpan] = Field(
        default_factory=list, description="Root-level spans with children"
    )
    flat_spans: list[TraceSpan] = Field(
        default_factory=list, description="All spans flattened"
    )
    span_count: int = Field(..., description="Total span count")
    duration_ms: float | None = Field(None, description="Total trace duration")
    start_time: str | None = Field(None, description="Trace start time")
    end_time: str | None = Field(None, description="Trace end time")


class TraceStats(BaseModel):
    """Statistics about trace data."""

    total_traces: int = Field(..., description="Total number of traces")
    total_spans: int = Field(..., description="Total number of spans")
    span_name_counts: dict[str, int] = Field(
        default_factory=dict, description="Count per span name"
    )
    status_counts: dict[str, int] = Field(
        default_factory=dict, description="Count per status"
    )
    time_range: dict[str, str | None] = Field(
        default_factory=dict, description="Time range"
    )
    file_size_bytes: int = Field(..., description="File size in bytes")


def _get_trace_file(project_path: str, file_name: str = "traces.jsonl") -> Path:
    """Get the trace file path for a project."""
    return Path(project_path) / "logs" / file_name


def _parse_span(line: str) -> dict[str, Any] | None:
    """Parse a JSON span line."""
    try:
        return json.loads(line)
    except json.JSONDecodeError:
        return None


def _build_span_tree(spans: list[dict[str, Any]]) -> list[TraceSpan]:
    """Build a hierarchical tree from flat spans.

    Args:
        spans: List of span dictionaries with parent_span_id references.

    Returns:
        List of root spans with children populated.
    """
    # Create span objects and index by span_id
    span_map: dict[str, TraceSpan] = {}
    for span_data in spans:
        span = TraceSpan(
            trace_id=span_data.get("trace_id", ""),
            span_id=span_data.get("span_id", ""),
            parent_span_id=span_data.get("parent_span_id"),
            name=span_data.get("name", "unknown"),
            start_time=span_data.get("start_time", ""),
            end_time=span_data.get("end_time"),
            duration_ms=span_data.get("duration_ms"),
            status=span_data.get("status", "UNSET"),
            attributes=span_data.get("attributes", {}),
            children=[],
        )
        span_map[span.span_id] = span

    # Build the tree
    roots: list[TraceSpan] = []
    for span in span_map.values():
        if span.parent_span_id and span.parent_span_id in span_map:
            parent = span_map[span.parent_span_id]
            parent.children.append(span)
        else:
            roots.append(span)

    # Sort children by start_time
    def sort_children(span: TraceSpan) -> None:
        span.children.sort(key=lambda s: s.start_time)
        for child in span.children:
            sort_children(child)

    for root in roots:
        sort_children(root)

    # Sort roots by start_time
    roots.sort(key=lambda s: s.start_time)
    return roots


def _read_all_spans(file_path: Path) -> list[dict[str, Any]]:
    """Read all spans from a trace file."""
    spans: list[dict[str, Any]] = []
    if not file_path.exists():
        return spans

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                span = _parse_span(line)
                if span:
                    spans.append(span)
    except Exception:
        pass

    return spans


def _group_spans_by_trace(
    spans: list[dict[str, Any]],
) -> dict[str, list[dict[str, Any]]]:
    """Group spans by trace_id."""
    traces: dict[str, list[dict[str, Any]]] = {}
    for span in spans:
        trace_id = span.get("trace_id", "unknown")
        if trace_id not in traces:
            traces[trace_id] = []
        traces[trace_id].append(span)
    return traces


@router.get("", response_model=TraceListResponse)
async def list_traces(
    project_path: str = Query(..., description="Path to the project directory"),
    file_name: str = Query("traces.jsonl", description="Trace file name"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    limit: int = Query(50, ge=1, le=200, description="Maximum traces to return"),
    start_time: datetime | None = Query(
        None, description="Filter: traces after this time"
    ),
    end_time: datetime | None = Query(
        None, description="Filter: traces before this time"
    ),
) -> TraceListResponse:
    """List traces from the trace file.

    Returns summary information about each trace, sorted by start time (newest first).
    """
    file_path = _get_trace_file(project_path, file_name)

    if not file_path.exists():
        return TraceListResponse(
            traces=[],
            total_count=0,
            has_more=False,
            file_name=file_name,
        )

    # Read all spans and group by trace
    all_spans = _read_all_spans(file_path)
    traces_map = _group_spans_by_trace(all_spans)

    # Build trace summaries
    trace_infos: list[TraceInfo] = []
    for trace_id, spans in traces_map.items():
        if not spans:
            continue

        # Find time range
        start_times = [s.get("start_time", "") for s in spans if s.get("start_time")]
        end_times = [s.get("end_time", "") for s in spans if s.get("end_time")]

        trace_start = min(start_times) if start_times else ""
        trace_end = max(end_times) if end_times else None

        # Apply time filters
        if start_time and trace_start:
            try:
                span_dt = datetime.fromisoformat(trace_start.replace("Z", "+00:00"))
                if span_dt < start_time:
                    continue
            except ValueError:
                pass

        if end_time and trace_start:
            try:
                span_dt = datetime.fromisoformat(trace_start.replace("Z", "+00:00"))
                if span_dt > end_time:
                    continue
            except ValueError:
                pass

        # Calculate duration
        duration_ms = None
        if trace_start and trace_end:
            try:
                start_dt = datetime.fromisoformat(trace_start.replace("Z", "+00:00"))
                end_dt = datetime.fromisoformat(trace_end.replace("Z", "+00:00"))
                duration_ms = (end_dt - start_dt).total_seconds() * 1000
            except ValueError:
                pass

        # Find root span name
        root_spans = [s for s in spans if not s.get("parent_span_id")]
        root_span_name = (
            root_spans[0].get("name", "unknown") if root_spans else "unknown"
        )

        # Check for errors
        has_errors = any(s.get("status") == "ERROR" for s in spans)
        status = "ERROR" if has_errors else "OK"

        trace_infos.append(
            TraceInfo(
                trace_id=trace_id,
                span_count=len(spans),
                root_span_name=root_span_name,
                start_time=trace_start,
                end_time=trace_end,
                duration_ms=duration_ms,
                status=status,
                has_errors=has_errors,
            )
        )

    # Sort by start_time descending (newest first)
    trace_infos.sort(key=lambda t: t.start_time, reverse=True)

    # Apply pagination
    total_count = len(trace_infos)
    trace_infos = trace_infos[offset : offset + limit]
    has_more = offset + len(trace_infos) < total_count

    return TraceListResponse(
        traces=trace_infos,
        total_count=total_count,
        has_more=has_more,
        file_name=file_name,
    )


@router.get("/stats", response_model=TraceStats)
async def get_trace_stats(
    project_path: str = Query(..., description="Path to the project directory"),
    file_name: str = Query("traces.jsonl", description="Trace file name"),
) -> TraceStats:
    """Get statistics about the trace file.

    Returns counts by span name, status, and overall metrics.
    """
    file_path = _get_trace_file(project_path, file_name)

    if not file_path.exists():
        return TraceStats(
            total_traces=0,
            total_spans=0,
            span_name_counts={},
            status_counts={},
            time_range={"start": None, "end": None},
            file_size_bytes=0,
        )

    # Read all spans
    all_spans = _read_all_spans(file_path)
    traces_map = _group_spans_by_trace(all_spans)

    # Count by span name
    span_name_counts: dict[str, int] = {}
    status_counts: dict[str, int] = {}
    all_times: list[str] = []

    for span in all_spans:
        name = span.get("name", "unknown")
        span_name_counts[name] = span_name_counts.get(name, 0) + 1

        status = span.get("status", "UNSET")
        status_counts[status] = status_counts.get(status, 0) + 1

        if span.get("start_time"):
            all_times.append(span["start_time"])

    # Get time range
    time_range = {
        "start": min(all_times) if all_times else None,
        "end": max(all_times) if all_times else None,
    }

    # Get file size
    file_size = file_path.stat().st_size if file_path.exists() else 0

    return TraceStats(
        total_traces=len(traces_map),
        total_spans=len(all_spans),
        span_name_counts=span_name_counts,
        status_counts=status_counts,
        time_range=time_range,
        file_size_bytes=file_size,
    )


@router.get("/{trace_id}", response_model=TraceDetailResponse)
async def get_trace(
    trace_id: str,
    project_path: str = Query(..., description="Path to the project directory"),
    file_name: str = Query("traces.jsonl", description="Trace file name"),
) -> TraceDetailResponse:
    """Get a single trace with full span hierarchy.

    Returns the complete span tree for a trace, with children nested under parents.
    """
    file_path = _get_trace_file(project_path, file_name)

    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trace file not found: {file_name}",
        )

    # Read all spans and find those matching trace_id
    all_spans = _read_all_spans(file_path)
    trace_spans = [s for s in all_spans if s.get("trace_id") == trace_id]

    if not trace_spans:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trace not found: {trace_id}",
        )

    # Build span tree
    root_spans = _build_span_tree(trace_spans)

    # Create flat span list for convenience
    flat_spans = [
        TraceSpan(
            trace_id=s.get("trace_id", ""),
            span_id=s.get("span_id", ""),
            parent_span_id=s.get("parent_span_id"),
            name=s.get("name", "unknown"),
            start_time=s.get("start_time", ""),
            end_time=s.get("end_time"),
            duration_ms=s.get("duration_ms"),
            status=s.get("status", "UNSET"),
            attributes=s.get("attributes", {}),
            children=[],
        )
        for s in trace_spans
    ]

    # Calculate overall trace timing
    start_times = [s.get("start_time", "") for s in trace_spans if s.get("start_time")]
    end_times = [s.get("end_time", "") for s in trace_spans if s.get("end_time")]

    trace_start = min(start_times) if start_times else None
    trace_end = max(end_times) if end_times else None

    duration_ms = None
    if trace_start and trace_end:
        try:
            start_dt = datetime.fromisoformat(trace_start.replace("Z", "+00:00"))
            end_dt = datetime.fromisoformat(trace_end.replace("Z", "+00:00"))
            duration_ms = (end_dt - start_dt).total_seconds() * 1000
        except ValueError:
            pass

    return TraceDetailResponse(
        trace_id=trace_id,
        spans=root_spans,
        flat_spans=flat_spans,
        span_count=len(trace_spans),
        duration_ms=duration_ms,
        start_time=trace_start,
        end_time=trace_end,
    )
