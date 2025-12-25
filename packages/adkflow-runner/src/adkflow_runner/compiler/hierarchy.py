"""Agent Hierarchy Builder.

Builds the agent hierarchy (SequentialAgent, ParallelAgent wrappers) from
a workflow graph, handling fork-join patterns where parallel branches
converge to a single downstream agent.
"""

from collections import deque

from adkflow_runner.compiler.graph import GraphNode, WorkflowGraph
from adkflow_runner.config import EdgeSemantics
from adkflow_runner.ir import AgentIR


class HierarchyBuilder:
    """Builds agent hierarchy with proper fork-join handling.

    This class implements a recursive algorithm that detects merge points
    where parallel branches converge, creating the correct structure:
    Sequential[Parallel[branches], continuation] instead of duplicating
    downstream agents in each parallel branch.
    """

    def __init__(
        self,
        graph: WorkflowGraph,
        all_agents: dict[str, AgentIR],
    ):
        """Initialize the hierarchy builder.

        Args:
            graph: The workflow graph
            all_agents: Dict of agent ID to AgentIR (will be modified to add wrappers)
        """
        self.graph = graph
        self.all_agents = all_agents
        self.global_visited: set[str] = set()

    def build(self, roots: list[GraphNode]) -> AgentIR | None:
        """Build the agent hierarchy from root nodes.

        Args:
            roots: Root agent nodes (no incoming SEQUENTIAL edges from other agents)

        Returns:
            Root AgentIR for the hierarchy, or None if no agents
        """
        self.global_visited = set()
        return self._build_agent_tree(roots)

    def _get_sequential_targets(self, node: GraphNode) -> list[GraphNode]:
        """Get unvisited agent nodes connected via SEQUENTIAL edges.

        Args:
            node: Source node

        Returns:
            List of unvisited agent nodes connected via SEQUENTIAL edges
        """
        targets: list[GraphNode] = []
        for edge in node.get_outgoing_by_semantics(EdgeSemantics.SEQUENTIAL):
            target = self.graph.get_node(edge.target_id)
            if (
                target
                and target.type == "agent"
                and target.id not in self.global_visited
            ):
                targets.append(target)
        return targets

    def _wrap_chain(self, chain: list[AgentIR]) -> AgentIR | None:
        """Wrap a chain of agents appropriately.

        - Empty chain: returns None
        - Single agent: returns as-is
        - Multiple agents: wraps in SequentialAgent

        Args:
            chain: List of AgentIR to wrap

        Returns:
            Single AgentIR or None if chain is empty
        """
        if not chain:
            return None
        if len(chain) == 1:
            return chain[0]

        # Multiple agents - wrap in sequential
        seq_id = f"__seq_{chain[0].id}__"
        seq_agent = AgentIR(
            id=seq_id,
            name=f"seq_{chain[0].name}",
            type="sequential",
            subagents=chain,
        )
        self.all_agents[seq_id] = seq_agent
        return seq_agent

    def _find_merge_point(self, roots: list[GraphNode]) -> str | None:
        """Find the first node where all root branches converge.

        Uses BFS from each root to find nodes reachable from ALL roots,
        then returns the closest one.

        Args:
            roots: List of root nodes to check convergence for

        Returns:
            Node ID of the merge point, or None if branches don't converge
        """
        if len(roots) < 2:
            return None

        root_ids = {r.id for r in roots}
        reachable: dict[str, set[str]] = {r.id: set() for r in roots}

        # BFS from each root to find all reachable agent nodes
        for root in roots:
            queue: deque[GraphNode] = deque([root])
            visited: set[str] = set()
            while queue:
                node = queue.popleft()
                if node.id in visited or node.id in self.global_visited:
                    continue
                visited.add(node.id)
                # Add to reachable set (excluding the roots themselves)
                if node.id not in root_ids:
                    reachable[root.id].add(node.id)
                # Continue BFS via SEQUENTIAL edges
                for edge in node.get_outgoing_by_semantics(EdgeSemantics.SEQUENTIAL):
                    target = self.graph.get_node(edge.target_id)
                    if target and target.type == "agent":
                        queue.append(target)

        # Find nodes reachable from ALL roots (intersection)
        if not all(reachable.values()):
            return None
        common = set.intersection(*reachable.values())
        if not common:
            return None

        # Return the closest merge point (first found in BFS order from any root)
        for root in roots:
            queue = deque([root])
            visited = set()
            while queue:
                node = queue.popleft()
                if node.id in visited:
                    continue
                visited.add(node.id)
                if node.id in common:
                    return node.id
                for edge in node.get_outgoing_by_semantics(EdgeSemantics.SEQUENTIAL):
                    target = self.graph.get_node(edge.target_id)
                    if target:
                        queue.append(target)

        return None

    def _build_branch_until(
        self,
        start: GraphNode,
        stop_before_id: str,
    ) -> AgentIR | None:
        """Build a sequential chain from start, stopping before stop_before_id.

        Args:
            start: Starting node
            stop_before_id: Node ID to stop before (not included in chain)

        Returns:
            AgentIR for the branch, or None if empty
        """
        chain: list[AgentIR] = []
        current: GraphNode | None = start

        while (
            current
            and current.id not in self.global_visited
            and current.id != stop_before_id
        ):
            self.global_visited.add(current.id)

            if current.id in self.all_agents:
                chain.append(self.all_agents[current.id])

            # Get next node via SEQUENTIAL edge
            next_nodes = self._get_sequential_targets(current)

            if len(next_nodes) == 0:
                break
            elif len(next_nodes) == 1:
                # Check if next is the merge point
                if next_nodes[0].id == stop_before_id:
                    break
                current = next_nodes[0]
            else:
                # Multiple targets - take the first one that's not the stop point
                current = None
                for n in next_nodes:
                    if n.id != stop_before_id:
                        current = n
                        break
                if current is None:
                    break

        return self._wrap_chain(chain)

    def _build_pure_parallel(self, roots: list[GraphNode]) -> AgentIR:
        """Build a ParallelAgent when branches don't converge.

        Args:
            roots: Root nodes for parallel branches

        Returns:
            ParallelAgent wrapping all branches
        """
        branches: list[AgentIR] = []
        for root in roots:
            branch = self._build_sequential_recursive(root)
            if branch:
                branches.append(branch)

        if len(branches) == 1:
            return branches[0]

        parallel_id = f"__parallel_{id(branches)}__"
        parallel = AgentIR(
            id=parallel_id,
            name="parallel",
            type="parallel",
            subagents=branches,
        )
        self.all_agents[parallel_id] = parallel
        return parallel

    def _build_fork_join(
        self,
        roots: list[GraphNode],
        merge_point_id: str,
    ) -> AgentIR:
        """Build fork-join structure: Sequential[Parallel[branches], continuation].

        Args:
            roots: Root nodes that fork
            merge_point_id: Node ID where branches converge

        Returns:
            SequentialAgent containing parallel branches and continuation
        """
        # Build each branch up to (not including) the merge point
        branches: list[AgentIR] = []
        for root in roots:
            branch = self._build_branch_until(root, merge_point_id)
            if branch:
                branches.append(branch)

        # Create parallel wrapper for branches
        if len(branches) == 1:
            parallel = branches[0]
        else:
            parallel_id = f"__parallel_{id(branches)}__"
            parallel = AgentIR(
                id=parallel_id,
                name="parallel",
                type="parallel",
                subagents=branches,
            )
            self.all_agents[parallel_id] = parallel

        # Continue recursively from merge point
        merge_node = self.graph.get_node(merge_point_id)
        if not merge_node:
            return parallel

        continuation = self._build_sequential_recursive(merge_node)

        # Combine: Sequential[Parallel[branches], continuation]
        if continuation:
            seq_id = f"__seq_{id(branches)}__"
            seq = AgentIR(
                id=seq_id,
                name="sequential",
                type="sequential",
                subagents=[parallel, continuation],
            )
            self.all_agents[seq_id] = seq
            return seq

        return parallel

    def _build_sequential_recursive(self, start: GraphNode) -> AgentIR | None:
        """Build sequential chain, recursing when forks are detected.

        Follows SEQUENTIAL edges from start node. When multiple outgoing
        edges are found (a fork), recursively calls _build_agent_tree()
        to handle the parallel structure.

        Args:
            start: Starting node

        Returns:
            AgentIR for the sequence, or None if empty
        """
        chain: list[AgentIR] = []
        current: GraphNode | None = start

        while current and current.id not in self.global_visited:
            self.global_visited.add(current.id)

            if current.id in self.all_agents:
                chain.append(self.all_agents[current.id])

            # Get next nodes via SEQUENTIAL edges
            next_nodes = self._get_sequential_targets(current)

            if len(next_nodes) == 0:
                break  # End of chain
            elif len(next_nodes) == 1:
                current = next_nodes[0]  # Continue linear path
            else:
                # Fork detected - recurse with multiple roots
                subtree = self._build_agent_tree(next_nodes)
                if subtree:
                    chain.append(subtree)
                break

        return self._wrap_chain(chain)

    def _build_agent_tree(self, roots: list[GraphNode]) -> AgentIR | None:
        """Recursively build agent tree with proper fork-join handling.

        This is the main entry point for the recursive algorithm that
        correctly handles diamond/merge patterns in workflow graphs.

        Args:
            roots: Current root nodes to process

        Returns:
            Root AgentIR for the tree, or None if no agents to process
        """
        if not roots:
            return None

        # Filter out already-visited roots
        roots = [r for r in roots if r.id not in self.global_visited]
        if not roots:
            return None

        # Single root - build sequential chain recursively
        if len(roots) == 1:
            return self._build_sequential_recursive(roots[0])

        # Multiple roots - detect merge point and build fork-join
        merge_point_id = self._find_merge_point(roots)

        if merge_point_id:
            # Fork-join: build branches to merge, then continue recursively
            return self._build_fork_join(roots, merge_point_id)
        else:
            # Pure parallel: no convergence
            return self._build_pure_parallel(roots)
