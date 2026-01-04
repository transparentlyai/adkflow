"""ContextAggregator FlowUnit - collects context from multiple sources.

This builtin FlowUnit aggregates content from files, directories, URLs,
and connected nodes into named variables for Agent template substitution.
"""

import glob as glob_module
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
                    default="\n\n",
                    show_if={"aggregationMode": "concatenate"},
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
        separator = config.get("separator", "\n\n")
        output_var_name = config.get("outputVariableName", "context")

        # Unescape separator (handle \\n -> \n)
        separator = separator.replace("\\n", "\n").replace("\\t", "\t")

        variables: dict[str, str] = {}
        all_values: list[str] = []

        for di in dynamic_inputs:
            input_type = di.get("inputType")
            var_name = di.get("variableName", di.get("id"))

            if input_type == "file":
                content = await self._read_file(
                    di.get("filePath", ""),
                    context.project_path,
                )
                if aggregation_mode == "pass":
                    variables[var_name] = content
                else:
                    all_values.append(content)

            elif input_type == "directory":
                contents = await self._read_directory(
                    di.get("directoryPath", ""),
                    di.get("globPattern", "*"),
                    di.get("directoryAggregation", "concatenate"),
                    di.get("namingPattern", "file_name"),
                    di.get("customPattern", "{base}_{file_name}"),
                    di.get("directorySeparator", "\n\n").replace("\\n", "\n"),
                    var_name,
                    context.project_path,
                )
                if aggregation_mode == "pass":
                    variables.update(contents)
                else:
                    all_values.extend(contents.values())

            elif input_type == "url":
                content = await self._fetch_url(di.get("url", ""))
                if aggregation_mode == "pass":
                    variables[var_name] = content
                else:
                    all_values.append(content)

            elif input_type == "node":
                # Get from inputs (connected node output)
                input_id = di.get("id")
                content = inputs.get(input_id, "")
                if isinstance(content, str):
                    if aggregation_mode == "pass":
                        variables[var_name] = content
                    else:
                        all_values.append(content)

        if aggregation_mode == "concatenate":
            variables = {output_var_name: separator.join(all_values)}

        return {"output": variables}

    async def _read_file(self, file_path: str, project_path: Path) -> str:
        """Read content from a file."""
        if not file_path:
            return ""

        # Try both relative to project and absolute paths
        full_path = project_path / file_path
        if not full_path.exists():
            # Try absolute path
            full_path = Path(file_path)
            if not full_path.exists():
                return f"[File not found: {file_path}]"

        try:
            return full_path.read_text(encoding="utf-8")
        except Exception as e:
            return f"[Error reading {file_path}: {e}]"

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
    ) -> dict[str, str]:
        """Read files from a directory with glob pattern."""
        if not directory_path:
            return {}

        # Try both relative to project and absolute paths
        full_dir = project_path / directory_path
        if not full_dir.exists():
            full_dir = Path(directory_path)
            if not full_dir.exists():
                return {base_var_name: f"[Directory not found: {directory_path}]"}

        pattern = str(full_dir / glob_pattern)
        files = sorted(glob_module.glob(pattern, recursive=True))

        # Filter out directories, keep only files
        files = [f for f in files if Path(f).is_file()]

        if not files:
            return {base_var_name: f"[No files matched: {glob_pattern}]"}

        if aggregation == "concatenate":
            contents = []
            for f in files:
                try:
                    contents.append(Path(f).read_text(encoding="utf-8"))
                except Exception:
                    pass
            return {base_var_name: separator.join(contents)}
        else:
            # Pass mode - each file gets its own variable
            result = {}
            for i, f in enumerate(files):
                file_path = Path(f)
                try:
                    content = file_path.read_text(encoding="utf-8")
                except Exception as e:
                    content = f"[Error: {e}]"

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

                result[var_name] = content
            return result

    async def _fetch_url(self, url: str) -> str:
        """Fetch content from a URL."""
        if not url:
            return ""

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, timeout=30.0, follow_redirects=True)
                response.raise_for_status()
                return response.text
        except httpx.TimeoutException:
            return f"[Timeout fetching {url}]"
        except httpx.HTTPStatusError as e:
            return f"[HTTP {e.response.status_code} from {url}]"
        except Exception as e:
            return f"[Error fetching {url}: {e}]"
