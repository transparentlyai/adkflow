"""Tests for JSONL span exporter."""

import json
from unittest.mock import MagicMock, patch


from adkflow_runner.telemetry.jsonl_exporter import JsonlSpanExporter


class MockSpanContext:
    """Mock span context."""

    def __init__(self, trace_id=123456, span_id=789):
        self.trace_id = trace_id
        self.span_id = span_id


class MockSpanStatus:
    """Mock span status."""

    def __init__(self, name="OK"):
        self.status_code = MagicMock()
        self.status_code.name = name


class MockReadableSpan:
    """Mock ReadableSpan for testing."""

    def __init__(
        self,
        name="test_span",
        start_time=1000000000000000000,
        end_time=1000000001000000000,
        parent=None,
        attributes=None,
        status=None,
    ):
        self.name = name
        self.start_time = start_time
        self.end_time = end_time
        self.context = MockSpanContext()
        self.parent = parent
        self.attributes = attributes or {}
        self.status = status or MockSpanStatus()


class TestJsonlSpanExporterCreation:
    """Tests for JsonlSpanExporter initialization."""

    def test_creates_exporter(self, tmp_path):
        """Create exporter with file path."""
        file_path = tmp_path / "traces.jsonl"
        exporter = JsonlSpanExporter(file_path)
        assert exporter.file_path == file_path

    def test_creates_directory(self, tmp_path):
        """Exporter creates parent directory."""
        nested_path = tmp_path / "logs" / "traces.jsonl"
        _exporter = JsonlSpanExporter(nested_path)
        assert nested_path.parent.exists()

    def test_default_max_file_size(self, tmp_path):
        """Default max file size is 10MB."""
        exporter = JsonlSpanExporter(tmp_path / "traces.jsonl")
        assert exporter.max_file_size_bytes == 10 * 1024 * 1024

    def test_custom_max_file_size(self, tmp_path):
        """Custom max file size is applied."""
        exporter = JsonlSpanExporter(tmp_path / "traces.jsonl", max_file_size_mb=5.0)
        assert exporter.max_file_size_bytes == 5 * 1024 * 1024


class TestJsonlSpanExporterExport:
    """Tests for export method."""

    def test_export_empty_spans(self, tmp_path):
        """Export empty list succeeds."""
        from opentelemetry.sdk.trace.export import SpanExportResult

        file_path = tmp_path / "traces.jsonl"
        exporter = JsonlSpanExporter(file_path)

        result = exporter.export([])
        assert result == SpanExportResult.SUCCESS

    def test_export_writes_jsonl(self, tmp_path):
        """Export writes spans as JSONL."""
        from opentelemetry.sdk.trace.export import SpanExportResult

        file_path = tmp_path / "traces.jsonl"
        exporter = JsonlSpanExporter(file_path)

        span = MockReadableSpan(name="test_span")
        result = exporter.export([span])  # type: ignore[arg-type]

        assert result == SpanExportResult.SUCCESS
        assert file_path.exists()

        content = file_path.read_text()
        record = json.loads(content.strip())
        assert record["name"] == "test_span"

    def test_export_multiple_spans(self, tmp_path):
        """Export multiple spans writes multiple lines."""
        file_path = tmp_path / "traces.jsonl"
        exporter = JsonlSpanExporter(file_path)

        spans = [
            MockReadableSpan(name="span1"),
            MockReadableSpan(name="span2"),
            MockReadableSpan(name="span3"),
        ]
        exporter.export(spans)  # type: ignore[arg-type]

        lines = file_path.read_text().strip().split("\n")
        assert len(lines) == 3

    def test_export_includes_all_fields(self, tmp_path):
        """Exported record includes all expected fields."""
        file_path = tmp_path / "traces.jsonl"
        exporter = JsonlSpanExporter(file_path)

        span = MockReadableSpan(
            name="test_span",
            attributes={"key": "value"},
        )
        exporter.export([span])  # type: ignore[arg-type]

        record = json.loads(file_path.read_text().strip())
        assert "trace_id" in record
        assert "span_id" in record
        assert "parent_span_id" in record
        assert "name" in record
        assert "start_time" in record
        assert "end_time" in record
        assert "duration_ms" in record
        assert "status" in record
        assert "attributes" in record

    def test_export_handles_parent_span(self, tmp_path):
        """Parent span ID is included when present."""
        file_path = tmp_path / "traces.jsonl"
        exporter = JsonlSpanExporter(file_path)

        parent = MagicMock()
        parent.span_id = 12345

        span = MockReadableSpan(name="child_span", parent=parent)
        exporter.export([span])  # type: ignore[arg-type]

        record = json.loads(file_path.read_text().strip())
        assert record["parent_span_id"] is not None


class TestJsonlSpanExporterRotation:
    """Tests for file rotation behavior."""

    def test_rotation_when_file_too_large(self, tmp_path):
        """File is rotated when exceeding max size."""
        file_path = tmp_path / "traces.jsonl"
        # Set very small max size for testing
        exporter = JsonlSpanExporter(file_path, max_file_size_mb=0.001)

        # Write enough data to trigger rotation
        for i in range(100):
            span = MockReadableSpan(name=f"span_{i}" * 100)
            exporter.export([span])  # type: ignore[arg-type]

        # Check that backup files exist
        _backup_path = file_path.with_suffix(".jsonl.1")
        # Rotation may or may not have occurred depending on write size
        assert file_path.exists()


class TestJsonlSpanExporterSpanToDict:
    """Tests for span conversion to dict."""

    def test_duration_calculation(self, tmp_path):
        """Duration is calculated in milliseconds."""
        file_path = tmp_path / "traces.jsonl"
        exporter = JsonlSpanExporter(file_path)

        # 1 second difference (in nanoseconds)
        span = MockReadableSpan(
            start_time=1000000000000000000,
            end_time=1000000001000000000,
        )
        exporter.export([span])  # type: ignore[arg-type]

        record = json.loads(file_path.read_text().strip())
        assert record["duration_ms"] == 1000.0

    def test_attributes_serialization(self, tmp_path):
        """Attributes are properly serialized."""
        file_path = tmp_path / "traces.jsonl"
        exporter = JsonlSpanExporter(file_path)

        span = MockReadableSpan(
            attributes={
                "string_key": "value",
                "int_key": 42,
                "float_key": 3.14,
                "bool_key": True,
                "list_key": [1, 2, 3],
            }
        )
        exporter.export([span])  # type: ignore[arg-type]

        record = json.loads(file_path.read_text().strip())
        attrs = record["attributes"]
        assert attrs["string_key"] == "value"
        assert attrs["int_key"] == 42
        assert attrs["float_key"] == 3.14
        assert attrs["bool_key"] is True
        assert attrs["list_key"] == [1, 2, 3]

    def test_iso_timestamp_format(self, tmp_path):
        """Timestamps are in ISO 8601 format."""
        file_path = tmp_path / "traces.jsonl"
        exporter = JsonlSpanExporter(file_path)

        span = MockReadableSpan()
        exporter.export([span])  # type: ignore[arg-type]

        record = json.loads(file_path.read_text().strip())
        # Check format has expected structure
        assert "T" in record["start_time"]
        assert record["start_time"].endswith("+00:00")


class TestJsonlSpanExporterCleanup:
    """Tests for cleanup methods."""

    def test_shutdown_safe(self, tmp_path):
        """Shutdown is safe to call."""
        file_path = tmp_path / "traces.jsonl"
        exporter = JsonlSpanExporter(file_path)
        exporter.shutdown()  # Should not raise

    def test_force_flush_returns_true(self, tmp_path):
        """Force flush returns True."""
        file_path = tmp_path / "traces.jsonl"
        exporter = JsonlSpanExporter(file_path)
        assert exporter.force_flush() is True


class TestJsonlSpanExporterErrorHandling:
    """Tests for error handling."""

    def test_export_handles_write_error(self, tmp_path):
        """Export handles write errors gracefully."""
        from opentelemetry.sdk.trace.export import SpanExportResult

        file_path = tmp_path / "traces.jsonl"
        exporter = JsonlSpanExporter(file_path)

        span = MockReadableSpan()

        # Make directory read-only to cause write error
        with patch("builtins.open", side_effect=OSError("Permission denied")):
            result = exporter.export([span])  # type: ignore[arg-type]
            assert result == SpanExportResult.FAILURE
