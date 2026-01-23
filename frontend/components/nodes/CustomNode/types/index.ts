/**
 * Custom Node Types
 *
 * Re-exports all type definitions for custom nodes.
 */

export type { PortDefinition } from "./ports";
export type { FieldDefinition } from "./fields";
export type {
  NodeLayout,
  CollapsedDisplay,
  CollapsedBody,
  CollapsedFooter,
  HandleLayout,
} from "./layout";
export type { CustomNodeSchema } from "./schema";
export type { CustomNodeData } from "./data";

// Dynamic input types
export type {
  DynamicInputType,
  DynamicInputConfig,
  NodeAggregationMode,
  DirectoryAggregationMode,
  NamingPatternType,
} from "./dynamicInputs";

// Dynamic input utilities
export {
  DEFAULT_DYNAMIC_INPUT,
  generateDynamicInputId,
  createDynamicInput,
  NAMING_PATTERN_VARIABLES,
} from "./dynamicInputs";

// KeyValue types for Variable nodes
export type { KeyValueItem } from "./keyValue";
