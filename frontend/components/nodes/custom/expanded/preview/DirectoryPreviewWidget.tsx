"use client";

import {
  Folder,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  File,
  Copy,
  Check,
} from "lucide-react";
import { useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { useTheme } from "@/contexts/ThemeContext";
import type { PreviewWidgetProps } from "./types";
import { isDirectoryPreviewResult, type DirectoryPreviewResult } from "./types";

/**
 * Detect language from file path extension.
 */
function detectLanguage(filePath: string): string {
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
 * DirectoryPreviewWidget displays files from a directory.
 *
 * Shows the directory path, glob pattern, file count, and an expandable list
 * of matched files with their content. Displays warnings for limits exceeded.
 */
export function DirectoryPreviewWidget({
  input,
  preview,
  isLoading,
  error,
}: PreviewWidgetProps) {
  const { theme } = useTheme();
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);

  const toggleFile = useCallback((path: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleCopy = useCallback(async (content: string, path: string) => {
    await navigator.clipboard.writeText(content);
    setCopied(path);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const directoryPath = input.directoryPath || "No directory selected";
  const globPattern = input.globPattern || "*";

  // Type guard and cast
  const dirPreview =
    preview && isDirectoryPreviewResult(preview)
      ? (preview as DirectoryPreviewResult)
      : null;

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
              className="h-4 w-40 rounded mb-1"
              style={{ backgroundColor: theme.colors.nodes.common.footer.background }}
            />
            <div
              className="h-3 w-24 rounded"
              style={{ backgroundColor: theme.colors.nodes.common.footer.background }}
            />
          </div>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-8 rounded"
              style={{ backgroundColor: theme.colors.nodes.common.footer.background }}
            />
          ))}
        </div>
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
          <Folder
            className="w-4 h-4"
            style={{ color: theme.colors.nodes.common.text.muted }}
          />
          <span
            className="text-sm font-mono"
            style={{ color: theme.colors.nodes.common.text.primary }}
          >
            {directoryPath}
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
          <Folder
            className="w-4 h-4 flex-shrink-0"
            style={{ color: theme.colors.nodes.common.text.muted }}
          />
          <span
            className="text-sm font-mono truncate"
            style={{ color: theme.colors.nodes.common.text.primary }}
            title={directoryPath}
          >
            {directoryPath}
          </span>
        </div>
        <div
          className="text-xs px-2 py-0.5 rounded"
          style={{
            backgroundColor: theme.colors.nodes.common.container.background,
            color: theme.colors.nodes.common.text.muted,
          }}
        >
          {dirPreview?.totalFiles ?? 0} files
        </div>
      </div>

      {/* Configuration summary */}
      <div
        className="flex items-center gap-3 px-3 py-1.5 text-xs border-b"
        style={{
          borderColor: theme.colors.nodes.common.container.border,
          backgroundColor: theme.colors.nodes.common.footer.background,
          color: theme.colors.nodes.common.text.muted,
        }}
      >
        <span>
          Pattern: <code className="font-mono">{globPattern}</code>
        </span>
        {input.recursive && <span>Recursive</span>}
        {input.excludePatterns && input.excludePatterns.length > 0 && (
          <span>Excludes: {input.excludePatterns.length}</span>
        )}
      </div>

      {/* Warnings */}
      {dirPreview?.warnings && dirPreview.warnings.length > 0 && (
        <div
          className="px-3 py-2 border-b"
          style={{ borderColor: theme.colors.nodes.common.container.border }}
        >
          {dirPreview.warnings.map((warning, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-xs"
              style={{ color: "#f59e0b" }}
            >
              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}

      {/* File list */}
      <div className="max-h-64 overflow-y-auto">
        {dirPreview?.files && dirPreview.files.length > 0 ? (
          <div className="divide-y" style={{ borderColor: theme.colors.nodes.common.container.border }}>
            {dirPreview.files.map((file) => {
              const isExpanded = expandedFiles.has(file.path);
              const language = detectLanguage(file.path);

              return (
                <div key={file.path}>
                  {/* File row */}
                  <button
                    type="button"
                    onClick={() => toggleFile(file.path)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-black/5 transition-colors"
                    style={{ color: theme.colors.nodes.common.text.primary }}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3 h-3 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-3 h-3 flex-shrink-0" />
                    )}
                    <File
                      className="w-3 h-3 flex-shrink-0"
                      style={{ color: theme.colors.nodes.common.text.muted }}
                    />
                    <span className="text-xs font-mono truncate flex-1">
                      {file.path}
                    </span>
                    <span
                      className="text-[10px]"
                      style={{ color: theme.colors.nodes.common.text.muted }}
                    >
                      {formatSize(file.size)}
                    </span>
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div
                      className="border-t"
                      style={{ borderColor: theme.colors.nodes.common.container.border }}
                    >
                      {file.error ? (
                        <div
                          className="px-3 py-2 text-xs"
                          style={{ color: "#ef4444" }}
                        >
                          Error: {file.error}
                        </div>
                      ) : (
                        <>
                          <div
                            className="flex justify-end px-2 py-1"
                            style={{
                              backgroundColor: theme.colors.nodes.common.footer.background,
                            }}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(file.content, file.path);
                              }}
                              className="p-1 rounded hover:bg-black/10 transition-colors"
                              title="Copy content"
                            >
                              {copied === file.path ? (
                                <Check className="w-3 h-3 text-green-500" />
                              ) : (
                                <Copy
                                  className="w-3 h-3"
                                  style={{ color: theme.colors.nodes.common.text.muted }}
                                />
                              )}
                            </button>
                          </div>
                          <div className="h-32">
                            <Editor
                              height="100%"
                              language={language}
                              value={file.content}
                              theme={theme.colors.monaco}
                              options={{
                                readOnly: true,
                                minimap: { enabled: false },
                                fontSize: 10,
                                lineNumbers: "off",
                                scrollBeyondLastLine: false,
                                folding: false,
                                renderLineHighlight: "none",
                                overviewRulerLanes: 0,
                                scrollbar: {
                                  vertical: "auto",
                                  horizontal: "hidden",
                                  verticalScrollbarSize: 4,
                                },
                                wordWrap: "on",
                                automaticLayout: true,
                                padding: { top: 4, bottom: 4 },
                                domReadOnly: true,
                              }}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div
            className="px-3 py-4 text-center text-sm"
            style={{ color: theme.colors.nodes.common.text.muted }}
          >
            No files matched
          </div>
        )}
      </div>
    </div>
  );
}
