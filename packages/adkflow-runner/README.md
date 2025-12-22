# ADKFlow Runner

Standalone workflow runner for Google ADK agents.

## Installation

```bash
pip install adkflow-runner
```

## Usage

```bash
# Run a workflow
adkflow-runner run /path/to/project

# Validate a workflow
adkflow-runner validate /path/to/project
```

## API

```python
from adkflow_runner import WorkflowRunner, RunConfig, Compiler

# Compile and run a workflow
compiler = Compiler()
project = compiler.load("/path/to/project")
workflow_ir = compiler.compile(project)

config = RunConfig(project_path="/path/to/project")
runner = WorkflowRunner()
result = await runner.run(config)
```
