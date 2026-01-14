/**
 * Node and handle type definitions
 * Includes node types, teleporters, and handle data type system
 */

/**
 * Node types for the Drawflow canvas
 */
export type NodeType =
  | "group"
  | "agent"
  | "prompt"
  | "context"
  | "inputProbe"
  | "outputProbe"
  | "logProbe"
  | "tool"
  | "agentTool"
  | "variable"
  | "teleportOut"
  | "teleportIn"
  | "userInput"
  | "start"
  | "end";

/**
 * Teleporter (flow connector) types for cross-flow connections
 */
export type TeleporterDirection = "output" | "input";

export interface TeleporterEntry {
  id: string;
  name: string;
  direction: TeleporterDirection;
  tabId: string;
  tabName: string;
  color: string;
}

export interface TeleporterRegistry {
  teleporters: TeleporterEntry[];
  colorMap: Record<string, string>; // name -> color for consistent coloring
}

export interface TeleporterListResponse {
  teleporters: TeleporterEntry[];
  colorMap: Record<string, string>;
}

/**
 * Handle position for draggable handles
 */
export type HandleEdge = "top" | "right" | "bottom" | "left";

export interface HandlePosition {
  edge: HandleEdge;
  percent: number; // 0-100, position along the edge
}

export type HandlePositions = Record<string, HandlePosition>;

/**
 * Handle Data Type System
 * Uses source:type pattern for connection validation
 * - Source: semantic origin (e.g., 'prompt', 'agent', 'tool', 'context')
 * - Type: Python type (e.g., 'str', 'dict', 'list', 'callable')
 */

/**
 * Handle type information for connection validation
 */
export interface HandleTypeInfo {
  // For source handles (outputs)
  outputSource?: string; // e.g., 'prompt', 'agent', 'tool', 'context'
  outputType?: string; // Python type: 'str', 'dict', 'list', 'callable', etc.

  // For target handles (inputs)
  acceptedSources?: string[]; // Which sources accepted (or ['*'] for any)
  acceptedTypes?: string[]; // Which Python types accepted (or ['*'] for any)

  // Connection multiplicity
  multiple?: boolean; // Whether multiple connections are allowed (default: true)
}

/**
 * Registry mapping handleId -> HandleTypeInfo for a node
 */
export type HandleTypes = Record<string, HandleTypeInfo>;

/**
 * Helper to check if a connection is valid based on source and type
 * Both source and type must match for a valid connection
 */
export function isTypeCompatible(
  outputSource: string | undefined | null,
  outputType: string | undefined | null,
  acceptedSources: string[] | undefined,
  acceptedTypes: string[] | undefined,
): boolean {
  // Missing source or type info = connection NOT allowed
  if (!outputSource || !outputType) return false;
  if (!acceptedSources?.length || !acceptedTypes?.length) return false;

  // '*' on either side = wildcard match
  const sourceMatch =
    outputSource === "*" ||
    acceptedSources.includes("*") ||
    acceptedSources.includes(outputSource);
  const typeMatch =
    outputType === "*" ||
    acceptedTypes.includes("*") ||
    acceptedTypes.includes(outputType);

  return sourceMatch && typeMatch;
}

/**
 * Extended node data for Drawflow integration
 */
export interface NodeData {
  type: NodeType;
  id: string;
  name: string;
  model?: string;
  system_prompt?: string;
  tools?: string[];
  text?: string; // For prompt nodes
  description?: string;
  agents?: import("./agent").Agent[];
}
