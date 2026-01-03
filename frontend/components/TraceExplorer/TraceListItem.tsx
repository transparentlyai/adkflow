/**
 * Trace list item component
 */

import { cn } from "@/lib/utils";
import type { TraceInfo } from "@/lib/api/traces";
import {
  formatDuration,
  formatSpanName,
  formatTime,
  getSpanTypeClass,
} from "./traceUtils";

interface TraceListItemProps {
  trace: TraceInfo;
  isSelected: boolean;
  onClick: () => void;
  isCollapsed?: boolean;
}

export function TraceListItem({
  trace,
  isSelected,
  onClick,
  isCollapsed,
}: TraceListItemProps) {
  const typeClass = getSpanTypeClass(trace.rootSpanName);
  const Icon = typeClass.icon;

  if (isCollapsed) {
    return (
      <button
        onClick={onClick}
        className={cn(
          "w-full flex items-center justify-center p-2 border-b border-agentprism-border hover:bg-agentprism-secondary transition-colors",
          isSelected && "bg-agentprism-secondary",
        )}
        title={`${formatSpanName(trace.rootSpanName)} - ${formatTime(trace.startTime)}`}
      >
        <span
          className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center",
            typeClass.badge,
          )}
        >
          <Icon className="w-3.5 h-3.5 text-white" />
        </span>
        {trace.hasErrors && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-agentprism-error" />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-2 py-1.5 border-b border-agentprism-border hover:bg-agentprism-secondary transition-colors",
        isSelected && "bg-agentprism-secondary",
      )}
    >
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center",
            typeClass.badge,
          )}
        >
          <Icon className="w-3 h-3 text-white" />
        </span>
        <span className="text-xs truncate flex-1">
          {formatSpanName(trace.rootSpanName)}
        </span>
        {trace.hasErrors && (
          <span className="w-2 h-2 rounded-full bg-agentprism-error flex-shrink-0" />
        )}
      </div>
      <div className="flex items-center justify-between text-[10px] text-agentprism-muted-foreground mt-0.5 pl-6">
        <span>{formatTime(trace.startTime)}</span>
        <span>{trace.spanCount}s</span>
        <span>{formatDuration(trace.durationMs)}</span>
      </div>
    </button>
  );
}
