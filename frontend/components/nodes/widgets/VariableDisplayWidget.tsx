"use client";

import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export interface VariableDisplayWidgetProps {
  variableName: string;
}

export default function VariableDisplayWidget({
  variableName,
}: VariableDisplayWidgetProps) {
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);

  const displayValue = `{${variableName}}`;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(displayValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  }, [displayValue]);

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded border font-mono text-sm"
      style={{
        backgroundColor: theme.colors.nodes.common.container.background,
        borderColor: theme.colors.nodes.common.container.border,
        color: theme.colors.nodes.variable.header,
      }}
    >
      <span className="flex-1 truncate">{displayValue}</span>
      <button
        onClick={handleCopy}
        className="p-1 rounded transition-colors hover:bg-accent flex-shrink-0"
        title={copied ? "Copied!" : "Copy to clipboard"}
      >
        {copied ? (
          <Check
            className="w-4 h-4"
            style={{ color: theme.colors.nodes.common.text.secondary }}
          />
        ) : (
          <Copy
            className="w-4 h-4"
            style={{ color: theme.colors.nodes.common.text.muted }}
          />
        )}
      </button>
    </div>
  );
}
