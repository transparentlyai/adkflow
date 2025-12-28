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

      let targetHandle = params.targetHandle;

      // Auto-detect for AgentNode collapsed "input" handle
      if (
        params.target?.startsWith("agent_") &&
        params.targetHandle === "input"
      ) {
        // Look up source handle's source type from registry
        const sourceKey = `${params.source}:${params.sourceHandle}`;
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
        params.sourceHandle?.startsWith("link-") &&
        targetHandle?.startsWith("link-");

      if (isLinkConnection) {
        // Gray dotted edge for link connections between agents
        const edgeWithStyle = {
          ...params,
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
        params.sourceHandle?.startsWith("link-") ||
        targetHandle?.startsWith("link-")
      ) {
        // Prevent mixing link handles with regular handles
        return;
      } else {
        setEdges((eds) => addEdge({ ...params, targetHandle }, eds));
      }
    },
    [isLocked, linkEdgeColor, handleTypeRegistry, setEdges],
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
