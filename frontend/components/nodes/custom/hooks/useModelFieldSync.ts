import { useEffect, useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import {
  getModelSchema,
  getUniversalFieldIds,
  getModelDefaults,
} from "@/lib/constants/modelSchemas";
import type { CustomNodeData } from "@/components/nodes/CustomNode/types";

/**
 * Hook that synchronizes Agent Node fields when the model changes.
 *
 * When the user selects a different model:
 * 1. Preserves universal field values (description, temperature, etc.)
 * 2. Resets model-specific fields to the new model's defaults
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
    const universalIds = new Set(getUniversalFieldIds());
    const newDefaults = getModelDefaults(currentModel);

    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id !== nodeId) return node;

        const nodeData = node.data as unknown as CustomNodeData;
        const currentConfig = nodeData.config || {};

        // Build new config:
        // - Preserve universal fields
        // - Reset model-specific fields to new model's defaults
        const newConfig: Record<string, unknown> = {};

        // Copy universal field values
        for (const fieldId of universalIds) {
          if (fieldId in currentConfig) {
            newConfig[fieldId] = currentConfig[fieldId];
          } else if (fieldId in newDefaults) {
            newConfig[fieldId] = newDefaults[fieldId];
          }
        }

        // Apply new model's defaults for non-universal fields
        for (const [fieldId, defaultValue] of Object.entries(newDefaults)) {
          if (!universalIds.has(fieldId)) {
            newConfig[fieldId] = defaultValue;
          }
        }

        // Also preserve the 'name' field (not in universal but should be kept)
        if ("name" in currentConfig) {
          newConfig.name = currentConfig.name;
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
