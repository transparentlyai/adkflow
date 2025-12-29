import { useMemo } from "react";
import type { Node } from "@xyflow/react";
import type { HandleTypes, HandleTypeInfo } from "@/lib/types";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode";
import { useTheme } from "@/contexts/ThemeContext";
import GroupNode from "@/components/nodes/GroupNode";
import LabelNode from "@/components/nodes/LabelNode";
import CustomNode from "@/components/nodes/CustomNode";

// Static node types - base types that are always available
// Layout nodes use their own components, all other built-in nodes use CustomNode
const staticNodeTypes = {
  // Layout nodes (not schema-driven)
  group: GroupNode,
  label: LabelNode,
  // All built-in nodes use CustomNode (schema-driven)
  agent: CustomNode,
  prompt: CustomNode,
  context: CustomNode,
  inputProbe: CustomNode,
  outputProbe: CustomNode,
  logProbe: CustomNode,
  outputFile: CustomNode,
  tool: CustomNode,
  agentTool: CustomNode,
  variable: CustomNode,
  process: CustomNode,
  teleportOut: CustomNode,
  teleportIn: CustomNode,
  userInput: CustomNode,
  start: CustomNode,
  end: CustomNode,
} as const;

export function useCanvasConfig(
  nodes: Node[],
  customNodeSchemas: CustomNodeSchema[],
) {
  const { theme } = useTheme();

  // Dynamic node types - includes static types plus custom types from extensions
  const nodeTypes = useMemo(
    () => ({
      // Static types: layout nodes + built-in schema-driven nodes (all use CustomNode except group/label)
      ...staticNodeTypes,
      // Dynamic custom types from extensions - all use the same CustomNode component
      ...Object.fromEntries(
        customNodeSchemas.map((schema) => [
          `custom:${schema.unit_id}`,
          CustomNode,
        ]),
      ),
    }),
    [customNodeSchemas],
  );

  // Memoized props for ReactFlow to prevent unnecessary re-renders
  const defaultEdgeOptions = useMemo(
    () => ({
      style: { strokeWidth: 1.5, stroke: theme.colors.edges.default },
      animated: false,
      selectable: true,
      zIndex: 0,
    }),
    [theme.colors.edges.default],
  );

  const snapGridValue = useMemo(() => [16, 16] as [number, number], []);

  // Build registry of handle types from node data for connection validation
  const handleTypeRegistry = useMemo(() => {
    const registry: Record<string, HandleTypeInfo> = {};
    for (const node of nodes) {
      const data = node.data as Record<string, unknown>;
      const handleTypes = data.handleTypes as HandleTypes | undefined;
      if (handleTypes) {
        for (const [handleId, typeInfo] of Object.entries(handleTypes)) {
          registry[`${node.id}:${handleId}`] = typeInfo;
        }
      }
    }
    return registry;
  }, [nodes]);

  return {
    nodeTypes,
    defaultEdgeOptions,
    snapGridValue,
    handleTypeRegistry,
    theme,
  };
}
