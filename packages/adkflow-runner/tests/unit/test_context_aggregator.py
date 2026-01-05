"""Tests for ContextAggregator FlowUnit.

Tests file reading, directory aggregation, URL fetching, and context aggregation
with various modes and metadata options.
"""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from adkflow_runner.builtin_units.context_aggregator import ContextAggregatorUnit
from adkflow_runner.extensions.flow_unit import ExecutionContext


class TestContextAggregatorSetup:
    """Tests for ContextAggregator setup and configuration."""

    def test_unit_metadata(self):
        """Unit has correct metadata."""
        assert ContextAggregatorUnit.UNIT_ID == "builtin.context_aggregator"
        assert ContextAggregatorUnit.UI_LABEL == "Context Aggregator"
        assert ContextAggregatorUnit.MENU_LOCATION == "Content/Context Aggregator"
        assert ContextAggregatorUnit.VERSION == "1.0.0"

    def test_execution_flags(self):
        """Unit has correct execution control flags."""
        assert ContextAggregatorUnit.OUTPUT_NODE is False
        assert ContextAggregatorUnit.ALWAYS_EXECUTE is True

    def test_setup_interface(self):
        """Setup interface returns valid UI schema."""
        schema = ContextAggregatorUnit.setup_interface()

        assert schema is not None
        assert len(schema.inputs) == 0  # Dynamic inputs
        assert len(schema.outputs) == 1
        assert schema.outputs[0].id == "output"
        assert schema.outputs[0].source_type == "context_aggregator"

        # Check fields
        field_ids = [f.id for f in schema.fields]
        assert "aggregationMode" in field_ids
        assert "outputVariableName" in field_ids
        assert "separator" in field_ids
        assert "includeMetadata" in field_ids


class TestReadFile:
    """Tests for _read_file method."""

    @pytest.fixture
    def unit(self):
        """Create ContextAggregatorUnit instance."""
        return ContextAggregatorUnit()

    @pytest.fixture
    def test_file(self, tmp_path: Path):
        """Create a test file with known content."""
        file = tmp_path / "test.txt"
        file.write_text("Hello, world!", encoding="utf-8")
        return file

    @pytest.mark.asyncio
    async def test_read_file_success(self, unit, tmp_path: Path, test_file: Path):
        """Read file successfully."""
        content, metadata = await unit._read_file("test.txt", tmp_path, False)

        assert content == "Hello, world!"
        assert metadata is None

    @pytest.mark.asyncio
    async def test_read_file_with_metadata(self, unit, tmp_path: Path, test_file: Path):
        """Read file with metadata collection."""
        content, metadata = await unit._read_file("test.txt", tmp_path, True)

        assert content == "Hello, world!"
        assert metadata is not None
        assert metadata["source_path"] == "test.txt"
        assert metadata["source_name"] == "test"
        assert metadata["file_ext"] == "txt"
        assert "file_size" in metadata
        assert "modified_time" in metadata

    @pytest.mark.asyncio
    async def test_read_file_absolute_path(self, unit, tmp_path: Path, test_file: Path):
        """Read file using absolute path."""
        content, metadata = await unit._read_file(str(test_file), tmp_path, False)

        assert content == "Hello, world!"

    @pytest.mark.asyncio
    async def test_read_file_not_found(self, unit, tmp_path: Path):
        """Handle missing file gracefully."""
        content, metadata = await unit._read_file("nonexistent.txt", tmp_path, False)

        assert content == "[File not found: nonexistent.txt]"
        assert metadata is None

    @pytest.mark.asyncio
    async def test_read_file_empty_path(self, unit, tmp_path: Path):
        """Handle empty file path."""
        content, metadata = await unit._read_file("", tmp_path, False)

        assert content == ""
        assert metadata is None

    @pytest.mark.asyncio
    async def test_read_file_encoding_error(self, unit, tmp_path: Path):
        """Handle encoding errors gracefully."""
        # Create a file with binary content that's not valid UTF-8
        bad_file = tmp_path / "bad.txt"
        bad_file.write_bytes(b"\x80\x81\x82")

        content, metadata = await unit._read_file("bad.txt", tmp_path, False)

        assert content.startswith("[Error reading bad.txt:")
        assert metadata is None


class TestReadDirectory:
    """Tests for _read_directory method."""

    @pytest.fixture
    def unit(self):
        """Create ContextAggregatorUnit instance."""
        return ContextAggregatorUnit()

    @pytest.fixture
    def test_dir(self, tmp_path: Path):
        """Create test directory with multiple files."""
        test_dir = tmp_path / "testdir"
        test_dir.mkdir()
        (test_dir / "file1.txt").write_text("Content 1")
        (test_dir / "file2.txt").write_text("Content 2")
        (test_dir / "file3.md").write_text("# Markdown")
        return test_dir

    @pytest.mark.asyncio
    async def test_read_directory_pass_mode(self, unit, tmp_path: Path, test_dir: Path):
        """Read directory in pass mode with file_name pattern."""
        result = await unit._read_directory(
            directory_path="testdir",
            glob_pattern="*.txt",
            aggregation="pass",
            naming_pattern="file_name",
            custom_pattern="{base}_{file_name}",
            separator="\n---\n",
            base_var_name="doc",
            project_path=tmp_path,
            include_metadata=False,
        )

        assert len(result) == 2
        assert "doc_file1" in result
        assert "doc_file2" in result
        assert result["doc_file1"][0] == "Content 1"
        assert result["doc_file2"][0] == "Content 2"
        assert result["doc_file1"][1] is None  # No metadata

    @pytest.mark.asyncio
    async def test_read_directory_pass_mode_number(
        self, unit, tmp_path: Path, test_dir: Path
    ):
        """Read directory with number naming pattern."""
        result = await unit._read_directory(
            directory_path="testdir",
            glob_pattern="*.txt",
            aggregation="pass",
            naming_pattern="number",
            custom_pattern="",
            separator="\n",
            base_var_name="item",
            project_path=tmp_path,
            include_metadata=False,
        )

        assert "item_0" in result
        assert "item_1" in result

    @pytest.mark.asyncio
    async def test_read_directory_pass_mode_custom(
        self, unit, tmp_path: Path, test_dir: Path
    ):
        """Read directory with custom naming pattern."""
        result = await unit._read_directory(
            directory_path="testdir",
            glob_pattern="*.txt",
            aggregation="pass",
            naming_pattern="custom",
            custom_pattern="var_{number}_{file_name}",
            separator="\n",
            base_var_name="doc",
            project_path=tmp_path,
            include_metadata=False,
        )

        assert "var_0_file1" in result
        assert "var_1_file2" in result

    @pytest.mark.asyncio
    async def test_read_directory_concatenate_mode(
        self, unit, tmp_path: Path, test_dir: Path
    ):
        """Read directory in concatenate mode."""
        result = await unit._read_directory(
            directory_path="testdir",
            glob_pattern="*.txt",
            aggregation="concatenate",
            naming_pattern="file_name",
            custom_pattern="",
            separator="\n---\n",
            base_var_name="combined",
            project_path=tmp_path,
            include_metadata=False,
        )

        assert len(result) == 1
        assert "combined" in result
        content, metadata = result["combined"]
        assert "Content 1" in content
        assert "Content 2" in content
        assert "\n---\n" in content
        assert metadata is None

    @pytest.mark.asyncio
    async def test_read_directory_with_metadata(
        self, unit, tmp_path: Path, test_dir: Path
    ):
        """Read directory with metadata collection."""
        result = await unit._read_directory(
            directory_path="testdir",
            glob_pattern="*.txt",
            aggregation="pass",
            naming_pattern="file_name",
            custom_pattern="",
            separator="\n",
            base_var_name="doc",
            project_path=tmp_path,
            include_metadata=True,
        )

        content, metadata = result["doc_file1"]
        assert metadata is not None
        assert "source_path" in metadata
        assert "file_index" in metadata
        assert "total_files" in metadata
        assert metadata["total_files"] == "2"

    @pytest.mark.asyncio
    async def test_read_directory_concatenate_with_metadata(
        self, unit, tmp_path: Path, test_dir: Path
    ):
        """Read directory in concatenate mode with metadata."""
        result = await unit._read_directory(
            directory_path="testdir",
            glob_pattern="*.txt",
            aggregation="concatenate",
            naming_pattern="file_name",
            custom_pattern="",
            separator="\n--- {source_name} ---\n",
            base_var_name="combined",
            project_path=tmp_path,
            include_metadata=True,
        )

        content, metadata = result["combined"]
        # Should have formatted separators with metadata
        assert "Content 1" in content
        assert "Content 2" in content

    @pytest.mark.asyncio
    async def test_read_directory_not_found(self, unit, tmp_path: Path):
        """Handle missing directory."""
        result = await unit._read_directory(
            directory_path="nonexistent",
            glob_pattern="*",
            aggregation="pass",
            naming_pattern="file_name",
            custom_pattern="",
            separator="\n",
            base_var_name="doc",
            project_path=tmp_path,
            include_metadata=False,
        )

        assert len(result) == 1
        assert "doc" in result
        assert result["doc"][0] == "[Directory not found: nonexistent]"

    @pytest.mark.asyncio
    async def test_read_directory_no_matches(
        self, unit, tmp_path: Path, test_dir: Path
    ):
        """Handle no matching files."""
        result = await unit._read_directory(
            directory_path="testdir",
            glob_pattern="*.pdf",
            aggregation="pass",
            naming_pattern="file_name",
            custom_pattern="",
            separator="\n",
            base_var_name="doc",
            project_path=tmp_path,
            include_metadata=False,
        )

        assert len(result) == 1
        assert "doc" in result
        assert result["doc"][0] == "[No files matched: *.pdf]"

    @pytest.mark.asyncio
    async def test_read_directory_empty_path(self, unit, tmp_path: Path):
        """Handle empty directory path."""
        result = await unit._read_directory(
            directory_path="",
            glob_pattern="*",
            aggregation="pass",
            naming_pattern="file_name",
            custom_pattern="",
            separator="\n",
            base_var_name="doc",
            project_path=tmp_path,
            include_metadata=False,
        )

        assert result == {}


class TestFetchUrl:
    """Tests for _fetch_url method."""

    @pytest.fixture
    def unit(self):
        """Create ContextAggregatorUnit instance."""
        return ContextAggregatorUnit()

    @pytest.mark.asyncio
    async def test_fetch_url_success(self, unit):
        """Fetch URL successfully."""
        mock_response = MagicMock()
        mock_response.text = "<html>Test content</html>"
        mock_response.status_code = 200
        mock_response.headers = {
            "Content-Type": "text/html",
            "Content-Length": "24",
        }

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                return_value=mock_response
            )

            content, metadata = await unit._fetch_url(
                "https://example.com/test.html", False
            )

            assert content == "<html>Test content</html>"
            assert metadata is None

    @pytest.mark.asyncio
    async def test_fetch_url_with_metadata(self, unit):
        """Fetch URL with metadata collection."""
        mock_response = MagicMock()
        mock_response.text = "Content"
        mock_response.status_code = 200
        mock_response.headers = {
            "Content-Type": "text/html",
            "Content-Length": "7",
            "Last-Modified": "Wed, 01 Jan 2025 12:00:00 GMT",
        }

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                return_value=mock_response
            )

            content, metadata = await unit._fetch_url(
                "https://example.com/page.html", True
            )

            assert content == "Content"
            assert metadata is not None
            assert metadata["source_path"] == "https://example.com/page.html"
            assert metadata["source_name"] == "page"
            assert metadata["content_type"] == "text/html"
            assert metadata["status_code"] == "200"
            assert "modified_time" in metadata
            assert "retrieved_time" in metadata

    @pytest.mark.asyncio
    async def test_fetch_url_timeout(self, unit):
        """Handle URL fetch timeout."""
        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                side_effect=httpx.TimeoutException("Timeout")
            )

            content, metadata = await unit._fetch_url("https://slow.example.com", False)

            assert content == "[Timeout fetching https://slow.example.com]"
            assert metadata is None

    @pytest.mark.asyncio
    async def test_fetch_url_http_error(self, unit):
        """Handle HTTP error status."""
        mock_response = MagicMock()
        mock_response.status_code = 404

        with patch("httpx.AsyncClient") as mock_client:
            mock_get = AsyncMock(
                side_effect=httpx.HTTPStatusError(
                    "Not found", request=MagicMock(), response=mock_response
                )
            )
            mock_client.return_value.__aenter__.return_value.get = mock_get

            content, metadata = await unit._fetch_url("https://example.com/404", False)

            assert content == "[HTTP 404 from https://example.com/404]"
            assert metadata is None

    @pytest.mark.asyncio
    async def test_fetch_url_generic_error(self, unit):
        """Handle generic fetch error."""
        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                side_effect=Exception("Network error")
            )

            content, metadata = await unit._fetch_url("https://example.com", False)

            assert content.startswith("[Error fetching https://example.com:")
            assert metadata is None

    @pytest.mark.asyncio
    async def test_fetch_url_empty(self, unit):
        """Handle empty URL."""
        content, metadata = await unit._fetch_url("", False)

        assert content == ""
        assert metadata is None


class TestMetadataHelpers:
    """Tests for metadata extraction helper methods."""

    @pytest.fixture
    def unit(self):
        """Create ContextAggregatorUnit instance."""
        return ContextAggregatorUnit()

    def test_get_file_metadata(self, unit, tmp_path: Path):
        """Extract file metadata correctly."""
        test_file = tmp_path / "test.txt"
        test_file.write_text("Test content")

        metadata = unit._get_file_metadata(test_file, "relative/test.txt")

        assert metadata["source_path"] == "relative/test.txt"
        assert metadata["source_name"] == "test"
        assert metadata["file_ext"] == "txt"
        assert metadata["file_size"] == "12"  # "Test content" length
        assert "modified_time" in metadata
        # Verify it's a valid ISO format datetime
        datetime.fromisoformat(metadata["modified_time"])

    def test_get_url_metadata(self, unit):
        """Extract URL metadata correctly."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.headers = {
            "Content-Type": "application/json",
            "Content-Length": "1024",
            "Last-Modified": "Wed, 01 Jan 2025 12:00:00 GMT",
        }

        metadata = unit._get_url_metadata(
            "https://api.example.com/data.json", mock_response
        )

        assert metadata["source_path"] == "https://api.example.com/data.json"
        assert metadata["source_name"] == "data"
        assert metadata["content_type"] == "application/json"
        assert metadata["content_length"] == "1024"
        assert metadata["status_code"] == "200"
        assert "modified_time" in metadata
        assert "retrieved_time" in metadata

    def test_get_url_metadata_no_extension(self, unit):
        """Extract URL metadata from URL without extension."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.headers = {}

        metadata = unit._get_url_metadata("https://example.com/page", mock_response)

        assert metadata["source_name"] == "page"

    def test_get_url_metadata_root_url(self, unit):
        """Extract URL metadata from root URL."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.headers = {}

        metadata = unit._get_url_metadata("https://example.com/", mock_response)

        assert metadata["source_name"] == "url"

    def test_get_url_metadata_invalid_last_modified(self, unit):
        """Handle invalid Last-Modified header."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.headers = {
            "Last-Modified": "Invalid date format",
        }

        metadata = unit._get_url_metadata("https://example.com", mock_response)

        # Should fall back to retrieved_time
        assert metadata["modified_time"] == metadata["retrieved_time"]

    def test_get_node_metadata(self, unit):
        """Extract node metadata correctly."""
        metadata = unit._get_node_metadata("TestNode", "node-123")

        assert metadata["source_name"] == "TestNode"
        assert metadata["source_id"] == "node-123"
        assert "retrieved_time" in metadata
        # Verify it's a valid ISO format datetime
        datetime.fromisoformat(metadata["retrieved_time"])

    def test_format_frontmatter(self, unit):
        """Format metadata as YAML frontmatter."""
        metadata = {
            "source_name": "test",
            "file_ext": "txt",
            "file_size": "100",
        }

        frontmatter = unit._format_frontmatter(metadata)

        assert frontmatter.startswith("---\n")
        assert frontmatter.endswith("---\n")
        assert "source_name: test" in frontmatter
        assert "file_ext: txt" in frontmatter
        assert "file_size: 100" in frontmatter

    def test_format_frontmatter_empty_values(self, unit):
        """Format frontmatter excluding empty values."""
        metadata = {
            "name": "test",
            "empty": "",
            "value": "data",
        }

        frontmatter = unit._format_frontmatter(metadata)

        assert "name: test" in frontmatter
        assert "value: data" in frontmatter
        assert "empty:" not in frontmatter

    def test_format_separator_with_metadata(self, unit):
        """Format separator with metadata variables."""
        separator = "\n--- {source_name} ({file_size} bytes) ---\n"
        metadata = {"source_name": "test.txt", "file_size": "1024"}

        result = unit._format_separator_with_metadata(separator, metadata)

        assert result == "\n--- test.txt (1024 bytes) ---\n"

    def test_format_separator_missing_variables(self, unit):
        """Handle missing variables in separator gracefully."""
        separator = "\n--- {missing_var} ---\n"
        metadata = {"other_key": "value"}

        result = unit._format_separator_with_metadata(separator, metadata)

        # Should return separator as-is when variables are missing
        assert result == separator


class TestRunProcess:
    """Tests for run_process method and overall integration."""

    @pytest.fixture
    def unit(self):
        """Create ContextAggregatorUnit instance."""
        return ContextAggregatorUnit()

    @pytest.fixture
    def execution_context(self, tmp_path: Path):
        """Create execution context for testing."""
        return ExecutionContext(
            session_id="session-123",
            run_id="run-456",
            node_id="context-1",
            node_name="ContextAggregator",
            state={},
            emit=MagicMock(),
            project_path=tmp_path,
        )

    @pytest.mark.asyncio
    async def test_run_process_empty_inputs(self, unit, execution_context):
        """Handle empty dynamic inputs."""
        inputs = {}
        config = {"dynamicInputs": []}

        result = await unit.run_process(inputs, config, execution_context)

        assert result == {"output": {}}

    @pytest.mark.asyncio
    async def test_run_process_file_input_pass_mode(
        self, unit, execution_context, tmp_path: Path
    ):
        """Process file input in pass mode."""
        test_file = tmp_path / "input.txt"
        test_file.write_text("File content")

        inputs = {}
        config = {
            "dynamicInputs": [
                {
                    "id": "file1",
                    "inputType": "file",
                    "filePath": "input.txt",
                    "variableName": "my_file",
                }
            ],
            "aggregationMode": "pass",
        }

        result = await unit.run_process(inputs, config, execution_context)

        assert "output" in result
        assert result["output"]["my_file"] == "File content"

    @pytest.mark.asyncio
    async def test_run_process_file_input_with_metadata(
        self, unit, execution_context, tmp_path: Path
    ):
        """Process file input with metadata in pass mode."""
        test_file = tmp_path / "input.txt"
        test_file.write_text("Content")

        inputs = {}
        config = {
            "dynamicInputs": [
                {
                    "id": "file1",
                    "inputType": "file",
                    "filePath": "input.txt",
                    "variableName": "doc",
                }
            ],
            "aggregationMode": "pass",
            "includeMetadata": True,
        }

        result = await unit.run_process(inputs, config, execution_context)

        content = result["output"]["doc"]
        assert "---" in content  # Frontmatter
        assert "source_path: input.txt" in content
        assert "Content" in content

    @pytest.mark.asyncio
    async def test_run_process_directory_input(
        self, unit, execution_context, tmp_path: Path
    ):
        """Process directory input."""
        test_dir = tmp_path / "docs"
        test_dir.mkdir()
        (test_dir / "file1.txt").write_text("Doc 1")
        (test_dir / "file2.txt").write_text("Doc 2")

        inputs = {}
        config = {
            "dynamicInputs": [
                {
                    "id": "dir1",
                    "inputType": "directory",
                    "directoryPath": "docs",
                    "globPattern": "*.txt",
                    "directoryAggregation": "pass",
                    "namingPattern": "file_name",
                    "variableName": "doc",
                }
            ],
            "aggregationMode": "pass",
        }

        result = await unit.run_process(inputs, config, execution_context)

        assert "doc_file1" in result["output"]
        assert "doc_file2" in result["output"]
        assert result["output"]["doc_file1"] == "Doc 1"

    @pytest.mark.asyncio
    async def test_run_process_node_input(self, unit, execution_context):
        """Process node input in pass mode."""
        inputs = {"input1": "Connected node output"}
        config = {
            "dynamicInputs": [
                {
                    "id": "input1",
                    "inputType": "node",
                    "variableName": "upstream",
                }
            ],
            "aggregationMode": "pass",
        }

        result = await unit.run_process(inputs, config, execution_context)

        assert result["output"]["upstream"] == "Connected node output"

    @pytest.mark.asyncio
    async def test_run_process_node_input_with_metadata(self, unit, execution_context):
        """Process node input with metadata."""
        inputs = {"input1": "Node output"}
        config = {
            "dynamicInputs": [
                {
                    "id": "input1",
                    "inputType": "node",
                    "label": "UpstreamNode",
                    "variableName": "upstream",
                }
            ],
            "aggregationMode": "pass",
            "includeMetadata": True,
        }

        result = await unit.run_process(inputs, config, execution_context)

        content = result["output"]["upstream"]
        assert "---" in content
        assert "source_name: UpstreamNode" in content
        assert "Node output" in content

    @pytest.mark.asyncio
    async def test_run_process_concatenate_mode(
        self, unit, execution_context, tmp_path: Path
    ):
        """Process multiple inputs in concatenate mode."""
        file1 = tmp_path / "file1.txt"
        file1.write_text("First")
        file2 = tmp_path / "file2.txt"
        file2.write_text("Second")

        inputs = {}
        config = {
            "dynamicInputs": [
                {
                    "id": "f1",
                    "inputType": "file",
                    "filePath": "file1.txt",
                    "variableName": "doc1",
                },
                {
                    "id": "f2",
                    "inputType": "file",
                    "filePath": "file2.txt",
                    "variableName": "doc2",
                },
            ],
            "aggregationMode": "concatenate",
            "outputVariableName": "combined",
            "separator": "\n---\n",
        }

        result = await unit.run_process(inputs, config, execution_context)

        assert len(result["output"]) == 1
        assert "combined" in result["output"]
        content = result["output"]["combined"]
        assert "First" in content
        assert "Second" in content
        assert "\n---\n" in content

    @pytest.mark.asyncio
    async def test_run_process_concatenate_with_metadata(
        self, unit, execution_context, tmp_path: Path
    ):
        """Process inputs in concatenate mode with metadata."""
        file1 = tmp_path / "file1.txt"
        file1.write_text("First")
        file2 = tmp_path / "file2.txt"
        file2.write_text("Second")

        inputs = {}
        config = {
            "dynamicInputs": [
                {
                    "id": "f1",
                    "inputType": "file",
                    "filePath": "file1.txt",
                    "variableName": "doc1",
                },
                {
                    "id": "f2",
                    "inputType": "file",
                    "filePath": "file2.txt",
                    "variableName": "doc2",
                },
            ],
            "aggregationMode": "concatenate",
            "outputVariableName": "all",
            "separator": "\n--- {source_name} ---\n",
            "includeMetadata": True,
        }

        result = await unit.run_process(inputs, config, execution_context)

        content = result["output"]["all"]
        assert "First" in content
        assert "Second" in content
        # Should have formatted separator with metadata
        assert "file1" in content or "file2" in content

    @pytest.mark.asyncio
    async def test_run_process_separator_escaping(
        self, unit, execution_context, tmp_path: Path
    ):
        """Handle escaped characters in separator."""
        file1 = tmp_path / "f1.txt"
        file1.write_text("A")

        inputs = {}
        config = {
            "dynamicInputs": [
                {
                    "id": "f1",
                    "inputType": "file",
                    "filePath": "f1.txt",
                    "variableName": "doc",
                }
            ],
            "aggregationMode": "concatenate",
            "separator": "\\n---\\n",  # Escaped newlines
        }

        result = await unit.run_process(inputs, config, execution_context)

        # Separator should be unescaped to actual newline
        # With only one item, separator won't appear but test verifies processing
        assert "context" in result["output"]

    @pytest.mark.asyncio
    async def test_run_process_mixed_inputs(
        self, unit, execution_context, tmp_path: Path
    ):
        """Process mixed input types in pass mode."""
        test_file = tmp_path / "file.txt"
        test_file.write_text("File")

        inputs = {"node1": "Node content"}
        config = {
            "dynamicInputs": [
                {
                    "id": "f1",
                    "inputType": "file",
                    "filePath": "file.txt",
                    "variableName": "from_file",
                },
                {
                    "id": "node1",
                    "inputType": "node",
                    "variableName": "from_node",
                },
            ],
            "aggregationMode": "pass",
        }

        result = await unit.run_process(inputs, config, execution_context)

        assert result["output"]["from_file"] == "File"
        assert result["output"]["from_node"] == "Node content"

    @pytest.mark.asyncio
    async def test_run_process_url_input(self, unit, execution_context):
        """Process URL input."""
        mock_response = MagicMock()
        mock_response.text = "URL content"
        mock_response.status_code = 200
        mock_response.headers = {}

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                return_value=mock_response
            )

            inputs = {}
            config = {
                "dynamicInputs": [
                    {
                        "id": "url1",
                        "inputType": "url",
                        "url": "https://example.com",
                        "variableName": "web_content",
                    }
                ],
                "aggregationMode": "pass",
            }

            result = await unit.run_process(inputs, config, execution_context)

            assert result["output"]["web_content"] == "URL content"

    @pytest.mark.asyncio
    async def test_run_process_directory_concatenate_nested(
        self, unit, execution_context, tmp_path: Path
    ):
        """Process directory with concatenate mode at directory level."""
        test_dir = tmp_path / "docs"
        test_dir.mkdir()
        (test_dir / "a.txt").write_text("A")
        (test_dir / "b.txt").write_text("B")

        inputs = {}
        config = {
            "dynamicInputs": [
                {
                    "id": "dir1",
                    "inputType": "directory",
                    "directoryPath": "docs",
                    "globPattern": "*.txt",
                    "directoryAggregation": "concatenate",
                    "directorySeparator": "\\n***\\n",
                    "variableName": "all_docs",
                }
            ],
            "aggregationMode": "pass",
        }

        result = await unit.run_process(inputs, config, execution_context)

        content = result["output"]["all_docs"]
        assert "A" in content
        assert "B" in content
        assert "\n***\n" in content

    @pytest.mark.asyncio
    async def test_run_process_non_string_node_input(self, unit, execution_context):
        """Ignore non-string node inputs."""
        inputs = {"input1": {"type": "dict"}}  # Non-string input
        config = {
            "dynamicInputs": [
                {
                    "id": "input1",
                    "inputType": "node",
                    "variableName": "data",
                }
            ],
            "aggregationMode": "pass",
        }

        result = await unit.run_process(inputs, config, execution_context)

        # Should be ignored since it's not a string
        assert result["output"] == {}

    @pytest.mark.asyncio
    async def test_run_process_default_config_values(
        self, unit, execution_context, tmp_path: Path
    ):
        """Use default config values when not specified."""
        test_file = tmp_path / "test.txt"
        test_file.write_text("Test")

        inputs = {}
        config = {
            "dynamicInputs": [
                {
                    "id": "f1",
                    "inputType": "file",
                    "filePath": "test.txt",
                    # No variableName, should use id
                }
            ],
            # No aggregationMode, should default to "pass"
            # No separator, should use default
            # No outputVariableName, should use default
        }

        result = await unit.run_process(inputs, config, execution_context)

        # Should use id as variable name
        assert "f1" in result["output"]
        assert result["output"]["f1"] == "Test"
