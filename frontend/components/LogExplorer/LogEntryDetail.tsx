/**
 * LogEntryDetail - Expanded view of a log entry
 *
 * Shows full context, exception traceback, and copy functionality.
 */

import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { LogEntry } from "@/lib/api";
import {
  formatFullTimestamp,
  formatDuration,
  copyEntryAsJson,
} from "./logExplorerUtils";

interface LogEntryDetailProps {
  entry: LogEntry;
}

export function LogEntryDetail({ entry }: LogEntryDetailProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyEntryAsJson(entry);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
          <div className="text-xs font-medium text-muted-foreground mb-1">
            Context
          </div>
          <pre className="bg-background p-2 rounded text-xs font-mono whitespace-pre-wrap break-all max-h-48 overflow-auto">
            {JSON.stringify(entry.context, null, 2)}
          </pre>
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
