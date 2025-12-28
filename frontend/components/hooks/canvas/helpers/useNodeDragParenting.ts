import { useCallback } from "react";
import type { Node } from "@xyflow/react";

interface UseNodeDragParentingParams {
  nodes: Node[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  isLocked?: boolean;
}

export function useNodeDragParenting({
  nodes,
  setNodes,
  isLocked,
}: UseNodeDragParentingParams) {
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

  return { onNodeDragStop };
}
