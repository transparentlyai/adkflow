/**
 * Context Aggregator Preview API functions
 *
 * Provides functions to preview context aggregation results
 * without running the full workflow.
 */

import axios from "axios";
import { apiClient } from "./client";
import type { DynamicInputConfig, NodeAggregationMode } from "@/components/nodes/CustomNode/types/dynamicInputs";

/**
 * File info for directory previews.
 */
export interface FileInfo {
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

  // Directory-specific fields
  /** List of matched files with their content */
  files?: FileInfo[];
  /** Total number of files matched */
  totalFiles?: number;
  /** The glob pattern used */
  matchedPattern?: string;
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
  results: Record<string, PreviewResult>;
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
  aggregationMode: NodeAggregationMode;
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
 * Preview context aggregation results.
 *
 * Calls the backend to read files, directories, and URLs to show what content
 * would be aggregated. Node inputs show a placeholder since they're only
 * available at runtime.
 *
 * @param request Preview request configuration
 * @returns Preview response with results for each input
 * @throws Error if the API call fails
 */
export async function previewContextAggregation(
  request: PreviewRequest,
): Promise<PreviewResponse> {
  try {
    const response = await apiClient.post<PreviewResponse>(
      "/api/context-aggregator/preview",
      request,
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(
        error.response.data.detail || "Failed to preview context aggregation",
      );
    }
    throw error;
  }
}
