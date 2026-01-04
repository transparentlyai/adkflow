"""ContextAggregator FlowUnit - collects context from multiple sources.

This builtin FlowUnit aggregates content from files, directories, URLs,
and connected nodes into named variables for Agent template substitution.
"""

import glob as glob_module
from datetime import datetime
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Any, Literal

import httpx

from adkflow_runner.extensions.flow_unit import (
    ExecutionContext,
    FieldDefinition,
    FlowUnit,
    PortDefinition,
    UISchema,
    WidgetType,
)


class ContextAggregatorUnit(FlowUnit):
    """Collects context from files, directories, URLs, and connected nodes.

    Aggregates content into named variables for Agent template substitution.
    Supports two aggregation modes:
    - pass: Each input gets its own variable
    - concatenate: All inputs are joined into a single variable
    """

    UNIT_ID = "builtin.context_aggregator"
    UI_LABEL = "Context Aggregator"
    MENU_LOCATION = "Content/Context Aggregator"
    DESCRIPTION = "Collects context from multiple sources into named variables"
    VERSION = "1.0.0"

    OUTPUT_NODE = False
    ALWAYS_EXECUTE = True  # Content may change, always re-execute

    @classmethod
    def setup_interface(cls) -> UISchema:
        """Define UI schema - mostly handled by dynamic inputs on frontend."""
        return UISchema(
            inputs=[],  # Dynamic inputs handled separately
            outputs=[
                PortDefinition(
                    id="output",
                    label="Variables",
                    source_type="context_aggregator",
                    data_type="dict",
                    required=True,
                    multiple=False,
                )
            ],
            fields=[
                FieldDefinition(
                    id="aggregationMode",
                    label="Aggregation Mode",
                    widget=WidgetType.SELECT,
                    default="pass",
                    options=[
                        {"value": "pass", "label": "Pass (each input → own variable)"},
                        {
                            "value": "concatenate",
                            "label": "Concatenate (all → single variable)",
                        },
                    ],
                ),
                FieldDefinition(
                    id="outputVariableName",
                    label="Output Variable Name",
                    widget=WidgetType.TEXT_INPUT,
                    default="context",
                    show_if={"aggregationMode": "concatenate"},
                ),
                FieldDefinition(
                    id="separator",
                    label="Separator",
                    widget=WidgetType.TEXT_INPUT,
                    default="\n\n---",
                    show_if={"aggregationMode": "concatenate"},
                ),
                FieldDefinition(
                    id="includeMetadata",
                    label="Include Metadata",
                    widget=WidgetType.CHECKBOX,
                    default=False,
                    help_text="Add source metadata (path, name, timestamps) to content",
                ),
            ],
            color="#10b981",
            icon="database",
            expandable=True,
            default_width=400,
            default_height=350,
        )

    async def run_process(
        self,
        inputs: dict[str, Any],
        config: dict[str, Any],
        context: ExecutionContext,
    ) -> dict[str, Any]:
        """Process all dynamic inputs and aggregate into output variables."""

        dynamic_inputs = config.get("dynamicInputs", [])
        aggregation_mode: Literal["pass", "concatenate"] = config.get(
            "aggregationMode", "pass"
        )
        separator = config.get("separator", "\n\n---")
        output_var_name = config.get("outputVariableName", "context")
        include_metadata = config.get("includeMetadata", False)

        # Unescape separator (handle \\n -> \n)
        separator = separator.replace("\\n", "\n").replace("\\t", "\t")

        variables: dict[str, str] = {}
        # For concatenate mode: list of (content, metadata) tuples
        all_items: list[tuple[str, dict[str, str] | None]] = []

        for di in dynamic_inputs:
            input_type = di.get("inputType")
            var_name = di.get("variableName", di.get("id"))

            if input_type == "file":
                content, metadata = await self._read_file(
                    di.get("filePath", ""),
                    context.project_path,
                    include_metadata,
                )
                if aggregation_mode == "pass":
                    if metadata:
                        content = self._format_frontmatter(metadata) + content
                    variables[var_name] = content
                else:
                    all_items.append((content, metadata))

            elif input_type == "directory":
                contents = await self._read_directory(
                    di.get("directoryPath", ""),
                    di.get("globPattern", "*"),
                    di.get("directoryAggregation", "concatenate"),
                    di.get("namingPattern", "file_name"),
                    di.get("customPattern", "{base}_{file_name}"),
                    di.get("directorySeparator", "\n\n---")
                    .replace("\\n", "\n")
                    .replace("\\t", "\t"),
                    var_name,
                    context.project_path,
                    include_metadata,
                )
                if aggregation_mode == "pass":
                    for v_name, (content, metadata) in contents.items():
                        if metadata:
                            content = self._format_frontmatter(metadata) + content
                        variables[v_name] = content
                else:
                    all_items.extend(contents.values())

            elif input_type == "url":
                content, metadata = await self._fetch_url(
                    di.get("url", ""), include_metadata
                )
                if aggregation_mode == "pass":
                    if metadata:
                        content = self._format_frontmatter(metadata) + content
                    variables[var_name] = content
                else:
                    all_items.append((content, metadata))

            elif input_type == "node":
                # Get from inputs (connected node output)
                input_id = di.get("id")
                content = inputs.get(input_id, "")
                if isinstance(content, str):
                    metadata = None
                    if include_metadata:
                        # Get source info from inputs if available
                        source_name = di.get("label", var_name)
                        metadata = self._get_node_metadata(source_name, input_id)

                    if aggregation_mode == "pass":
                        if metadata:
                            content = self._format_frontmatter(metadata) + content
                        variables[var_name] = content
                    else:
                        all_items.append((content, metadata))

        if aggregation_mode == "concatenate":
            # Check if any items have metadata
            has_metadata = any(m for _, m in all_items)
            if has_metadata:
                # Build output with formatted separators
                parts = []
                for i, (content, metadata) in enumerate(all_items):
                    if i > 0:
                        if metadata:
                            formatted_sep = self._format_separator_with_metadata(
                                separator, metadata
                            )
                            parts.append(formatted_sep)
                        else:
                            parts.append(separator)
                    parts.append(content)
                variables = {output_var_name: "".join(parts)}
            else:
                variables = {output_var_name: separator.join(c for c, _ in all_items)}

        return {"output": variables}

    async def _read_file(
        self, file_path: str, project_path: Path, include_metadata: bool = False
    ) -> tuple[str, dict[str, str] | None]:
        """Read content from a file.

        Args:
            file_path: Path to the file (relative to project or absolute)
            project_path: Path to the project root
            include_metadata: Whether to collect file metadata

        Returns:
            Tuple of (content, metadata dict or None)
        """
        if not file_path:
            return "", None

        # Track the relative path for metadata
        relative_path = file_path

        # Try both relative to project and absolute paths
        full_path = project_path / file_path
        if not full_path.exists():
            # Try absolute path
            full_path = Path(file_path)
            if not full_path.exists():
                return f"[File not found: {file_path}]", None

        try:
            content = full_path.read_text(encoding="utf-8")
            metadata = None
            if include_metadata:
                metadata = self._get_file_metadata(full_path, relative_path)
            return content, metadata
        except Exception as e:
            return f"[Error reading {file_path}: {e}]", None

    async def _read_directory(
        self,
        directory_path: str,
        glob_pattern: str,
        aggregation: str,
        naming_pattern: str,
        custom_pattern: str,
        separator: str,
        base_var_name: str,
        project_path: Path,
        include_metadata: bool = False,
    ) -> dict[str, tuple[str, dict[str, str] | None]]:
        """Read files from a directory with glob pattern.

        Args:
            directory_path: Path to the directory
            glob_pattern: Glob pattern to match files
            aggregation: "pass" or "concatenate"
            naming_pattern: How to name variables in pass mode
            custom_pattern: Custom pattern for variable names
            separator: Separator for concatenation
            base_var_name: Base variable name
            project_path: Path to project root
            include_metadata: Whether to include file metadata

        Returns:
            Dict mapping variable names to (content, metadata) tuples
        """
        if not directory_path:
            return {}

        # Try both relative to project and absolute paths
        full_dir = project_path / directory_path
        if not full_dir.exists():
            full_dir = Path(directory_path)
            if not full_dir.exists():
                return {
                    base_var_name: (f"[Directory not found: {directory_path}]", None)
                }

        pattern = str(full_dir / glob_pattern)
        files = sorted(glob_module.glob(pattern, recursive=True))

        # Filter out directories, keep only files
        files = [f for f in files if Path(f).is_file()]

        if not files:
            return {base_var_name: (f"[No files matched: {glob_pattern}]", None)}

        total_files = len(files)

        if aggregation == "concatenate":
            # Concatenate mode - collect all contents with per-file metadata
            contents_with_meta: list[tuple[str, dict[str, str] | None]] = []
            for i, f in enumerate(files):
                file_path = Path(f)
                relative_path = str(file_path.relative_to(project_path))
                try:
                    content = file_path.read_text(encoding="utf-8")
                    metadata = None
                    if include_metadata:
                        metadata = self._get_file_metadata(file_path, relative_path)
                        metadata["file_index"] = str(i)
                        metadata["total_files"] = str(total_files)
                    contents_with_meta.append((content, metadata))
                except Exception:
                    pass

            # For concatenate with metadata, build the output with formatted separators
            if include_metadata and any(m for _, m in contents_with_meta):
                parts = []
                for i, (content, metadata) in enumerate(contents_with_meta):
                    if i > 0 and metadata:
                        formatted_sep = self._format_separator_with_metadata(
                            separator, metadata
                        )
                        parts.append(formatted_sep)
                    elif i > 0:
                        parts.append(separator)
                    parts.append(content)
                return {base_var_name: ("".join(parts), None)}
            else:
                return {
                    base_var_name: (
                        separator.join(c for c, _ in contents_with_meta),
                        None,
                    )
                }
        else:
            # Pass mode - each file gets its own variable
            result: dict[str, tuple[str, dict[str, str] | None]] = {}
            for i, f in enumerate(files):
                file_path = Path(f)
                relative_path = str(file_path.relative_to(project_path))
                try:
                    content = file_path.read_text(encoding="utf-8")
                    metadata = None
                    if include_metadata:
                        metadata = self._get_file_metadata(file_path, relative_path)
                        metadata["file_index"] = str(i)
                        metadata["total_files"] = str(total_files)
                except Exception as e:
                    content = f"[Error: {e}]"
                    metadata = None

                # Generate variable name based on pattern
                if naming_pattern == "file_name":
                    var_name = f"{base_var_name}_{file_path.stem}"
                elif naming_pattern == "number":
                    var_name = f"{base_var_name}_{i}"
                else:
                    # Custom pattern
                    var_name = custom_pattern.format(
                        file_name=file_path.stem,
                        file_ext=file_path.suffix.lstrip("."),
                        number=i,
                        base=base_var_name,
                    )

                result[var_name] = (content, metadata)
            return result

    async def _fetch_url(
        self, url: str, include_metadata: bool = False
    ) -> tuple[str, dict[str, str] | None]:
        """Fetch content from a URL.

        Args:
            url: URL to fetch
            include_metadata: Whether to collect metadata

        Returns:
            Tuple of (content, metadata dict or None)
        """
        if not url:
            return "", None

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, timeout=30.0, follow_redirects=True)
                response.raise_for_status()
                content = response.text

                metadata = None
                if include_metadata:
                    metadata = self._get_url_metadata(url, response)

                return content, metadata
        except httpx.TimeoutException:
            return f"[Timeout fetching {url}]", None
        except httpx.HTTPStatusError as e:
            return f"[HTTP {e.response.status_code} from {url}]", None
        except Exception as e:
            return f"[Error fetching {url}: {e}]", None

    # -------------------------------------------------------------------------
    # Metadata extraction helpers
    # -------------------------------------------------------------------------

    def _get_file_metadata(self, file_path: Path, relative_path: str) -> dict[str, str]:
        """Get metadata for a file.

        Args:
            file_path: Absolute path to the file
            relative_path: Relative path from project root

        Returns:
            Dictionary with file metadata
        """
        stat = file_path.stat()
        return {
            "source_path": relative_path,
            "source_name": file_path.stem,
            "file_ext": file_path.suffix.lstrip("."),
            "file_size": str(stat.st_size),
            "modified_time": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        }

    def _get_url_metadata(self, url: str, response: httpx.Response) -> dict[str, str]:
        """Get metadata for a URL response.

        Args:
            url: The URL that was fetched
            response: The HTTP response object

        Returns:
            Dictionary with URL metadata
        """
        retrieved_time = datetime.now().isoformat()

        # Try to parse Last-Modified header
        last_modified = response.headers.get("Last-Modified")
        if last_modified:
            try:
                modified_time = parsedate_to_datetime(last_modified).isoformat()
            except Exception:
                modified_time = retrieved_time
        else:
            modified_time = retrieved_time

        # Extract source name from URL path
        url_path = url.split("?")[0].split("/")[-1] or "url"
        source_name = url_path.rsplit(".", 1)[0] if "." in url_path else url_path

        return {
            "source_path": url,
            "source_name": source_name,
            "content_type": response.headers.get("Content-Type", ""),
            "content_length": response.headers.get("Content-Length", ""),
            "status_code": str(response.status_code),
            "modified_time": modified_time,
            "retrieved_time": retrieved_time,
        }

    def _get_node_metadata(self, source_name: str, source_id: str) -> dict[str, str]:
        """Get metadata for a node input.

        Args:
            source_name: Display name of the connected node
            source_id: ID of the connected node

        Returns:
            Dictionary with node metadata
        """
        return {
            "source_name": source_name,
            "source_id": source_id,
            "retrieved_time": datetime.now().isoformat(),
        }

    def _format_frontmatter(self, metadata: dict[str, str]) -> str:
        """Format metadata as YAML front matter.

        Args:
            metadata: Dictionary of metadata key-value pairs

        Returns:
            YAML front matter string with trailing newline
        """
        lines = ["---"]
        for key, value in metadata.items():
            if value:  # Only include non-empty values
                lines.append(f"{key}: {value}")
        lines.append("---\n")
        return "\n".join(lines)

    def _format_separator_with_metadata(
        self, separator: str, metadata: dict[str, str]
    ) -> str:
        """Format separator string with metadata variables.

        Args:
            separator: Separator template with {variable} placeholders
            metadata: Dictionary of metadata values

        Returns:
            Formatted separator with variables replaced
        """
        try:
            return separator.format(**metadata)
        except KeyError:
            # If some placeholders aren't available, just return the separator as-is
            return separator
