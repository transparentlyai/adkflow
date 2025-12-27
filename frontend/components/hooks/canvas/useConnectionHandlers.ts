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
  type OnConnectStartParams,
} from "@xyflow/react";
import type { HandleTypeInfo } from "@/lib/types";
import { isTypeCompatible } from "@/lib/types";
import { useConnection } from "@/contexts/ConnectionContext";

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
  const { startConnection, endConnection } = useConnection();

  // Track drag start to update connection context for visual feedback
  const onConnectStart = useCallback(
    (_event: MouseEvent | TouchEvent, params: OnConnectStartParams) => {
      const key = `${params.nodeId}:${params.handleId}`;
      const typeInfo = handleTypeRegistry[key];
      if (
        typeInfo?.outputSource &&
        typeInfo?.outputType &&
        params.nodeId &&
        params.handleId
      ) {
        startConnection(
          params.nodeId,
          params.handleId,
          typeInfo.outputSource,
          typeInfo.outputType,
        );
      }
    },
    [handleTypeRegistry, startConnection],
  );

  // Clear drag state when connection ends
  const onConnectEnd = useCallback(() => {
    endConnection();
  }, [endConnection]);

  // Validate connection types - centralized validation for performance
  const isValidConnection = useCallback(
    (connection: Edge | Connection) => {
      // Prevent self-connections
      if (connection.source === connection.target) return false;

      const sourceKey = `${connection.source}:${connection.sourceHandle ?? ""}`;
      const targetKey = `${connection.target}:${connection.targetHandle ?? ""}`;

      const sourceInfo = handleTypeRegistry[sourceKey];
      const targetInfo = handleTypeRegistry[targetKey];

      return isTypeCompatible(
        sourceInfo?.outputSource,
        sourceInfo?.outputType,
        targetInfo?.acceptedSources,
        targetInfo?.acceptedTypes,
      );
    },
    [handleTypeRegistry],
  );

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

  // Auto-parent/detach nodes from Group on drag stop (handles multi-selection)
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, _draggedNode: Node, draggedNodes: Node[]) => {
      if (isLocked) return;

      // Filter out group nodes - they can't be parented
      const nodesToProcess = draggedNodes.filter((n) => n.type !== "group");
      if (nodesToProcess.length === 0) return;

      const groupNodes = nodes.filter((n) => n.type === "group");

      setNodes((nds) => {
        let updatedNodes = nds.map((node) => {
          // Only process nodes that were dragged
          const draggedVersion = nodesToProcess.find((d) => d.id === node.id);
          if (!draggedVersion) return node;

          const nodeWidth = node.measured?.width ?? 200;
          const nodeHeight = node.measured?.height ?? 100;

          // Calculate absolute position
          let absoluteX = node.position.x;
          let absoluteY = node.position.y;

          if (node.parentId) {
            const parentNode = nds.find((n) => n.id === node.parentId);
            if (parentNode) {
              absoluteX += parentNode.position.x;
              absoluteY += parentNode.position.y;
            }
          }

          const centerX = absoluteX + nodeWidth / 2;
          const centerY = absoluteY + nodeHeight / 2;

          // Find target group for this node
          let targetGroup: Node | null = null;
          for (const group of groupNodes) {
            const groupWidth =
              group.measured?.width ?? (group.style?.width as number) ?? 300;
            const groupHeight =
              group.measured?.height ?? (group.style?.height as number) ?? 200;

            const isInside =
              centerX >= group.position.x &&
              centerX <= group.position.x + groupWidth &&
              centerY >= group.position.y &&
              centerY <= group.position.y + groupHeight;

            if (isInside) {
              targetGroup = group;
              break;
            }
          }

          // Attach to group
          if (targetGroup && targetGroup.id !== node.parentId) {
            const relativeX = absoluteX - targetGroup.position.x;
            const relativeY = absoluteY - targetGroup.position.y;

            return {
              ...node,
              parentId: targetGroup.id,
              extent: "parent" as const,
              position: {
                x: Math.max(10, relativeX),
                y: Math.max(40, relativeY),
              },
            };
          }
          // Detach from group - only if node is contracted (extent: "parent")
          // Expanded nodes (extent: undefined) should stay attached even if visually outside
          else if (!targetGroup && node.parentId && node.extent === "parent") {
            const parentNode = nds.find((n) => n.id === node.parentId);
            const newAbsoluteX = parentNode
              ? node.position.x + parentNode.position.x
              : node.position.x;
            const newAbsoluteY = parentNode
              ? node.position.y + parentNode.position.y
              : node.position.y;

            const { parentId, extent, ...rest } = node;
            return {
              ...rest,
              position: { x: newAbsoluteX, y: newAbsoluteY },
            };
          }

          // Sync position to the correct field based on expanded state
          const nodeData = node.data as {
            isExpanded?: boolean;
            expandedPosition?: { x: number; y: number };
            contractedPosition?: { x: number; y: number };
          };
          if (nodeData.isExpanded !== undefined) {
            // Only sync if this node uses the dual-position pattern
            if (nodeData.isExpanded) {
              return {
                ...node,
                data: { ...node.data, expandedPosition: node.position },
              };
            } else {
              return {
                ...node,
                data: { ...node.data, contractedPosition: node.position },
              };
            }
          }

          return node;
        });

        // Parent nodes must come before children in React Flow
        updatedNodes = updatedNodes.sort((a, b) => {
          const aHasParent = !!a.parentId;
          const bHasParent = !!b.parentId;
          if (aHasParent && !bHasParent) return 1;
          if (!aHasParent && bHasParent) return -1;
          return 0;
        });

        return updatedNodes;
      });
    },
    [nodes, isLocked, setNodes],
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
