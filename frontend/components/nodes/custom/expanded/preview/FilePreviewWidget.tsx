"use client";

import { File, AlertCircle, Copy, Check } from "lucide-react";
import { useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { useTheme } from "@/contexts/ThemeContext";
import type { PreviewWidgetProps } from "./types";

/**
 * Detect language from file path extension.
 */
function detectLanguage(filePath: string | undefined): string {
  if (!filePath) return "plaintext";

  const ext = filePath.split(".").pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    md: "markdown",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    html: "html",
    css: "css",
    scss: "scss",
    sql: "sql",
    sh: "shell",
    bash: "shell",
    xml: "xml",
    go: "go",
    rs: "rust",
    java: "java",
    kt: "kotlin",
    rb: "ruby",
    php: "php",
    c: "c",
    cpp: "cpp",
    h: "c",
    hpp: "cpp",
  };

  return languageMap[ext || ""] || "plaintext";
}

/**
 * Format file size in human-readable format.
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * FilePreviewWidget displays the content of a file.
 *
 * Shows the file path, metadata (if enabled), and content in a Monaco editor
 * with syntax highlighting. Handles truncation notices for large files and
 * error states for missing or unreadable files.
 */
export function FilePreviewWidget({
  input,
  preview,
  isLoading,
  error,
  includeMetadata,
}: PreviewWidgetProps) {
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (preview?.content) {
      await navigator.clipboard.writeText(preview.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [preview?.content]);

  const filePath = input.filePath || "No file selected";
  const language = detectLanguage(input.filePath);

  // Loading state
  if (isLoading) {
    return (
      <div
        className="rounded-lg border p-4 animate-pulse"
        style={{
          borderColor: theme.colors.nodes.common.container.border,
          backgroundColor: theme.colors.nodes.common.container.background,
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-8 h-8 rounded"
            style={{ backgroundColor: theme.colors.nodes.common.footer.background }}
          />
          <div className="flex-1">
            <div
              className="h-4 w-32 rounded mb-1"
              style={{ backgroundColor: theme.colors.nodes.common.footer.background }}
            />
            <div
              className="h-3 w-24 rounded"
              style={{ backgroundColor: theme.colors.nodes.common.footer.background }}
            />
          </div>
        </div>
        <div
          className="h-32 rounded"
          style={{ backgroundColor: theme.colors.nodes.common.footer.background }}
        />
      </div>
    );
  }

  // Error state
  if (error || preview?.error) {
    return (
      <div
        className="rounded-lg border p-4"
        style={{
          borderColor: theme.colors.nodes.common.container.border,
          backgroundColor: theme.colors.nodes.common.container.background,
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <File
            className="w-4 h-4"
            style={{ color: theme.colors.nodes.common.text.muted }}
          />
          <span
            className="text-sm font-mono truncate"
            style={{ color: theme.colors.nodes.common.text.primary }}
          >
            {filePath}
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
          <span>{error || preview?.error}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{
        borderColor: theme.colors.nodes.common.container.border,
        backgroundColor: theme.colors.nodes.common.container.background,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b"
        style={{
          borderColor: theme.colors.nodes.common.container.border,
          backgroundColor: theme.colors.nodes.common.footer.background,
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <File
            className="w-4 h-4 flex-shrink-0"
            style={{ color: theme.colors.nodes.common.text.muted }}
          />
          <span
            className="text-sm font-mono truncate"
            style={{ color: theme.colors.nodes.common.text.primary }}
            title={filePath}
          >
            {filePath}
          </span>
        </div>
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

      {/* Metadata bar */}
      {includeMetadata && preview?.metadata && (
        <div
          className="flex items-center gap-4 px-3 py-1.5 text-xs border-b"
          style={{
            borderColor: theme.colors.nodes.common.container.border,
            backgroundColor: theme.colors.nodes.common.footer.background,
            color: theme.colors.nodes.common.text.muted,
          }}
        >
          {preview.metadata.file_size && (
            <span>Size: {formatSize(parseInt(preview.metadata.file_size, 10))}</span>
          )}
          {preview.metadata.modified_time && (
            <span>
              Modified: {new Date(preview.metadata.modified_time).toLocaleDateString()}
            </span>
          )}
          {preview.metadata.file_ext && <span>Type: .{preview.metadata.file_ext}</span>}
        </div>
      )}

      {/* Content */}
      <div className="h-48">
        <Editor
          height="100%"
          language={language}
          value={preview?.content || ""}
          theme={theme.colors.monaco}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 11,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            folding: false,
            lineDecorationsWidth: 8,
            lineNumbersMinChars: 3,
            renderLineHighlight: "none",
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            overviewRulerBorder: false,
            scrollbar: {
              vertical: "auto",
              horizontal: "hidden",
              verticalScrollbarSize: 6,
            },
            wordWrap: "on",
            automaticLayout: true,
            padding: { top: 4, bottom: 4 },
            domReadOnly: true,
          }}
        />
      </div>

      {/* Truncation notice */}
      {preview?.truncated && preview.totalSize && (
        <div
          className="px-3 py-1.5 text-xs border-t"
          style={{
            borderColor: theme.colors.nodes.common.container.border,
            backgroundColor: theme.colors.nodes.common.footer.background,
            color: theme.colors.nodes.common.text.muted,
          }}
        >
          Showing first {formatSize(preview.content?.length || 0)} of{" "}
          {formatSize(preview.totalSize)}
        </div>
      )}
    </div>
  );
}
