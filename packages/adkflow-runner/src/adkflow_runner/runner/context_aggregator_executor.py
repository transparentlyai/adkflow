"""Context Aggregator Executor.

Executes context aggregator nodes as built-in nodes, collecting content from
files, directories, URLs, and connected nodes into named variables for
Agent template substitution.
"""

import glob as glob_module
from datetime import datetime
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Any, Literal

import httpx

from adkflow_runner.ir import ContextAggregatorIR
from adkflow_runner.logging import get_logger

_log = get_logger("runner.context_aggregator")


async def execute_context_aggregator(
    ir: ContextAggregatorIR,
    project_path: str,
    node_inputs: dict[str, Any],
) -> dict[str, Any]:
    """Execute a context aggregator and return output variables.

    Args:
        ir: The context aggregator IR
        project_path: Path to the project root
        node_inputs: Values from connected nodes (for "node" type inputs)

    Returns:
        Dict with "output" key containing {variable_name: content} mapping
    """
    config = ir.config
    dynamic_inputs = config.get("dynamicInputs", [])
    aggregation_mode: Literal["pass", "concatenate"] = config.get(
        "aggregationMode", "pass"
    )
    separator = config.get("separator", "\n\n---")
    output_var_name = config.get("outputVariableName", "context")
    include_metadata = config.get("includeMetadata", False)

    # Unescape separator (handle \\n -> \n)
    separator = separator.replace("\\n", "\n").replace("\\t", "\t")

    project_path_obj = Path(project_path)
    variables: dict[str, str] = {}
    # For concatenate mode: list of (content, metadata) tuples
    all_items: list[tuple[str, dict[str, str] | None]] = []

    _log.debug(
        "Executing context aggregator",
        node_id=ir.id,
        name=ir.name,
        dynamic_inputs=len(dynamic_inputs),
        aggregation_mode=aggregation_mode,
    )

    for di in dynamic_inputs:
        input_type = di.get("inputType")
        var_name = di.get("variableName", di.get("id"))

        if input_type == "file":
            content, metadata = await _read_file(
                di.get("filePath", ""),
                project_path_obj,
                include_metadata,
            )
            if aggregation_mode == "pass":
                if metadata:
                    content = _format_frontmatter(metadata) + content
                variables[var_name] = content
            else:
                all_items.append((content, metadata))

        elif input_type == "directory":
            contents = await _read_directory(
                di.get("directoryPath", ""),
                di.get("globPattern", "*"),
                di.get("directoryAggregation", "concatenate"),
                di.get("namingPattern", "file_name"),
                di.get("customPattern", "{base}_{file_name}"),
                di.get("directorySeparator", "\n\n---")
                .replace("\\n", "\n")
                .replace("\\t", "\t"),
                var_name,
                project_path_obj,
                include_metadata,
                recursive=di.get("recursive", False),
                exclude_patterns=di.get("excludePatterns"),
                max_files=di.get("maxFiles", 100),
                max_file_size=di.get("maxFileSize", 1048576),
            )
            if aggregation_mode == "pass":
                for v_name, (content, metadata) in contents.items():
                    if metadata:
                        content = _format_frontmatter(metadata) + content
                    variables[v_name] = content
            else:
                all_items.extend(contents.values())

        elif input_type == "url":
            content, metadata = await _fetch_url(di.get("url", ""), include_metadata)
            if aggregation_mode == "pass":
                if metadata:
                    content = _format_frontmatter(metadata) + content
                variables[var_name] = content
            else:
                all_items.append((content, metadata))

        elif input_type == "node":
            # Get from inputs (connected node output)
            input_id = di.get("id")
            content = node_inputs.get(input_id, "")
            if isinstance(content, str):
                metadata = None
                if include_metadata:
                    # Get source info from inputs if available
                    source_name = di.get("label", var_name)
                    metadata = _get_node_metadata(source_name, input_id)

                if aggregation_mode == "pass":
                    if metadata:
                        content = _format_frontmatter(metadata) + content
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
                        formatted_sep = _format_separator_with_metadata(
                            separator, metadata
                        )
                        parts.append(formatted_sep)
                    else:
                        parts.append(separator)
                parts.append(content)
            variables = {output_var_name: "".join(parts)}
        else:
            variables = {output_var_name: separator.join(c for c, _ in all_items)}

    _log.debug(
        "Context aggregator complete",
        node_id=ir.id,
        variables=list(variables.keys()),
    )

    return {"output": variables}


# -----------------------------------------------------------------------------
# File reading
# -----------------------------------------------------------------------------


async def _read_file(
    file_path: str, project_path: Path, include_metadata: bool = False
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
            metadata = _get_file_metadata(full_path, relative_path)
        return content, metadata
    except UnicodeDecodeError:
        # Try latin-1 as fallback
        try:
            content = full_path.read_text(encoding="latin-1")
            metadata = None
            if include_metadata:
                metadata = _get_file_metadata(full_path, relative_path)
            return content, metadata
        except Exception as e:
            return f"[Error reading {file_path}: {e}]", None
    except Exception as e:
        return f"[Error reading {file_path}: {e}]", None


# -----------------------------------------------------------------------------
# Directory reading
# -----------------------------------------------------------------------------


def _matches_exclude_pattern(
    file_path: Path, base_dir: Path, patterns: list[str]
) -> bool:
    """Check if a file path matches any exclusion pattern.

    Args:
        file_path: Absolute path to the file
        base_dir: Base directory for relative path computation
        patterns: List of patterns to check (e.g., ".git", "node_modules")

    Returns:
        True if the file should be excluded
    """
    try:
        rel_path = file_path.relative_to(base_dir)
    except ValueError:
        return False

    rel_parts = rel_path.parts
    for pattern in patterns:
        # Check if pattern matches any component of the path
        if pattern in rel_parts:
            return True
        # Also support glob-like patterns (e.g., "*.pyc")
        if any(Path(part).match(pattern) for part in rel_parts):
            return True
    return False


def _check_limits(
    files: list[Path], max_files: int, max_file_size: int
) -> tuple[list[Path], str | None]:
    """Check and enforce file/size limits.

    Args:
        files: List of file paths to check
        max_files: Maximum number of files allowed
        max_file_size: Maximum size per file in bytes

    Returns:
        Tuple of (filtered_files, warning_message or None)
    """
    warning = None
    skipped_large = 0

    # Filter out files that exceed the per-file size limit
    size_filtered_files = []
    for f in files:
        try:
            file_size = f.stat().st_size
            if file_size > max_file_size:
                skipped_large += 1
            else:
                size_filtered_files.append(f)
        except OSError:
            continue

    if skipped_large > 0:
        warning = (
            f"[Warning: Skipped {skipped_large} file(s) "
            f"exceeding {max_file_size // 1024}KB]"
        )

    # Apply file count limit
    if len(size_filtered_files) > max_files:
        count_warning = (
            f"[Warning: Found {len(size_filtered_files)} files, limited to {max_files}]"
        )
        if warning:
            warning = f"{warning} {count_warning}"
        else:
            warning = count_warning
        size_filtered_files = size_filtered_files[:max_files]

    return size_filtered_files, warning


def _sanitize_relative_path(rel_path: str) -> str:
    """Sanitize relative path for use in variable names.

    Replaces / and \\ with _ to create valid variable names.
    Removes the file extension from the final segment.

    Args:
        rel_path: Relative path string

    Returns:
        Sanitized path string
    """
    path = Path(rel_path)
    sanitized = str(path.with_suffix("")).replace("/", "_").replace("\\", "_")
    return sanitized


def _get_relative_path(file_path: Path, project_path: Path, fallback_dir: Path) -> str:
    """Get relative path for metadata, handling files outside project.

    Tries to compute path relative to project, falls back to relative to
    the directory being read, or absolute path as last resort.

    Args:
        file_path: Absolute path to the file
        project_path: Project root path
        fallback_dir: Directory being read (for files outside project)

    Returns:
        Best available relative path string
    """
    try:
        return str(file_path.relative_to(project_path))
    except ValueError:
        # File is outside project - try relative to the directory being read
        try:
            return str(file_path.relative_to(fallback_dir))
        except ValueError:
            # Last resort: use absolute path
            return str(file_path)


async def _read_directory(
    directory_path: str,
    glob_pattern: str,
    aggregation: str,
    naming_pattern: str,
    custom_pattern: str,
    separator: str,
    base_var_name: str,
    project_path: Path,
    include_metadata: bool = False,
    recursive: bool = False,
    exclude_patterns: list[str] | None = None,
    max_files: int = 100,
    max_file_size: int = 1048576,
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
        recursive: Whether to scan subdirectories
        exclude_patterns: Patterns to exclude (e.g., ".git", "node_modules")
        max_files: Maximum number of files to include
        max_file_size: Maximum size per file in bytes

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
            return {base_var_name: (f"[Directory not found: {directory_path}]", None)}

    # Handle recursive mode - prepend **/ if not already recursive
    effective_pattern = glob_pattern
    if recursive and not glob_pattern.startswith("**/"):
        effective_pattern = f"**/{glob_pattern}"

    pattern = str(full_dir / effective_pattern)
    files = sorted(glob_module.glob(pattern, recursive=True))

    # Filter out directories, keep only files
    files = [Path(f) for f in files if Path(f).is_file()]

    # Apply exclusion patterns
    if exclude_patterns:
        files = [
            f
            for f in files
            if not _matches_exclude_pattern(f, full_dir, exclude_patterns)
        ]

    if not files:
        return {base_var_name: (f"[No files matched: {glob_pattern}]", None)}

    # Apply limits
    files, limit_warning = _check_limits(files, max_files, max_file_size)

    total_files = len(files)

    if aggregation == "concatenate":
        # Concatenate mode - collect all contents with per-file metadata
        contents_with_meta: list[tuple[str, dict[str, str] | None]] = []

        if limit_warning:
            contents_with_meta.append((limit_warning, None))

        for i, file_path in enumerate(files):
            # Compute relative path from base directory for metadata
            try:
                rel_to_dir = file_path.relative_to(full_dir)
            except ValueError:
                rel_to_dir = Path(file_path.name)

            relative_path = _get_relative_path(file_path, project_path, full_dir)
            sanitized_rel_path = _sanitize_relative_path(str(rel_to_dir))

            try:
                content = file_path.read_text(encoding="utf-8")
                metadata = None
                if include_metadata:
                    metadata = _get_file_metadata(file_path, relative_path)
                    metadata["file_index"] = str(i)
                    metadata["total_files"] = str(total_files)
                    metadata["relative_path"] = sanitized_rel_path
                contents_with_meta.append((content, metadata))
            except UnicodeDecodeError:
                # Try latin-1 as fallback
                try:
                    content = file_path.read_text(encoding="latin-1")
                    metadata = None
                    if include_metadata:
                        metadata = _get_file_metadata(file_path, relative_path)
                        metadata["file_index"] = str(i)
                        metadata["total_files"] = str(total_files)
                        metadata["relative_path"] = sanitized_rel_path
                    contents_with_meta.append((content, metadata))
                except Exception:
                    pass
            except Exception:
                pass

        # For concatenate with metadata, build the output with formatted separators
        if include_metadata and any(m for _, m in contents_with_meta):
            parts = []
            for i, (content, metadata) in enumerate(contents_with_meta):
                if i > 0 and metadata:
                    formatted_sep = _format_separator_with_metadata(separator, metadata)
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

        if limit_warning:
            result[f"{base_var_name}_warning"] = (limit_warning, None)

        for i, file_path in enumerate(files):
            # Compute relative path from base directory
            try:
                rel_to_dir = file_path.relative_to(full_dir)
            except ValueError:
                rel_to_dir = Path(file_path.name)

            relative_path = _get_relative_path(file_path, project_path, full_dir)
            sanitized_rel_path = _sanitize_relative_path(str(rel_to_dir))

            try:
                content = file_path.read_text(encoding="utf-8")
                metadata = None
                if include_metadata:
                    metadata = _get_file_metadata(file_path, relative_path)
                    metadata["file_index"] = str(i)
                    metadata["total_files"] = str(total_files)
                    metadata["relative_path"] = sanitized_rel_path
            except UnicodeDecodeError:
                # Try latin-1 as fallback
                try:
                    content = file_path.read_text(encoding="latin-1")
                    metadata = None
                    if include_metadata:
                        metadata = _get_file_metadata(file_path, relative_path)
                        metadata["file_index"] = str(i)
                        metadata["total_files"] = str(total_files)
                        metadata["relative_path"] = sanitized_rel_path
                except Exception as e:
                    content = f"[Error: {e}]"
                    metadata = None
            except Exception as e:
                content = f"[Error: {e}]"
                metadata = None

            # Generate variable name based on pattern
            if naming_pattern == "file_name":
                var_name = f"{base_var_name}_{file_path.stem}"
            elif naming_pattern == "number":
                var_name = f"{base_var_name}_{i}"
            else:
                # Custom pattern - now includes relative_path
                var_name = custom_pattern.format(
                    file_name=file_path.stem,
                    file_ext=file_path.suffix.lstrip("."),
                    number=i,
                    base=base_var_name,
                    relative_path=sanitized_rel_path,
                )

            result[var_name] = (content, metadata)
        return result


# -----------------------------------------------------------------------------
# URL fetching
# -----------------------------------------------------------------------------


async def _fetch_url(
    url: str, include_metadata: bool = False
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
                metadata = _get_url_metadata(url, response)

            return content, metadata
    except httpx.TimeoutException:
        return f"[Timeout fetching {url}]", None
    except httpx.HTTPStatusError as e:
        return f"[HTTP {e.response.status_code} from {url}]", None
    except Exception as e:
        return f"[Error fetching {url}: {e}]", None


# -----------------------------------------------------------------------------
# Metadata extraction helpers
# -----------------------------------------------------------------------------


def _get_file_metadata(file_path: Path, relative_path: str) -> dict[str, str]:
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


def _get_url_metadata(url: str, response: httpx.Response) -> dict[str, str]:
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


def _get_node_metadata(source_name: str, source_id: str) -> dict[str, str]:
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


def _format_frontmatter(metadata: dict[str, str]) -> str:
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


def _format_separator_with_metadata(separator: str, metadata: dict[str, str]) -> str:
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
