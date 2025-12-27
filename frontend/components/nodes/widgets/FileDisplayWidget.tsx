"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { useTheme } from "@/contexts/ThemeContext";
import { RefreshCw, Loader2 } from "lucide-react";

// Map file extensions to Monaco language IDs
function getMonacoLanguage(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    py: "python",
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    md: "markdown",
    txt: "plaintext",
    xml: "xml",
    html: "html",
    htm: "html",
    css: "css",
    sql: "sql",
    sh: "shell",
    bash: "shell",
    go: "go",
    rs: "rust",
    java: "java",
    c: "c",
    h: "c",
    cpp: "cpp",
    hpp: "cpp",
    cc: "cpp",
    rb: "ruby",
    php: "php",
    swift: "swift",
    kt: "kotlin",
    scala: "scala",
    r: "r",
    csv: "plaintext",
    log: "plaintext",
  };
  return langMap[ext || ""] || "plaintext";
}

export interface FileChunkResponse {
  content: string;
  total_lines: number;
  has_more: boolean;
}

export interface FileDisplayWidgetProps {
  filePath: string;
  height?: string | number;
  chunkSize?: number;
  onLoadChunk: (
    filePath: string,
    offset: number,
    limit: number
  ) => Promise<FileChunkResponse>;
}

export default function FileDisplayWidget({
  filePath,
  height = 200,
  chunkSize = 500,
  onLoadChunk,
}: FileDisplayWidgetProps) {
  const { theme } = useTheme();

  const [content, setContent] = useState("");
  const [totalLines, setTotalLines] = useState(0);
  const [loadedOffset, setLoadedOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  const loadContent = useCallback(
    async (isRefresh = false) => {
      if (!filePath) {
        setContent("");
        setTotalLines(0);
        setHasMore(false);
        return;
      }

      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsInitialLoading(true);
      }

      try {
        const response = await onLoadChunk(filePath, 0, chunkSize);
        setContent(response.content);
        setTotalLines(response.total_lines);
        setLoadedOffset(chunkSize);
        setHasMore(response.has_more);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (
          !errorMessage.includes("File not found") &&
          !errorMessage.includes("not found")
        ) {
          console.error("Failed to load file content:", error);
        }
        setContent("");
        setTotalLines(0);
        setHasMore(false);
      } finally {
        setIsInitialLoading(false);
        setIsRefreshing(false);
      }
    },
    [filePath, chunkSize, onLoadChunk]
  );

  // Initial load
  useEffect(() => {
    loadContent();
  }, [loadContent]);

  // Load more content
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || !filePath) return;

    setIsLoadingMore(true);
    try {
      const response = await onLoadChunk(filePath, loadedOffset, chunkSize);
      if (response.content) {
        setContent((prev) => prev + "\n" + response.content);
        setLoadedOffset((prev) => prev + chunkSize);
        setHasMore(response.has_more);
      }
    } catch (error) {
      console.error("Failed to load more content:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, filePath, loadedOffset, chunkSize, onLoadChunk]);

  const handleEditorMount: OnMount = useCallback(
    (editor) => {
      editorRef.current = editor;

      editor.onDidScrollChange(() => {
        const model = editor.getModel();
        if (!model) return;

        const visibleRanges = editor.getVisibleRanges();
        if (visibleRanges.length === 0) return;

        const lastVisibleLine =
          visibleRanges[visibleRanges.length - 1].endLineNumber;
        const totalModelLines = model.getLineCount();

        // If scrolled near the bottom (within 5 lines), load more
        if (lastVisibleLine >= totalModelLines - 5) {
          loadMore();
        }
      });
    },
    [loadMore]
  );

  const handleRefresh = useCallback(() => {
    loadContent(true);
  }, [loadContent]);

  const displayedLines = content?.split("\n").length || 0;
  const language = getMonacoLanguage(filePath || "");
  const computedHeight = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      className="flex flex-col rounded overflow-hidden border"
      style={{
        borderColor: theme.colors.nodes.common.container.border,
      }}
    >
      {/* Header with refresh button and line count */}
      <div
        className="h-7 flex items-center justify-between px-2"
        style={{
          backgroundColor: theme.colors.nodes.common.footer.background,
          borderBottom: `1px solid ${theme.colors.nodes.common.container.border}`,
        }}
      >
        <span
          className="text-xs truncate flex-1"
          style={{ color: theme.colors.nodes.common.text.secondary }}
        >
          {filePath || "No file selected"}
        </span>
        <div className="flex items-center gap-2">
          <span
            className="text-xs"
            style={{ color: theme.colors.nodes.common.text.muted }}
          >
            {totalLines > 0 ? (
              <>
                {displayedLines} / {totalLines} lines
                {hasMore && " ..."}
              </>
            ) : (
              `${displayedLines} lines`
            )}
          </span>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || isInitialLoading}
            className="p-1 rounded transition-colors disabled:opacity-50 hover:bg-accent"
            title="Refresh content"
          >
            <RefreshCw
              className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`}
              style={{ color: theme.colors.nodes.common.text.secondary }}
            />
          </button>
        </div>
      </div>

      {/* Editor area */}
      <div
        className="nodrag nowheel nopan relative"
        style={{ height: computedHeight }}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {isInitialLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2
              className="w-6 h-6 animate-spin"
              style={{ color: theme.colors.nodes.common.text.muted }}
            />
          </div>
        ) : (
          <Editor
            height="100%"
            language={language}
            value={content}
            theme={theme.colors.monaco}
            onMount={handleEditorMount}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 12,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              folding: true,
              lineDecorationsWidth: 10,
              lineNumbersMinChars: 4,
              renderLineHighlight: "none",
              overviewRulerLanes: 0,
              hideCursorInOverviewRuler: true,
              overviewRulerBorder: false,
              scrollbar: {
                vertical: "auto",
                horizontal: "auto",
                verticalScrollbarSize: 8,
                horizontalScrollbarSize: 8,
              },
              wordWrap: "off",
              automaticLayout: true,
              padding: { top: 8, bottom: 8 },
            }}
          />
        )}
        {isLoadingMore && (
          <div
            className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white text-xs px-2 py-1 rounded flex items-center gap-1"
            style={{
              backgroundColor: theme.colors.nodes.common.text.secondary,
            }}
          >
            <Loader2 className="w-3 h-3 animate-spin" />
            Loading...
          </div>
        )}
      </div>
    </div>
  );
}
