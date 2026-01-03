"""Tests for the main Compiler class and compile_project function."""

import json
from pathlib import Path

import pytest

from adkflow_runner.compiler.compiler import Compiler, compile_project
from adkflow_runner.config import ExecutionConfig, get_default_config
from adkflow_runner.ir import WorkflowIR


@pytest.fixture
def simple_manifest():
    """Create a simple valid manifest with start node."""
    return {
        "name": "test-project",
        "version": "3.0",
        "tabs": [{"id": "main", "name": "Main", "order": 0}],
        "nodes": [
            {
                "id": "start_1",
                "type": "start",
                "position": {"x": 0, "y": 0},
                "data": {"tabId": "main"},
            },
            {
                "id": "agent_1",
                "type": "agent",
                "position": {"x": 200, "y": 0},
                "data": {
                    "tabId": "main",
                    "config": {"name": "TestAgent", "description": "Test"},
                },
            },
        ],
        "edges": [
            {"id": "e1", "source": "start_1", "target": "agent_1"},
        ],
        "settings": {},
    }


@pytest.fixture
def tmp_project(tmp_path, simple_manifest):
    """Create a temporary project directory."""
    (tmp_path / "manifest.json").write_text(json.dumps(simple_manifest, indent=2))
    (tmp_path / "prompts").mkdir()
    (tmp_path / "tools").mkdir()
    return tmp_path


class TestCompiler:
    """Tests for Compiler class."""

    def test_compiler_creation(self):
        """Create compiler with default config."""
        compiler = Compiler()
        assert compiler.config is not None
        assert compiler.loader is not None
        assert compiler.parser is not None

    def test_compiler_with_custom_config(self):
        """Create compiler with custom config."""
        config = ExecutionConfig(strict_validation=True)
        compiler = Compiler(config)
        assert compiler.config.strict_validation is True

    def test_load_project(self, tmp_project):
        """Load project from path."""
        compiler = Compiler()
        project = compiler.load(tmp_project)
        # LoadedProject has name, not manifest
        assert project.name == "test-project"

    def test_parse_project(self, tmp_project):
        """Parse loaded project."""
        compiler = Compiler()
        project = compiler.load(tmp_project)
        parsed = compiler.parse(project)
        # ParsedProject has flows, get all nodes
        all_nodes = parsed.get_all_nodes()
        assert len(all_nodes) == 2  # start and agent

    def test_build_graph(self, tmp_project):
        """Build graph from parsed project."""
        compiler = Compiler()
        project = compiler.load(tmp_project)
        parsed = compiler.parse(project)
        graph = compiler.build_graph(parsed)
        assert graph is not None

    def test_validate_graph(self, tmp_project):
        """Validate workflow graph."""
        compiler = Compiler()
        project = compiler.load(tmp_project)
        parsed = compiler.parse(project)
        graph = compiler.build_graph(parsed)
        result = compiler.validate_graph(graph, project)
        assert result is not None
        assert hasattr(result, "valid")

    def test_transform_to_ir(self, tmp_project):
        """Transform graph to IR."""
        compiler = Compiler()
        project = compiler.load(tmp_project)
        parsed = compiler.parse(project)
        graph = compiler.build_graph(parsed)
        ir = compiler.transform(graph, project)
        assert isinstance(ir, WorkflowIR)
        assert ir.root_agent is not None

    def test_full_compile(self, tmp_project):
        """Full compilation pipeline."""
        compiler = Compiler()
        ir = compiler.compile(tmp_project)
        assert isinstance(ir, WorkflowIR)
        assert ir.root_agent.name == "TestAgent"

    def test_compile_without_validation(self, tmp_project):
        """Compile with validation disabled."""
        compiler = Compiler()
        ir = compiler.compile(tmp_project, validate=False)
        assert isinstance(ir, WorkflowIR)


class TestCompileProject:
    """Tests for compile_project convenience function."""

    def test_compile_project_function(self, tmp_project):
        """Compile using convenience function."""
        ir = compile_project(tmp_project)
        assert isinstance(ir, WorkflowIR)

    def test_compile_project_with_config(self, tmp_project):
        """Compile with custom config."""
        config = ExecutionConfig(strict_validation=False)
        ir = compile_project(tmp_project, config=config)
        assert isinstance(ir, WorkflowIR)

    def test_compile_project_string_path(self, tmp_project):
        """Compile with string path."""
        ir = compile_project(str(tmp_project))
        assert isinstance(ir, WorkflowIR)


class TestCompilerErrors:
    """Tests for compiler error handling."""

    def test_compile_missing_manifest(self, tmp_path):
        """Error when manifest missing."""
        from adkflow_runner.errors import CompilationError

        compiler = Compiler()
        with pytest.raises((CompilationError, FileNotFoundError)):
            compiler.compile(tmp_path)

    def test_compile_invalid_manifest(self, tmp_path):
        """Error on invalid manifest JSON."""
        from adkflow_runner.errors import CompilationError

        (tmp_path / "manifest.json").write_text("not json")
        compiler = Compiler()
        with pytest.raises((CompilationError, Exception)):
            compiler.compile(tmp_path)
