import { useCallback } from "react";
import type { Node, ReactFlowInstance } from "@xyflow/react";
import { generateNodeId } from "@/lib/workflowHelpers";
import { builtinTypeToSchema } from "@/lib/builtinNodeHelpers";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode";
import { getDefaultCustomNodeData } from "@/components/nodes/CustomNode";
import { getDefaultGroupData } from "@/components/nodes/GroupNode";
import { getDefaultLabelData } from "@/components/nodes/LabelNode";

const SPACING = 350;

interface UseNodeCreationParams {
  nodes: Node[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  rfInstance: ReactFlowInstance | null;
  // Position state and setters
  groupPosition: { x: number; y: number };
  setGroupPosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  agentPosition: { x: number; y: number };
  setAgentPosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  promptPosition: { x: number; y: number };
  setPromptPosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  contextPosition: { x: number; y: number };
  setContextPosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  inputProbePosition: { x: number; y: number };
  setInputProbePosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  outputProbePosition: { x: number; y: number };
  setOutputProbePosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  logProbePosition: { x: number; y: number };
  setLogProbePosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  outputFilePosition: { x: number; y: number };
  setOutputFilePosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  toolPosition: { x: number; y: number };
  setToolPosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  agentToolPosition: { x: number; y: number };
  setAgentToolPosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  variablePosition: { x: number; y: number };
  setVariablePosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  processPosition: { x: number; y: number };
  setProcessPosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  labelPosition: { x: number; y: number };
  setLabelPosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  teleportOutPosition: { x: number; y: number };
  setTeleportOutPosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  teleportInPosition: { x: number; y: number };
  setTeleportInPosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
  userInputPosition: { x: number; y: number };
  setUserInputPosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
}

export function useNodeCreation({
  nodes,
  setNodes,
  rfInstance,
  groupPosition,
  setGroupPosition,
  agentPosition,
  setAgentPosition,
  promptPosition,
  setPromptPosition,
  contextPosition,
  setContextPosition,
  inputProbePosition,
  setInputProbePosition,
  outputProbePosition,
  setOutputProbePosition,
  logProbePosition,
  setLogProbePosition,
  outputFilePosition,
  setOutputFilePosition,
  toolPosition,
  setToolPosition,
  agentToolPosition,
  setAgentToolPosition,
  variablePosition,
  setVariablePosition,
  processPosition,
  setProcessPosition,
  labelPosition,
  setLabelPosition,
  teleportOutPosition,
  setTeleportOutPosition,
  teleportInPosition,
  setTeleportInPosition,
  userInputPosition,
  setUserInputPosition,
}: UseNodeCreationParams) {
  /**
   * Get the center of the current viewport in flow coordinates
   */
  const getViewportCenter = useCallback(() => {
    if (!rfInstance) {
      return { x: 400, y: 300 };
    }
    const { x, y, zoom } = rfInstance.getViewport();
    // Get the dimensions of the React Flow container
    const domNode = document.querySelector(".react-flow");
    if (!domNode) {
      return { x: 400, y: 300 };
    }
    const { width, height } = domNode.getBoundingClientRect();
    // Calculate center in flow coordinates
    const centerX = (-x + width / 2) / zoom;
    const centerY = (-y + height / 2) / zoom;
    return { x: centerX, y: centerY };
  }, [rfInstance]);

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

  /**
   * Add a custom node to the canvas
   */
  const addCustomNode = useCallback(
    (schema: CustomNodeSchema, position?: { x: number; y: number }) => {
      const id = `custom_${schema.unit_id}_${Date.now()}`;
      const pos = position || getViewportCenter();

      const newNode: Node = {
        id,
        type: `custom:${schema.unit_id}`,
        position: pos,
        data: getDefaultCustomNodeData(schema) as unknown as Record<
          string,
          unknown
        >,
      };

      setNodes((nodes) => [...nodes, newNode]);
      return id;
    },
    [setNodes, getViewportCenter],
  );

  /**
   * Add a built-in schema-driven node to the canvas.
   * This is the new unified way to create built-in nodes using the schema architecture.
   *
   * @param nodeType - The built-in node type (e.g., "agent", "variable", "prompt")
   * @param position - Optional position on the canvas
   * @param configOverrides - Optional field values to override schema defaults
   * @param parentGroupId - Optional parent group ID to nest the node inside
   */
  const addBuiltinSchemaNode = useCallback(
    (
      nodeType: string,
      position?: { x: number; y: number },
      configOverrides?: Record<string, unknown>,
      parentGroupId?: string,
    ) => {
      const schema = builtinTypeToSchema[nodeType];
      if (!schema) {
        console.error(`Unknown built-in node type: ${nodeType}`);
        return null;
      }

      // Start node can only exist once
      if (nodeType === "start") {
        const hasStart = nodes.some((n) => n.type === "start");
        if (hasStart) return null;
      }

      const id = generateNodeId(nodeType);
      const pos = position || getViewportCenter();
      const defaultData = getDefaultCustomNodeData(schema);

      // Apply any config overrides
      if (configOverrides) {
        Object.assign(defaultData.config, configOverrides);
      }

      const newNode: Node = {
        id,
        type: nodeType,
        position: pos,
        data: defaultData as unknown as Record<string, unknown>,
        // Add parent group relationship if specified
        ...(parentGroupId && {
          parentId: parentGroupId,
          extent: "parent" as const,
        }),
      };

      setNodes((nds) => {
        // If parented, ensure proper ordering (parent before children)
        if (parentGroupId) {
          const parentIndex = nds.findIndex((n) => n.id === parentGroupId);
          if (parentIndex !== -1) {
            return [
              ...nds.slice(0, parentIndex + 1),
              newNode,
              ...nds.slice(parentIndex + 1),
            ];
          }
        }
        return [...nds, newNode];
      });
      return id;
    },
    [nodes, setNodes, getViewportCenter],
  );

  return {
    getViewportCenter,
    addGroupNode,
    addLabelNode,
    addCustomNode,
    addBuiltinSchemaNode,
  };
}
