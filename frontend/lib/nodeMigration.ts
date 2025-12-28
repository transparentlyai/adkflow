/**
 * Node Migration Utilities
 *
 * Provides functions to migrate legacy node formats to the new schema-driven format.
 * This ensures backward compatibility when loading older workflows.
 */

import type { Node } from "@xyflow/react";
import type {
  CustomNodeSchema,
  CustomNodeData,
} from "@/components/nodes/CustomNode";
import { getDefaultCustomNodeData } from "@/components/nodes/CustomNode";
import { builtinTypeToSchema } from "@/lib/builtinNodeHelpers";

/**
 * Node types that should be migrated to schema-driven format.
 * Excluded:
 * - Layout nodes (group, label) - fundamentally different architecture
 * - Complex nodes (agent) - need custom UI components (AgentPropertiesPanel)
 */
const MIGRATABLE_TYPES = [
  "prompt",
  "context",
  "inputProbe",
  "outputProbe",
  "logProbe",
  "outputFile",
  "tool",
  "agentTool",
  "process",
  "variable",
  "teleportIn",
  "teleportOut",
  "userInput",
  "start",
  "end",
];

/**
 * Check if a node is using the legacy format (not schema-driven).
 */
export function isLegacyNode(node: Node): boolean {
  const nodeType = node.type || "";

  // If it's already a builtin: or custom: prefixed type, it's schema-driven
  if (nodeType.startsWith("builtin:") || nodeType.startsWith("custom:")) {
    return false;
  }

  // If it's a migratable type without the prefix, it's legacy
  return MIGRATABLE_TYPES.includes(nodeType);
}

/**
 * Check if node data is in the schema-driven format.
 */
function isSchemaData(data: Record<string, unknown>): boolean {
  return (
    data && typeof data === "object" && "schema" in data && "config" in data
  );
}

/**
 * Extract config values from legacy AgentNode data.
 */
function migrateAgentData(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const agent = data.agent as Record<string, unknown> | undefined;
  if (!agent) return {};

  const httpOptions = agent.http_options as Record<string, unknown> | undefined;

  return {
    name: agent.name,
    type: agent.type || "llm",
    model: agent.model || "gemini-2.5-flash",
    temperature: agent.temperature ?? 0.7,
    description: agent.description || "",
    max_iterations: agent.max_iterations ?? 5,
    planner_type: agent.planner_type || "none",
    disallow_transfer_to_parent: agent.disallow_transfer_to_parent ?? false,
    disallow_transfer_to_peers: agent.disallow_transfer_to_peers ?? false,
    code_executor_enabled: agent.code_executor_enabled ?? false,
    http_timeout: httpOptions?.timeout ?? 30000,
    http_max_retries: httpOptions?.max_retries ?? 3,
  };
}

/**
 * Extract config values from legacy PromptNode/ContextNode data.
 */
function migratePromptData(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const prompt = data.prompt as Record<string, unknown> | undefined;
  return {
    name: prompt?.name || "",
    file_path: prompt?.file_path || "",
    content: data.content || "",
  };
}

/**
 * Extract config values from legacy probe node data.
 */
function migrateProbeData(
  data: Record<string, unknown>,
): Record<string, unknown> {
  return {
    file_path: data.file_path || "",
    content: data.content || "",
  };
}

/**
 * Extract config values from legacy ToolNode data.
 */
function migrateToolData(
  data: Record<string, unknown>,
): Record<string, unknown> {
  return {
    name: data.name || "new_tool",
    file_path: data.file_path || "",
    code: data.code || "",
    error_behavior: data.error_behavior || "raise",
  };
}

/**
 * Extract config values from legacy ProcessNode data.
 */
function migrateProcessData(
  data: Record<string, unknown>,
): Record<string, unknown> {
  return {
    name: data.name || "new_process",
    description: data.description || "",
    file_path: data.file_path || "",
    code: data.code || "",
  };
}

/**
 * Extract config values from legacy VariableNode data.
 */
function migrateVariableData(
  data: Record<string, unknown>,
): Record<string, unknown> {
  return {
    name: data.name || "variable",
    value: data.value || "",
  };
}

/**
 * Extract config values from legacy TeleportNode data.
 */
function migrateTeleportData(
  data: Record<string, unknown>,
): Record<string, unknown> {
  return {
    name: data.name || "",
  };
}

/**
 * Extract config values from legacy UserInputNode data.
 */
function migrateUserInputData(
  data: Record<string, unknown>,
): Record<string, unknown> {
  return {
    name: data.name || "User Input",
    timeout: data.timeout ?? 300,
    timeoutBehavior: data.timeoutBehavior || "error",
    predefinedText: data.predefinedText || "",
  };
}

/**
 * Extract config values from legacy OutputFileNode data.
 */
function migrateOutputFileData(
  data: Record<string, unknown>,
): Record<string, unknown> {
  return {
    name: data.name || "Output File",
    file_path: data.file_path || "outputs/output.txt",
  };
}

/**
 * Extract config values from legacy AgentToolNode data.
 */
function migrateAgentToolData(
  data: Record<string, unknown>,
): Record<string, unknown> {
  return {
    name: data.name || "Agent Tool",
  };
}

/**
 * Migrate a single legacy node to schema-driven format.
 */
export function migrateLegacyNode(node: Node): Node {
  const nodeType = node.type || "";
  const data = node.data as Record<string, unknown>;

  // Skip if already schema-driven
  if (!isLegacyNode(node) || isSchemaData(data)) {
    return node;
  }

  // Get the schema for this node type
  const schema = builtinTypeToSchema[nodeType];
  if (!schema) {
    // No schema available, keep as legacy
    return node;
  }

  // Create base schema-driven data
  const schemaData = getDefaultCustomNodeData(schema);

  // Migrate config values based on node type
  let migratedConfig: Record<string, unknown> = {};

  switch (nodeType) {
    case "agent":
      migratedConfig = migrateAgentData(data);
      break;
    case "prompt":
    case "context":
      migratedConfig = migratePromptData(data);
      break;
    case "inputProbe":
    case "outputProbe":
    case "logProbe":
      migratedConfig = migrateProbeData(data);
      break;
    case "tool":
      migratedConfig = migrateToolData(data);
      break;
    case "process":
      migratedConfig = migrateProcessData(data);
      break;
    case "variable":
      migratedConfig = migrateVariableData(data);
      break;
    case "teleportIn":
    case "teleportOut":
      migratedConfig = migrateTeleportData(data);
      break;
    case "userInput":
      migratedConfig = migrateUserInputData(data);
      break;
    case "outputFile":
      migratedConfig = migrateOutputFileData(data);
      break;
    case "agentTool":
      migratedConfig = migrateAgentToolData(data);
      break;
    case "start":
    case "end":
      // These have no config fields
      migratedConfig = {};
      break;
  }

  // Merge migrated config with schema defaults
  const finalConfig = { ...schemaData.config, ...migratedConfig };

  // Preserve handle types and other common properties
  const finalData: CustomNodeData = {
    ...schemaData,
    config: finalConfig,
    handleTypes:
      (data.handleTypes as CustomNodeData["handleTypes"]) ||
      schemaData.handleTypes,
    isExpanded:
      (data.isExpanded as boolean | undefined) ?? schemaData.isExpanded,
    isNodeLocked: data.isNodeLocked as boolean | undefined,
    expandedSize: data.expandedSize as
      | { width: number; height: number }
      | undefined,
    executionState: data.executionState as CustomNodeData["executionState"],
    validationErrors: data.validationErrors as string[] | undefined,
    validationWarnings: data.validationWarnings as string[] | undefined,
  };

  // Return migrated node
  // Keep the original node type (e.g., "start", not "builtin:start")
  // since staticNodeTypes maps these directly to CustomNode
  return {
    ...node,
    type: nodeType,
    data: finalData as unknown as Record<string, unknown>,
  };
}

/**
 * Migrate all legacy nodes in a workflow to schema-driven format.
 */
export function migrateWorkflow(nodes: Node[]): Node[] {
  return nodes.map(migrateLegacyNode);
}

/**
 * Check if a workflow contains any legacy nodes that need migration.
 */
export function workflowNeedsMigration(nodes: Node[]): boolean {
  return nodes.some(isLegacyNode);
}

/**
 * Fill in missing default values for schema-driven nodes.
 * This handles nodes that were migrated before new fields were added to schemas.
 */
export function fillMissingDefaults(node: Node): Node {
  const data = node.data as Record<string, unknown>;

  // Only process schema-driven nodes
  if (!isSchemaData(data)) {
    return node;
  }

  const schema = data.schema as CustomNodeSchema;
  const config = data.config as Record<string, unknown>;

  if (!schema?.ui?.fields) {
    return node;
  }

  // Check if any field is missing from config
  let hasChanges = false;
  const updatedConfig = { ...config };

  for (const field of schema.ui.fields) {
    if (!(field.id in updatedConfig) && field.default !== undefined) {
      updatedConfig[field.id] = field.default;
      hasChanges = true;
    }
  }

  if (!hasChanges) {
    return node;
  }

  return {
    ...node,
    data: {
      ...data,
      config: updatedConfig,
    },
  };
}

/**
 * Apply all migrations and fill missing defaults.
 * Use this as the main entry point for loading workflows.
 */
export function prepareWorkflowNodes(nodes: Node[]): Node[] {
  return nodes.map((node) => {
    // First migrate legacy nodes
    const migrated = migrateLegacyNode(node);
    // Then fill any missing defaults
    return fillMissingDefaults(migrated);
  });
}
