"use client";

import { Globe, AlertCircle, Copy, Check, ExternalLink } from "lucide-react";
import { useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { useTheme } from "@/contexts/ThemeContext";
import type { PreviewWidgetProps } from "./types";

/**
 * Detect content type from metadata or URL.
 */
function detectLanguage(
  contentType: string | undefined,
  url: string | undefined,
): string {
  // Check content-type header
  if (contentType) {
    if (contentType.includes("json")) return "json";
    if (contentType.includes("xml")) return "xml";
    if (contentType.includes("html")) return "html";
    if (contentType.includes("css")) return "css";
    if (contentType.includes("javascript")) return "javascript";
    if (contentType.includes("yaml")) return "yaml";
    if (contentType.includes("markdown")) return "markdown";
  }

  // Fallback: check URL extension
  if (url) {
    const path = url.split("?")[0];
    const ext = path.split(".").pop()?.toLowerCase();
    if (ext === "json") return "json";
    if (ext === "xml") return "xml";
    if (ext === "html" || ext === "htm") return "html";
    if (ext === "css") return "css";
    if (ext === "js") return "javascript";
    if (ext === "yaml" || ext === "yml") return "yaml";
    if (ext === "md") return "markdown";
  }

  return "plaintext";
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
 * URLPreviewWidget displays content fetched from a URL.
 *
 * Shows the URL, HTTP metadata (status, content-type), and content in a
 * Monaco editor. Handles error states for timeouts and HTTP errors.
 */
export function URLPreviewWidget({
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

  const url = input.url || "No URL specified";
  const language = detectLanguage(preview?.metadata?.content_type, input.url);

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
              className="h-4 w-48 rounded mb-1"
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
          <Globe
            className="w-4 h-4"
            style={{ color: theme.colors.nodes.common.text.muted }}
          />
          <span
            className="text-sm font-mono truncate"
            style={{ color: theme.colors.nodes.common.text.primary }}
          >
            {url}
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
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Globe
            className="w-4 h-4 flex-shrink-0"
            style={{ color: theme.colors.nodes.common.text.muted }}
          />
          <span
            className="text-sm font-mono truncate"
            style={{ color: theme.colors.nodes.common.text.primary }}
            title={url}
          >
            {url}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <a
            href={input.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded hover:bg-black/10 transition-colors"
            title="Open in browser"
          >
            <ExternalLink
              className="w-4 h-4"
              style={{ color: theme.colors.nodes.common.text.muted }}
            />
          </a>
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
          {preview.metadata.status_code && (
            <span
              className={
                preview.metadata.status_code.startsWith("2")
                  ? "text-green-500"
                  : preview.metadata.status_code.startsWith("4") ||
                      preview.metadata.status_code.startsWith("5")
                    ? "text-red-500"
                    : ""
              }
            >
              HTTP {preview.metadata.status_code}
            </span>
          )}
          {preview.metadata.content_type && (
            <span>{preview.metadata.content_type.split(";")[0]}</span>
          )}
          {preview.metadata.content_length && (
            <span>Size: {formatSize(parseInt(preview.metadata.content_length, 10))}</span>
          )}
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
