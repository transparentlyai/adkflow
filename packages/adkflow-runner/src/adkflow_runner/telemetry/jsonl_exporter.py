"""JSONL Span Exporter for local trace visualization.

Exports OpenTelemetry spans to a JSONL file that can be read by the
Trace Explorer in the ADKFlow UI.
"""

from __future__ import annotations

import json
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

from opentelemetry.sdk.trace import ReadableSpan
from opentelemetry.sdk.trace.export import SpanExporter, SpanExportResult


class JsonlSpanExporter(SpanExporter):
    """Exports OTel spans to a JSONL file for local visualization.

    Each span is written as a single JSON line with the following structure:
    {
        "trace_id": "...",
        "span_id": "...",
        "parent_span_id": "..." | null,
        "name": "call_llm",
        "start_time": "2025-01-03T12:34:56.789Z",
        "end_time": "2025-01-03T12:34:57.123Z",
        "duration_ms": 334.0,
        "status": "OK",
        "attributes": {...}
    }
    """

    def __init__(self, file_path: Path, max_file_size_mb: float = 10.0) -> None:
        """Initialize the exporter.

        Args:
            file_path: Path to the JSONL file to write spans to.
            max_file_size_mb: Maximum file size in MB before rotation.
        """
        self.file_path = Path(file_path)
        self.max_file_size_bytes = int(max_file_size_mb * 1024 * 1024)
        self._lock = threading.Lock()
        self._ensure_directory()

    def _ensure_directory(self) -> None:
        """Ensure the parent directory exists."""
        self.file_path.parent.mkdir(parents=True, exist_ok=True)

    def _maybe_rotate(self) -> None:
        """Rotate the file if it exceeds the max size."""
        if not self.file_path.exists():
            return

        try:
            size = self.file_path.stat().st_size
            if size >= self.max_file_size_bytes:
                # Simple rotation: rename to .1, .2, etc.
                for i in range(5, 0, -1):
                    old_path = self.file_path.with_suffix(f".jsonl.{i}")
                    new_path = self.file_path.with_suffix(f".jsonl.{i + 1}")
                    if old_path.exists():
                        if i == 5:
                            old_path.unlink()
                        else:
                            old_path.rename(new_path)

                backup_path = self.file_path.with_suffix(".jsonl.1")
                self.file_path.rename(backup_path)
        except OSError:
            pass  # Ignore rotation errors

    def export(self, spans: Sequence[ReadableSpan]) -> SpanExportResult:
        """Export spans to the JSONL file.

        Args:
            spans: Sequence of spans to export.

        Returns:
            SpanExportResult indicating success or failure.
        """
        if not spans:
            return SpanExportResult.SUCCESS

        with self._lock:
            self._maybe_rotate()

            try:
                with open(self.file_path, "a", encoding="utf-8") as f:
                    for span in spans:
                        record = self._span_to_dict(span)
                        f.write(json.dumps(record, ensure_ascii=False) + "\n")
                return SpanExportResult.SUCCESS
            except OSError as e:
                # Log error but don't crash the application
                print(f"Failed to write trace: {e}")
                return SpanExportResult.FAILURE

    def _span_to_dict(self, span: ReadableSpan) -> dict:
        """Convert a span to a dictionary for JSON serialization.

        Args:
            span: The span to convert.

        Returns:
            Dictionary representation of the span.
        """
        # Convert nanoseconds to ISO timestamp
        start_time = self._ns_to_iso(span.start_time) if span.start_time else None
        end_time = self._ns_to_iso(span.end_time) if span.end_time else None

        # Calculate duration in milliseconds
        duration_ms = None
        if span.start_time and span.end_time:
            duration_ms = (span.end_time - span.start_time) / 1_000_000

        # Format trace and span IDs as hex strings
        context = span.context
        trace_id = format(context.trace_id, "032x") if context else "0" * 32
        span_id = format(context.span_id, "016x") if context else "0" * 16
        parent_span_id = None
        if span.parent and span.parent.span_id:
            parent_span_id = format(span.parent.span_id, "016x")

        # Get status
        status = span.status.status_code.name if span.status else "UNSET"

        # Convert attributes to a serializable dict
        attributes = {}
        if span.attributes:
            for key, value in span.attributes.items():
                # Handle special types
                if isinstance(value, (list, tuple)):
                    attributes[key] = list(value)
                elif hasattr(value, "__str__"):
                    attributes[key] = (
                        str(value)
                        if not isinstance(value, (str, int, float, bool))
                        else value
                    )
                else:
                    attributes[key] = value

        return {
            "trace_id": trace_id,
            "span_id": span_id,
            "parent_span_id": parent_span_id,
            "name": span.name,
            "start_time": start_time,
            "end_time": end_time,
            "duration_ms": duration_ms,
            "status": status,
            "attributes": attributes,
        }

    def _ns_to_iso(self, ns: int) -> str:
        """Convert nanoseconds since epoch to ISO 8601 string.

        Args:
            ns: Nanoseconds since epoch.

        Returns:
            ISO 8601 formatted timestamp string.
        """
        dt = datetime.fromtimestamp(ns / 1_000_000_000, tz=timezone.utc)
        return dt.isoformat(timespec="milliseconds")

    def shutdown(self) -> None:
        """Shutdown the exporter."""
        pass  # No cleanup needed for file-based exporter

    def force_flush(self, timeout_millis: int = 30000) -> bool:
        """Force flush any buffered data.

        Args:
            timeout_millis: Timeout in milliseconds.

        Returns:
            True if flush was successful.
        """
        return True  # We write synchronously, so nothing to flush
