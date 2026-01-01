"""Log Explorer API routes for development mode only.

These routes are only registered when ADKFLOW_DEV_MODE=1.
They provide read access to log files (both JSONL and readable format)
from the project's logs/ directory.
"""

from __future__ import annotations

import json
import re
from datetime import datetime, date
from fnmatch import fnmatch
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/debug/logs", tags=["log-explorer"])


class LogFileInfo(BaseModel):
    """Information about a log file."""

    name: str = Field(..., description="File name (e.g., 'adkflow.jsonl')")
    path: str = Field(..., description="Relative path from project")
    size_bytes: int = Field(..., description="File size in bytes")
    modified_at: str = Field(..., description="Last modified time (ISO format)")
    line_count: int | None = Field(
        None, description="Approximate line count (None for large files)"
    )
    format: str = Field("unknown", description="Log format: jsonl or readable")


class LogFilesResponse(BaseModel):
    """Response for listing log files."""

    files: list[LogFileInfo] = Field(default_factory=list)
    log_dir: str = Field(..., description="Path to logs directory")


class LogEntryException(BaseModel):
    """Exception info from a log entry."""

    type: str
    message: str
    traceback: list[str]


class LogEntry(BaseModel):
    """A single log entry from a log file."""

    line_number: int = Field(..., description="1-based line number in file")
    timestamp: str = Field(..., description="Timestamp string")
    level: str = Field(..., description="Log level (DEBUG/INFO/WARNING/ERROR/CRITICAL)")
    category: str = Field(..., description="Log category (e.g., 'runner.workflow')")
    message: str = Field(..., description="Log message")
    context: dict[str, Any] | None = Field(None, description="Additional context")
    duration_ms: float | None = Field(None, description="Operation duration in ms")
    exception: LogEntryException | None = Field(None, description="Exception info")


class LogEntriesResponse(BaseModel):
    """Response for reading log entries."""

    entries: list[LogEntry] = Field(default_factory=list)
    total_count: int = Field(..., description="Total matching entries")
    has_more: bool = Field(..., description="Whether more entries exist")
    file_name: str = Field(..., description="Name of the log file")
    applied_filters: dict[str, Any] = Field(
        default_factory=dict, description="Filters that were applied"
    )


class LogStats(BaseModel):
    """Statistics about a log file."""

    total_lines: int = Field(..., description="Total number of log lines")
    level_counts: dict[str, int] = Field(
        default_factory=dict, description="Count per log level"
    )
    category_counts: dict[str, int] = Field(
        default_factory=dict, description="Count per category"
    )
    time_range: dict[str, str | None] = Field(
        default_factory=dict, description="Earliest and latest timestamps"
    )
    file_size_bytes: int = Field(..., description="File size in bytes")


# Regex for parsing readable log format:
# HH:MM:SS.mmm LEVEL    category message key=value key='value'
READABLE_LOG_PATTERN = re.compile(
    r"^(\d{2}:\d{2}:\d{2}\.\d{3})\s+"  # Timestamp
    r"(DEBUG|INFO|WARNING|ERROR|CRITICAL)\s+"  # Level
    r"(\S+)\s+"  # Category
    r"(.*)$"  # Message (rest of line)
)

# Pattern to extract key=value or key='value' pairs from message
CONTEXT_PATTERN = re.compile(r"(\w+)=(?:'([^']*)'|\"([^\"]*)\"|(\S+))")


def _get_logs_dir(project_path: str) -> Path:
    """Get the logs directory for a project."""
    return Path(project_path) / "logs"


def _count_lines_fast(file_path: Path, max_lines: int = 100000) -> int | None:
    """Count lines in a file, returning None if over max_lines."""
    count = 0
    try:
        with open(file_path, "rb") as f:
            for _ in f:
                count += 1
                if count > max_lines:
                    return None
    except Exception:
        return None
    return count


def _detect_log_format(file_path: Path) -> str:
    """Detect whether a log file is JSONL or readable format."""
    try:
        with open(file_path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                # Try to parse as JSON
                try:
                    json.loads(line)
                    return "jsonl"
                except json.JSONDecodeError:
                    # Check if it matches readable format
                    if READABLE_LOG_PATTERN.match(line):
                        return "readable"
                    return "unknown"
    except Exception:
        return "unknown"
    return "unknown"


def _parse_readable_log_line(line: str, line_number: int) -> dict[str, Any] | None:
    """Parse a readable log line into a record dict."""
    match = READABLE_LOG_PATTERN.match(line)
    if not match:
        return None

    timestamp_str, level, category, message = match.groups()

    # Extract context from message (key=value pairs)
    context: dict[str, Any] = {}
    duration_ms: float | None = None

    for ctx_match in CONTEXT_PATTERN.finditer(message):
        key = ctx_match.group(1)
        # Value is in one of the capture groups (quoted or unquoted)
        value = ctx_match.group(2) or ctx_match.group(3) or ctx_match.group(4)

        # Try to parse as number
        if value:
            try:
                if "." in value:
                    value = float(value)
                else:
                    value = int(value)
            except ValueError:
                pass  # Keep as string

        context[key] = value

    # Extract duration if present (look for patterns like "(123ms)" or duration_ms=123)
    duration_match = re.search(r"\((\d+(?:\.\d+)?)\s*ms\)", message)
    if duration_match:
        duration_ms = float(duration_match.group(1))
    elif "duration_ms" in context:
        try:
            duration_ms = float(context.pop("duration_ms"))
        except (ValueError, TypeError):
            pass

    # Clean up message by removing trailing context
    # Find where the main message ends and context begins
    clean_message = message
    first_ctx = CONTEXT_PATTERN.search(message)
    if first_ctx:
        clean_message = message[: first_ctx.start()].strip()

    # Build timestamp - add today's date if only time
    today = date.today().isoformat()
    full_timestamp = f"{today}T{timestamp_str}"

    return {
        "timestamp": full_timestamp,
        "level": level,
        "category": category,
        "message": clean_message or message,
        "context": context if context else None,
        "duration_ms": duration_ms,
        "exception": None,
    }


def _parse_record(
    line: str, line_number: int, file_format: str
) -> dict[str, Any] | None:
    """Parse a log line based on detected format."""
    if file_format == "jsonl":
        try:
            return json.loads(line)
        except json.JSONDecodeError:
            return None
    elif file_format == "readable":
        return _parse_readable_log_line(line, line_number)
    else:
        # Try JSON first, then readable
        try:
            return json.loads(line)
        except json.JSONDecodeError:
            return _parse_readable_log_line(line, line_number)


def _matches_filters(
    record: dict[str, Any],
    level: str | None,
    category: str | None,
    search: str | None,
    start_time: datetime | None,
    end_time: datetime | None,
) -> bool:
    """Check if a log record matches the given filters."""
    # Level filter
    if level:
        levels = [lv.strip().upper() for lv in level.split(",")]
        if record.get("level", "").upper() not in levels:
            return False

    # Category filter (supports wildcards)
    if category:
        record_category = record.get("category", "")
        if not fnmatch(record_category, category):
            return False

    # Text search
    if search:
        search_lower = search.lower()
        message = record.get("message", "").lower()
        if search_lower not in message:
            # Also search in context
            context = record.get("context") or {}
            context_str = json.dumps(context, default=str).lower()
            if search_lower not in context_str:
                return False

    # Time range filter
    if start_time or end_time:
        timestamp_str = record.get("timestamp", "")
        try:
            # Parse timestamp
            timestamp_str = timestamp_str.replace("Z", "+00:00")
            # Handle timestamps without timezone
            if "+" not in timestamp_str and "-" not in timestamp_str[10:]:
                record_time = datetime.fromisoformat(timestamp_str)
            else:
                record_time = datetime.fromisoformat(timestamp_str)

            if start_time and record_time < start_time:
                return False
            if end_time and record_time > end_time:
                return False
        except (ValueError, TypeError):
            # If we can't parse the timestamp, skip time filtering
            pass

    return True


def _parse_log_entry(record: dict[str, Any], line_number: int) -> LogEntry:
    """Parse a record dict into a LogEntry."""
    exception = None
    if "exception" in record and record["exception"]:
        exc = record["exception"]
        exception = LogEntryException(
            type=exc.get("type", "Unknown"),
            message=exc.get("message", ""),
            traceback=exc.get("traceback", []),
        )

    return LogEntry(
        line_number=line_number,
        timestamp=record.get("timestamp", ""),
        level=record.get("level", "INFO"),
        category=record.get("category", ""),
        message=record.get("message", ""),
        context=record.get("context"),
        duration_ms=record.get("duration_ms"),
        exception=exception,
    )


@router.get("", response_model=LogFilesResponse)
async def list_log_files(
    project_path: str = Query(..., description="Project directory path"),
) -> LogFilesResponse:
    """
    List all log files in the project's logs/ directory.

    Returns JSONL and .log files sorted by modification time (newest first).
    """
    logs_dir = _get_logs_dir(project_path)

    if not logs_dir.exists():
        return LogFilesResponse(files=[], log_dir=str(logs_dir))

    files: list[LogFileInfo] = []
    for file_path in logs_dir.iterdir():
        if file_path.is_file() and file_path.suffix in (".jsonl", ".log"):
            stat = file_path.stat()

            # Only count lines for small files (< 5MB)
            line_count = None
            if stat.st_size < 5 * 1024 * 1024:
                line_count = _count_lines_fast(file_path)

            # Detect format
            log_format = _detect_log_format(file_path)

            files.append(
                LogFileInfo(
                    name=file_path.name,
                    path=str(file_path.relative_to(project_path)),
                    size_bytes=stat.st_size,
                    modified_at=datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    line_count=line_count,
                    format=log_format,
                )
            )

    # Sort by modification time, newest first
    files.sort(key=lambda f: f.modified_at, reverse=True)

    return LogFilesResponse(files=files, log_dir=str(logs_dir))


@router.get("/entries", response_model=LogEntriesResponse)
async def read_log_entries(
    project_path: str = Query(..., description="Project directory path"),
    file_name: str = Query("adkflow.log", description="Log file name"),
    offset: int = Query(0, ge=0, description="Number of matching entries to skip"),
    limit: int = Query(500, ge=1, le=2000, description="Max entries to return"),
    level: str | None = Query(
        None, description="Filter by levels (comma-separated: DEBUG,INFO,ERROR)"
    ),
    category: str | None = Query(
        None, description="Filter by category (supports wildcards: runner.*)"
    ),
    search: str | None = Query(None, description="Full-text search in message/context"),
    start_time: str | None = Query(
        None, description="Filter entries after this time (ISO format)"
    ),
    end_time: str | None = Query(
        None, description="Filter entries before this time (ISO format)"
    ),
) -> LogEntriesResponse:
    """
    Read log entries from a log file with filtering and pagination.

    Supports both JSONL and readable log formats.
    Entries are returned in file order (oldest first by default).
    Use offset and limit for pagination.
    """
    logs_dir = _get_logs_dir(project_path)
    log_file = logs_dir / file_name

    if not log_file.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Log file not found: {file_name}",
        )

    # Detect file format
    file_format = _detect_log_format(log_file)

    # Parse time filters
    parsed_start_time = None
    parsed_end_time = None
    if start_time:
        try:
            parsed_start_time = datetime.fromisoformat(
                start_time.replace("Z", "+00:00")
            )
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid start_time format: {start_time}",
            )
    if end_time:
        try:
            parsed_end_time = datetime.fromisoformat(end_time.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid end_time format: {end_time}",
            )

    entries: list[LogEntry] = []
    matched_count = 0
    line_number = 0

    try:
        with open(log_file, encoding="utf-8") as f:
            for line in f:
                line_number += 1
                line = line.strip()
                if not line:
                    continue

                record = _parse_record(line, line_number, file_format)
                if record is None:
                    continue

                if _matches_filters(
                    record, level, category, search, parsed_start_time, parsed_end_time
                ):
                    matched_count += 1
                    if matched_count > offset and len(entries) < limit:
                        entries.append(_parse_log_entry(record, line_number))

    except PermissionError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied reading: {file_name}",
        )

    applied_filters = {}
    if level:
        applied_filters["level"] = level
    if category:
        applied_filters["category"] = category
    if search:
        applied_filters["search"] = search
    if start_time:
        applied_filters["start_time"] = start_time
    if end_time:
        applied_filters["end_time"] = end_time

    return LogEntriesResponse(
        entries=entries,
        total_count=matched_count,
        has_more=matched_count > offset + len(entries),
        file_name=file_name,
        applied_filters=applied_filters,
    )


@router.get("/stats", response_model=LogStats)
async def get_log_stats(
    project_path: str = Query(..., description="Project directory path"),
    file_name: str = Query("adkflow.log", description="Log file name"),
) -> LogStats:
    """
    Get statistics about a log file.

    Supports both JSONL and readable log formats.
    Scans the entire file to compute level counts, category counts,
    and time range. May be slow for very large files.
    """
    logs_dir = _get_logs_dir(project_path)
    log_file = logs_dir / file_name

    if not log_file.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Log file not found: {file_name}",
        )

    # Detect file format
    file_format = _detect_log_format(log_file)

    total_lines = 0
    level_counts: dict[str, int] = {}
    category_counts: dict[str, int] = {}
    earliest_time: str | None = None
    latest_time: str | None = None

    try:
        with open(log_file, encoding="utf-8") as f:
            line_number = 0
            for line in f:
                line_number += 1
                line = line.strip()
                if not line:
                    continue

                record = _parse_record(line, line_number, file_format)
                if record is None:
                    continue

                total_lines += 1

                # Count levels
                level = record.get("level", "INFO")
                level_counts[level] = level_counts.get(level, 0) + 1

                # Count categories
                cat = record.get("category", "")
                if cat:
                    category_counts[cat] = category_counts.get(cat, 0) + 1

                # Track time range
                timestamp = record.get("timestamp", "")
                if timestamp:
                    if earliest_time is None or timestamp < earliest_time:
                        earliest_time = timestamp
                    if latest_time is None or timestamp > latest_time:
                        latest_time = timestamp

    except PermissionError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied reading: {file_name}",
        )

    return LogStats(
        total_lines=total_lines,
        level_counts=level_counts,
        category_counts=category_counts,
        time_range={"start": earliest_time, "end": latest_time},
        file_size_bytes=log_file.stat().st_size,
    )
