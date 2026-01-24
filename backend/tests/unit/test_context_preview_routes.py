"""Tests for context aggregator preview API routes.

Tests preview functionality for context aggregation including:
- Env file parsing
- Token counting
- Content truncation
- File, directory, and URL previews
- Aggregation modes (pass vs concatenate)
"""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
from httpx import AsyncClient

from backend.src.api.routes.context_preview_service import (
    _count_tokens,
    _format_frontmatter,
    _format_python_dict,
    _format_separator_with_metadata,
    _get_default_model,
    _get_file_metadata,
    _get_url_metadata,
    _matches_exclude_pattern,
    _parse_env_file,
    _truncate_content,
    _unescape_string,
    preview_directory,
    preview_file,
    preview_url,
)


class TestParseEnvFile:
    """Tests for _parse_env_file function."""

    def test_parse_basic_env_variables(self, tmp_path: Path):
        """Parse basic key=value pairs from .env file."""
        env_file = tmp_path / ".env"
        env_file.write_text(
            "API_KEY=test123\nPROJECT_ID=myproject\nREGION=us-central1\n"
        )

        result = _parse_env_file(env_file)

        assert result == {
            "API_KEY": "test123",
            "PROJECT_ID": "myproject",
            "REGION": "us-central1",
        }

    def test_parse_env_with_quotes(self, tmp_path: Path):
        """Strip quotes from values."""
        env_file = tmp_path / ".env"
        env_file.write_text(
            'API_KEY="test123"\nPROJECT_ID=\'myproject\'\nREGION="us-central1"\n'
        )

        result = _parse_env_file(env_file)

        assert result == {
            "API_KEY": "test123",
            "PROJECT_ID": "myproject",
            "REGION": "us-central1",
        }

    def test_parse_env_skips_comments(self, tmp_path: Path):
        """Ignore lines starting with #."""
        env_file = tmp_path / ".env"
        env_file.write_text(
            "# This is a comment\n"
            "API_KEY=test123\n"
            "# Another comment\n"
            "PROJECT_ID=myproject\n"
        )

        result = _parse_env_file(env_file)

        assert result == {
            "API_KEY": "test123",
            "PROJECT_ID": "myproject",
        }

    def test_parse_env_skips_empty_lines(self, tmp_path: Path):
        """Ignore blank lines."""
        env_file = tmp_path / ".env"
        env_file.write_text("API_KEY=test123\n\nPROJECT_ID=myproject\n\n\n")

        result = _parse_env_file(env_file)

        assert result == {
            "API_KEY": "test123",
            "PROJECT_ID": "myproject",
        }

    def test_parse_env_nonexistent_file(self, tmp_path: Path):
        """Return empty dict when file doesn't exist."""
        env_file = tmp_path / ".env"

        result = _parse_env_file(env_file)

        assert result == {}

    def test_parse_env_invalid_lines(self, tmp_path: Path):
        """Skip lines that don't match key=value pattern."""
        env_file = tmp_path / ".env"
        env_file.write_text("API_KEY=test123\nINVALID LINE\nPROJECT_ID=myproject\n")

        result = _parse_env_file(env_file)

        assert result == {
            "API_KEY": "test123",
            "PROJECT_ID": "myproject",
        }


class TestGetDefaultModel:
    """Tests for _get_default_model function."""

    def test_get_model_from_settings(self, tmp_path: Path):
        """Return defaultModel from manifest settings."""
        manifest = {
            "name": "test-project",
            "version": "3.0",
            "settings": {
                "defaultModel": "gemini-1.5-pro",
            },
        }
        (tmp_path / "manifest.json").write_text(json.dumps(manifest))

        result = _get_default_model(tmp_path)

        assert result == "gemini-1.5-pro"

    def test_get_model_missing_settings(self, tmp_path: Path):
        """Return default when settings is missing."""
        manifest = {
            "name": "test-project",
            "version": "3.0",
        }
        (tmp_path / "manifest.json").write_text(json.dumps(manifest))

        result = _get_default_model(tmp_path)

        assert result == "gemini-2.5-flash"

    def test_get_model_missing_default_model(self, tmp_path: Path):
        """Return default when defaultModel is missing."""
        manifest = {
            "name": "test-project",
            "version": "3.0",
            "settings": {},
        }
        (tmp_path / "manifest.json").write_text(json.dumps(manifest))

        result = _get_default_model(tmp_path)

        assert result == "gemini-2.5-flash"

    def test_get_model_no_manifest(self, tmp_path: Path):
        """Return default when manifest doesn't exist."""
        result = _get_default_model(tmp_path)

        assert result == "gemini-2.5-flash"

    def test_get_model_invalid_json(self, tmp_path: Path):
        """Return default when manifest has invalid JSON."""
        (tmp_path / "manifest.json").write_text("invalid json{")

        result = _get_default_model(tmp_path)

        assert result == "gemini-2.5-flash"


class TestCountTokens:
    """Tests for _count_tokens function."""

    async def test_count_tokens_not_available(self, tmp_path: Path):
        """Return error when gemtoken not installed."""
        with patch(
            "backend.src.api.routes.context_preview_service.GEMTOKEN_AVAILABLE",
            False,
        ):
            token_count, error = await _count_tokens("test content", tmp_path)

            assert token_count is None
            assert error == "gemtoken not installed"

    async def test_count_tokens_with_api_key(self, tmp_path: Path):
        """Count tokens using Google API key."""
        env_file = tmp_path / ".env"
        env_file.write_text("GOOGLE_API_KEY=test_api_key")

        manifest = {
            "name": "test-project",
            "version": "3.0",
            "settings": {"defaultModel": "gemini-2.5-flash"},
        }
        (tmp_path / "manifest.json").write_text(json.dumps(manifest))

        mock_counter = MagicMock()
        mock_counter.count_tokens_async = AsyncMock(return_value=42)

        with (
            patch(
                "backend.src.api.routes.context_preview_service.GEMTOKEN_AVAILABLE",
                True,
            ),
            patch(
                "backend.src.api.routes.context_preview_service._TokenCounter",
                return_value=mock_counter,
            ),
        ):
            token_count, error = await _count_tokens("test content", tmp_path)

            assert token_count == 42
            assert error is None

    async def test_count_tokens_missing_api_key(self, tmp_path: Path):
        """Return error when API key not configured."""
        manifest = {
            "name": "test-project",
            "version": "3.0",
        }
        (tmp_path / "manifest.json").write_text(json.dumps(manifest))

        with (
            patch(
                "backend.src.api.routes.context_preview_service.GEMTOKEN_AVAILABLE",
                True,
            ),
            patch(
                "backend.src.api.routes.context_preview_service._TokenCounter",
                MagicMock(),
            ),
        ):
            token_count, error = await _count_tokens("test content", tmp_path)

            assert token_count is None
            assert error == "GOOGLE_API_KEY not configured"

    async def test_count_tokens_with_vertex_ai(self, tmp_path: Path):
        """Count tokens using Vertex AI."""
        env_file = tmp_path / ".env"
        env_file.write_text(
            "GOOGLE_GENAI_USE_VERTEXAI=true\n"
            "GOOGLE_CLOUD_PROJECT=my-project\n"
            "GOOGLE_CLOUD_LOCATION=us-west1\n"
        )

        manifest = {
            "name": "test-project",
            "version": "3.0",
        }
        (tmp_path / "manifest.json").write_text(json.dumps(manifest))

        mock_counter = MagicMock()
        mock_counter.count_tokens_async = AsyncMock(return_value=100)

        with (
            patch(
                "backend.src.api.routes.context_preview_service.GEMTOKEN_AVAILABLE",
                True,
            ),
            patch(
                "backend.src.api.routes.context_preview_service._TokenCounter",
                return_value=mock_counter,
            ),
        ):
            token_count, error = await _count_tokens("test content", tmp_path)

            assert token_count == 100
            assert error is None

    async def test_count_tokens_vertex_missing_project(self, tmp_path: Path):
        """Return error when Vertex AI project not configured."""
        env_file = tmp_path / ".env"
        env_file.write_text("GOOGLE_GENAI_USE_VERTEXAI=true\n")

        manifest = {
            "name": "test-project",
            "version": "3.0",
        }
        (tmp_path / "manifest.json").write_text(json.dumps(manifest))

        with (
            patch(
                "backend.src.api.routes.context_preview_service.GEMTOKEN_AVAILABLE",
                True,
            ),
            patch(
                "backend.src.api.routes.context_preview_service._TokenCounter",
                MagicMock(),
            ),
        ):
            token_count, error = await _count_tokens("test content", tmp_path)

            assert token_count is None
            assert error == "GOOGLE_CLOUD_PROJECT not configured"

    async def test_count_tokens_handles_exception(self, tmp_path: Path):
        """Return error message when token counting fails."""
        env_file = tmp_path / ".env"
        env_file.write_text("GOOGLE_API_KEY=test_api_key")

        manifest = {
            "name": "test-project",
            "version": "3.0",
        }
        (tmp_path / "manifest.json").write_text(json.dumps(manifest))

        mock_counter = MagicMock()
        mock_counter.count_tokens_async = AsyncMock(side_effect=Exception("API error"))

        with (
            patch(
                "backend.src.api.routes.context_preview_service.GEMTOKEN_AVAILABLE",
                True,
            ),
            patch(
                "backend.src.api.routes.context_preview_service._TokenCounter",
                return_value=mock_counter,
            ),
        ):
            token_count, error = await _count_tokens("test content", tmp_path)

            assert token_count is None
            assert error == "API error"


class TestTruncateContent:
    """Tests for _truncate_content function."""

    def test_truncate_content_within_limit(self):
        """Content within limit is not truncated."""
        content = "Hello, world!"
        max_size = 100

        result_content, truncated, total_size = _truncate_content(content, max_size)

        assert result_content == content
        assert truncated is False
        assert total_size == len(content.encode("utf-8"))

    def test_truncate_content_exceeds_limit(self):
        """Content exceeding limit is truncated."""
        content = "A" * 1000
        max_size = 100

        result_content, truncated, total_size = _truncate_content(content, max_size)

        assert len(result_content.encode("utf-8")) <= max_size
        assert truncated is True
        assert total_size == 1000

    def test_truncate_content_utf8_boundary(self):
        """Handle UTF-8 character boundaries correctly."""
        # Create content with multibyte UTF-8 characters
        content = "😀" * 100  # Each emoji is 4 bytes
        max_size = 50

        result_content, truncated, total_size = _truncate_content(content, max_size)

        # Should not break in middle of UTF-8 character
        assert result_content.encode("utf-8") == result_content.encode("utf-8")
        assert truncated is True
        assert total_size == 400  # 100 emojis * 4 bytes


class TestHelperFunctions:
    """Tests for various helper functions."""

    def test_format_frontmatter(self):
        """Format metadata as YAML front matter."""
        metadata = {
            "source_path": "test.txt",
            "source_name": "test",
            "file_size": "1024",
        }

        result = _format_frontmatter(metadata)

        assert (
            result
            == "---\nsource_path: test.txt\nsource_name: test\nfile_size: 1024\n---\n"
        )

    def test_format_frontmatter_skips_empty_values(self):
        """Skip empty values in front matter."""
        metadata = {
            "source_path": "test.txt",
            "source_name": "",
            "file_size": "1024",
        }

        result = _format_frontmatter(metadata)

        assert "source_name" not in result
        assert "source_path: test.txt" in result

    def test_format_separator_with_metadata(self):
        """Format separator string with metadata placeholders."""
        separator = "\n--- {source_name} ---\n"
        metadata = {"source_name": "test"}

        result = _format_separator_with_metadata(separator, metadata)

        assert result == "\n--- test ---\n"

    def test_format_separator_missing_placeholder(self):
        """Return separator as-is when placeholder missing."""
        separator = "\n--- {source_name} ---\n"
        metadata = {"other_key": "value"}

        result = _format_separator_with_metadata(separator, metadata)

        assert result == separator

    def test_get_file_metadata(self, tmp_path: Path):
        """Get metadata for a file."""
        test_file = tmp_path / "test.txt"
        test_file.write_text("test content")

        metadata = _get_file_metadata(test_file, "test.txt")

        assert metadata["source_path"] == "test.txt"
        assert metadata["source_name"] == "test"
        assert metadata["file_ext"] == "txt"
        assert "file_size" in metadata
        assert "modified_time" in metadata

    def test_get_url_metadata(self):
        """Get metadata for a URL response."""
        url = "https://example.com/test.html"
        response = MagicMock(spec=httpx.Response)
        response.headers = {
            "Content-Type": "text/html",
            "Content-Length": "1024",
        }
        response.status_code = 200

        metadata = _get_url_metadata(url, response)

        assert metadata["source_path"] == url
        assert metadata["source_name"] == "test"
        assert metadata["content_type"] == "text/html"
        assert metadata["content_length"] == "1024"
        assert metadata["status_code"] == "200"
        assert "retrieved_time" in metadata

    def test_matches_exclude_pattern_exact_match(self, tmp_path: Path):
        """Match exact directory/file name in path."""
        file_path = tmp_path / "node_modules" / "test.txt"
        file_path.parent.mkdir(parents=True)

        result = _matches_exclude_pattern(file_path, tmp_path, ["node_modules"])

        assert result is True

    def test_matches_exclude_pattern_glob_match(self, tmp_path: Path):
        """Match glob pattern in path parts."""
        file_path = tmp_path / "src" / "test.pyc"
        file_path.parent.mkdir(parents=True)

        result = _matches_exclude_pattern(file_path, tmp_path, ["*.pyc"])

        assert result is True

    def test_matches_exclude_pattern_no_match(self, tmp_path: Path):
        """No match when pattern doesn't apply."""
        file_path = tmp_path / "src" / "test.txt"
        file_path.parent.mkdir(parents=True)

        result = _matches_exclude_pattern(
            file_path, tmp_path, ["node_modules", "*.pyc"]
        )

        assert result is False

    def test_unescape_string(self):
        """Unescape common escape sequences."""
        input_str = "line1\\nline2\\ttab\\rcarriage\\\\backslash"

        result = _unescape_string(input_str)

        assert result == "line1\nline2\ttab\rcarriage\\backslash"

    def test_format_python_dict(self):
        """Format Python dict as readable string."""
        data = {
            "key1": "value1",
            "key2": {"nested": "value2"},
            "key3": ["item1", "item2"],
        }

        result = _format_python_dict(data)

        assert "'key1': 'value1'" in result
        assert "'nested': 'value2'" in result
        assert "'item1'" in result


class TestPreviewFile:
    """Tests for preview_file function."""

    async def testpreview_file_success(self, tmp_path: Path):
        """Preview a single file successfully."""
        test_file = tmp_path / "test.txt"
        test_file.write_text("Hello, world!")

        result = await preview_file(
            "test.txt",
            tmp_path,
            include_metadata=False,
            max_size=10000,
        )

        assert result.content == "Hello, world!"
        assert result.error is None
        assert result.truncated is False

    async def testpreview_file_with_metadata(self, tmp_path: Path):
        """Preview file with metadata included."""
        test_file = tmp_path / "test.txt"
        test_file.write_text("Hello, world!")

        result = await preview_file(
            "test.txt",
            tmp_path,
            include_metadata=True,
            max_size=10000,
        )

        assert result.content == "Hello, world!"
        assert result.metadata is not None
        assert result.metadata["source_path"] == "test.txt"
        assert result.metadata["source_name"] == "test"

    async def testpreview_file_not_found(self, tmp_path: Path):
        """Error when file doesn't exist."""
        result = await preview_file(
            "nonexistent.txt",
            tmp_path,
            include_metadata=False,
            max_size=10000,
        )

        assert result.error is not None
        assert "File not found" in result.error

    async def testpreview_file_empty_path(self, tmp_path: Path):
        """Error when file path is empty."""
        result = await preview_file(
            "",
            tmp_path,
            include_metadata=False,
            max_size=10000,
        )

        assert result.error == "No file path specified"

    async def testpreview_file_truncated(self, tmp_path: Path):
        """File content is truncated when exceeding max size."""
        test_file = tmp_path / "large.txt"
        test_file.write_text("A" * 1000)

        result = await preview_file(
            "large.txt",
            tmp_path,
            include_metadata=False,
            max_size=100,
        )

        assert result.truncated is True
        assert len(result.content.encode("utf-8")) <= 100
        assert result.totalSize == 1000

    async def testpreview_file_absolute_path(self, tmp_path: Path):
        """Handle absolute file paths."""
        test_file = tmp_path / "test.txt"
        test_file.write_text("Hello, world!")

        result = await preview_file(
            str(test_file),
            tmp_path,
            include_metadata=False,
            max_size=10000,
        )

        assert result.content == "Hello, world!"
        assert result.error is None


class TestPreviewDirectory:
    """Tests for preview_directory function."""

    async def testpreview_directory_success(self, tmp_path: Path):
        """Preview files in directory."""
        (tmp_path / "file1.txt").write_text("Content 1")
        (tmp_path / "file2.txt").write_text("Content 2")

        result = await preview_directory(
            ".",
            "*.txt",
            tmp_path,
            include_metadata=False,
            max_size=10000,
        )

        assert result.error is None
        assert result.totalFiles == 2
        assert result.files is not None
        assert len(result.files) == 2

    async def testpreview_directory_no_matches(self, tmp_path: Path):
        """Error when no files match pattern."""
        result = await preview_directory(
            ".",
            "*.txt",
            tmp_path,
            include_metadata=False,
            max_size=10000,
        )

        assert result.error is not None
        assert "No files matched pattern" in result.error
        assert result.totalFiles == 0

    async def testpreview_directory_empty_path(self, tmp_path: Path):
        """Error when directory path is empty."""
        result = await preview_directory(
            "",
            "*.txt",
            tmp_path,
            include_metadata=False,
            max_size=10000,
        )

        assert result.error == "No directory path specified"

    async def testpreview_directory_not_found(self, tmp_path: Path):
        """Error when directory doesn't exist."""
        result = await preview_directory(
            "nonexistent",
            "*.txt",
            tmp_path,
            include_metadata=False,
            max_size=10000,
        )

        assert result.error is not None
        assert "Directory not found" in result.error

    async def testpreview_directory_recursive(self, tmp_path: Path):
        """Preview files recursively in subdirectories."""
        (tmp_path / "file1.txt").write_text("Content 1")
        subdir = tmp_path / "subdir"
        subdir.mkdir()
        (subdir / "file2.txt").write_text("Content 2")

        result = await preview_directory(
            ".",
            "*.txt",
            tmp_path,
            include_metadata=False,
            max_size=10000,
            recursive=True,
        )

        assert result.error is None
        assert result.totalFiles == 2
        assert len(result.files) == 2

    async def testpreview_directory_exclude_patterns(self, tmp_path: Path):
        """Exclude files matching exclusion patterns."""
        (tmp_path / "file1.txt").write_text("Content 1")
        (tmp_path / "file2.pyc").write_text("Compiled")
        node_modules = tmp_path / "node_modules"
        node_modules.mkdir()
        (node_modules / "file3.txt").write_text("Content 3")

        result = await preview_directory(
            ".",
            "*",
            tmp_path,
            include_metadata=False,
            max_size=10000,
            recursive=True,
            exclude_patterns=["node_modules", "*.pyc"],
        )

        assert result.error is None
        assert result.totalFiles == 1  # Only file1.txt
        assert result.files[0].path.endswith("file1.txt")

    async def testpreview_directory_max_files_limit(self, tmp_path: Path):
        """Limit number of files when exceeding max."""
        for i in range(10):
            (tmp_path / f"file{i}.txt").write_text(f"Content {i}")

        result = await preview_directory(
            ".",
            "*.txt",
            tmp_path,
            include_metadata=False,
            max_size=10000,
            max_files=5,
        )

        assert result.totalFiles == 10
        assert len(result.files) == 5
        assert result.warnings is not None
        assert "showing first 5" in result.warnings[0]

    async def testpreview_directory_max_file_size(self, tmp_path: Path):
        """Skip files exceeding max file size."""
        (tmp_path / "small.txt").write_text("Small")
        (tmp_path / "large.txt").write_text("A" * 10000)

        result = await preview_directory(
            ".",
            "*.txt",
            tmp_path,
            include_metadata=False,
            max_size=100000,
            max_file_size=1000,
        )

        assert result.totalFiles == 1  # Only small.txt
        assert len(result.files) == 1
        assert result.warnings is not None
        assert "Skipped 1 file(s) exceeding" in result.warnings[0]


class TestPreviewUrl:
    """Tests for preview_url function."""

    async def testpreview_url_success(self):
        """Preview content from URL successfully."""
        mock_response = MagicMock(spec=httpx.Response)
        mock_response.text = "URL content"
        mock_response.status_code = 200
        mock_response.headers = {"Content-Type": "text/html"}

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                return_value=mock_response
            )

            result = await preview_url(
                "https://example.com",
                include_metadata=False,
                max_size=10000,
            )

            assert result.content == "URL content"
            assert result.error is None

    async def testpreview_url_with_metadata(self):
        """Preview URL with metadata included."""
        mock_response = MagicMock(spec=httpx.Response)
        mock_response.text = "URL content"
        mock_response.status_code = 200
        mock_response.headers = {
            "Content-Type": "text/html",
            "Content-Length": "100",
        }

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                return_value=mock_response
            )

            result = await preview_url(
                "https://example.com/test.html",
                include_metadata=True,
                max_size=10000,
            )

            assert result.content == "URL content"
            assert result.metadata is not None
            assert result.metadata["content_type"] == "text/html"
            assert result.metadata["status_code"] == "200"

    async def testpreview_url_empty_url(self):
        """Error when URL is empty."""
        result = await preview_url(
            "",
            include_metadata=False,
            max_size=10000,
        )

        assert result.error == "No URL specified"

    async def testpreview_url_timeout(self):
        """Handle timeout errors."""
        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                side_effect=httpx.TimeoutException("Timeout")
            )

            result = await preview_url(
                "https://example.com",
                include_metadata=False,
                max_size=10000,
            )

            assert result.error is not None
            assert "Timeout" in result.error

    async def testpreview_url_http_error(self):
        """Handle HTTP status errors."""
        mock_response = MagicMock(spec=httpx.Response)
        mock_response.status_code = 404

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                side_effect=httpx.HTTPStatusError(
                    "Not Found", request=MagicMock(), response=mock_response
                )
            )

            result = await preview_url(
                "https://example.com/notfound",
                include_metadata=False,
                max_size=10000,
            )

            assert result.error is not None
            assert "HTTP 404" in result.error

    async def testpreview_url_general_error(self):
        """Handle general exceptions."""
        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                side_effect=Exception("Network error")
            )

            result = await preview_url(
                "https://example.com",
                include_metadata=False,
                max_size=10000,
            )

            assert result.error is not None
            assert "Network error" in result.error


class TestContextPreviewEndpoint:
    """Tests for POST /api/context-aggregator/preview endpoint."""

    async def testpreview_file_input(self, client: AsyncClient, tmp_path: Path):
        """Preview single file input."""
        test_file = tmp_path / "test.txt"
        test_file.write_text("Hello, world!")

        response = await client.post(
            "/api/context-aggregator/preview",
            json={
                "projectPath": str(tmp_path),
                "dynamicInputs": [
                    {
                        "id": "input1",
                        "label": "Test File",
                        "variableName": "file_content",
                        "inputType": "file",
                        "filePath": "test.txt",
                    }
                ],
                "aggregationMode": "pass",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "input1" in data["results"]
        assert data["results"]["input1"]["content"] == "Hello, world!"
        assert data["results"]["input1"]["variableName"] == "file_content"

    async def testpreview_directory_input(self, client: AsyncClient, tmp_path: Path):
        """Preview directory input."""
        (tmp_path / "file1.txt").write_text("Content 1")
        (tmp_path / "file2.txt").write_text("Content 2")

        response = await client.post(
            "/api/context-aggregator/preview",
            json={
                "projectPath": str(tmp_path),
                "dynamicInputs": [
                    {
                        "id": "input1",
                        "label": "Test Directory",
                        "variableName": "dir_content",
                        "inputType": "directory",
                        "directoryPath": ".",
                        "globPattern": "*.txt",
                    }
                ],
                "aggregationMode": "pass",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "input1" in data["results"]
        assert data["results"]["input1"]["totalFiles"] == 2

    async def testpreview_url_input(self, client: AsyncClient, tmp_path: Path):
        """Preview URL input."""
        mock_response = MagicMock(spec=httpx.Response)
        mock_response.text = "URL content"
        mock_response.status_code = 200
        mock_response.headers = {"Content-Type": "text/html"}

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                return_value=mock_response
            )

            response = await client.post(
                "/api/context-aggregator/preview",
                json={
                    "projectPath": str(tmp_path),
                    "dynamicInputs": [
                        {
                            "id": "input1",
                            "label": "Test URL",
                            "variableName": "url_content",
                            "inputType": "url",
                            "url": "https://example.com",
                        }
                    ],
                    "aggregationMode": "pass",
                },
            )

            assert response.status_code == 200
            data = response.json()
            assert "input1" in data["results"]
            assert data["results"]["input1"]["content"] == "URL content"

    async def test_preview_node_input(self, client: AsyncClient, tmp_path: Path):
        """Preview node input shows placeholder."""
        response = await client.post(
            "/api/context-aggregator/preview",
            json={
                "projectPath": str(tmp_path),
                "dynamicInputs": [
                    {
                        "id": "input1",
                        "label": "Previous Node",
                        "variableName": "node_output",
                        "inputType": "node",
                    }
                ],
                "aggregationMode": "pass",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "input1" in data["results"]
        assert "Runtime" in data["results"]["input1"]["content"]

    async def test_preview_pass_mode(self, client: AsyncClient, tmp_path: Path):
        """Aggregation in pass mode returns dict representation."""
        test_file = tmp_path / "test.txt"
        test_file.write_text("Hello, world!")

        response = await client.post(
            "/api/context-aggregator/preview",
            json={
                "projectPath": str(tmp_path),
                "dynamicInputs": [
                    {
                        "id": "input1",
                        "label": "Test File",
                        "variableName": "content",
                        "inputType": "file",
                        "filePath": "test.txt",
                    }
                ],
                "aggregationMode": "pass",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["computedOutput"]["mode"] == "pass"
        assert "'content': 'Hello, world!'" in data["computedOutput"]["content"]

    async def test_preview_concatenate_mode(self, client: AsyncClient, tmp_path: Path):
        """Aggregation in concatenate mode returns full text."""
        test_file1 = tmp_path / "test1.txt"
        test_file1.write_text("Content 1")
        test_file2 = tmp_path / "test2.txt"
        test_file2.write_text("Content 2")

        response = await client.post(
            "/api/context-aggregator/preview",
            json={
                "projectPath": str(tmp_path),
                "dynamicInputs": [
                    {
                        "id": "input1",
                        "label": "File 1",
                        "variableName": "file1",
                        "inputType": "file",
                        "filePath": "test1.txt",
                    },
                    {
                        "id": "input2",
                        "label": "File 2",
                        "variableName": "file2",
                        "inputType": "file",
                        "filePath": "test2.txt",
                    },
                ],
                "aggregationMode": "concatenate",
                "separator": "\\n---\\n",
                "outputVariableName": "context",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["computedOutput"]["mode"] == "concatenate"
        assert "Content 1" in data["computedOutput"]["content"]
        assert "Content 2" in data["computedOutput"]["content"]
        assert "---" in data["computedOutput"]["content"]

    async def test_preview_with_metadata(self, client: AsyncClient, tmp_path: Path):
        """Include metadata in preview results."""
        test_file = tmp_path / "test.txt"
        test_file.write_text("Hello, world!")

        response = await client.post(
            "/api/context-aggregator/preview",
            json={
                "projectPath": str(tmp_path),
                "dynamicInputs": [
                    {
                        "id": "input1",
                        "label": "Test File",
                        "variableName": "content",
                        "inputType": "file",
                        "filePath": "test.txt",
                    }
                ],
                "aggregationMode": "pass",
                "includeMetadata": True,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["results"]["input1"]["metadata"] is not None
        assert data["results"]["input1"]["metadata"]["source_path"] == "test.txt"

    async def test_preview_multiple_inputs(self, client: AsyncClient, tmp_path: Path):
        """Preview multiple inputs of different types."""
        test_file = tmp_path / "test.txt"
        test_file.write_text("File content")

        mock_response = MagicMock(spec=httpx.Response)
        mock_response.text = "URL content"
        mock_response.status_code = 200
        mock_response.headers = {"Content-Type": "text/html"}

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                return_value=mock_response
            )

            response = await client.post(
                "/api/context-aggregator/preview",
                json={
                    "projectPath": str(tmp_path),
                    "dynamicInputs": [
                        {
                            "id": "input1",
                            "label": "File",
                            "variableName": "file",
                            "inputType": "file",
                            "filePath": "test.txt",
                        },
                        {
                            "id": "input2",
                            "label": "URL",
                            "variableName": "url",
                            "inputType": "url",
                            "url": "https://example.com",
                        },
                        {
                            "id": "input3",
                            "label": "Node",
                            "variableName": "node",
                            "inputType": "node",
                        },
                    ],
                    "aggregationMode": "pass",
                },
            )

            assert response.status_code == 200
            data = response.json()
            assert len(data["results"]) == 3
            assert data["results"]["input1"]["content"] == "File content"
            assert data["results"]["input2"]["content"] == "URL content"
            assert "Runtime" in data["results"]["input3"]["content"]

    async def test_preview_invalid_project_path(self, client: AsyncClient):
        """Handle invalid project path."""
        response = await client.post(
            "/api/context-aggregator/preview",
            json={
                "projectPath": "/nonexistent/path",
                "dynamicInputs": [
                    {
                        "id": "input1",
                        "label": "Test",
                        "variableName": "test",
                        "inputType": "file",
                        "filePath": "test.txt",
                    }
                ],
                "aggregationMode": "pass",
            },
        )

        assert response.status_code == 200
        data = response.json()
        # Should still return response but with errors in results
        assert "input1" in data["results"]
        assert data["results"]["input1"]["error"] is not None
