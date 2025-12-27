/**
 * Built-in Node Helpers
 *
 * Provides utilities for working with built-in nodes in a schema-driven way.
 * This module bridges the gap between the old individual node components
 * and the new unified CustomNode approach.
 */

import type { CustomNodeSchema, CustomNodeData } from "@/components/nodes/CustomNode";
import { getDefaultCustomNodeData } from "@/components/nodes/CustomNode";
import {
  builtinNodeSchemas,
  agentNodeSchema,
  promptNodeSchema,
  contextNodeSchema,
  inputProbeNodeSchema,
  outputProbeNodeSchema,
  logProbeNodeSchema,
  outputFileNodeSchema,
  toolNodeSchema,
  agentToolNodeSchema,
  processNodeSchema,
  variableNodeSchema,
  teleportInNodeSchema,
  teleportOutNodeSchema,
  userInputNodeSchema,
  startNodeSchema,
  endNodeSchema,
} from "@/lib/builtinNodeSchemas";

/**
 * Map from old node type names to their schemas.
 * This allows looking up the schema for any built-in node type.
 */
export const builtinTypeToSchema: Record<string, CustomNodeSchema> = {
  agent: agentNodeSchema,
  prompt: promptNodeSchema,
  context: contextNodeSchema,
  inputProbe: inputProbeNodeSchema,
  outputProbe: outputProbeNodeSchema,
  logProbe: logProbeNodeSchema,
  outputFile: outputFileNodeSchema,
  tool: toolNodeSchema,
  agentTool: agentToolNodeSchema,
  process: processNodeSchema,
  variable: variableNodeSchema,
  teleportIn: teleportInNodeSchema,
  teleportOut: teleportOutNodeSchema,
  userInput: userInputNodeSchema,
  start: startNodeSchema,
  end: endNodeSchema,
};

/**
 * Map from unit_id to schema for built-in nodes.
 */
export const builtinUnitIdToSchema: Record<string, CustomNodeSchema> = Object.fromEntries(
  builtinNodeSchemas.map((schema) => [schema.unit_id, schema])
);

/**
 * Get the schema for a built-in node type.
 */
export function getBuiltinSchema(nodeType: string): CustomNodeSchema | undefined {
  return builtinTypeToSchema[nodeType];
}

/**
 * Check if a node type is a built-in schema-driven type.
 */
export function isBuiltinSchemaType(nodeType: string): boolean {
  return nodeType in builtinTypeToSchema;
}

/**
 * Get the React Flow node type string for a built-in schema.
 * For now, we use the simple type name to maintain backward compatibility.
 */
export function getBuiltinNodeType(schema: CustomNodeSchema): string {
  // Extract type name from unit_id (e.g., "builtin.agent" -> "agent")
  const typeName = schema.unit_id.replace("builtin.", "");
  return typeName;
}

/**
 * Create default node data for a built-in node type.
 * This uses the schema to generate the proper CustomNodeData.
 */
export function getDefaultBuiltinNodeData(nodeType: string): CustomNodeData | undefined {
  const schema = builtinTypeToSchema[nodeType];
  if (!schema) return undefined;
  return getDefaultCustomNodeData(schema);
}

/**
 * All built-in node types that should use CustomNode for rendering.
 */
export const schemaDriverNodeTypes = Object.keys(builtinTypeToSchema);

/**
 * Export all schemas for use in registration.
 */
export { builtinNodeSchemas };
