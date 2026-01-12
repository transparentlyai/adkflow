import { useCallback } from "react";
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from "@xyflow/react";
import type { HandleTypeInfo } from "@/lib/types";
import { useConnectionTracking } from "./helpers/useConnectionTracking";
import { useNodeDragParenting } from "./helpers/useNodeDragParenting";

interface UseConnectionHandlersParams {
  nodes: Node[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  handleTypeRegistry: Record<string, HandleTypeInfo>;
  isLocked?: boolean;
  linkEdgeColor: string;
}

export function useConnectionHandlers({
  nodes,
  setNodes,
  setEdges,
  handleTypeRegistry,
  isLocked,
  linkEdgeColor,
}: UseConnectionHandlersParams) {
  // Use helper hooks
  const { onConnectStart, onConnectEnd, isValidConnection } =
    useConnectionTracking({
      handleTypeRegistry,
    });

  const { onNodeDragStop } = useNodeDragParenting({
    nodes,
    setNodes,
    isLocked,
  });

  // Handle node changes (drag, select, etc.)
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [setNodes],
  );

  // Handle edge changes
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [setEdges],
  );

  // Handle new connections
  const onConnect = useCallback(
    (params: Connection) => {
      if (isLocked) return;

      let sourceHandle = params.sourceHandle;
      let targetHandle = params.targetHandle;

      // Auto-route for universal "output" handle on source node
      // This routes to the specific output if node has only one
      if (params.sourceHandle === "output" && params.source) {
        const sourceNode = nodes.find((n) => n.id === params.source);
        const sourceData = sourceNode?.data as
          | { schema?: { ui?: { outputs?: { id: string }[] } } }
          | undefined;
        const outputs = sourceData?.schema?.ui?.outputs || [];
        // Filter to get regular outputs (not in additional_handles)
        const additionalHandles =
          (
            sourceData?.schema?.ui as {
              handle_layout?: { additional_handles?: { id: string }[] };
            }
          )?.handle_layout?.additional_handles || [];
        const regularOutputs = outputs.filter(
          (o) => !additionalHandles.some((h) => h.id === o.id),
        );
        if (regularOutputs.length === 1) {
          // Single output - auto-route to it
          sourceHandle = regularOutputs[0].id;
        }
        // If multiple outputs, keep "output" - edge will attach to universal handle
      }

      // Auto-detect for AgentNode collapsed "input" handle
      if (
        params.target?.startsWith("agent_") &&
        params.targetHandle === "input"
      ) {
        // Look up source handle's source type from registry
        const sourceKey = `${params.source}:${sourceHandle}`;
        const sourceInfo = handleTypeRegistry[sourceKey];
        const outputSource = sourceInfo?.outputSource;

        if (outputSource === "prompt") {
          targetHandle = "prompt-input";
        } else if (outputSource === "tool") {
          targetHandle = "tools-input";
        } else {
          // agent, context, or any other source type
          targetHandle = "agent-input";
        }
      }

      // Check if this is a link connection (from link handles)
      const isLinkConnection =
        sourceHandle?.startsWith("link-") && targetHandle?.startsWith("link-");

      if (isLinkConnection) {
        // Gray dotted edge for link connections between agents
        const edgeWithStyle = {
          ...params,
          sourceHandle,
          targetHandle,
          type: "default",
          style: {
            strokeWidth: 2,
            stroke: linkEdgeColor,
            strokeDasharray: "5 5",
          },
        };
        setEdges((eds) => addEdge(edgeWithStyle, eds));
      } else if (
        sourceHandle?.startsWith("link-") ||
        targetHandle?.startsWith("link-")
      ) {
        // Prevent mixing link handles with regular handles
        return;
      } else {
        setEdges((eds) =>
          addEdge({ ...params, sourceHandle, targetHandle }, eds),
        );
      }
    },
    [isLocked, linkEdgeColor, handleTypeRegistry, nodes, setEdges],
  );

  return {
    onConnectStart,
    onConnectEnd,
    isValidConnection,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeDragStop,
  };
}
