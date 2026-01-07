"""Tests for topology visualization rendering."""

from adkflow_runner.ir import (
    AgentIR,
    OutputFileIR,
    UserInputIR,
    WorkflowIR,
)
from adkflow_runner.visualization.topology import (
    render_ascii,
    render_mermaid,
)


class TestRenderMermaid:
    """Tests for render_mermaid function."""

    def test_minimal_workflow_with_single_llm(self):
        """Render minimal workflow with single LLM agent."""
        agent = AgentIR(
            id="agent1",
            name="TestAgent",
            type="llm",
            model="gemini-2.5-flash",
        )
        ir = WorkflowIR(
            root_agent=agent,
            all_agents={"agent1": agent},
        )
        result = render_mermaid(ir)

        assert "flowchart TD" in result
        assert "TestAgent" in result
        assert "N1" in result  # Node ID
        # Check style is applied
        assert "style N1 fill:#4ade80" in result

    def test_workflow_with_start_node(self):
        """Render workflow with Start node."""
        agent = AgentIR(id="agent1", name="Agent", type="llm")
        ir = WorkflowIR(
            root_agent=agent,
            all_agents={"agent1": agent},
            has_start_node=True,
        )
        result = render_mermaid(ir)

        assert '"Start"' in result
        assert "style N1 fill:#22c55e" in result  # Start node style
        assert "N1 --> N2" in result  # Connection from start to agent

    def test_workflow_with_end_node(self):
        """Render workflow with End node."""
        agent = AgentIR(id="agent1", name="Agent", type="llm")
        ir = WorkflowIR(
            root_agent=agent,
            all_agents={"agent1": agent},
            has_end_node=True,
        )
        result = render_mermaid(ir)

        assert '"End"' in result
        assert "style N2 fill:#ef4444" in result  # End node style
        assert "N1 --> N2" in result  # Connection from agent to end

    def test_sequential_agent_wrapper(self):
        """Render SequentialAgent as subgraph with connections."""
        child1 = AgentIR(id="c1", name="Child1", type="llm")
        child2 = AgentIR(id="c2", name="Child2", type="llm")
        sequential = AgentIR(
            id="seq",
            name="Sequential",
            type="sequential",
            subagents=[child1, child2],
        )
        ir = WorkflowIR(
            root_agent=sequential,
            all_agents={"seq": sequential, "c1": child1, "c2": child2},
        )
        result = render_mermaid(ir)

        assert "subgraph N1" in result
        assert "SequentialAgent" in result
        assert "Child1" in result
        assert "Child2" in result
        # Check sequential connection
        assert "N2 --> N3" in result

    def test_parallel_agent_wrapper(self):
        """Render ParallelAgent as subgraph without connections."""
        child1 = AgentIR(id="c1", name="Child1", type="llm")
        child2 = AgentIR(id="c2", name="Child2", type="llm")
        parallel = AgentIR(
            id="par",
            name="Parallel",
            type="parallel",
            subagents=[child1, child2],
        )
        ir = WorkflowIR(
            root_agent=parallel,
            all_agents={"par": parallel, "c1": child1, "c2": child2},
        )
        result = render_mermaid(ir)

        assert "subgraph N1" in result
        assert "ParallelAgent" in result
        assert "Child1" in result
        assert "Child2" in result
        # Should NOT have connections between children
        assert "N2 --> N3" not in result

    def test_loop_agent_wrapper(self):
        """Render LoopAgent as subgraph with loop-back arrow."""
        child = AgentIR(id="c1", name="Child", type="llm")
        loop = AgentIR(
            id="loop",
            name="Loop",
            type="loop",
            max_iterations=10,
            subagents=[child],
        )
        ir = WorkflowIR(
            root_agent=loop,
            all_agents={"loop": loop, "c1": child},
        )
        result = render_mermaid(ir)

        assert "subgraph N1" in result
        assert "LoopAgent max:10" in result
        assert "Child" in result
        # Check loop-back connection (child to itself)
        assert "N2 --> N2" in result

    def test_llm_with_subagents(self):
        """Render LLM agent with explicit sub-agents (plug handle)."""
        sub1 = AgentIR(id="s1", name="Sub1", type="llm")
        sub2 = AgentIR(id="s2", name="Sub2", type="llm")
        parent = AgentIR(
            id="parent",
            name="Parent",
            type="llm",
            subagents=[sub1, sub2],
        )
        ir = WorkflowIR(
            root_agent=parent,
            all_agents={"parent": parent, "s1": sub1, "s2": sub2},
        )
        result = render_mermaid(ir)

        # Should create a subgraph for the LLM+subagents structure
        assert "subgraph N1" in result
        assert "Parent + Sub-Agents" in result
        assert "Parent" in result  # Parent node inside subgraph
        assert "Sub1" in result
        assert "Sub2" in result

        # Check dashed stroke style for LLM+subagents
        assert "stroke-dasharray:5 5" in result

        # Should have connections from parent to children
        # N2 is parent, N3 is invisible container, N4 and N5 are children
        assert "N2 --> N4" in result  # Parent to Sub1
        assert "N2 --> N5" in result  # Parent to Sub2

        # Check direction directives
        assert "direction TB" in result  # Top-to-bottom
        assert "direction LR" in result  # Left-to-right for children

    def test_llm_with_nested_subagents(self):
        """Render LLM agent with nested composite subagents."""
        inner1 = AgentIR(id="i1", name="Inner1", type="llm")
        inner2 = AgentIR(id="i2", name="Inner2", type="llm")
        seq = AgentIR(
            id="seq",
            name="Sequential",
            type="sequential",
            subagents=[inner1, inner2],
        )
        parent = AgentIR(
            id="parent",
            name="Parent",
            type="llm",
            subagents=[seq],
        )
        ir = WorkflowIR(
            root_agent=parent,
            all_agents={"parent": parent, "seq": seq, "i1": inner1, "i2": inner2},
        )
        result = render_mermaid(ir)

        # Parent LLM+subagents subgraph
        assert "Parent + Sub-Agents" in result
        # Nested sequential subgraph
        assert "SequentialAgent" in result
        assert "Inner1" in result
        assert "Inner2" in result

    def test_agent_with_output_key(self):
        """Render agent with output_key in label."""
        agent = AgentIR(
            id="agent1",
            name="TestAgent",
            type="llm",
            output_key="{result}",
        )
        ir = WorkflowIR(
            root_agent=agent,
            all_agents={"agent1": agent},
        )
        result = render_mermaid(ir)

        # Output key should be escaped (curly braces removed)
        assert "TestAgent ⇒ (result)" in result

    def test_user_input_pause_point(self):
        """Render user input pause point after agent."""
        agent = AgentIR(id="agent1", name="Agent", type="llm")
        downstream = AgentIR(id="agent2", name="Downstream", type="llm")
        ui = UserInputIR(
            id="ui1",
            name="ReviewInput",
            variable_name="review_input",
            is_trigger=False,
            timeout_seconds=120,
            outgoing_agent_ids=["agent2"],
        )
        ir = WorkflowIR(
            root_agent=agent,
            all_agents={"agent1": agent, "agent2": downstream},
            user_inputs=[ui],
        )
        result = render_mermaid(ir)

        assert "UserInput: ReviewInput 120s" in result
        assert "style N2 fill:#fbbf24" in result  # User input style
        # Should have connection from agent to user input
        assert "N1 --> N2" in result

    def test_output_file(self):
        """Render output file node."""
        agent = AgentIR(id="agent1", name="Agent", type="llm")
        output = OutputFileIR(
            name="result",
            file_path="outputs/result.txt",
            agent_id="agent1",
        )
        ir = WorkflowIR(
            root_agent=agent,
            all_agents={"agent1": agent},
            output_files=[output],
        )
        result = render_mermaid(ir)

        assert "result.txt" in result
        assert "style N2 fill:#60a5fa" in result  # Output file style
        assert "N1 --> N2" in result  # Connection from agent to output

    def test_nested_subgraph_colors(self):
        """Render nested subgraphs with depth-based colors."""
        inner = AgentIR(id="inner", name="Inner", type="llm")
        middle = AgentIR(
            id="middle",
            name="Middle",
            type="sequential",
            subagents=[inner],
        )
        outer = AgentIR(
            id="outer",
            name="Outer",
            type="sequential",
            subagents=[middle],
        )
        ir = WorkflowIR(
            root_agent=outer,
            all_agents={"outer": outer, "middle": middle, "inner": inner},
        )
        result = render_mermaid(ir)

        # Check that different depth colors are applied
        assert "fill:#1e3a5f" in result  # Depth 0
        assert "fill:#2d4a6f" in result  # Depth 1

    def test_mermaid_escaping_special_chars(self):
        """Escape special characters that break Mermaid parsing."""
        agent = AgentIR(
            id="agent1",
            name="TestAgent",
            type="llm",
            output_key="{complex.output}",
        )
        ir = WorkflowIR(
            root_agent=agent,
            all_agents={"agent1": agent},
        )
        result = render_mermaid(ir)

        # Curly braces should be converted to parentheses
        assert "{complex" not in result
        assert "(complex.output)" in result


class TestRenderAscii:
    """Tests for render_ascii function."""

    def test_minimal_workflow_with_single_llm(self):
        """Render minimal workflow with single LLM agent."""
        agent = AgentIR(
            id="agent1",
            name="TestAgent",
            type="llm",
            model="gemini-2.5-flash",
        )
        ir = WorkflowIR(
            root_agent=agent,
            all_agents={"agent1": agent},
        )
        result = render_ascii(ir)

        assert "Workflow" in result
        assert "TestAgent (llm, gemini-2.5-flash)" in result

    def test_workflow_with_project_name(self):
        """Render workflow with project name from path."""
        agent = AgentIR(id="agent1", name="Agent", type="llm")
        ir = WorkflowIR(
            root_agent=agent,
            all_agents={"agent1": agent},
            project_path="/path/to/my-project",
        )
        result = render_ascii(ir)

        assert "my-project" in result

    def test_workflow_with_start_node(self):
        """Render workflow with Start node."""
        agent = AgentIR(id="agent1", name="Agent", type="llm", model="gemini-pro")
        ir = WorkflowIR(
            root_agent=agent,
            all_agents={"agent1": agent},
            has_start_node=True,
        )
        result = render_ascii(ir)

        assert "▶ Start" in result
        assert "├── " in result  # Tree connector

    def test_workflow_with_end_node(self):
        """Render workflow with End node."""
        agent = AgentIR(id="agent1", name="Agent", type="llm", model="gemini-pro")
        ir = WorkflowIR(
            root_agent=agent,
            all_agents={"agent1": agent},
            has_end_node=True,
        )
        result = render_ascii(ir)

        assert "■ End" in result
        assert "└── " in result  # Last tree connector

    def test_sequential_agent_wrapper(self):
        """Render SequentialAgent with tree-structured children."""
        child1 = AgentIR(id="c1", name="Child1", type="llm", model="gemini-pro")
        child2 = AgentIR(id="c2", name="Child2", type="llm", model="gemini-pro")
        sequential = AgentIR(
            id="seq",
            name="Sequential",
            type="sequential",
            subagents=[child1, child2],
        )
        ir = WorkflowIR(
            root_agent=sequential,
            all_agents={"seq": sequential, "c1": child1, "c2": child2},
        )
        result = render_ascii(ir)

        assert "SequentialAgent" in result
        assert "Child1" in result
        assert "Child2" in result
        # Check tree connectors are present
        assert "├── " in result or "└── " in result

    def test_parallel_agent_wrapper(self):
        """Render ParallelAgent with children."""
        child1 = AgentIR(id="c1", name="Child1", type="llm", model="gemini-pro")
        child2 = AgentIR(id="c2", name="Child2", type="llm", model="gemini-pro")
        parallel = AgentIR(
            id="par",
            name="Parallel",
            type="parallel",
            subagents=[child1, child2],
        )
        ir = WorkflowIR(
            root_agent=parallel,
            all_agents={"par": parallel, "c1": child1, "c2": child2},
        )
        result = render_ascii(ir)

        assert "ParallelAgent" in result
        assert "Child1" in result
        assert "Child2" in result

    def test_loop_agent_wrapper(self):
        """Render LoopAgent with max_iterations."""
        child = AgentIR(id="c1", name="Child", type="llm", model="gemini-pro")
        loop = AgentIR(
            id="loop",
            name="Loop",
            type="loop",
            max_iterations=10,
            subagents=[child],
        )
        ir = WorkflowIR(
            root_agent=loop,
            all_agents={"loop": loop, "c1": child},
        )
        result = render_ascii(ir)

        assert "LoopAgent (max_iterations: 10)" in result
        assert "Child" in result

    def test_llm_with_subagents(self):
        """Render LLM agent with explicit sub-agents."""
        sub1 = AgentIR(id="s1", name="Sub1", type="llm", model="gemini-pro")
        sub2 = AgentIR(id="s2", name="Sub2", type="llm", model="gemini-pro")
        parent = AgentIR(
            id="parent",
            name="Parent",
            type="llm",
            model="gemini-2.5-flash",
            subagents=[sub1, sub2],
        )
        ir = WorkflowIR(
            root_agent=parent,
            all_agents={"parent": parent, "s1": sub1, "s2": sub2},
        )
        result = render_ascii(ir)

        # Parent should have [+subagents] marker
        assert (
            "Parent (llm, gemini-2.5-flash) ⇒" not in result or "[+subagents]" in result
        )
        assert "Parent" in result
        assert "[+subagents]" in result
        assert "Sub1" in result
        assert "Sub2" in result

    def test_llm_with_nested_subagents(self):
        """Render LLM agent with nested composite subagents."""
        inner1 = AgentIR(id="i1", name="Inner1", type="llm", model="gemini-pro")
        inner2 = AgentIR(id="i2", name="Inner2", type="llm", model="gemini-pro")
        seq = AgentIR(
            id="seq",
            name="Sequential",
            type="sequential",
            subagents=[inner1, inner2],
        )
        parent = AgentIR(
            id="parent",
            name="Parent",
            type="llm",
            model="gemini-2.5-flash",
            subagents=[seq],
        )
        ir = WorkflowIR(
            root_agent=parent,
            all_agents={"parent": parent, "seq": seq, "i1": inner1, "i2": inner2},
        )
        result = render_ascii(ir)

        assert "[+subagents]" in result
        assert "SequentialAgent" in result
        assert "Inner1" in result
        assert "Inner2" in result

    def test_agent_with_output_key(self):
        """Render agent with output_key in info."""
        agent = AgentIR(
            id="agent1",
            name="TestAgent",
            type="llm",
            model="gemini-pro",
            output_key="{result}",
        )
        ir = WorkflowIR(
            root_agent=agent,
            all_agents={"agent1": agent},
        )
        result = render_ascii(ir)

        assert "TestAgent (llm, gemini-pro) ⇒ {result}" in result

    def test_user_input_pause_point(self):
        """Render user input pause point."""
        agent = AgentIR(id="agent1", name="Agent", type="llm", model="gemini-pro")
        downstream = AgentIR(
            id="agent2", name="Downstream", type="llm", model="gemini-pro"
        )
        ui = UserInputIR(
            id="ui1",
            name="ReviewInput",
            variable_name="review_input",
            is_trigger=False,
            timeout_seconds=120,
            timeout_behavior="error",
            outgoing_agent_ids=["agent2"],
        )
        ir = WorkflowIR(
            root_agent=agent,
            all_agents={"agent1": agent, "agent2": downstream},
            user_inputs=[ui],
        )
        result = render_ascii(ir)

        assert "⏸ ReviewInput (timeout: 120s, on_timeout: error)" in result
        assert "Downstream" in result

    def test_output_file(self):
        """Render output file."""
        agent = AgentIR(id="agent1", name="Agent", type="llm", model="gemini-pro")
        output = OutputFileIR(
            name="result",
            file_path="outputs/result.txt",
            agent_id="agent1",
        )
        ir = WorkflowIR(
            root_agent=agent,
            all_agents={"agent1": agent},
            output_files=[output],
        )
        result = render_ascii(ir)

        assert "→ outputs/result.txt" in result

    def test_tree_structure_with_branches(self):
        """Render complex tree with proper branch characters."""
        child1 = AgentIR(id="c1", name="Child1", type="llm", model="gemini-pro")
        child2 = AgentIR(id="c2", name="Child2", type="llm", model="gemini-pro")
        sequential = AgentIR(
            id="seq",
            name="Sequential",
            type="sequential",
            subagents=[child1, child2],
        )
        ir = WorkflowIR(
            root_agent=sequential,
            all_agents={"seq": sequential, "c1": child1, "c2": child2},
            has_end_node=True,
        )
        result = render_ascii(ir)

        # Should use proper tree connectors
        assert "├── " in result or "└── " in result
        # Verify tree structure is present
        assert "Child1" in result
        assert "Child2" in result
        assert "End" in result


class TestHelperFunctions:
    """Tests for private helper functions through their outputs."""

    def test_escape_mermaid_curly_braces(self):
        """Test that curly braces are properly escaped."""
        agent = AgentIR(
            id="agent1",
            name="Agent",
            type="llm",
            output_key="{data}",
        )
        ir = WorkflowIR(root_agent=agent, all_agents={"agent1": agent})
        result = render_mermaid(ir)

        # Curly braces should be converted to parentheses
        assert "(data)" in result
        assert "{data}" not in result

    def test_escape_mermaid_quotes(self):
        """Test that quotes are properly escaped."""
        agent = AgentIR(
            id="agent1",
            name='Agent "with quotes"',
            type="llm",
        )
        ir = WorkflowIR(root_agent=agent, all_agents={"agent1": agent})
        result = render_mermaid(ir)

        # Double quotes should be replaced with single quotes
        assert "with quotes" in result
        # Should not break Mermaid syntax
        assert "flowchart TD" in result

    def test_wrapper_label_formats(self):
        """Test wrapper agent label formats."""
        # Sequential
        seq = AgentIR(id="s", name="S", type="sequential")
        ir_seq = WorkflowIR(root_agent=seq, all_agents={"s": seq})
        result_seq = render_mermaid(ir_seq)
        assert "SequentialAgent" in result_seq

        # Parallel
        par = AgentIR(id="p", name="P", type="parallel")
        ir_par = WorkflowIR(root_agent=par, all_agents={"p": par})
        result_par = render_mermaid(ir_par)
        assert "ParallelAgent" in result_par

        # Loop with max_iterations
        loop = AgentIR(id="l", name="L", type="loop", max_iterations=15)
        ir_loop = WorkflowIR(root_agent=loop, all_agents={"l": loop})
        result_loop = render_mermaid(ir_loop)
        assert "LoopAgent max:15" in result_loop


class TestComplexScenarios:
    """Tests for complex, realistic workflow scenarios."""

    def test_full_workflow_with_all_elements(self):
        """Render workflow with Start, agents, user input, output, and End."""
        agent1 = AgentIR(id="a1", name="FirstAgent", type="llm", model="gemini-pro")
        agent2 = AgentIR(id="a2", name="SecondAgent", type="llm", model="gemini-flash")
        ui = UserInputIR(
            id="ui1",
            name="Review",
            variable_name="review",
            timeout_seconds=300,
            outgoing_agent_ids=["a2"],
        )
        output = OutputFileIR(
            name="final",
            file_path="outputs/final.txt",
            agent_id="a2",
        )
        ir = WorkflowIR(
            root_agent=agent1,
            all_agents={"a1": agent1, "a2": agent2},
            user_inputs=[ui],
            output_files=[output],
            has_start_node=True,
            has_end_node=True,
        )
        result_mermaid = render_mermaid(ir)
        result_ascii = render_ascii(ir)

        # Mermaid checks
        assert "Start" in result_mermaid
        assert "FirstAgent" in result_mermaid
        assert "Review" in result_mermaid
        assert "SecondAgent" in result_mermaid
        assert "final.txt" in result_mermaid
        assert "End" in result_mermaid

        # ASCII checks
        assert "▶ Start" in result_ascii
        assert "FirstAgent" in result_ascii
        assert "⏸ Review" in result_ascii
        assert "SecondAgent" in result_ascii
        assert "final.txt" in result_ascii
        assert "■ End" in result_ascii

    def test_deeply_nested_hierarchy(self):
        """Render deeply nested agent hierarchy."""
        leaf = AgentIR(id="leaf", name="Leaf", type="llm", model="gemini-pro")
        inner_seq = AgentIR(
            id="inner_seq",
            name="InnerSeq",
            type="sequential",
            subagents=[leaf],
        )
        middle_par = AgentIR(
            id="middle_par",
            name="MiddlePar",
            type="parallel",
            subagents=[inner_seq],
        )
        outer_loop = AgentIR(
            id="outer_loop",
            name="OuterLoop",
            type="loop",
            max_iterations=3,
            subagents=[middle_par],
        )
        ir = WorkflowIR(
            root_agent=outer_loop,
            all_agents={
                "outer_loop": outer_loop,
                "middle_par": middle_par,
                "inner_seq": inner_seq,
                "leaf": leaf,
            },
        )
        result_mermaid = render_mermaid(ir)
        result_ascii = render_ascii(ir)

        # Should render all levels
        assert "LoopAgent" in result_mermaid
        assert "ParallelAgent" in result_mermaid
        assert "SequentialAgent" in result_mermaid
        assert "Leaf" in result_mermaid

        assert "LoopAgent" in result_ascii
        assert "ParallelAgent" in result_ascii
        assert "SequentialAgent" in result_ascii
        assert "Leaf" in result_ascii

    def test_llm_with_multiple_subagent_types(self):
        """Render LLM with mixed subagent types."""
        simple_sub = AgentIR(id="simple", name="SimpleSub", type="llm", model="gemini")
        seq_child1 = AgentIR(id="sc1", name="SeqChild1", type="llm", model="gemini")
        seq_child2 = AgentIR(id="sc2", name="SeqChild2", type="llm", model="gemini")
        seq_sub = AgentIR(
            id="seq_sub",
            name="SeqSub",
            type="sequential",
            subagents=[seq_child1, seq_child2],
        )
        parent = AgentIR(
            id="parent",
            name="Parent",
            type="llm",
            model="gemini-2.5-flash",
            subagents=[simple_sub, seq_sub],
        )
        ir = WorkflowIR(
            root_agent=parent,
            all_agents={
                "parent": parent,
                "simple": simple_sub,
                "seq_sub": seq_sub,
                "sc1": seq_child1,
                "sc2": seq_child2,
            },
        )
        result_mermaid = render_mermaid(ir)
        result_ascii = render_ascii(ir)

        # Should show LLM+subagents structure
        assert "Parent + Sub-Agents" in result_mermaid
        assert "SimpleSub" in result_mermaid
        assert "SeqSub" in result_mermaid or "SequentialAgent" in result_mermaid

        assert "[+subagents]" in result_ascii
        assert "SimpleSub" in result_ascii
        assert "SequentialAgent" in result_ascii
