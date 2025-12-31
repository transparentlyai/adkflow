/**
 * Custom Node Data Types
 *
 * Runtime data structure stored on CustomNode instances.
 */

import type { HandlePositions, NodeExecutionState } from "@/lib/types";
import type { CustomNodeSchema } from "./schema";

/**
 * Runtime data stored on a CustomNode instance.
 *
 * This interface defines the data structure that is stored in ReactFlow's
 * node data property. It includes the schema, current configuration values,
 * and runtime state like expansion and execution status.
 *
 * @example Creating node data from schema
 * ```typescript
 * const nodeData = getDefaultCustomNodeData(myNodeSchema);
 * // nodeData.config contains default values from schema
 * // nodeData.handleTypes contains connection type info
 * ```
 */
export interface CustomNodeData {
  /** The node's schema definition */
  schema: CustomNodeSchema;
  /** Current configuration values keyed by field ID (includes 'name' field) */
  config: Record<string, unknown>;
  /** Handle position overrides */
  handlePositions?: HandlePositions;
  /**
   * Handle type information for connection validation.
   * Computed from schema inputs/outputs.
   */
  handleTypes?: Record<
    string,
    {
      outputSource?: string;
      outputType?: string;
      acceptedSources?: string[];
      acceptedTypes?: string[];
    }
  >;
  /** Current size when expanded (for resizable nodes) */
  expandedSize?: { width: number; height: number };
  /** Position when expanded (saved on collapse, restored on expand) */
  expandedPosition?: { x: number; y: number };
  /** Position when contracted/collapsed (saved on expand, restored on collapse) */
  contractedPosition?: { x: number; y: number };
  /** Whether the node is currently expanded */
  isExpanded?: boolean;
  /** Whether the node is locked (prevents editing) */
  isNodeLocked?: boolean;
  /** Current execution state for visual feedback */
  executionState?: NodeExecutionState;
  /** List of validation error messages */
  validationErrors?: string[];
  /** List of validation warning messages */
  validationWarnings?: string[];
  /** Client-side duplicate name error message */
  duplicateNameError?: string;
  /** Currently active tab in expanded view (for edge opacity calculation) */
  activeTab?: string;
}
