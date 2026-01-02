/**
 * Debug panel utilities and constants
 */

import type { CategoryInfo } from "@/lib/api";

export type LogLevel = "DEBUG" | "INFO" | "WARNING" | "ERROR" | "OFF";

export const LOG_LEVELS: LogLevel[] = [
  "DEBUG",
  "INFO",
  "WARNING",
  "ERROR",
  "OFF",
];

export const LEVEL_COLORS: Record<LogLevel, string> = {
  DEBUG: "text-purple-400",
  INFO: "text-blue-400",
  WARNING: "text-yellow-400",
  ERROR: "text-red-400",
  OFF: "text-muted-foreground/50",
};

export interface LoggingPreset {
  id: string;
  name: string;
  description: string;
  apply: (categories: CategoryInfo[]) => Record<string, string>;
}

// Quick preset configurations
export const LOGGING_PRESETS: LoggingPreset[] = [
  {
    id: "debug-all",
    name: "Debug All",
    description: "Enable DEBUG for all categories",
    apply: (categories: CategoryInfo[]): Record<string, string> => {
      const result: Record<string, string> = {};
      for (const cat of categories) {
        result[cat.name] = "DEBUG";
      }
      return result;
    },
  },
  {
    id: "production",
    name: "Production",
    description: "Only warnings and errors",
    apply: (): Record<string, string> => ({}),
  },
  {
    id: "silent",
    name: "Silent",
    description: "Disable all logging",
    apply: (categories: CategoryInfo[]): Record<string, string> => {
      const result: Record<string, string> = {};
      for (const cat of categories) {
        result[cat.name] = "OFF";
      }
      return result;
    },
  },
  {
    id: "adk-debug",
    name: "ADK Debug",
    description: "API, agents, tools, workflow",
    apply: (): Record<string, string> => ({
      api: "DEBUG",
      "api.request": "DEBUG",
      "api.response": "DEBUG",
      runner: "DEBUG",
      "runner.agent": "DEBUG",
      "runner.agent.config": "DEBUG",
      "runner.tool": "DEBUG",
      "runner.workflow": "DEBUG",
      "runner.custom_node": "DEBUG",
    }),
  },
  {
    id: "api-only",
    name: "API Only",
    description: "LLM requests & responses",
    apply: (): Record<string, string> => ({
      api: "DEBUG",
      "api.request": "DEBUG",
      "api.response": "DEBUG",
    }),
  },
  {
    id: "tools-only",
    name: "Tools",
    description: "Tool execution only",
    apply: (): Record<string, string> => ({
      "runner.tool": "DEBUG",
    }),
  },
  {
    id: "agents-only",
    name: "Agents",
    description: "Agent execution and config",
    apply: (): Record<string, string> => ({
      "runner.agent": "DEBUG",
      "runner.agent.config": "DEBUG",
    }),
  },
  {
    id: "workflow-only",
    name: "Workflow",
    description: "Workflow and custom nodes",
    apply: (): Record<string, string> => ({
      "runner.workflow": "DEBUG",
      "runner.custom_node": "DEBUG",
    }),
  },
  {
    id: "compiler",
    name: "Compiler",
    description: "Workflow compilation",
    apply: (): Record<string, string> => ({
      compiler: "DEBUG",
    }),
  },
  {
    id: "runner-all",
    name: "Runner",
    description: "All runner categories",
    apply: (): Record<string, string> => ({
      runner: "DEBUG",
      "runner.agent": "DEBUG",
      "runner.agent.config": "DEBUG",
      "runner.tool": "DEBUG",
      "runner.workflow": "DEBUG",
      "runner.custom_node": "DEBUG",
    }),
  },
];

export interface CategoryNode {
  name: string;
  displayName: string;
  level: LogLevel;
  effectiveLevel: LogLevel; // Level after inheritance
  isInherited: boolean; // True if level is inherited from parent
  children: CategoryNode[];
  depth: number;
}

/**
 * Build a hierarchical tree from flat category list with inheritance.
 * @param categories - List of registered categories
 * @param categoryLevels - Explicit category level overrides
 * @param globalLevel - Global default level
 */
export function buildCategoryTree(
  categories: CategoryInfo[],
  categoryLevels: Record<string, string>,
  globalLevel: LogLevel = "INFO",
): CategoryNode[] {
  const nodeMap = new Map<string, CategoryNode>();

  // First pass: create all nodes
  for (const cat of categories) {
    const parts = cat.name.split(".");
    const displayName = parts[parts.length - 1];
    const explicitLevel = categoryLevels[cat.name];
    const hasExplicitLevel = explicitLevel !== undefined;

    nodeMap.set(cat.name, {
      name: cat.name,
      displayName,
      level: (explicitLevel || "INFO") as LogLevel, // Will be updated with inheritance
      effectiveLevel: globalLevel, // Will be computed
      isInherited: !hasExplicitLevel,
      children: [],
      depth: parts.length - 1,
    });
  }

  // Build tree structure
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

  // Second pass: compute effective levels with inheritance
  const computeEffectiveLevels = (
    nodes: CategoryNode[],
    parentLevel: LogLevel,
  ) => {
    for (const node of nodes) {
      const explicitLevel = categoryLevels[node.name];
      if (explicitLevel) {
        node.level = explicitLevel as LogLevel;
        node.effectiveLevel = explicitLevel as LogLevel;
        node.isInherited = false;
      } else {
        node.level = parentLevel;
        node.effectiveLevel = parentLevel;
        node.isInherited = true;
      }
      computeEffectiveLevels(node.children, node.effectiveLevel);
    }
  };
  computeEffectiveLevels(roots, globalLevel);

  // Sort nodes alphabetically
  const sortNodes = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => a.displayName.localeCompare(b.displayName));
    for (const node of nodes) {
      sortNodes(node.children);
    }
  };
  sortNodes(roots);

  return roots;
}
