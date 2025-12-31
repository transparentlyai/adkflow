import { useEffect, useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import { getModelSchema, getModelDefaults } from "@/lib/constants/modelSchemas";
import type { CustomNodeData } from "@/components/nodes/CustomNode/types";

/**
 * Fields to preserve when switching models.
 * - name, description: user-entered text fields
 * - model: the newly selected model (don't overwrite with default)
 */
const PRESERVED_FIELDS = ["name", "description", "model"];

/**
 * Hook that synchronizes Agent Node fields when the model changes.
 *
 * When the user selects a different model:
 * 1. Applies all defaults from the new model
 * 2. Preserves only user-entered text fields (name, description)
 * 3. Updates the node's schema.ui.fields to match the new model
 *
 * @param nodeId - The node's unique ID
 * @param config - Current node configuration
 * @param schema - Current node schema
 * @param unitId - The node's unit_id (only applies to "builtin.agent")
 */
export function useModelFieldSync(
  nodeId: string,
  config: Record<string, unknown>,
  schema: CustomNodeData["schema"],
  unitId: string,
) {
  const { setNodes } = useReactFlow();
  const previousModelRef = useRef<string | null>(null);

  useEffect(() => {
    // Only apply to Agent nodes
    if (unitId !== "builtin.agent") {
      return;
    }

    const currentModel = config.model as string | undefined;

    // Skip if no model set or if model hasn't changed
    if (!currentModel || currentModel === previousModelRef.current) {
      previousModelRef.current = currentModel || null;
      return;
    }

    // Model has changed - sync fields
    const newModelSchema = getModelSchema(currentModel);
    const newDefaults = getModelDefaults(currentModel);

    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id !== nodeId) return node;

        const nodeData = node.data as unknown as CustomNodeData;
        const currentConfig = nodeData.config || {};

        // Start with all new model defaults
        const newConfig: Record<string, unknown> = { ...newDefaults };

        // Preserve user-entered text fields
        for (const fieldId of PRESERVED_FIELDS) {
          if (fieldId in currentConfig) {
            newConfig[fieldId] = currentConfig[fieldId];
          }
        }

        return {
          ...node,
          data: {
            ...node.data,
            schema: {
              ...nodeData.schema,
              ui: {
                ...nodeData.schema.ui,
                tabs: newModelSchema.tabs,
                fields: newModelSchema.fields,
              },
            },
            config: newConfig,
          },
        };
      }),
    );

    previousModelRef.current = currentModel;
  }, [nodeId, config.model, unitId, setNodes]);
}
