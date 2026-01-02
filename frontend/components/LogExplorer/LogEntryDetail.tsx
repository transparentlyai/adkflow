/**
 * LogEntryDetail - Expanded view of a log entry
 *
 * Shows full context, exception traceback, and copy functionality.
 * Optionally displays JSON with syntax highlighting using Monaco Editor.
 */

import { Copy, Check, ExternalLink } from "lucide-react";
import { useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import type { LogEntry } from "@/lib/api";
import {
  formatFullTimestamp,
  formatDuration,
  copyEntryAsJson,
  deepFormatJson,
} from "./logExplorerUtils";

interface LogEntryDetailProps {
  entry: LogEntry;
  formatJson: boolean;
}

export function LogEntryDetail({ entry, formatJson }: LogEntryDetailProps) {
  const [copied, setCopied] = useState(false);
  const [editorHeight, setEditorHeight] = useState(200);

  const handleCopy = async () => {
    const success = await copyEntryAsJson(entry);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startY = e.clientY;
      const startHeight = editorHeight;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientY - startY;
        setEditorHeight(Math.max(100, Math.min(500, startHeight + delta)));
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [editorHeight],
  );

  const handleOpenContextInNewTab = useCallback(() => {
    if (!entry.context) return;
    const key = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const content = deepFormatJson(entry.context);
    localStorage.setItem(`log-context-${key}`, content);
    window.open(`/logs/context?key=${key}`, "_blank");
  }, [entry.context]);

  return (
    <div className="bg-muted/50 border-t px-4 py-3 space-y-3 text-sm">
      {/* Header with copy button */}
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground text-xs">
          Line {entry.lineNumber} | {formatFullTimestamp(entry.timestamp)}
          {entry.durationMs !== null && (
            <span className="ml-2">| {formatDuration(entry.durationMs)}</span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-6 px-2 text-xs"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 mr-1" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 mr-1" />
              Copy JSON
            </>
          )}
        </Button>
      </div>

      {/* Full message */}
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-1">
          Message
        </div>
        <pre className="bg-background p-2 rounded text-xs font-mono whitespace-pre-wrap break-all">
          {entry.message}
        </pre>
      </div>

      {/* Context */}
      {entry.context && Object.keys(entry.context).length > 0 && (
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center justify-between">
            <span>Context</span>
            {formatJson && (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={handleOpenContextInNewTab}
                title="Open in new tab"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            )}
          </div>
          {formatJson ? (
            <div className="rounded overflow-hidden border">
              <Editor
                height={`${editorHeight}px`}
                language="json"
                value={deepFormatJson(entry.context)}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  lineNumbers: "off",
                  folding: true,
                  showFoldingControls: "always",
                  fontSize: 12,
                  wordWrap: "on",
                  automaticLayout: true,
                }}
                theme="vs-dark"
              />
              {/* Vertical resize handle */}
              <div
                onMouseDown={handleResizeMouseDown}
                className="h-2 cursor-ns-resize bg-muted hover:bg-primary/20 flex items-center justify-center transition-colors"
              >
                <div className="w-8 h-0.5 bg-muted-foreground/50 rounded" />
              </div>
            </div>
          ) : (
            <pre className="bg-background p-2 rounded text-xs font-mono whitespace-pre-wrap break-all max-h-48 overflow-auto">
              {JSON.stringify(entry.context, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Exception */}
      {entry.exception && (
        <div>
          <div className="text-xs font-medium text-red-600 mb-1">
            Exception: {entry.exception.type}
          </div>
          <div className="text-xs text-red-500 mb-2">
            {entry.exception.message}
          </div>
          {entry.exception.traceback.length > 0 && (
            <pre className="bg-red-50 dark:bg-red-950/30 p-2 rounded text-xs font-mono whitespace-pre-wrap break-all max-h-64 overflow-auto text-red-700 dark:text-red-300">
              {entry.exception.traceback.join("")}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
