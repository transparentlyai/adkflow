"use client";

import { Cable } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import type { PreviewWidgetProps } from "./types";

/**
 * RuntimePlaceholderWidget displays a placeholder message for node inputs.
 *
 * Node inputs are resolved at runtime, so they cannot be previewed in advance.
 * This widget shows the input name and a placeholder message, along with
 * connection status if available.
 */
export function RuntimePlaceholderWidget({
  input,
  connectedSourceName,
}: PreviewWidgetProps) {
  const { theme } = useTheme();

  return (
    <div
      className="rounded-lg border-2 border-dashed p-4"
      style={{
        borderColor: theme.colors.nodes.common.container.border,
        backgroundColor: theme.colors.nodes.common.container.background,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className="p-1.5 rounded"
          style={{
            backgroundColor: theme.colors.nodes.common.footer.background,
          }}
        >
          <Cable
            className="w-4 h-4"
            style={{ color: theme.colors.nodes.common.text.muted }}
          />
        </div>
        <div>
          <div
            className="text-sm font-medium"
            style={{ color: theme.colors.nodes.common.text.primary }}
          >
            {input.label}
          </div>
          <div
            className="text-xs font-mono"
            style={{ color: theme.colors.nodes.common.text.muted }}
          >
            {input.variableName}
          </div>
        </div>
      </div>

      {/* Connection status */}
      {connectedSourceName && (
        <div
          className="text-xs mb-3 px-2 py-1 rounded inline-block"
          style={{
            backgroundColor: theme.colors.nodes.common.footer.background,
            color: theme.colors.nodes.common.text.secondary,
          }}
        >
          Connected to:{" "}
          <span className="font-medium">{connectedSourceName}</span>
        </div>
      )}

      {/* Placeholder message */}
      <div
        className="text-center py-6 text-sm font-medium"
        style={{ color: theme.colors.nodes.common.text.muted }}
      >
        --- {input.label} Value Resolved at Runtime ---
      </div>
    </div>
  );
}
