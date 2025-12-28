import { useCallback } from "react";
import type { Node } from "@xyflow/react";
import { generateNodeId } from "@/lib/workflowHelpers";
import { getDefaultGroupData } from "@/components/nodes/GroupNode";
import { getDefaultLabelData } from "@/components/nodes/LabelNode";

const SPACING = 350;

interface UseLayoutNodeCreationParams {
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  groupPosition: { x: number; y: number };
  setGroupPosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  labelPosition: { x: number; y: number };
  setLabelPosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
}

export function useLayoutNodeCreation({
  setNodes,
  groupPosition,
  setGroupPosition,
  labelPosition,
  setLabelPosition,
}: UseLayoutNodeCreationParams) {
  const addGroupNode = useCallback(
    (position?: { x: number; y: number }) => {
      const groupId = generateNodeId("group");

      const newNode: Node = {
        id: groupId,
        type: "group",
        position: position || groupPosition,
        data: getDefaultGroupData(),
        style: { width: 300, height: 200 },
        dragHandle: ".group-drag-handle",
      };

      // Group nodes must come before their children, so prepend
      setNodes((nds) => [newNode, ...nds]);
      if (!position) {
        setGroupPosition((pos) => ({ ...pos, x: pos.x + SPACING }));
      }
    },
    [groupPosition, setNodes, setGroupPosition],
  );

  /**
   * Add a Label node to the canvas
   */
  const addLabelNode = useCallback(
    (position?: { x: number; y: number }) => {
      const labelId = generateNodeId("label");

      const newNode: Node = {
        id: labelId,
        type: "label",
        position: position || labelPosition,
        data: getDefaultLabelData(),
        style: { width: 100, height: 30 },
      };

      setNodes((nds) => [...nds, newNode]);
      if (!position) {
        setLabelPosition((pos) => ({ ...pos, x: pos.x + SPACING }));
      }
    },
    [labelPosition, setNodes, setLabelPosition],
  );

  return {
    addGroupNode,
    addLabelNode,
  };
}
