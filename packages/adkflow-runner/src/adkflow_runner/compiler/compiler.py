"""Main compiler module.

Provides a high-level API for compiling workflows from project paths to IR.
"""

from pathlib import Path

from adkflow_runner.compiler.graph import GraphBuilder, WorkflowGraph
from adkflow_runner.compiler.loader import LoadedProject, ProjectLoader
from adkflow_runner.compiler.node_transforms import transform_variable_nodes
from adkflow_runner.compiler.parser import FlowParser, ParsedProject
from adkflow_runner.compiler.substitution import substitute_global_variables
from adkflow_runner.compiler.transformer import IRTransformer
from adkflow_runner.compiler.validator import WorkflowValidator
from adkflow_runner.config import ExecutionConfig, get_default_config
from adkflow_runner.errors import ValidationResult
from adkflow_runner.ir import WorkflowIR


class Compiler:
    """High-level compiler API.

    Usage:
        compiler = Compiler()
        ir = compiler.compile("/path/to/project")

        # Or step by step:
        project = compiler.load("/path/to/project")
        parsed = compiler.parse(project)
        graph = compiler.build_graph(parsed)
        validation = compiler.validate(graph, project)
        if validation.valid:
            ir = compiler.transform(graph, project)
    """

    def __init__(self, config: ExecutionConfig | None = None):
        self.config = config or get_default_config()
        self.loader = ProjectLoader(
            load_prompts=self.config.load_prompt_content,
            load_tools=self.config.load_tool_code,
        )
        self.parser = FlowParser()
        self.graph_builder = GraphBuilder(self.config)
        self.transformer = IRTransformer(self.config)
        self.validator = WorkflowValidator(strict=self.config.strict_validation)

    def compile(
        self,
        project_path: Path | str,
        validate: bool = True,
    ) -> WorkflowIR:
        """Compile a project to IR.

        Args:
            project_path: Path to the project directory
            validate: Whether to validate before compilation

        Returns:
            WorkflowIR ready for execution

        Raises:
            CompilationError: If compilation fails
            ValidationError: If validation fails (when validate=True)
        """
        # Load
        project = self.load(project_path)

        # Parse
        parsed = self.parse(project)

        # Build graph
        graph = self.build_graph(parsed)

        # Extract and substitute global variables (before validation)
        _, global_vars = transform_variable_nodes(graph)
        if global_vars:
            graph = substitute_global_variables(graph, global_vars)

        # Validate
        if validate:
            result = self.validate_graph(graph, project)
            if self.config.strict_validation:
                result.raise_if_invalid()

        # Transform
        ir = self.transform(graph, project)

        # Validate IR
        if validate:
            ir_result = self.validate_ir(ir)
            if self.config.strict_validation:
                ir_result.raise_if_invalid()

        return ir

    def load(self, project_path: Path | str) -> LoadedProject:
        """Load project files.

        Args:
            project_path: Path to the project directory

        Returns:
            LoadedProject with all files loaded
        """
        return self.loader.load(Path(project_path))

    def parse(self, project: LoadedProject) -> ParsedProject:
        """Parse loaded project to typed objects.

        Args:
            project: Loaded project

        Returns:
            ParsedProject with typed nodes and edges
        """
        return self.parser.parse_project(project)

    def build_graph(self, parsed: ParsedProject) -> WorkflowGraph:
        """Build dependency graph from parsed project.

        Args:
            parsed: Parsed project

        Returns:
            WorkflowGraph with resolved connections
        """
        return self.graph_builder.build(parsed)

    def validate_graph(
        self,
        graph: WorkflowGraph,
        project: LoadedProject,
    ) -> ValidationResult:
        """Validate workflow graph.

        Args:
            graph: Workflow graph to validate
            project: Loaded project for reference resolution

        Returns:
            ValidationResult with errors and warnings
        """
        return self.validator.validate_graph(graph, project)

    def validate_ir(self, ir: WorkflowIR) -> ValidationResult:
        """Validate workflow IR.

        Args:
            ir: Workflow IR to validate

        Returns:
            ValidationResult with errors and warnings
        """
        return self.validator.validate_ir(ir)

    def transform(
        self,
        graph: WorkflowGraph,
        project: LoadedProject,
    ) -> WorkflowIR:
        """Transform graph to IR.

        Args:
            graph: Workflow graph
            project: Loaded project

        Returns:
            WorkflowIR ready for execution
        """
        return self.transformer.transform(graph, project)


# Convenience function
def compile_project(
    project_path: Path | str,
    config: ExecutionConfig | None = None,
    validate: bool = True,
) -> WorkflowIR:
    """Compile a project to IR.

    This is a convenience function that creates a Compiler and compiles
    the project in one call.

    Args:
        project_path: Path to the project directory
        config: Optional execution configuration
        validate: Whether to validate before compilation

    Returns:
        WorkflowIR ready for execution
    """
    compiler = Compiler(config)
    return compiler.compile(project_path, validate=validate)
