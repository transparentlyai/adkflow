import { useCallback } from "react";
import type { Node } from "@xyflow/react";
import { generateNodeId } from "@/lib/workflowHelpers";
import { builtinTypeToSchema } from "@/lib/builtinNodeHelpers";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode";
import { getDefaultCustomNodeData } from "@/components/nodes/CustomNode";

interface UseSchemaNodeCreationParams {
  nodes: Node[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  getViewportCenter: () => { x: number; y: number };
  activeTabId: string | null;
}

export function useSchemaNodeCreation({
  nodes,
  setNodes,
  getViewportCenter,
  activeTabId,
}: UseSchemaNodeCreationParams) {
  /**
   * Add a custom node to the canvas
   */
  const addCustomNode = useCallback(
    (schema: CustomNodeSchema, position?: { x: number; y: number }) => {
      const id = `custom_${schema.unit_id}_${Date.now()}`;
      const pos = position || getViewportCenter();

      const defaultData = getDefaultCustomNodeData(schema) as unknown as Record<
        string,
        unknown
      >;

      const newNode: Node = {
        id,
        type: `custom:${schema.unit_id}`,
        position: pos,
        data: {
          ...defaultData,
          tabId: activeTabId,
        },
      };

      setNodes((nodes) => [...nodes, newNode]);
      return id;
    },
    [setNodes, getViewportCenter, activeTabId],
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
        data: {
          ...(defaultData as unknown as Record<string, unknown>),
          tabId: activeTabId,
        },
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
    [nodes, setNodes, getViewportCenter, activeTabId],
  );

  return {
    addCustomNode,
    addBuiltinSchemaNode,
  };
}
