/**
 * Span tree components for trace visualization
 */

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TraceSpan } from "@/lib/api/traces";
import { formatDuration, formatSpanName, getSpanTypeClass } from "./traceUtils";

interface SpanTimelineProps {
  span: TraceSpan;
  traceStartMs: number;
  traceDurationMs: number;
}

/**
 * Timeline bar component for a span
 */
export function SpanTimeline({
  span,
  traceStartMs,
  traceDurationMs,
}: SpanTimelineProps) {
  const typeClass = getSpanTypeClass(span.name);
  const spanStartMs = new Date(span.startTime).getTime();
  const spanDurationMs = span.durationMs || 0;

  const startPercent =
    traceDurationMs > 0
      ? ((spanStartMs - traceStartMs) / traceDurationMs) * 100
      : 0;
  const widthPercent =
    traceDurationMs > 0 ? (spanDurationMs / traceDurationMs) * 100 : 0;

  return (
    <span className="relative flex h-3 min-w-16 w-20 flex-shrink-0 rounded bg-agentprism-secondary">
      <span
        className={cn("absolute h-full rounded", typeClass.badge)}
        style={{
          left: `${Math.max(0, Math.min(startPercent, 100))}%`,
          width: `${Math.max(1, Math.min(widthPercent, 100 - startPercent))}%`,
        }}
      />
    </span>
  );
}

interface SpanTreeNodeProps {
  span: TraceSpan;
  depth: number;
  selectedSpan: TraceSpan | null;
  onSelectSpan: (span: TraceSpan) => void;
  traceStartMs: number;
  traceDurationMs: number;
}

/**
 * Span tree node component
 */
export function SpanTreeNode({
  span,
  depth,
  selectedSpan,
  onSelectSpan,
  traceStartMs,
  traceDurationMs,
}: SpanTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = span.children.length > 0;
  const isSelected = selectedSpan?.spanId === span.spanId;
  const typeClass = getSpanTypeClass(span.name);

  return (
    <div>
      <button
        onClick={() => onSelectSpan(span)}
        className={cn(
          "w-full text-left flex items-center gap-1.5 py-1.5 px-2 hover:bg-agentprism-secondary rounded transition-colors",
          isSelected && "bg-agentprism-secondary",
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {hasChildren ? (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }
            }}
            className="p-0.5 hover:bg-agentprism-muted rounded cursor-pointer"
          >
            <ChevronRight
              className={cn(
                "h-3 w-3 transition-transform",
                isExpanded && "rotate-90",
              )}
            />
          </span>
        ) : (
          <span className="w-4" />
        )}
        <span
          className={cn(
            "w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center",
            typeClass.badge,
          )}
        >
          <typeClass.icon className="w-2.5 h-2.5 text-white" />
        </span>
        <span className="text-sm truncate flex-1 min-w-0">
          {formatSpanName(span.name)}
        </span>
        <SpanTimeline
          span={span}
          traceStartMs={traceStartMs}
          traceDurationMs={traceDurationMs}
        />
        <span className="text-xs text-agentprism-muted-foreground w-14 text-right flex-shrink-0">
          {formatDuration(span.durationMs)}
        </span>
        {span.status === "ERROR" && (
          <span className="text-xs text-agentprism-error ml-1">!</span>
        )}
      </button>
      {hasChildren && isExpanded && (
        <div>
          {span.children.map((child) => (
            <SpanTreeNode
              key={child.spanId}
              span={child}
              depth={depth + 1}
              selectedSpan={selectedSpan}
              onSelectSpan={onSelectSpan}
              traceStartMs={traceStartMs}
              traceDurationMs={traceDurationMs}
            />
          ))}
        </div>
      )}
    </div>
  );
}
