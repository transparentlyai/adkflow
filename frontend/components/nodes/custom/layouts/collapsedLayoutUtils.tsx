import type { CSSProperties } from "react";
import type { useTheme } from "@/contexts/ThemeContext";
import type { NodeExecutionState } from "@/lib/types";

/**
 * Get theme colors for a node type
 */
export function getThemeColors(
  theme: ReturnType<typeof useTheme>["theme"],
  themeKey?: string,
) {
  if (!themeKey) return null;
  const nodesRecord = theme.colors.nodes as unknown as Record<string, unknown>;
  const nodeColors = nodesRecord[themeKey];
  if (nodeColors && typeof nodeColors === "object") {
    return nodeColors as {
      header?: string;
      headerHover?: string;
      text?: string;
      ring?: string;
    };
  }
  return null;
}

/**
 * Get execution state styling for a node
 */
export function getExecutionStyle(
  executionState?: NodeExecutionState,
): CSSProperties {
  switch (executionState) {
    case "running":
      return {
        boxShadow: `0 0 0 2px rgba(59, 130, 246, 0.8), 0 0 20px 4px rgba(59, 130, 246, 0.4)`,
        animation: "custom-node-execution-pulse 1.5s ease-in-out infinite",
      };
    case "completed":
      return {
        boxShadow: `0 0 0 2px rgba(34, 197, 94, 0.8), 0 0 10px 2px rgba(34, 197, 94, 0.3)`,
        transition: "box-shadow 0.3s ease-out",
      };
    case "error":
      return {
        boxShadow: `0 0 0 2px rgba(239, 68, 68, 0.8), 0 0 20px 4px rgba(239, 68, 68, 0.4)`,
        animation: "validation-error-pulse 1s ease-in-out infinite",
      };
    default:
      return {};
  }
}

/**
 * Get validation error glow style
 */
export function getValidationStyle(
  hasValidationError?: boolean,
): CSSProperties {
  if (hasValidationError) {
    return {
      boxShadow: `0 0 0 2px rgba(239, 68, 68, 0.8), 0 0 20px 4px rgba(239, 68, 68, 0.4)`,
      animation: "validation-error-pulse 1s ease-in-out infinite",
    };
  }
  return {};
}

/**
 * Get duplicate name error style (static red glow, no animation)
 */
export function getDuplicateNameStyle(
  duplicateNameError?: string,
): CSSProperties {
  if (duplicateNameError) {
    return {
      boxShadow: `0 0 0 2px #ef4444`,
    };
  }
  return {};
}

/**
 * Format collapsed display text using config values
 */
export function formatCollapsedText(
  format: string | undefined,
  config: Record<string, unknown>,
  summaryFields: string[] | undefined,
): string | null {
  if (format) {
    return format.replace(/\{(\w+)\}/g, (_, key) => String(config[key] || ""));
  }
  if (summaryFields && summaryFields.length > 0) {
    return summaryFields
      .map((f) => String(config[f] || ""))
      .filter(Boolean)
      .join(" • ");
  }
  return null;
}

/**
 * Parse function signature from Python code
 */
export function parseFunctionSignature(
  code: string,
): { name: string; params: string; returnType: string } | null {
  // Match: def function_name(params) -> return_type:
  const match = code.match(/def\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*([^:]+))?:/);
  if (!match) return null;

  return {
    name: match[1],
    params: match[2].trim(),
    returnType: match[3]?.trim() || "None",
  };
}

/**
 * Shallow comparison for arrays of strings
 */
export function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * CSS keyframes for execution and validation animations
 */
export const ExecutionAnimationStyles = `
  @keyframes custom-node-execution-pulse {
    0%, 100% { box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.8), 0 0 20px 4px rgba(59, 130, 246, 0.4); }
    50% { box-shadow: 0 0 0 3px rgba(59, 130, 246, 1), 0 0 30px 8px rgba(59, 130, 246, 0.6); }
  }
  @keyframes validation-error-pulse {
    0%, 100% { box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.8), 0 0 20px 4px rgba(239, 68, 68, 0.4); }
    50% { box-shadow: 0 0 0 3px rgba(239, 68, 68, 1), 0 0 30px 8px rgba(239, 68, 68, 0.6); }
  }
`;

/**
 * Component that renders the execution animation styles
 */
export const ExecutionAnimations = () => (
  <style>{ExecutionAnimationStyles}</style>
);
