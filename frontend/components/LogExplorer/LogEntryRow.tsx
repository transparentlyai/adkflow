/**
 * LogEntryRow - A single row in the log list
 *
 * Displays level, timestamp, category, and message with expand/collapse.
 */

import { ChevronDown, ChevronRight } from "lucide-react";
import { memo, type ReactNode } from "react";
import type { LogEntry } from "@/lib/api";
import { LogEntryDetail } from "./LogEntryDetail";
import {
  LEVEL_STYLES,
  LEVEL_ICONS,
  formatTimestamp,
  formatDuration,
  escapeRegex,
  type LogLevel,
} from "./logExplorerUtils";

interface LogEntryRowProps {
  entry: LogEntry;
  isExpanded: boolean;
  onToggleExpand: () => void;
  searchTerm?: string;
  formatJson: boolean;
}

function HighlightedText({
  text,
  search,
}: {
  text: string;
  search?: string;
}): ReactNode {
  if (!search) return text;

  const regex = new RegExp(`(${escapeRegex(search)})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

export const LogEntryRow = memo(function LogEntryRow({
  entry,
  isExpanded,
  onToggleExpand,
  searchTerm,
  formatJson,
}: LogEntryRowProps) {
  const level = entry.level as LogLevel;
  const LevelIcon = LEVEL_ICONS[level] || LEVEL_ICONS.INFO;
  const levelStyle = LEVEL_STYLES[level] || LEVEL_STYLES.INFO;

  return (
    <div className="border-b last:border-b-0">
      {/* Main row */}
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors text-left"
      >
        {/* Expand/collapse icon */}
        <span className="text-muted-foreground flex-shrink-0">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </span>

        {/* Level icon */}
        <span className={`flex-shrink-0 ${levelStyle}`}>
          <LevelIcon className="h-4 w-4" />
        </span>

        {/* Timestamp */}
        <span className="text-xs text-muted-foreground font-mono flex-shrink-0 w-24">
          {formatTimestamp(entry.timestamp)}
        </span>

        {/* Category */}
        <span className="text-xs text-violet-600 dark:text-violet-400 font-medium flex-shrink-0 w-36 truncate">
          {entry.category}
        </span>

        {/* Message */}
        <span className="text-sm flex-1 truncate">
          <HighlightedText text={entry.message} search={searchTerm} />
        </span>

        {/* Duration (if present) */}
        {entry.durationMs !== null && (
          <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
            {formatDuration(entry.durationMs)}
          </span>
        )}

        {/* Exception indicator */}
        {entry.exception && (
          <span className="text-xs text-red-500 flex-shrink-0 ml-2 font-medium">
            Exception
          </span>
        )}
      </button>

      {/* Expanded detail */}
      {isExpanded && <LogEntryDetail entry={entry} formatJson={formatJson} />}
    </div>
  );
});
