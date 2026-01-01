/**
 * Debug panel utilities and constants
 */

import { Radio, Wrench, Settings, MessageSquare } from "lucide-react";
import type { CategoryInfo } from "@/lib/api";

export type LogLevel = "DEBUG" | "INFO" | "WARNING" | "ERROR";

export const LOG_LEVELS: LogLevel[] = ["DEBUG", "INFO", "WARNING", "ERROR"];

export const LEVEL_COLORS: Record<LogLevel, string> = {
  DEBUG: "text-gray-400",
  INFO: "text-blue-400",
  WARNING: "text-yellow-400",
  ERROR: "text-red-400",
};

// ADK debugging categories with their display names and icons
export const ADK_DEBUG_CATEGORIES = [
  {
    id: "api",
    name: "API Requests",
    description: "LLM API calls & responses",
    icon: Radio,
    categories: ["api.request", "api.response"],
  },
  {
    id: "tool",
    name: "Tool Execution",
    description: "Tool calls & results",
    icon: Wrench,
    categories: ["runner.tool"],
  },
  {
    id: "agent",
    name: "Agent Config",
    description: "Agent creation & setup",
    icon: Settings,
    categories: ["runner.agent.config"],
  },
  {
    id: "workflow",
    name: "Workflow",
    description: "Workflow execution flow",
    icon: MessageSquare,
    categories: ["runner.workflow"],
  },
] as const;

export interface CategoryNode {
  name: string;
  displayName: string;
  level: LogLevel;
  children: CategoryNode[];
  depth: number;
}

/**
 * Build a hierarchical tree from flat category list.
 */
export function buildCategoryTree(
  categories: CategoryInfo[],
  categoryLevels: Record<string, string>,
): CategoryNode[] {
  const nodeMap = new Map<string, CategoryNode>();

  for (const cat of categories) {
    const parts = cat.name.split(".");
    const displayName = parts[parts.length - 1];
    const level = (categoryLevels[cat.name] || cat.level || "INFO") as LogLevel;

    nodeMap.set(cat.name, {
      name: cat.name,
      displayName,
      level,
      children: [],
      depth: parts.length - 1,
    });
  }

  const roots: CategoryNode[] = [];

  for (const cat of categories) {
    const node = nodeMap.get(cat.name)!;
    const parts = cat.name.split(".");

    if (parts.length === 1) {
      roots.push(node);
    } else {
      const parentName = parts.slice(0, -1).join(".");
      const parent = nodeMap.get(parentName);
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }
  }

  const sortNodes = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => a.displayName.localeCompare(b.displayName));
    for (const node of nodes) {
      sortNodes(node.children);
    }
  };
  sortNodes(roots);

  return roots;
}
