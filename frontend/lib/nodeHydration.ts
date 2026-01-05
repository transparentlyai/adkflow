/**
 * Node Hydration Utilities
 *
 * Provides utilities for stripping and hydrating node data when saving/loading workflows.
 * This enables smaller workflow files by saving only user-configured values and
 * reconstructing schemas on load.
 */

import type { Node } from "@xyflow/react";
import type {
  CustomNodeSchema,
  CustomNodeData,
} from "@/components/nodes/CustomNode";
import { getDefaultCustomNodeData } from "@/components/nodes/CustomNode";
import { builtinTypeToSchema } from "@/lib/builtinNodeHelpers";

/**
 * Fields that are transient (reconstructed on load) and should be stripped when saving.
 */
const TRANSIENT_FIELDS = [
  "schema",
  "handleTypes",
  "executionState",
  "validationErrors",
  "validationWarnings",
  "duplicateNameError",
] as const;

/**
 * Strip transient fields from a node before saving.
 * This removes fields that can be reconstructed on load (schema, handleTypes, etc.)
 */
export function stripTransientFields(node: Node): Node {
  const cleanData = { ...node.data };
  for (const field of TRANSIENT_FIELDS) {
    delete cleanData[field];
  }
  return { ...node, data: cleanData };
}

/**
 * Strip transient fields from all nodes in a flow.
 */
export function stripTransientFieldsFromNodes(nodes: Node[]): Node[] {
  return nodes.map(stripTransientFields);
}

/**
 * Get the schema for a node type.
 * Checks built-in schemas first, then custom extension schemas.
 */
function getSchemaForNodeType(
  nodeType: string,
  customNodeSchemas?: CustomNodeSchema[],
): CustomNodeSchema | null {
  // Check built-in schemas first
  if (builtinTypeToSchema[nodeType]) {
    return builtinTypeToSchema[nodeType];
  }

  // Check custom extension schemas (type format: "custom:unit_id")
  if (nodeType.startsWith("custom:") && customNodeSchemas) {
    const unitId = nodeType.slice(7);
    return customNodeSchemas.find((s) => s.unit_id === unitId) || null;
  }

  return null;
}

/**
 * Hydrate a single node with its schema and derived fields.
 * This reconstructs the schema, handleTypes, and applies proper defaults.
 */
export function hydrateNodeWithSchema(
  node: Node,
  customNodeSchemas?: CustomNodeSchema[],
): Node {
  const schema = getSchemaForNodeType(node.type || "", customNodeSchemas);

  if (!schema) {
    // Handle group nodes specially - they don't have schemas but need dragHandle
    if (node.type === "group") {
      return {
        ...node,
        dragHandle: ".group-drag-handle",
      };
    }
    // Unknown node type - return as-is but ensure it has minimal structure
    console.warn(`Unknown node type: ${node.type}, skipping hydration`);
    return node;
  }

  // Get default data for this schema (includes handleTypes computation)
  const defaultData = getDefaultCustomNodeData(schema);

  // Get saved data, treating node.data as potentially incomplete CustomNodeData
  const savedData = node.data as Partial<CustomNodeData>;
  const savedConfig = savedData?.config || {};

  // Merge saved config with defaults, preserving user values
  const mergedConfig = {
    ...defaultData.config,
    ...savedConfig,
  };

  // Reconstruct the full node data
  const hydratedData: CustomNodeData = {
    ...defaultData,
    ...savedData,
    schema,
    config: mergedConfig,
    handleTypes: defaultData.handleTypes,
  };

  // Build the hydrated node with the hydrated data
  const hydratedNode: Node = {
    ...node,
    data: hydratedData as unknown as Record<string, unknown>,
  };

  return hydratedNode;
}

/**
 * Hydrate all nodes in a flow with their schemas.
 */
export function hydrateNodesWithSchemas(
  nodes: Node[],
  customNodeSchemas?: CustomNodeSchema[],
): Node[] {
  return nodes.map((node) => hydrateNodeWithSchema(node, customNodeSchemas));
}
