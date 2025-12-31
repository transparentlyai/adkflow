/**
 * Extension API functions
 */

import { apiClient } from "./client";

/**
 * Extension nodes response
 */
export interface ExtensionNodesResponse {
  nodes: unknown[];
  menu_tree: Record<string, unknown>;
  count: number;
}

/**
 * Get available extension nodes
 */
export async function getExtensionNodes(): Promise<ExtensionNodesResponse> {
  try {
    const response = await apiClient.get<ExtensionNodesResponse>(
      "/api/extensions/nodes",
    );
    return response.data;
  } catch {
    // Return empty response if extensions not available
    return { nodes: [], menu_tree: {}, count: 0 };
  }
}
