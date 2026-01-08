"""Tests for context aggregator executor."""

import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest

from adkflow_runner.ir import ContextAggregatorIR
from adkflow_runner.runner.context_aggregator_executor import (
    _check_limits,
    _format_frontmatter,
    _format_separator_with_metadata,
    _get_file_metadata,
    _matches_exclude_pattern,
    _read_file,
    _read_directory,
    _sanitize_relative_path,
    execute_context_aggregator,
)


# -----------------------------------------------------------------------------
# Fixtures
# -----------------------------------------------------------------------------


@pytest.fixture
def temp_project():
    """Create a temporary project directory with test files."""
    with tempfile.TemporaryDirectory() as tmpdir:
        project_path = Path(tmpdir)

        # Create test files
        (project_path / "file1.txt").write_text("Content of file 1")
        (project_path / "file2.txt").write_text("Content of file 2")
        (project_path / "data.json").write_text('{"key": "value"}')

        # Create subdirectory with files
        subdir = project_path / "subdir"
        subdir.mkdir()
        (subdir / "nested.txt").write_text("Nested content")
        (subdir / "another.md").write_text("# Markdown content")

        # Create directory to exclude
        gitdir = project_path / ".git"
        gitdir.mkdir()
        (gitdir / "config").write_text("git config")

        yield project_path


@pytest.fixture
def basic_aggregator_ir():
    """Create a basic context aggregator IR for testing."""
    return ContextAggregatorIR(
        id="agg-1",
        name="Test Aggregator",
        config={
            "aggregationMode": "pass",
            "outputVariableName": "context",
            "separator": "\n\n---",
            "includeMetadata": False,
            "dynamicInputs": [],
        },
        input_connections={},
    )


# -----------------------------------------------------------------------------
# Test _read_file
# -----------------------------------------------------------------------------


class TestReadFile:
    """Tests for _read_file function."""

    @pytest.mark.asyncio
    async def test_read_existing_file(self, temp_project: Path):
        """Should read content from existing file."""
        content, metadata = await _read_file("file1.txt", temp_project, False)
        assert content == "Content of file 1"
        assert metadata is None

    @pytest.mark.asyncio
    async def test_read_file_with_metadata(self, temp_project: Path):
        """Should include metadata when requested."""
        content, metadata = await _read_file("file1.txt", temp_project, True)
        assert content == "Content of file 1"
        assert metadata is not None
        assert "source_path" in metadata
        assert "source_name" in metadata
        assert metadata["source_name"] == "file1"

    @pytest.mark.asyncio
    async def test_read_nested_file(self, temp_project: Path):
        """Should read files from subdirectories."""
        content, metadata = await _read_file("subdir/nested.txt", temp_project, False)
        assert content == "Nested content"

    @pytest.mark.asyncio
    async def test_read_nonexistent_file(self, temp_project: Path):
        """Should return error message for missing file."""
        content, metadata = await _read_file("missing.txt", temp_project, False)
        assert "[File not found:" in content
        assert metadata is None

    @pytest.mark.asyncio
    async def test_read_empty_path(self, temp_project: Path):
        """Should return empty string for empty path."""
        content, metadata = await _read_file("", temp_project, False)
        assert content == ""
        assert metadata is None

    @pytest.mark.asyncio
    async def test_read_absolute_path(self, temp_project: Path):
        """Should handle absolute paths."""
        abs_path = str(temp_project / "file1.txt")
        content, metadata = await _read_file(abs_path, temp_project, False)
        assert content == "Content of file 1"


# -----------------------------------------------------------------------------
# Test _read_directory
# -----------------------------------------------------------------------------


class TestReadDirectory:
    """Tests for _read_directory function."""

    @pytest.mark.asyncio
    async def test_read_directory_concatenate(self, temp_project: Path):
        """Should concatenate files in directory."""
        result = await _read_directory(
            directory_path=".",
            glob_pattern="*.txt",
            aggregation="concatenate",
            naming_pattern="file_name",
            custom_pattern="",
            separator="\n---\n",
            base_var_name="files",
            project_path=temp_project,
            include_metadata=False,
        )
        assert "files" in result
        content, _ = result["files"]
        assert "Content of file 1" in content
        assert "Content of file 2" in content

    @pytest.mark.asyncio
    async def test_read_directory_pass(self, temp_project: Path):
        """Should create separate variables in pass mode."""
        result = await _read_directory(
            directory_path=".",
            glob_pattern="*.txt",
            aggregation="pass",
            naming_pattern="file_name",
            custom_pattern="",
            separator="\n---\n",
            base_var_name="doc",
            project_path=temp_project,
            include_metadata=False,
        )
        # Should have doc_file1 and doc_file2
        assert "doc_file1" in result
        assert "doc_file2" in result
        assert result["doc_file1"][0] == "Content of file 1"
        assert result["doc_file2"][0] == "Content of file 2"

    @pytest.mark.asyncio
    async def test_read_directory_recursive(self, temp_project: Path):
        """Should include subdirectory files when recursive."""
        result = await _read_directory(
            directory_path=".",
            glob_pattern="*.txt",
            aggregation="concatenate",
            naming_pattern="file_name",
            custom_pattern="",
            separator="\n---\n",
            base_var_name="all",
            project_path=temp_project,
            include_metadata=False,
            recursive=True,
        )
        assert "all" in result
        content, _ = result["all"]
        assert "Nested content" in content

    @pytest.mark.asyncio
    async def test_read_directory_exclude_patterns(self, temp_project: Path):
        """Should exclude files matching patterns."""
        # Create a file in .git that would match
        result = await _read_directory(
            directory_path=".",
            glob_pattern="*",
            aggregation="pass",
            naming_pattern="file_name",
            custom_pattern="",
            separator="\n---\n",
            base_var_name="files",
            project_path=temp_project,
            include_metadata=False,
            recursive=True,
            exclude_patterns=[".git"],
        )
        # Should not include .git/config
        var_names = list(result.keys())
        assert not any(".git" in name for name in var_names)

    @pytest.mark.asyncio
    async def test_read_directory_not_found(self, temp_project: Path):
        """Should return error for nonexistent directory."""
        result = await _read_directory(
            directory_path="nonexistent",
            glob_pattern="*",
            aggregation="pass",
            naming_pattern="file_name",
            custom_pattern="",
            separator="\n---\n",
            base_var_name="files",
            project_path=temp_project,
            include_metadata=False,
        )
        assert "files" in result
        assert "[Directory not found:" in result["files"][0]

    @pytest.mark.asyncio
    async def test_read_directory_no_matches(self, temp_project: Path):
        """Should return error when no files match pattern."""
        result = await _read_directory(
            directory_path=".",
            glob_pattern="*.xyz",
            aggregation="pass",
            naming_pattern="file_name",
            custom_pattern="",
            separator="\n---\n",
            base_var_name="files",
            project_path=temp_project,
            include_metadata=False,
        )
        assert "files" in result
        assert "[No files matched:" in result["files"][0]

    @pytest.mark.asyncio
    async def test_read_directory_number_naming(self, temp_project: Path):
        """Should use number-based naming when specified."""
        result = await _read_directory(
            directory_path=".",
            glob_pattern="*.txt",
            aggregation="pass",
            naming_pattern="number",
            custom_pattern="",
            separator="\n---\n",
            base_var_name="doc",
            project_path=temp_project,
            include_metadata=False,
        )
        assert "doc_0" in result
        assert "doc_1" in result

    @pytest.mark.asyncio
    async def test_read_directory_custom_naming(self, temp_project: Path):
        """Should support custom naming patterns."""
        result = await _read_directory(
            directory_path=".",
            glob_pattern="*.txt",
            aggregation="pass",
            naming_pattern="custom",
            custom_pattern="{base}_file_{number}",
            separator="\n---\n",
            base_var_name="doc",
            project_path=temp_project,
            include_metadata=False,
        )
        assert "doc_file_0" in result
        assert "doc_file_1" in result

    @pytest.mark.asyncio
    async def test_read_directory_with_metadata(self, temp_project: Path):
        """Should include file metadata when requested."""
        result = await _read_directory(
            directory_path=".",
            glob_pattern="file1.txt",
            aggregation="pass",
            naming_pattern="file_name",
            custom_pattern="",
            separator="\n---\n",
            base_var_name="doc",
            project_path=temp_project,
            include_metadata=True,
        )
        assert "doc_file1" in result
        _, metadata = result["doc_file1"]
        assert metadata is not None
        assert "source_path" in metadata
        assert "file_index" in metadata
        assert "total_files" in metadata


# -----------------------------------------------------------------------------
# Test execute_context_aggregator
# -----------------------------------------------------------------------------


class TestExecuteContextAggregator:
    """Tests for execute_context_aggregator main function."""

    @pytest.mark.asyncio
    async def test_empty_inputs(self, temp_project: Path):
        """Should return empty output for no inputs."""
        ir = ContextAggregatorIR(
            id="agg-1",
            name="Empty",
            config={
                "aggregationMode": "pass",
                "dynamicInputs": [],
            },
            input_connections={},
        )
        result = await execute_context_aggregator(ir, str(temp_project), {})
        assert result == {"output": {}}

    @pytest.mark.asyncio
    async def test_file_input_pass_mode(self, temp_project: Path):
        """Should read file and create variable in pass mode."""
        ir = ContextAggregatorIR(
            id="agg-1",
            name="File Reader",
            config={
                "aggregationMode": "pass",
                "dynamicInputs": [
                    {
                        "id": "input-1",
                        "inputType": "file",
                        "variableName": "myfile",
                        "filePath": "file1.txt",
                    }
                ],
            },
            input_connections={},
        )
        result = await execute_context_aggregator(ir, str(temp_project), {})
        assert "output" in result
        assert "myfile" in result["output"]
        assert result["output"]["myfile"] == "Content of file 1"

    @pytest.mark.asyncio
    async def test_file_input_concatenate_mode(self, temp_project: Path):
        """Should concatenate multiple file inputs."""
        ir = ContextAggregatorIR(
            id="agg-1",
            name="Concatenator",
            config={
                "aggregationMode": "concatenate",
                "outputVariableName": "combined",
                "separator": "\n---\n",
                "dynamicInputs": [
                    {
                        "id": "input-1",
                        "inputType": "file",
                        "variableName": "f1",
                        "filePath": "file1.txt",
                    },
                    {
                        "id": "input-2",
                        "inputType": "file",
                        "variableName": "f2",
                        "filePath": "file2.txt",
                    },
                ],
            },
            input_connections={},
        )
        result = await execute_context_aggregator(ir, str(temp_project), {})
        assert "combined" in result["output"]
        combined = result["output"]["combined"]
        assert "Content of file 1" in combined
        assert "Content of file 2" in combined
        assert "\n---\n" in combined

    @pytest.mark.asyncio
    async def test_node_input(self, temp_project: Path):
        """Should use content from connected node."""
        ir = ContextAggregatorIR(
            id="agg-1",
            name="Node Reader",
            config={
                "aggregationMode": "pass",
                "dynamicInputs": [
                    {
                        "id": "node-input-1",
                        "inputType": "node",
                        "variableName": "upstream",
                        "label": "Upstream Node",
                    }
                ],
            },
            input_connections={"node-input-1": ["upstream-node-id"]},
        )
        node_inputs = {"node-input-1": "Content from upstream node"}
        result = await execute_context_aggregator(ir, str(temp_project), node_inputs)
        assert "upstream" in result["output"]
        assert result["output"]["upstream"] == "Content from upstream node"

    @pytest.mark.asyncio
    async def test_directory_input(self, temp_project: Path):
        """Should read directory contents."""
        ir = ContextAggregatorIR(
            id="agg-1",
            name="Dir Reader",
            config={
                "aggregationMode": "pass",
                "dynamicInputs": [
                    {
                        "id": "dir-1",
                        "inputType": "directory",
                        "variableName": "docs",
                        "directoryPath": ".",
                        "globPattern": "*.txt",
                        "directoryAggregation": "pass",
                        "namingPattern": "file_name",
                    }
                ],
            },
            input_connections={},
        )
        result = await execute_context_aggregator(ir, str(temp_project), {})
        # Should have docs_file1 and docs_file2
        assert "docs_file1" in result["output"]
        assert "docs_file2" in result["output"]

    @pytest.mark.asyncio
    async def test_separator_unescaping(self, temp_project: Path):
        """Should unescape \\n in separator."""
        ir = ContextAggregatorIR(
            id="agg-1",
            name="Escaper",
            config={
                "aggregationMode": "concatenate",
                "outputVariableName": "combined",
                "separator": "\\n---\\n",  # Escaped newlines
                "dynamicInputs": [
                    {
                        "id": "input-1",
                        "inputType": "file",
                        "variableName": "f1",
                        "filePath": "file1.txt",
                    },
                    {
                        "id": "input-2",
                        "inputType": "file",
                        "variableName": "f2",
                        "filePath": "file2.txt",
                    },
                ],
            },
            input_connections={},
        )
        result = await execute_context_aggregator(ir, str(temp_project), {})
        combined = result["output"]["combined"]
        # Should have actual newline, not escaped
        assert "\n---\n" in combined
        assert "\\n" not in combined


# -----------------------------------------------------------------------------
# Test URL fetching
# -----------------------------------------------------------------------------


class TestFetchUrl:
    """Tests for URL fetching functionality."""

    @pytest.mark.asyncio
    async def test_url_input(self, temp_project: Path):
        """Should fetch URL content (mocked)."""
        ir = ContextAggregatorIR(
            id="agg-1",
            name="URL Fetcher",
            config={
                "aggregationMode": "pass",
                "dynamicInputs": [
                    {
                        "id": "url-1",
                        "inputType": "url",
                        "variableName": "webpage",
                        "url": "https://example.com/test",
                    }
                ],
            },
            input_connections={},
        )

        # Mock the httpx client
        mock_response = AsyncMock()
        mock_response.text = "Mock webpage content"
        mock_response.status_code = 200
        mock_response.headers = {"Content-Type": "text/html"}
        mock_response.raise_for_status = lambda: None  # Sync function, not async

        with patch(
            "adkflow_runner.runner.context_aggregator_executor.httpx.AsyncClient"
        ) as mock_client:
            mock_instance = AsyncMock()
            mock_instance.get.return_value = mock_response
            mock_instance.__aenter__.return_value = mock_instance
            mock_instance.__aexit__.return_value = None
            mock_client.return_value = mock_instance

            result = await execute_context_aggregator(ir, str(temp_project), {})

        assert "webpage" in result["output"]
        assert result["output"]["webpage"] == "Mock webpage content"


# -----------------------------------------------------------------------------
# Test helper functions
# -----------------------------------------------------------------------------


class TestHelperFunctions:
    """Tests for helper functions."""

    def test_format_frontmatter(self):
        """Should format metadata as YAML frontmatter."""
        metadata = {
            "source_path": "file.txt",
            "source_name": "file",
            "file_size": "100",
        }
        result = _format_frontmatter(metadata)
        assert result.startswith("---\n")
        assert result.endswith("---\n")
        assert "source_path: file.txt" in result
        assert "source_name: file" in result

    def test_format_frontmatter_empty_values(self):
        """Should skip empty values in frontmatter."""
        metadata = {
            "source_path": "file.txt",
            "empty_value": "",
            "source_name": "file",
        }
        result = _format_frontmatter(metadata)
        assert "empty_value" not in result

    def test_format_separator_with_metadata(self):
        """Should substitute metadata in separator template."""
        separator = "\n--- {source_name} ---\n"
        metadata = {"source_name": "test_file"}
        result = _format_separator_with_metadata(separator, metadata)
        assert result == "\n--- test_file ---\n"

    def test_format_separator_missing_key(self):
        """Should return original separator if key is missing."""
        separator = "\n--- {missing_key} ---\n"
        metadata = {"source_name": "test"}
        result = _format_separator_with_metadata(separator, metadata)
        # Should return original on KeyError
        assert result == separator

    def test_matches_exclude_pattern(self, temp_project: Path):
        """Should match files in excluded directories."""
        git_file = temp_project / ".git" / "config"
        assert _matches_exclude_pattern(git_file, temp_project, [".git"]) is True

        normal_file = temp_project / "file1.txt"
        assert _matches_exclude_pattern(normal_file, temp_project, [".git"]) is False

    def test_matches_exclude_pattern_glob(self, temp_project: Path):
        """Should match glob patterns."""
        pyc_file = temp_project / "test.pyc"
        pyc_file.touch()
        assert _matches_exclude_pattern(pyc_file, temp_project, ["*.pyc"]) is True

    def test_sanitize_relative_path(self):
        """Should sanitize paths for variable names."""
        assert _sanitize_relative_path("dir/file.txt") == "dir_file"
        assert _sanitize_relative_path("a/b/c.py") == "a_b_c"
        assert _sanitize_relative_path("file.txt") == "file"

    def test_check_limits_under_limit(self, temp_project: Path):
        """Should pass through files under limits."""
        files = [
            temp_project / "file1.txt",
            temp_project / "file2.txt",
        ]
        result, warning = _check_limits(files, max_files=10, max_file_size=1048576)
        assert len(result) == 2
        assert warning is None

    def test_check_limits_over_count(self, temp_project: Path):
        """Should limit file count."""
        files = [
            temp_project / "file1.txt",
            temp_project / "file2.txt",
            temp_project / "data.json",
        ]
        result, warning = _check_limits(files, max_files=2, max_file_size=1048576)
        assert len(result) == 2
        assert warning is not None
        assert "limited to 2" in warning

    def test_get_file_metadata(self, temp_project: Path):
        """Should extract file metadata."""
        file_path = temp_project / "file1.txt"
        metadata = _get_file_metadata(file_path, "file1.txt")
        assert metadata["source_path"] == "file1.txt"
        assert metadata["source_name"] == "file1"
        assert metadata["file_ext"] == "txt"
        assert "file_size" in metadata
        assert "modified_time" in metadata


# -----------------------------------------------------------------------------
# Test metadata inclusion
# -----------------------------------------------------------------------------


class TestMetadataInclusion:
    """Tests for metadata inclusion in outputs."""

    @pytest.mark.asyncio
    async def test_file_with_metadata_pass(self, temp_project: Path):
        """Should prepend frontmatter in pass mode with metadata."""
        ir = ContextAggregatorIR(
            id="agg-1",
            name="Meta Reader",
            config={
                "aggregationMode": "pass",
                "includeMetadata": True,
                "dynamicInputs": [
                    {
                        "id": "input-1",
                        "inputType": "file",
                        "variableName": "myfile",
                        "filePath": "file1.txt",
                    }
                ],
            },
            input_connections={},
        )
        result = await execute_context_aggregator(ir, str(temp_project), {})
        content = result["output"]["myfile"]
        # Should have frontmatter
        assert content.startswith("---\n")
        assert "source_path:" in content
        assert "Content of file 1" in content

    @pytest.mark.asyncio
    async def test_node_with_metadata(self, temp_project: Path):
        """Should include node metadata when requested."""
        ir = ContextAggregatorIR(
            id="agg-1",
            name="Node Meta Reader",
            config={
                "aggregationMode": "pass",
                "includeMetadata": True,
                "dynamicInputs": [
                    {
                        "id": "node-input-1",
                        "inputType": "node",
                        "variableName": "upstream",
                        "label": "My Upstream",
                    }
                ],
            },
            input_connections={},
        )
        node_inputs = {"node-input-1": "Node content"}
        result = await execute_context_aggregator(ir, str(temp_project), node_inputs)
        content = result["output"]["upstream"]
        assert "---\n" in content
        assert "source_name: My Upstream" in content
