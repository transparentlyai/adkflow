/**
 * Builtin Node Schemas
 *
 * Schema definitions for built-in node types that are part of the core system.
 * These schemas follow the CustomNodeSchema interface and define the UI,
 * inputs, outputs, and configuration for each node type.
 */

// Agent nodes
export { agentNodeSchema } from "./agentNodeSchema";

// Tool nodes
export { toolNodeSchema } from "./toolNodeSchema";
export { agentToolNodeSchema } from "./agentToolNodeSchema";

// Processing nodes
export { processNodeSchema } from "./processNodeSchema";

// Probe nodes
export { inputProbeNodeSchema } from "./inputProbeNodeSchema";
export { outputProbeNodeSchema } from "./outputProbeNodeSchema";
export { logProbeNodeSchema } from "./logProbeNodeSchema";

// Content nodes
export { promptNodeSchema } from "./promptNodeSchema";
export { contextNodeSchema } from "./contextNodeSchema";
export { contextAggregatorNodeSchema } from "./contextAggregatorNodeSchema";
export { userInputNodeSchema } from "./userInputNodeSchema";
export { outputFileNodeSchema } from "./outputFileNodeSchema";

// Flow control nodes
export { startNodeSchema } from "./startNodeSchema";
export { endNodeSchema } from "./endNodeSchema";

// Connector nodes
export { teleportInNodeSchema } from "./teleportInNodeSchema";
export { teleportOutNodeSchema } from "./teleportOutNodeSchema";

// Utility nodes
export { variableNodeSchema } from "./variableNodeSchema";

// Re-export all schemas as a collection for registration
import { agentNodeSchema } from "./agentNodeSchema";
import { toolNodeSchema } from "./toolNodeSchema";
import { agentToolNodeSchema } from "./agentToolNodeSchema";
import { processNodeSchema } from "./processNodeSchema";
import { inputProbeNodeSchema } from "./inputProbeNodeSchema";
import { outputProbeNodeSchema } from "./outputProbeNodeSchema";
import { logProbeNodeSchema } from "./logProbeNodeSchema";
import { promptNodeSchema } from "./promptNodeSchema";
import { contextNodeSchema } from "./contextNodeSchema";
import { contextAggregatorNodeSchema } from "./contextAggregatorNodeSchema";
import { userInputNodeSchema } from "./userInputNodeSchema";
import { outputFileNodeSchema } from "./outputFileNodeSchema";
import { startNodeSchema } from "./startNodeSchema";
import { endNodeSchema } from "./endNodeSchema";
import { teleportInNodeSchema } from "./teleportInNodeSchema";
import { teleportOutNodeSchema } from "./teleportOutNodeSchema";
import { variableNodeSchema } from "./variableNodeSchema";

export const builtinNodeSchemas = [
  // Agent nodes
  agentNodeSchema,
  // Tool nodes
  toolNodeSchema,
  agentToolNodeSchema,
  // Processing nodes
  processNodeSchema,
  // Probe nodes
  inputProbeNodeSchema,
  outputProbeNodeSchema,
  logProbeNodeSchema,
  // Content nodes
  promptNodeSchema,
  contextNodeSchema,
  contextAggregatorNodeSchema,
  userInputNodeSchema,
  outputFileNodeSchema,
  // Flow control nodes
  startNodeSchema,
  endNodeSchema,
  // Connector nodes
  teleportInNodeSchema,
  teleportOutNodeSchema,
  // Utility nodes
  variableNodeSchema,
] as const;
