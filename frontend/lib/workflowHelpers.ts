/**
 * Helper functions for workflow manipulation
 */

/**
 * Generate a unique ID for nodes
 */
export function generateNodeId(prefix: string = "node"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
