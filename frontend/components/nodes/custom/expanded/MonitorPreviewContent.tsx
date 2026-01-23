"use client";

import { useState, useCallback, useMemo } from "react";
import { Copy, Check, Clock } from "lucide-react";
import Editor from "@monaco-editor/react";
import { useTheme } from "@/contexts/ThemeContext";

interface MonitorPreviewContentProps {
  /** The monitored value (stored as string) */
  value: string;
  /** Detected content type: json, markdown, or plaintext */
  valueType: string;
  /** ISO timestamp when the value was captured */
  timestamp: string;
  /** Height of the content area */
  height?: number;
}

/**
 * Detects the content type from a value for syntax highlighting.
 */
function detectContentType(value: string): "json" | "markdown" | "plaintext" {
  if (!value) return "plaintext";

  // Try to parse as JSON
  try {
    JSON.parse(value);
    return "json";
  } catch {
    // Not valid JSON
  }

  // Check for markdown indicators
  if (/^#{1,6}\s|^\*\*|^\-\s|\[.*\]\(.*\)|```/.test(value)) {
    return "markdown";
  }

  return "plaintext";
}

/**
 * Formats a value for display in the editor.
 * Objects/arrays are pretty-printed as JSON.
 */
function formatValue(value: string, valueType: string): string {
  if (!value) return "";

  if (valueType === "json") {
    try {
      // Pretty print JSON
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }

  return value;
}

/**
 * Formats a timestamp for display.
 */
function formatTimestamp(timestamp: string): string {
  if (!timestamp) return "";

  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return timestamp;
  }
}

/**
 * MonitorPreviewContent displays the captured value in a read-only Monaco editor.
 *
 * Features:
 * - Minimal padding for edge-to-edge content
 * - Small header with timestamp and copy button
 * - Auto-detected syntax highlighting (json/markdown/plaintext)
 * - Empty state when no value captured
 */
export function MonitorPreviewContent({
  value,
  valueType,
  timestamp,
  height = 200,
}: MonitorPreviewContentProps) {
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);

  // Detect language from value type or auto-detect
  const language = useMemo(() => {
    if (valueType && valueType !== "plaintext") {
      return valueType;
    }
    return detectContentType(value);
  }, [value, valueType]);

  // Format the value for display
  const displayValue = useMemo(
    () => formatValue(value, language),
    [value, language],
  );

  const handleCopy = useCallback(async () => {
    if (displayValue) {
      await navigator.clipboard.writeText(displayValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [displayValue]);

  // Empty state
  if (!value) {
    return (
      <div
        className="flex flex-col items-center justify-center p-4"
        style={{
          height,
          color: theme.colors.nodes.common.text.muted,
        }}
      >
        <Clock className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">No value captured yet</p>
        <p className="text-xs opacity-75 mt-1">
          Run the workflow to see output
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{
        height,
        backgroundColor: theme.colors.nodes.common.container.background,
      }}
    >
      {/* Compact header */}
      <div
        className="flex items-center justify-between px-2 py-1 border-b flex-shrink-0"
        style={{
          borderColor: theme.colors.nodes.common.container.border,
          backgroundColor: theme.colors.nodes.common.footer.background,
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {timestamp && (
            <span
              className="flex items-center gap-1 text-[10px]"
              style={{ color: theme.colors.nodes.common.text.muted }}
            >
              <Clock className="w-3 h-3" />
              {formatTimestamp(timestamp)}
            </span>
          )}
          <span
            className="px-1.5 py-0.5 rounded text-[10px] uppercase"
            style={{
              backgroundColor: theme.colors.nodes.common.container.background,
              color: theme.colors.nodes.common.text.muted,
            }}
          >
            {language}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="p-1 rounded hover:bg-black/10 transition-colors"
          title="Copy content"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <Copy
              className="w-3.5 h-3.5"
              style={{ color: theme.colors.nodes.common.text.muted }}
            />
          )}
        </button>
      </div>

      {/* Monaco editor - edge-to-edge */}
      <div className="flex-1 min-h-0 nodrag nowheel nopan">
        <Editor
          height="100%"
          language={language}
          value={displayValue}
          theme={theme.colors.monaco}
          options={{
            readOnly: true,
            domReadOnly: true,
            minimap: { enabled: false },
            fontSize: 11,
            lineNumbers: "off",
            scrollBeyondLastLine: false,
            folding: false,
            glyphMargin: false,
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 0,
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
            padding: { top: 2, bottom: 2 },
          }}
        />
      </div>
    </div>
  );
}

export default MonitorPreviewContent;
