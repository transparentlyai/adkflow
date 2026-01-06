/**
 * Context Aggregator Preview Types
 *
 * Type definitions for the preview panel that displays aggregation results.
 * These types are used by preview widgets and the preview API.
 */

import type { DynamicInputConfig, DynamicInputType } from "@/components/nodes/CustomNode/types/dynamicInputs";

/**
 * Result of previewing a single input source.
 */
export interface PreviewResult {
  /** Variable name this content will be assigned to */
  variableName: string;
  /** The actual content (may be truncated) */
  content: string;
  /** Metadata about the source (when includeMetadata is true) */
  metadata?: Record<string, string>;
  /** Error message if preview failed */
  error?: string;
  /** Whether content was truncated due to size limits */
  truncated?: boolean;
  /** Total size of the original content in bytes */
  totalSize?: number;
}

/**
 * File info for directory previews.
 */
export interface DirectoryFileInfo {
  /** Relative path to the file */
  path: string;
  /** File content (may be truncated) */
  content: string;
  /** File size in bytes */
  size: number;
  /** Error if this specific file failed to read */
  error?: string;
}

/**
 * Extended result for directory inputs with file listing.
 */
export interface DirectoryPreviewResult extends PreviewResult {
  /** List of matched files with their content */
  files: DirectoryFileInfo[];
  /** Total number of files matched */
  totalFiles: number;
  /** The glob pattern used */
  matchedPattern: string;
  /** Warning messages (e.g., limits exceeded) */
  warnings?: string[];
}

/**
 * Computed aggregation output.
 *
 * For pass mode: Python dict representation.
 * For concatenate mode: Full rendered text with separators.
 */
export interface ComputedOutput {
  /** The computed content (Python dict or rendered text) */
  content: string;
  /** The aggregation mode used ("pass" or "concatenate") */
  mode: string;
  /** Output variable name (for concatenate mode only) */
  outputVariableName?: string;
  /** Approximate token count (undefined if counting failed) */
  tokenCount?: number;
  /** Error message if token counting failed */
  tokenCountError?: string;
}

/**
 * Response from the preview API endpoint.
 */
export interface PreviewResponse {
  /** Results keyed by input ID */
  results: Record<string, PreviewResult | DirectoryPreviewResult>;
  /** Computed aggregation output */
  computedOutput: ComputedOutput;
  /** Global errors that affected the entire preview */
  errors: string[];
}

/**
 * Request to the preview API endpoint.
 */
export interface PreviewRequest {
  /** Path to the project root */
  projectPath: string;
  /** Dynamic inputs to preview */
  dynamicInputs: DynamicInputConfig[];
  /** Node-level aggregation mode */
  aggregationMode: "pass" | "concatenate";
  /** Separator for concatenate mode */
  separator: string;
  /** Output variable name for concatenate mode */
  outputVariableName: string;
  /** Whether to include metadata */
  includeMetadata: boolean;
  /** Maximum content size per input (default: 10KB) */
  maxContentSize?: number;
}

/**
 * Props for preview widget components.
 */
export interface PreviewWidgetProps {
  /** The input configuration */
  input: DynamicInputConfig;
  /** Preview result from API (null if not yet loaded) */
  preview: PreviewResult | DirectoryPreviewResult | null;
  /** Whether preview is currently loading */
  isLoading: boolean;
  /** Error message if preview failed */
  error: string | null;
  /** Whether metadata is included */
  includeMetadata: boolean;
  /** Connected source name (for node inputs) */
  connectedSourceName?: string;
}

/**
 * Type guard to check if a preview result is a directory result.
 */
export function isDirectoryPreviewResult(
  result: PreviewResult | DirectoryPreviewResult,
): result is DirectoryPreviewResult {
  return "files" in result && Array.isArray(result.files);
}

/**
 * Preview widget component type.
 */
export type PreviewWidgetComponent = React.ComponentType<PreviewWidgetProps>;

/**
 * Registry mapping input types to preview widgets.
 */
export type PreviewWidgetRegistry = Record<DynamicInputType, PreviewWidgetComponent>;
