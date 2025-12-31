"use client";

import { memo } from "react";
import { Send, FileInput, Play, Square } from "lucide-react";

/**
 * Icon mapping for CustomNode types.
 * Maps schema icon names to either:
 * - Custom SVG paths (matching the old node components exactly)
 * - Lucide-react icons
 */

export interface NodeIconProps {
  /**
   * Icon name from schema (e.g., "prompt", "context", "tool", "process", "agent")
   */
  icon?: string;
  /**
   * CSS class for sizing (default: "w-3 h-3")
   */
  className?: string;
  /**
   * Additional styles
   */
  style?: React.CSSProperties;
}

/**
 * Custom SVG icon paths - extracted from old node components
 * These match the original icons exactly
 */
const CUSTOM_SVG_ICONS: Record<
  string,
  { paths: React.ReactNode; viewBox?: string }
> = {
  // Document icon - from PromptNode.tsx (aliases: document, prompt)
  document: {
    paths: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    ),
  },
  // Database/cylinder icon - from ContextNode.tsx (aliases: database, context)
  database: {
    paths: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
      />
    ),
  },
  // Settings/gear icon - from ToolNodeCollapsed.tsx (aliases: gear, tool, settings)
  gear: {
    paths: (
      <>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </>
    ),
  },
  // Code brackets icon - from ProcessNode.tsx (aliases: code, process)
  code: {
    paths: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
      />
    ),
  },
  // Monitor/screen icon - from AgentNode.tsx (aliases: monitor, agent)
  monitor: {
    paths: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    ),
  },
};

/**
 * Icon name aliases - maps alternative names to canonical icon names
 */
const ICON_ALIASES: Record<string, string> = {
  // Prompt/document aliases
  prompt: "document",
  doc: "document",
  file: "document",
  // Context/database aliases
  context: "database",
  db: "database",
  cylinder: "database",
  // Tool/gear aliases
  tool: "gear",
  settings: "gear",
  cog: "gear",
  // Process/code aliases
  process: "code",
  brackets: "code",
  // Agent/monitor aliases
  agent: "monitor",
  screen: "monitor",
  computer: "monitor",
};

/**
 * Lucide-react icon components for specific node types
 */
const LUCIDE_ICONS: Record<
  string,
  React.ComponentType<{ className?: string; style?: React.CSSProperties }>
> = {
  // UserInput - Send icon
  user_input: Send,
  userInput: Send,
  send: Send,
  // OutputFile - FileInput icon
  output_file: FileInput,
  outputFile: FileInput,
  file_input: FileInput,
  // Start - Play icon
  start: Play,
  play: Play,
  // End - Square icon
  end: Square,
  stop: Square,
  square: Square,
};

/**
 * NodeIcon component - renders the appropriate icon for a CustomNode based on schema.ui.icon
 *
 * Supports:
 * - Custom SVG paths for: prompt, context, tool, process, agent
 * - Lucide-react icons for: user_input, output_file, start, end
 * - Falls back to null for nodes that don't use icons (variable, probes, teleport, agent_tool)
 */
const NodeIcon = memo(
  ({ icon, className = "w-3 h-3", style }: NodeIconProps) => {
    if (!icon) return null;

    const normalizedIcon = icon.toLowerCase();
    // Resolve alias to canonical name
    const canonicalIcon = ICON_ALIASES[normalizedIcon] || normalizedIcon;

    // Check for custom SVG icon
    const customIcon = CUSTOM_SVG_ICONS[canonicalIcon];
    if (customIcon) {
      return (
        <svg
          className={`${className} flex-shrink-0`}
          fill="none"
          stroke="currentColor"
          viewBox={customIcon.viewBox || "0 0 24 24"}
          style={style}
        >
          {customIcon.paths}
        </svg>
      );
    }

    // Check for Lucide icon (use original normalized name for Lucide icons)
    const LucideIcon =
      LUCIDE_ICONS[normalizedIcon] || LUCIDE_ICONS[canonicalIcon];
    if (LucideIcon) {
      return (
        <LucideIcon className={`${className} flex-shrink-0`} style={style} />
      );
    }

    // No icon for this type (variable, probes, teleport, agent_tool use text labels instead)
    return null;
  },
);

NodeIcon.displayName = "NodeIcon";

export default NodeIcon;

/**
 * Helper to check if a node type should render an icon
 * Returns false for types that use text labels instead:
 * - Variable: just lock when locked, name shows with braces
 * - Probes: use text labels "IN", "OUT", "LOG"
 * - AgentTool: use text "Agent\nTool" or compact display
 * - Teleport: use name in tag shape
 */
export function hasIcon(icon?: string): boolean {
  if (!icon) return false;
  const normalizedIcon = icon.toLowerCase();
  const canonicalIcon = ICON_ALIASES[normalizedIcon] || normalizedIcon;
  return (
    canonicalIcon in CUSTOM_SVG_ICONS ||
    normalizedIcon in LUCIDE_ICONS ||
    canonicalIcon in LUCIDE_ICONS
  );
}
