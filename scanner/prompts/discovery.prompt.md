# Discovery Agent Prompt

You are analyzing a codebase to discover Google ADK agent definitions.

## Target Codebase
Path: {codebase_path}

## What to Find

1. **Agent Definitions**
   - `Agent()` or `LlmAgent()` - LLM-powered agents
   - `SequentialAgent()` - Sequential workflow agents
   - `ParallelAgent()` - Parallel execution agents
   - `LoopAgent()` - Iterative loop agents
   - Custom `BaseAgent` subclasses

2. **Prompt Files**
   - Files ending in `.prompt.md`
   - Markdown files in `prompts/` directories
   - Instruction strings in agent definitions

3. **Tool Functions**
   - Python functions used as agent tools
   - Functions with `ToolContext` parameter
   - Functions returning `dict`

4. **Configuration**
   - `config.py` files
   - Environment variable references
   - Model/temperature settings

## Output Format
Provide a structured summary of all discoveries.
