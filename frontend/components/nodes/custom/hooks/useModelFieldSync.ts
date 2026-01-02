import { useEffect, useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import { getModelSchema, getModelDefaults } from "@/lib/constants/modelSchemas";
import type { CustomNodeData } from "@/components/nodes/CustomNode/types";

/**
 * Hook that synchronizes Agent Node fields when the model changes.
 *
 * When the user selects a different model:
 * 1. Updates the node's schema.ui.fields to match the new model
 * 2. Applies all defaults from the new model
 * 3. Preserves all user values for fields that exist in both old and new models
 *
 * This approach avoids maintaining a list of "universal" fields - any field
 * that exists in the new model will preserve its value from the old config.
 * Model-specific fields (e.g., thinking_budget vs thinking_level) naturally
 * get their new defaults since they don't exist in the other model.
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

    // Get the set of field IDs that exist in the new model
    const newFieldIds = new Set(newModelSchema.fields.map((f) => f.id));
    // Also preserve "name" which is a config field, not a schema field
    newFieldIds.add("name");

    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id !== nodeId) return node;

        const nodeData = node.data as unknown as CustomNodeData;
        const currentConfig = nodeData.config || {};

        // Start with all new model defaults
        const newConfig: Record<string, unknown> = { ...newDefaults };

        // Preserve all fields from current config that exist in the new model
        for (const [fieldId, value] of Object.entries(currentConfig)) {
          if (newFieldIds.has(fieldId)) {
            newConfig[fieldId] = value;
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
