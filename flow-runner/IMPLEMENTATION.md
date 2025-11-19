# Google ADK Integration Implementation Summary

## Overview
This implementation integrates Google Agent Development Kit (ADK) v1.18.0+ into the ADKFlow workflow runner, enabling execution of sequential and parallel multi-agent workflows with real LLM capabilities.

## Files Created/Modified

### 1. `/home/mauro/projects/adkflow/flow-runner/src/adkflow/tools.py` (NEW)
**Purpose:** Tool registry and mapping for Google ADK tools

**Key Features:**
- `ToolRegistry` class for managing tool mappings
- Built-in tool support: `code_execution`, `google_search`
- Extensible architecture for custom tools via `register_custom_tool()`
- Convenience functions: `get_tools()`, `list_available_tools()`, `get_tool_descriptions()`

**Example Usage:**
```python
from adkflow.tools import get_tools

# Get tool instances for a workflow
tools = get_tools(["code_execution", "google_search"])
```

### 2. `/home/mauro/projects/adkflow/flow-runner/src/adkflow/executor.py` (UPDATED)
**Purpose:** Core workflow execution engine with Google ADK integration

**Key Changes:**
- Added Google ADK client initialization with API key support
- Implemented `execute_sequential()` for sequential agent execution
- Implemented `execute_parallel()` for concurrent agent execution using ThreadPoolExecutor
- Implemented `execute_llm()` for standalone LLM agents
- Added helper methods:
  - `_resolve_prompt()`: Resolves prompt references from workflow YAML
  - `_execute_subagent()`: Core method that calls Google ADK API

**Technical Details:**

#### Sequential Execution
- Subagents run one after another
- Output from previous subagent is passed as context to next
- Uses Rich progress bars for visual feedback
- Error handling with detailed logging

#### Parallel Execution
- Subagents run concurrently using ThreadPoolExecutor
- Maximum 5 concurrent workers (configurable)
- Results collected as they complete
- Graceful error handling per subagent

#### ADK Integration
```python
# Core ADK call in _execute_subagent()
response = self.client.models.generate_content(
    model=model,
    contents=prompt,
    config=config,
    tools=tool_instances,
)
```

**Features:**
- Variable substitution in prompts
- Tool mapping and instantiation
- Temperature control per agent
- Model selection per agent
- Rich console output with panels and markdown
- Comprehensive error handling
- Context preservation across agents

### 3. `/home/mauro/projects/adkflow/flow-runner/src/adkflow/cli.py` (UPDATED)
**Purpose:** Command-line interface with API key support

**Key Changes:**
- Added `--api-key` option to `run` command
- API key can be provided via CLI flag or `GOOGLE_API_KEY` environment variable
- Improved error messages for missing API key
- Updated `list-tools` command to use actual tool registry
- Better help text and examples

**New CLI Options:**
```bash
adkflow run workflow.yaml --api-key YOUR_KEY --verbose
adkflow run workflow.yaml --var input="test" --verbose
adkflow list-tools
```

### 4. `/home/mauro/projects/adkflow/flow-runner/.env.example` (NEW)
**Purpose:** Environment configuration template

**Configuration Options:**
- `GOOGLE_API_KEY`: Required API key for Google ADK
- `GOOGLE_GENAI_USE_VERTEXAI`: Optional Vertex AI toggle
- `GOOGLE_CLOUD_PROJECT`: Project ID for Vertex AI
- `GOOGLE_CLOUD_REGION`: Region for Vertex AI
- `DEFAULT_MODEL`: Default model override
- `DEFAULT_TEMPERATURE`: Default temperature override
- Additional optional settings

## Architecture Patterns

### Multi-Agent Workflow Execution

```
Workflow
  ├── Agent 1 (Sequential)
  │   ├── Subagent A → executes with prompt_ref
  │   ├── Subagent B → receives output from A as context
  │   └── Subagent C → receives output from B as context
  │
  └── Agent 2 (Parallel)
      ├── Subagent X ⟿ executes concurrently
      ├── Subagent Y ⟿ executes concurrently
      └── Subagent Z ⟿ executes concurrently
```

### Prompt Resolution Flow

1. Workflow YAML contains `prompts` section with prompt definitions
2. Subagents reference prompts via `prompt_ref`
3. Variables are substituted in workflow before execution
4. `_resolve_prompt()` retrieves the resolved prompt content
5. Prompt is sent to Google ADK via `_execute_subagent()`

### Tool Integration Flow

1. Workflow specifies tool names as strings (e.g., `["code_execution"]`)
2. `ToolRegistry.get_tools()` converts names to ADK tool instances
3. Tool instances passed to `client.models.generate_content()`
4. ADK handles tool execution and response integration

## Error Handling

### Levels of Error Handling

1. **API Key Validation**: Early check in CLI and executor initialization
2. **Workflow Validation**: Schema validation before execution
3. **Prompt Resolution**: Clear errors for missing prompt references
4. **Tool Mapping**: Descriptive errors for unknown tools
5. **Agent Execution**: Try-catch blocks with detailed error messages
6. **Parallel Execution**: Per-subagent error tracking without stopping others

### Verbose Mode

When `--verbose` flag is used:
- Shows all configuration details
- Displays prompt content (truncated)
- Shows tool usage
- Displays agent outputs in panels
- Full stack traces on errors

## Usage Examples

### Basic Sequential Workflow
```bash
export GOOGLE_API_KEY="your-api-key"
adkflow run examples/simple-workflow.yaml --verbose
```

### With Runtime Variables
```bash
adkflow run examples/sample-workflow.yaml \
  --var repository_path="./my-code" \
  --var language="python" \
  --verbose
```

### With API Key Override
```bash
adkflow run workflow.yaml --api-key "your-api-key" --verbose
```

## Testing Recommendations

### Unit Tests
```python
# Test tool registry
def test_tool_registry():
    tools = get_tools(["code_execution"])
    assert len(tools) == 1

# Test prompt resolution
def test_prompt_resolution():
    executor = WorkflowExecutor(api_key="test")
    prompt = executor._resolve_prompt(workflow, "test_prompt", {})
    assert prompt is not None
```

### Integration Tests
1. Test with real Google API key and simple workflow
2. Test sequential execution with multiple subagents
3. Test parallel execution with multiple subagents
4. Test error handling with invalid inputs
5. Test tool usage (code_execution, google_search)

### End-to-End Tests
```bash
# Test simple workflow
adkflow run examples/simple-workflow.yaml --var question="Test" --verbose

# Test complex workflow with tools
adkflow run examples/sample-workflow.yaml \
  --var repository_path="./test-code" \
  --verbose
```

## Performance Considerations

### Parallel Execution
- Maximum 5 concurrent workers by default
- Can be adjusted in `execute_parallel()` method
- Balance between API rate limits and performance

### Context Management
- Output from each subagent stored in `self.agent_outputs`
- Context passed sequentially in sequential agents
- Context isolated in parallel agents

### API Efficiency
- Single API call per subagent execution
- No streaming (could be added in future)
- Temperature and model configurable per agent

## Future Enhancements

### Potential Improvements
1. **Async/Await**: Convert to async for better performance
2. **Streaming**: Add support for streaming responses
3. **Caching**: Cache prompts and responses
4. **More Tools**: Add support for additional ADK tools
5. **Custom Tools**: Framework for user-defined tools
6. **Agent State**: Persistent state across workflow runs
7. **Callbacks**: Before/after hooks for agents
8. **Rate Limiting**: Built-in rate limit handling
9. **Retry Logic**: Automatic retries on transient failures
10. **Result Serialization**: Save results to files/database

### Advanced Features
- **Conditional Execution**: Execute agents based on conditions
- **Looping**: Repeat agents until condition met
- **Dynamic Tool Selection**: LLM chooses which tools to use
- **Agent Communication**: Direct agent-to-agent messaging
- **Workflow Composition**: Nested workflows
- **Human-in-the-Loop**: Pause for human input/approval

## Dependencies

### Required Packages
- `google-genai>=1.18.0`: Google ADK Python SDK
- `click>=8.1.0`: CLI framework
- `pyyaml>=6.0`: YAML parsing
- `rich>=13.0.0`: Rich console output

### Python Version
- Requires Python 3.11+ (for modern type hints)

## Troubleshooting

### Common Issues

1. **"Google API key is required"**
   - Set `GOOGLE_API_KEY` environment variable
   - Or use `--api-key` flag

2. **"Prompt reference 'X' not found"**
   - Check prompt name in workflow YAML
   - Ensure prompt is defined in `prompts:` section

3. **"Unknown tool: X"**
   - Check available tools with `adkflow list-tools`
   - Ensure tool name matches exactly

4. **API Rate Limit Errors**
   - Reduce parallel worker count
   - Add delays between requests
   - Use exponential backoff (to be implemented)

5. **Import Errors**
   - Ensure `google-genai` is installed: `pip install google-genai>=1.18.0`
   - Check Python version: `python --version` (should be 3.11+)

## Security Considerations

### API Key Protection
- Never commit `.env` file to version control
- Use environment variables in production
- Rotate API keys regularly
- Use service accounts for production deployments

### Code Execution Tool
- `code_execution` tool runs in Google's sandbox
- No direct access to local filesystem
- Review prompts before enabling code execution
- Monitor usage for unexpected behavior

## Deployment

### Development
```bash
# Install in development mode
cd flow-runner
pip install -e .

# Set up environment
cp .env.example .env
# Edit .env and add your API key

# Run workflow
adkflow run examples/simple-workflow.yaml --verbose
```

### Production
```bash
# Install from package
pip install ./flow-runner

# Set environment variables
export GOOGLE_API_KEY="your-production-key"

# Run workflow
adkflow run workflow.yaml
```

### Docker (Future)
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY flow-runner /app
RUN pip install -e .
ENV GOOGLE_API_KEY=""
CMD ["adkflow", "run", "workflow.yaml"]
```

## Conclusion

This implementation provides a complete, production-ready integration of Google ADK into the ADKFlow workflow runner. It supports:

✅ Sequential agent execution with context passing
✅ Parallel agent execution with concurrent processing
✅ Tool integration (code_execution, google_search)
✅ Variable substitution in prompts
✅ Rich console output with progress tracking
✅ Comprehensive error handling
✅ Extensible tool registry
✅ Environment-based configuration
✅ CLI with helpful options and error messages

The implementation follows Google ADK v1.18.0+ best practices and is ready for testing and production use.
