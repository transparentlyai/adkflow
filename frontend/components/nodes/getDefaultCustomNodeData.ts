/**
 * getDefaultCustomNodeData - Factory function for creating node data
 *
 * Creates default node data from a schema definition.
 * Used when programmatically creating nodes from schemas.
 */

import type { CustomNodeSchema, CustomNodeData } from "./CustomNode/types";

/**
 * Creates default node data from a schema definition.
 *
 * This factory function initializes a CustomNodeData object with:
 * - Default values for all fields and inputs from the schema
 * - Handle type information for connection validation
 * - Initial expanded state (false)
 *
 * Use this when programmatically creating nodes from schemas.
 *
 * @param schema - The node schema to create data from
 * @returns Initialized CustomNodeData ready for use with ReactFlow
 *
 * @example
 * ```typescript
 * import { getDefaultCustomNodeData } from "@/components/nodes/CustomNode";
 * import mySchema from "@/lib/builtinNodeSchemas/myNodeSchema";
 *
 * // Create a new node
 * const newNode = {
 *   id: "node-1",
 *   type: "CustomNode",
 *   position: { x: 100, y: 100 },
 *   data: getDefaultCustomNodeData(mySchema),
 * };
 * ```
 */
export function getDefaultCustomNodeData(
  schema: CustomNodeSchema,
): CustomNodeData {
  const config: Record<string, unknown> = {};
  // Initialize field defaults
  schema.ui.fields.forEach((field) => {
    if (field.default !== undefined) {
      config[field.id] = field.default;
    }
  });
  // Initialize input defaults (for inputs with connection_only=false)
  schema.ui.inputs.forEach((input) => {
    if (input.connection_only === false && input.default !== undefined) {
      config[input.id] = input.default;
    }
  });

  const handleTypes: Record<
    string,
    {
      outputSource?: string;
      outputType?: string;
      acceptedSources?: string[];
      acceptedTypes?: string[];
    }
  > = {};

  const allAcceptedSources = new Set<string>();
  const allAcceptedTypes = new Set<string>();
  schema.ui.inputs.forEach((input) => {
    (input.accepted_sources || [input.source_type]).forEach((s) =>
      allAcceptedSources.add(s),
    );
    (input.accepted_types || [input.data_type]).forEach((t) =>
      allAcceptedTypes.add(t),
    );
    handleTypes[input.id] = {
      acceptedSources: input.accepted_sources || [input.source_type],
      acceptedTypes: input.accepted_types || [input.data_type],
    };
  });
  handleTypes["input"] = {
    acceptedSources: Array.from(allAcceptedSources),
    acceptedTypes: Array.from(allAcceptedTypes),
  };

  schema.ui.outputs.forEach((output) => {
    handleTypes[output.id] = {
      outputSource: output.source_type,
      outputType: output.data_type,
    };
  });

  return {
    schema,
    config,
    handleTypes,
    isExpanded: false,
  };
}
