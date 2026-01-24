import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import type { CustomNodeData, CustomNodeSchema } from "@/components/nodes/CustomNode/types";

export interface UseNodeResizeOptions {
  nodeId: string;
  schema: CustomNodeSchema;
}

export interface UseNodeResizeResult {
  handleResize: (deltaWidth: number, deltaHeight: number) => void;
}

/**
 * Hook that provides resize handler for resizable CustomNodes.
 *
 * Handles updating node's expandedSize in data while respecting min width/height constraints.
 */
export function useNodeResize({
  nodeId,
  schema,
}: UseNodeResizeOptions): UseNodeResizeResult {
  const { setNodes } = useReactFlow();

  const handleResize = useCallback(
    (deltaWidth: number, deltaHeight: number) => {
      const minWidth = schema.ui.min_width ?? 200;
      const minHeight = schema.ui.min_height ?? 150;

      setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id !== nodeId) return node;
          const currentSize = (node.data as unknown as CustomNodeData)
            .expandedSize ?? {
            width: schema.ui.default_width,
            height: schema.ui.default_height,
          };
          return {
            ...node,
            data: {
              ...node.data,
              expandedSize: {
                width: Math.max(minWidth, currentSize.width + deltaWidth),
                height: Math.max(minHeight, currentSize.height + deltaHeight),
              },
            },
          };
        }),
      );
    },
    [
      nodeId,
      schema.ui.default_width,
      schema.ui.default_height,
      schema.ui.min_width,
      schema.ui.min_height,
      setNodes,
    ],
  );

  return {
    handleResize,
  };
}
