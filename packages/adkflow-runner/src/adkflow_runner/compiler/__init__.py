"""Compiler module for transforming ReactFlow JSON to IR.

Pipeline:
1. Loader: Load project files (manifest, pages, prompts, tools)
2. Parser: Parse ReactFlow JSON to typed objects
3. Graph: Build dependency graph, resolve teleporters
4. Transformer: Apply edge rules, create IR
5. Validator: Validate workflow before execution
"""

from adkflow_runner.compiler.compiler import Compiler
from adkflow_runner.compiler.loader import ProjectLoader
from adkflow_runner.compiler.parser import FlowParser
from adkflow_runner.compiler.graph import GraphBuilder
from adkflow_runner.compiler.transformer import IRTransformer
from adkflow_runner.compiler.validator import WorkflowValidator

__all__ = [
    "Compiler",
    "ProjectLoader",
    "FlowParser",
    "GraphBuilder",
    "IRTransformer",
    "WorkflowValidator",
]
