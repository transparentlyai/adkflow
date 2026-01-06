"use client";

import { useState, useCallback } from "react";
import {
  AlertCircle,
  Copy,
  Check,
  Code,
  FileText,
  Hash,
  AlertTriangle,
} from "lucide-react";
import Editor from "@monaco-editor/react";
import { useTheme } from "@/contexts/ThemeContext";
import type { ComputedOutput } from "./types";
import type { NodeAggregationMode } from "@/components/nodes/CustomNode/types/dynamicInputs";

interface OutputPreviewTabProps {
  /** Computed output from the backend */
  computedOutput: ComputedOutput | null;
  /** Whether preview is loading */
  isLoading: boolean;
  /** Error message if preview failed */
  error: string | null;
  /** Aggregation mode */
  aggregationMode: NodeAggregationMode;
}

/**
 * OutputPreviewTab displays the computed aggregation output.
 *
 * For pass mode: Shows Python dict representation in Monaco with Python syntax.
 * For concatenate mode: Shows full rendered text in Monaco with plaintext syntax.
 */
export function OutputPreviewTab({
  computedOutput,
  isLoading,
  error,
  aggregationMode,
}: OutputPreviewTabProps) {
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (computedOutput?.content) {
      await navigator.clipboard.writeText(computedOutput.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [computedOutput?.content]);

  const language = aggregationMode === "pass" ? "python" : "plaintext";
  const modeLabel =
    aggregationMode === "pass" ? "Python Dict" : "Rendered Text";
  const ModeIcon = aggregationMode === "pass" ? Code : FileText;

  // Loading state
  if (isLoading) {
    return (
      <div
        className="rounded-lg border p-4 animate-pulse mt-2 h-[calc(100%-1rem)]"
        style={{
          borderColor: theme.colors.nodes.common.container.border,
          backgroundColor: theme.colors.nodes.common.container.background,
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-8 h-8 rounded"
            style={{
              backgroundColor: theme.colors.nodes.common.footer.background,
            }}
          />
          <div className="flex-1">
            <div
              className="h-4 w-32 rounded mb-1"
              style={{
                backgroundColor: theme.colors.nodes.common.footer.background,
              }}
            />
            <div
              className="h-3 w-24 rounded"
              style={{
                backgroundColor: theme.colors.nodes.common.footer.background,
              }}
            />
          </div>
        </div>
        <div
          className="h-64 rounded"
          style={{
            backgroundColor: theme.colors.nodes.common.footer.background,
          }}
        />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className="rounded-lg border p-4 mt-2"
        style={{
          borderColor: theme.colors.nodes.common.container.border,
          backgroundColor: theme.colors.nodes.common.container.background,
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <ModeIcon
            className="w-4 h-4"
            style={{ color: theme.colors.nodes.common.text.muted }}
          />
          <span
            className="text-sm font-medium"
            style={{ color: theme.colors.nodes.common.text.primary }}
          >
            Computed Output
          </span>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-2 rounded text-sm"
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            color: "#ef4444",
          }}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  // No data state
  if (!computedOutput) {
    return (
      <div
        className="rounded-lg border p-4 mt-2"
        style={{
          borderColor: theme.colors.nodes.common.container.border,
          backgroundColor: theme.colors.nodes.common.container.background,
        }}
      >
        <div
          className="text-center py-8 text-sm"
          style={{ color: theme.colors.nodes.common.text.muted }}
        >
          No output available
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border overflow-hidden mt-2 flex flex-col h-[calc(100%-1rem)]"
      style={{
        borderColor: theme.colors.nodes.common.container.border,
        backgroundColor: theme.colors.nodes.common.container.background,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0"
        style={{
          borderColor: theme.colors.nodes.common.container.border,
          backgroundColor: theme.colors.nodes.common.footer.background,
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <ModeIcon
            className="w-4 h-4 flex-shrink-0"
            style={{ color: theme.colors.nodes.common.text.muted }}
          />
          <span
            className="text-sm font-medium"
            style={{ color: theme.colors.nodes.common.text.primary }}
          >
            Computed Output
          </span>
          <span
            className="px-1.5 py-0.5 rounded text-[10px]"
            style={{
              backgroundColor: theme.colors.nodes.common.container.background,
              color: theme.colors.nodes.common.text.muted,
            }}
          >
            {modeLabel}
          </span>
          {computedOutput.outputVariableName && (
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-mono"
              style={{
                backgroundColor: theme.colors.nodes.common.container.background,
                color: theme.colors.nodes.common.text.secondary,
              }}
            >
              {computedOutput.outputVariableName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Token count */}
          {computedOutput.tokenCount !== undefined && (
            <span
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]"
              style={{
                backgroundColor: theme.colors.nodes.common.container.background,
                color: theme.colors.nodes.common.text.secondary,
              }}
              title="Approximate token count"
            >
              <Hash className="w-3 h-3" />
              {computedOutput.tokenCount.toLocaleString()} tokens
            </span>
          )}
          {computedOutput.tokenCountError && !computedOutput.tokenCount && (
            <span
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]"
              style={{
                backgroundColor: "rgba(245, 158, 11, 0.1)",
                color: "#f59e0b",
              }}
              title={computedOutput.tokenCountError}
            >
              <AlertTriangle className="w-3 h-3" />
              Token count unavailable
            </span>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 rounded hover:bg-black/10 transition-colors"
            title="Copy content"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy
                className="w-4 h-4"
                style={{ color: theme.colors.nodes.common.text.muted }}
              />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={language}
          value={computedOutput.content}
          theme={theme.colors.monaco}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 11,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            folding: true,
            lineDecorationsWidth: 8,
            lineNumbersMinChars: 3,
            renderLineHighlight: "none",
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            overviewRulerBorder: false,
            scrollbar: {
              vertical: "auto",
              horizontal: "auto",
              verticalScrollbarSize: 6,
              horizontalScrollbarSize: 6,
            },
            wordWrap: "on",
            automaticLayout: true,
            padding: { top: 4, bottom: 4 },
            domReadOnly: true,
          }}
        />
      </div>
    </div>
  );
}
