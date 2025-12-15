import type { Node } from "@xyflow/react";

/**
 * Extract the display name from any node type
 */
export function getNodeDisplayName(node: Node): string {
  const prefix = node.id.split("_")[0];
  const data = node.data as Record<string, unknown>;

  switch (prefix) {
    case "agent":
      return (data.agent as { name?: string })?.name ?? "Unnamed Agent";
    case "prompt":
    case "context":
      return (data.prompt as { name?: string })?.name ?? "Unnamed";
    case "tool":
    case "agentTool":
    case "variable":
    case "process":
    case "teleportOut":
    case "teleportIn":
      return (data.name as string) ?? "Unnamed";
    case "group":
    case "label":
      return (data.label as string) ?? "Unnamed";
    case "inputProbe":
      return (data.name as string) ?? "Input Probe";
    case "outputProbe":
      return (data.name as string) ?? "Output Probe";
    case "logProbe":
      return (data.name as string) ?? "Log Probe";
    default:
      return node.id;
  }
}

/**
 * Get human-readable label for a node type
 */
export function getNodeTypeLabel(nodeType: string): string {
  const labels: Record<string, string> = {
    agent: "Agent",
    prompt: "Prompt",
    context: "Context",
    tool: "Tool",
    agentTool: "Agent Tool",
    variable: "Variable",
    process: "Process",
    group: "Group",
    label: "Label",
    teleportOut: "Teleport Out",
    teleportIn: "Teleport In",
    inputProbe: "Input Probe",
    outputProbe: "Output Probe",
    logProbe: "Log Probe",
  };
  return labels[nodeType] ?? nodeType;
}

/**
 * Get the node type from a node ID prefix
 */
export function getNodeTypeFromId(nodeId: string): string {
  return nodeId.split("_")[0];
}

/**
 * Simple search matching with scoring
 * Returns: exact=100, startsWith=80, contains=60, none=0
 */
export function matchSearch(query: string, text: string): number {
  if (!query || !text) return 0;

  const q = query.toLowerCase();
  const t = text.toLowerCase();

  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.includes(q)) return 60;
  return 0;
}

/**
 * Search index entry interface
 */
export interface SearchIndexEntry {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  nodeTypeLabel: string;
  tabId: string;
  tabName: string;
}

/**
 * Search result with score
 */
export interface SearchResult extends SearchIndexEntry {
  score: number;
}

/**
 * Build search index entries from nodes
 */
export function buildEntriesFromNodes(
  nodes: Node[],
  tabId: string,
  tabName: string
): SearchIndexEntry[] {
  return nodes.map((node) => {
    const nodeType = getNodeTypeFromId(node.id);
    return {
      nodeId: node.id,
      nodeName: getNodeDisplayName(node),
      nodeType,
      nodeTypeLabel: getNodeTypeLabel(nodeType),
      tabId,
      tabName,
    };
  });
}

/**
 * Filter and score search results
 */
export function searchIndex(
  entries: SearchIndexEntry[],
  query: string
): SearchResult[] {
  if (!query.trim()) return [];

  const results: SearchResult[] = [];

  for (const entry of entries) {
    // Match against node name (primary)
    const nameScore = matchSearch(query, entry.nodeName);
    // Match against node type (secondary, lower weight)
    const typeScore = matchSearch(query, entry.nodeTypeLabel) * 0.5;
    // Match against tab name (tertiary, even lower weight)
    const tabScore = matchSearch(query, entry.tabName) * 0.3;

    const score = Math.max(nameScore, typeScore, tabScore);

    if (score > 0) {
      results.push({ ...entry, score });
    }
  }

  // Sort by score descending, then by name alphabetically
  return results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.nodeName.localeCompare(b.nodeName);
  });
}
