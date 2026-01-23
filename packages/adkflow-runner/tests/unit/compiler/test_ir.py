"""Tests for the Intermediate Representation (IR) module.

Tests the IR dataclasses including:
- AgentIR (LLM, Sequential, Parallel, Loop)
- ToolIR
- PromptIR
- WorkflowIR
- Configuration classes
"""

from __future__ import annotations

import pytest

from adkflow_runner.ir import (
    AgentIR,
    CallbackConfig,
    CallbackSourceIR,
    CodeExecutorConfig,
    ConnectionSource,
    ContextAggregatorIR,
    CustomNodeIR,
    HttpOptionsConfig,
    OutputFileIR,
    PlannerConfig,
    PromptIR,
    SchemaSourceIR,
    TeleporterIR,
    ToolIR,
    UserInputIR,
    VariableIR,
    WorkflowIR,
)


class TestAgentIR:
    """Tests for AgentIR dataclass."""

    def test_llm_agent_creation(self):
        """Create a basic LLM agent."""
        agent = AgentIR(
            id="agent-1",
            name="TestAgent",
            type="llm",
            model="gemini-2.0-flash",
            temperature=0.5,
        )
        assert agent.id == "agent-1"
        assert agent.name == "TestAgent"
        assert agent.type == "llm"
        assert agent.model == "gemini-2.0-flash"
        assert agent.temperature == 0.5
        assert agent.is_llm()
        assert not agent.is_composite()

    def test_sequential_agent_creation(self):
        """Create a sequential composite agent."""
        sub1 = AgentIR(id="sub-1", name="Sub1", type="llm")
        sub2 = AgentIR(id="sub-2", name="Sub2", type="llm")
        agent = AgentIR(
            id="seq-1",
            name="SequentialAgent",
            type="sequential",
            subagents=[sub1, sub2],
        )
        assert agent.type == "sequential"
        assert agent.is_composite()
        assert not agent.is_llm()
        assert len(agent.subagents) == 2

    def test_parallel_agent_creation(self):
        """Create a parallel composite agent."""
        sub1 = AgentIR(id="sub-1", name="Sub1", type="llm")
        sub2 = AgentIR(id="sub-2", name="Sub2", type="llm")
        agent = AgentIR(
            id="par-1",
            name="ParallelAgent",
            type="parallel",
            subagents=[sub1, sub2],
        )
        assert agent.type == "parallel"
        assert agent.is_composite()

    def test_loop_agent_creation(self):
        """Create a loop composite agent."""
        sub = AgentIR(id="sub-1", name="LoopBody", type="llm")
        agent = AgentIR(
            id="loop-1",
            name="LoopAgent",
            type="loop",
            subagents=[sub],
            max_iterations=10,
        )
        assert agent.type == "loop"
        assert agent.is_composite()
        assert agent.max_iterations == 10

    def test_agent_with_tools(self):
        """Create an agent with tools attached."""
        tool = ToolIR(name="search", code="def search(): pass")
        agent = AgentIR(
            id="agent-1",
            name="ToolAgent",
            type="llm",
            tools=[tool],
        )
        assert len(agent.tools) == 1
        assert agent.tools[0].name == "search"

    def test_agent_with_instruction(self):
        """Create an agent with an instruction."""
        agent = AgentIR(
            id="agent-1",
            name="InstructedAgent",
            type="llm",
            instruction="You are a helpful assistant.",
        )
        assert agent.instruction == "You are a helpful assistant."

    def test_agent_default_values(self):
        """Verify default values for AgentIR."""
        agent = AgentIR(id="test", name="Test", type="llm")
        assert agent.model == "gemini-2.5-flash"
        assert agent.temperature == 0.7
        assert agent.tools == []
        assert agent.subagents == []
        assert agent.output_key is None
        assert agent.max_iterations == 5
        assert agent.disallow_transfer_to_parent is False
        assert agent.disallow_transfer_to_peers is False

    def test_agent_with_planner_config(self):
        """Create an agent with planner configuration."""
        agent = AgentIR(
            id="agent-1",
            name="PlannerAgent",
            type="llm",
            planner=PlannerConfig(
                type="builtin",
                thinking_budget=1000,
                include_thoughts=True,
            ),
        )
        assert agent.planner.type == "builtin"
        assert agent.planner.thinking_budget == 1000
        assert agent.planner.include_thoughts is True

    def test_agent_with_code_executor(self):
        """Create an agent with code executor configuration."""
        agent = AgentIR(
            id="agent-1",
            name="CoderAgent",
            type="llm",
            code_executor=CodeExecutorConfig(
                enabled=True,
                stateful=True,
                error_retry_attempts=3,
            ),
        )
        assert agent.code_executor.enabled is True
        assert agent.code_executor.stateful is True
        assert agent.code_executor.error_retry_attempts == 3


class TestToolIR:
    """Tests for ToolIR dataclass."""

    def test_tool_with_file_path(self):
        """Create a tool from a file."""
        tool = ToolIR(name="search", file_path="tools/search.py")
        assert tool.name == "search"
        assert tool.file_path == "tools/search.py"
        assert tool.code is None

    def test_tool_with_inline_code(self):
        """Create a tool with inline code."""
        code = "def my_tool(): return 'hello'"
        tool = ToolIR(name="my_tool", code=code)
        assert tool.name == "my_tool"
        assert tool.code == code
        assert tool.file_path is None

    def test_tool_requires_file_or_code(self):
        """Tool must have either file_path or code."""
        with pytest.raises(ValueError, match="either file_path or code"):
            ToolIR(name="invalid")

    def test_tool_error_behavior_default(self):
        """Default error behavior is fail_fast."""
        tool = ToolIR(name="test", code="def t(): pass")
        assert tool.error_behavior == "fail_fast"

    def test_tool_error_behavior_pass_to_model(self):
        """Set error behavior to pass_to_model."""
        tool = ToolIR(
            name="test",
            code="def t(): pass",
            error_behavior="pass_to_model",
        )
        assert tool.error_behavior == "pass_to_model"

    def test_tool_with_description(self):
        """Create a tool with description."""
        tool = ToolIR(
            name="search",
            code="def search(): pass",
            description="Search the web for information.",
        )
        assert tool.description == "Search the web for information."


class TestPromptIR:
    """Tests for PromptIR dataclass."""

    def test_prompt_with_file_path(self):
        """Create a prompt from a file."""
        prompt = PromptIR(name="system", file_path="prompts/system.md")
        assert prompt.name == "system"
        assert prompt.file_path == "prompts/system.md"

    def test_prompt_with_inline_content(self):
        """Create a prompt with inline content."""
        content = "You are a helpful assistant."
        prompt = PromptIR(name="system", content=content)
        assert prompt.content == content
        assert prompt.get_content() == content

    def test_prompt_get_content_raises_when_empty(self):
        """get_content raises when content not loaded."""
        prompt = PromptIR(name="unloaded", file_path="some/path.md")
        with pytest.raises(ValueError, match="content not loaded"):
            prompt.get_content()


class TestConfigClasses:
    """Tests for configuration dataclasses."""

    def test_planner_config_defaults(self):
        """Verify PlannerConfig defaults."""
        config = PlannerConfig()
        assert config.type == "none"
        assert config.thinking_budget is None
        assert config.include_thoughts is False

    def test_code_executor_config_defaults(self):
        """Verify CodeExecutorConfig defaults."""
        config = CodeExecutorConfig()
        assert config.enabled is False
        assert config.stateful is False
        assert config.error_retry_attempts == 2
        assert len(config.code_block_delimiters) == 2

    def test_http_options_config_defaults(self):
        """Verify HttpOptionsConfig defaults."""
        config = HttpOptionsConfig()
        assert config.timeout == 30000
        assert config.max_retries == 3
        assert config.retry_delay == 1000
        assert config.retry_backoff_multiplier == 2.0

    def test_callback_config_defaults(self):
        """Verify CallbackConfig defaults."""
        config = CallbackConfig()
        assert config.before_model is None
        assert config.after_model is None
        assert config.before_tool is None
        assert config.after_tool is None

    def test_callback_config_with_paths(self):
        """Create CallbackConfig with file paths."""
        config = CallbackConfig(
            before_model="callbacks/before.py",
            after_model="callbacks/after.py",
        )
        assert config.before_model == "callbacks/before.py"
        assert config.after_model == "callbacks/after.py"


class TestOutputFileIR:
    """Tests for OutputFileIR dataclass."""

    def test_output_file_creation(self):
        """Create an output file IR."""
        output = OutputFileIR(
            name="result",
            file_path="output/result.txt",
            agent_id="agent-1",
        )
        assert output.name == "result"
        assert output.file_path == "output/result.txt"
        assert output.agent_id == "agent-1"


class TestTeleporterIR:
    """Tests for TeleporterIR dataclass."""

    def test_teleporter_input(self):
        """Create an input teleporter."""
        teleporter = TeleporterIR(
            name="Data In",
            direction="input",
            tab_id="tab1",
            node_id="teleport-1",
        )
        assert teleporter.direction == "input"
        assert teleporter.connected_agent_id is None

    def test_teleporter_output(self):
        """Create an output teleporter with connected agent."""
        teleporter = TeleporterIR(
            name="Data Out",
            direction="output",
            tab_id="tab2",
            node_id="teleport-2",
            connected_agent_id="agent-1",
        )
        assert teleporter.direction == "output"
        assert teleporter.connected_agent_id == "agent-1"


class TestUserInputIR:
    """Tests for UserInputIR dataclass."""

    def test_user_input_default(self):
        """Create a default user input."""
        ui = UserInputIR(
            id="input-1",
            name="User Input",
            variable_name="user_input_1",
        )
        assert ui.is_trigger is False
        assert ui.timeout_seconds == 300.0
        assert ui.timeout_behavior == "error"

    def test_user_input_trigger(self):
        """Create a trigger user input (acts as start)."""
        ui = UserInputIR(
            id="input-1",
            name="Trigger",
            variable_name="trigger_input",
            is_trigger=True,
        )
        assert ui.is_trigger is True

    def test_user_input_with_timeout(self):
        """Create user input with custom timeout behavior."""
        ui = UserInputIR(
            id="input-1",
            name="Timed Input",
            variable_name="timed_input",
            timeout_seconds=60.0,
            timeout_behavior="predefined_text",
            predefined_text="Default answer",
        )
        assert ui.timeout_seconds == 60.0
        assert ui.timeout_behavior == "predefined_text"
        assert ui.predefined_text == "Default answer"


class TestCustomNodeIR:
    """Tests for CustomNodeIR dataclass."""

    def test_custom_node_creation(self):
        """Create a custom node IR."""
        node = CustomNodeIR(
            id="custom-1",
            unit_id="tools.web_search",
            name="Web Search",
            config={"query": "test", "num_results": 10},
            source_node_id="node-123",
        )
        assert node.id == "custom-1"
        assert node.unit_id == "tools.web_search"
        assert node.config["query"] == "test"

    def test_custom_node_with_connections(self):
        """Create custom node with input/output connections."""
        node = CustomNodeIR(
            id="custom-1",
            unit_id="tools.processor",
            name="Processor",
            config={},
            source_node_id="node-123",
            input_connections={
                "data": [
                    ConnectionSource(node_id="agent-1"),
                    ConnectionSource(node_id="agent-2"),
                ]
            },
            output_connections={"result": ["agent-3"]},
        )
        assert "data" in node.input_connections
        assert len(node.input_connections["data"]) == 2


class TestWorkflowIR:
    """Tests for WorkflowIR dataclass."""

    def test_workflow_creation(self):
        """Create a basic workflow IR."""
        root = AgentIR(id="root", name="Root", type="llm")
        workflow = WorkflowIR(
            root_agent=root,
            all_agents={"root": root},
        )
        assert workflow.root_agent.id == "root"
        assert len(workflow.all_agents) == 1

    def test_workflow_get_agent(self):
        """Get agent by ID from workflow."""
        agent1 = AgentIR(id="agent-1", name="Agent1", type="llm")
        agent2 = AgentIR(id="agent-2", name="Agent2", type="llm")
        workflow = WorkflowIR(
            root_agent=agent1,
            all_agents={"agent-1": agent1, "agent-2": agent2},
        )
        assert workflow.get_agent("agent-1") == agent1
        assert workflow.get_agent("agent-2") == agent2
        assert workflow.get_agent("nonexistent") is None

    def test_workflow_get_all_tools(self):
        """Get all tools from workflow."""
        tool1 = ToolIR(name="tool1", code="def t1(): pass")
        tool2 = ToolIR(name="tool2", code="def t2(): pass")
        agent1 = AgentIR(id="a1", name="A1", type="llm", tools=[tool1])
        agent2 = AgentIR(id="a2", name="A2", type="llm", tools=[tool2])
        workflow = WorkflowIR(
            root_agent=agent1,
            all_agents={"a1": agent1, "a2": agent2},
        )
        tools = workflow.get_all_tools()
        assert len(tools) == 2
        assert any(t.name == "tool1" for t in tools)
        assert any(t.name == "tool2" for t in tools)

    def test_workflow_with_user_inputs(self):
        """Create workflow with user input pause points."""
        root = AgentIR(id="root", name="Root", type="llm")
        ui = UserInputIR(id="ui-1", name="Review", variable_name="review_input")
        workflow = WorkflowIR(
            root_agent=root,
            all_agents={"root": root},
            user_inputs=[ui],
        )
        assert len(workflow.user_inputs) == 1

    def test_workflow_with_output_files(self):
        """Create workflow with output file destinations."""
        root = AgentIR(id="root", name="Root", type="llm")
        output = OutputFileIR(
            name="result",
            file_path="output.txt",
            agent_id="root",
        )
        workflow = WorkflowIR(
            root_agent=root,
            all_agents={"root": root},
            output_files=[output],
        )
        assert len(workflow.output_files) == 1

    def test_workflow_metadata(self):
        """Create workflow with metadata."""
        root = AgentIR(id="root", name="Root", type="llm")
        workflow = WorkflowIR(
            root_agent=root,
            all_agents={"root": root},
            metadata={"version": "1.0", "author": "test"},
            project_path="/path/to/project",
            tab_ids=["tab1", "tab2"],
        )
        assert workflow.metadata["version"] == "1.0"
        assert workflow.project_path == "/path/to/project"
        assert len(workflow.tab_ids) == 2

    def test_workflow_with_global_variables(self):
        """Create workflow with global variables for substitution."""
        root = AgentIR(id="root", name="Root", type="llm")
        workflow = WorkflowIR(
            root_agent=root,
            all_agents={"root": root},
            global_variables={"api_key": "secret", "env": "production"},
        )
        assert workflow.global_variables["api_key"] == "secret"
        assert workflow.global_variables["env"] == "production"

    def test_workflow_with_variable_nodes(self):
        """Create workflow with Variable node IR."""
        root = AgentIR(id="root", name="Root", type="llm")
        var1 = VariableIR(
            id="var1",
            name="Config",
            variables={"key1": "value1", "key2": "value2"},
            is_global=True,
        )
        var2 = VariableIR(
            id="var2",
            name="AgentVars",
            variables={"agent_key": "agent_value"},
            is_global=False,
            connected_agent_ids=["root"],
        )
        workflow = WorkflowIR(
            root_agent=root,
            all_agents={"root": root},
            variable_nodes=[var1, var2],
        )
        assert len(workflow.variable_nodes) == 2
        assert workflow.variable_nodes[0].is_global is True
        assert workflow.variable_nodes[1].is_global is False


class TestVariableIR:
    """Tests for VariableIR dataclass."""

    def test_global_variable_creation(self):
        """Create a global Variable node (no connections)."""
        var = VariableIR(
            id="var1",
            name="GlobalConfig",
            variables={"api_key": "secret123", "env": "prod"},
            is_global=True,
        )
        assert var.id == "var1"
        assert var.name == "GlobalConfig"
        assert var.variables["api_key"] == "secret123"
        assert var.variables["env"] == "prod"
        assert var.is_global is True
        assert len(var.connected_agent_ids) == 0

    def test_connected_variable_creation(self):
        """Create a connected Variable node."""
        var = VariableIR(
            id="var2",
            name="AgentVars",
            variables={"db_url": "localhost:5432"},
            is_global=False,
            connected_agent_ids=["agent1", "agent2"],
        )
        assert var.is_global is False
        assert len(var.connected_agent_ids) == 2
        assert "agent1" in var.connected_agent_ids
        assert "agent2" in var.connected_agent_ids

    def test_variable_empty_dict(self):
        """Create Variable with empty variables dict."""
        var = VariableIR(
            id="var3",
            name="Empty",
            variables={},
            is_global=True,
        )
        assert len(var.variables) == 0
        assert var.is_global is True


class TestCallbackSourceIR:
    """Tests for CallbackSourceIR dataclass."""

    def test_callback_with_file_path(self):
        """Create callback source with file path."""
        callback = CallbackSourceIR(file_path="callbacks/before.py")
        assert callback.file_path == "callbacks/before.py"
        assert callback.code is None
        assert callback.has_value() is True

    def test_callback_with_inline_code(self):
        """Create callback source with inline code."""
        code = "def before_agent(ctx): pass"
        callback = CallbackSourceIR(
            code=code,
            source_node_id="callback-1",
            source_node_name="BeforeAgent",
        )
        assert callback.code == code
        assert callback.file_path is None
        assert callback.source_node_id == "callback-1"
        assert callback.has_value() is True

    def test_callback_empty(self):
        """Empty callback source has no value."""
        callback = CallbackSourceIR()
        assert callback.has_value() is False

    def test_callback_config_has_any(self):
        """Test CallbackConfig.has_any() method."""
        config = CallbackConfig(
            before_agent=CallbackSourceIR(code="def before(): pass"),
            after_model=CallbackSourceIR(file_path="after.py"),
        )
        assert config.has_any() is True

    def test_callback_config_empty(self):
        """Empty callback config has no callbacks."""
        config = CallbackConfig()
        assert config.has_any() is False


class TestSchemaSourceIR:
    """Tests for SchemaSourceIR dataclass."""

    def test_schema_with_file_path(self):
        """Create schema source with file path."""
        schema = SchemaSourceIR(file_path="schemas/output.py")
        assert schema.file_path == "schemas/output.py"
        assert schema.code is None
        assert schema.has_value() is True

    def test_schema_with_inline_code(self):
        """Create schema source with inline code."""
        code = "class OutputSchema(BaseModel): pass"
        schema = SchemaSourceIR(
            code=code,
            class_name="OutputSchema",
            source_node_id="schema-1",
            source_node_name="Output",
        )
        assert schema.code == code
        assert schema.class_name == "OutputSchema"
        assert schema.has_value() is True

    def test_schema_empty(self):
        """Empty schema source has no value."""
        schema = SchemaSourceIR()
        assert schema.has_value() is False


class TestContextAggregatorIR:
    """Tests for ContextAggregatorIR dataclass."""

    def test_context_aggregator_creation(self):
        """Create a context aggregator IR."""
        agg = ContextAggregatorIR(
            id="agg1",
            name="DocumentAggregator",
            config={
                "aggregationMode": "concatenate",
                "outputVariableName": "docs",
                "separator": "\n\n---\n\n",
            },
        )
        assert agg.id == "agg1"
        assert agg.name == "DocumentAggregator"
        assert agg.config["aggregationMode"] == "concatenate"
        assert agg.config["outputVariableName"] == "docs"

    def test_context_aggregator_with_connections(self):
        """Create context aggregator with input connections."""
        agg = ContextAggregatorIR(
            id="agg2",
            name="DataCollector",
            config={"aggregationMode": "json"},
            input_connections={
                "input1": ["node1", "node2"],
                "input2": ["node3"],
            },
        )
        assert "input1" in agg.input_connections
        assert len(agg.input_connections["input1"]) == 2
        assert agg.input_connections["input2"][0] == "node3"
