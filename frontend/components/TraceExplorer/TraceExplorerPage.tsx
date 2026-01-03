/**
 * TraceExplorerPage - Full page trace visualization
 *
 * Uses AgentPrism components for rendering trace data.
 */

import { useState, useCallback, useEffect } from "react";
import {
  Activity,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  FileText,
} from "lucide-react";
import { useTraceExplorer } from "@/hooks/traceExplorer";
import { cn } from "@/lib/utils";
import type { TraceSpan, TraceInfo } from "@/lib/api/traces";
import type { TimeRangeFilter } from "@/app/debug/page";

interface TraceExplorerPageProps {
  projectPath: string | null;
  /** Initial time filter from cross-tab navigation */
  initialTimeFilter?: TimeRangeFilter | null;
  /** Called after the time filter has been applied */
  onTimeFilterApplied?: () => void;
  /** Navigate to logs tab with optional time filter */
  onNavigateToLogs?: (timeRange?: TimeRangeFilter) => void;
}

/**
 * Format duration in milliseconds to human-readable string
 */
function formatDuration(ms: number | null): string {
  if (ms === null) return "-";
  if (ms < 1) return "<1ms";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Format timestamp to time only
 */
function formatTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  } catch {
    return timestamp;
  }
}

/**
 * Get span type color class based on span name
 */
function getSpanTypeClass(name: string): {
  bg: string;
  text: string;
  badge: string;
} {
  const lowerName = name.toLowerCase();

  if (lowerName.includes("llm") || lowerName.includes("call_llm")) {
    return {
      bg: "bg-agentprism-badge-llm",
      text: "text-agentprism-badge-llm-foreground",
      badge: "bg-agentprism-avatar-llm",
    };
  }
  if (lowerName.includes("agent") || lowerName.includes("invoke_agent")) {
    return {
      bg: "bg-agentprism-badge-agent",
      text: "text-agentprism-badge-agent-foreground",
      badge: "bg-agentprism-avatar-agent",
    };
  }
  if (lowerName.includes("tool") || lowerName.includes("execute_tool")) {
    return {
      bg: "bg-agentprism-badge-tool",
      text: "text-agentprism-badge-tool-foreground",
      badge: "bg-agentprism-avatar-tool",
    };
  }
  if (lowerName.includes("chain")) {
    return {
      bg: "bg-agentprism-badge-chain",
      text: "text-agentprism-badge-chain-foreground",
      badge: "bg-agentprism-avatar-chain",
    };
  }
  if (lowerName.includes("retrieval")) {
    return {
      bg: "bg-agentprism-badge-retrieval",
      text: "text-agentprism-badge-retrieval-foreground",
      badge: "bg-agentprism-avatar-retrieval",
    };
  }
  if (lowerName.includes("embedding")) {
    return {
      bg: "bg-agentprism-badge-embedding",
      text: "text-agentprism-badge-embedding-foreground",
      badge: "bg-agentprism-avatar-embedding",
    };
  }
  if (lowerName.includes("guardrail")) {
    return {
      bg: "bg-agentprism-badge-guardrail",
      text: "text-agentprism-badge-guardrail-foreground",
      badge: "bg-agentprism-avatar-guardrail",
    };
  }

  return {
    bg: "bg-agentprism-badge-unknown",
    text: "text-agentprism-badge-unknown-foreground",
    badge: "bg-agentprism-avatar-unknown",
  };
}

/**
 * Trace list item component
 */
function TraceListItem({
  trace,
  isSelected,
  onClick,
}: {
  trace: TraceInfo;
  isSelected: boolean;
  onClick: () => void;
}) {
  const typeClass = getSpanTypeClass(trace.rootSpanName);

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 border-b border-agentprism-border hover:bg-agentprism-secondary transition-colors",
        isSelected && "bg-agentprism-secondary",
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className={cn(
            "px-2 py-0.5 text-xs rounded-full",
            typeClass.bg,
            typeClass.text,
          )}
        >
          {trace.rootSpanName}
        </span>
        {trace.hasErrors && (
          <span className="px-2 py-0.5 text-xs rounded-full bg-agentprism-error-muted text-agentprism-error-muted-foreground">
            ERROR
          </span>
        )}
      </div>
      <div className="flex items-center justify-between text-xs text-agentprism-muted-foreground">
        <span>{formatTime(trace.startTime)}</span>
        <span>{trace.spanCount} spans</span>
        <span>{formatDuration(trace.durationMs)}</span>
      </div>
    </button>
  );
}

/**
 * Span tree node component
 */
function SpanTreeNode({
  span,
  depth,
  selectedSpan,
  onSelectSpan,
}: {
  span: TraceSpan;
  depth: number;
  selectedSpan: TraceSpan | null;
  onSelectSpan: (span: TraceSpan) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = span.children.length > 0;
  const isSelected = selectedSpan?.spanId === span.spanId;
  const typeClass = getSpanTypeClass(span.name);

  return (
    <div>
      <button
        onClick={() => onSelectSpan(span)}
        className={cn(
          "w-full text-left flex items-center gap-1 py-1.5 px-2 hover:bg-agentprism-secondary rounded transition-colors",
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
          className={cn("w-2 h-2 rounded-full flex-shrink-0", typeClass.badge)}
        />
        <span className="text-sm truncate flex-1">{span.name}</span>
        <span className="text-xs text-agentprism-muted-foreground ml-2">
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
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Span details panel
 */
function SpanDetailsPanel({ span }: { span: TraceSpan }) {
  const typeClass = getSpanTypeClass(span.name);

  return (
    <div className="h-full overflow-auto p-4">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span
            className={cn(
              "w-3 h-3 rounded-full flex-shrink-0",
              typeClass.badge,
            )}
          />
          <h3 className="text-lg font-semibold">{span.name}</h3>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-agentprism-muted-foreground">Duration:</span>{" "}
            {formatDuration(span.durationMs)}
          </div>
          <div>
            <span className="text-agentprism-muted-foreground">Status:</span>{" "}
            <span
              className={cn(
                span.status === "ERROR"
                  ? "text-agentprism-error"
                  : "text-agentprism-success",
              )}
            >
              {span.status === "UNSET" ? "OK" : span.status}
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-agentprism-muted-foreground">Span ID:</span>{" "}
            <code className="text-xs bg-agentprism-muted px-1 py-0.5 rounded">
              {span.spanId}
            </code>
          </div>
          {span.parentSpanId && (
            <div className="col-span-2">
              <span className="text-agentprism-muted-foreground">
                Parent ID:
              </span>{" "}
              <code className="text-xs bg-agentprism-muted px-1 py-0.5 rounded">
                {span.parentSpanId}
              </code>
            </div>
          )}
        </div>
      </div>

      {Object.keys(span.attributes).length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2 text-agentprism-muted-foreground">
            Attributes
          </h4>
          <div className="bg-agentprism-muted rounded p-3 overflow-auto">
            <pre className="text-xs whitespace-pre-wrap">
              {JSON.stringify(span.attributes, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export function TraceExplorerPage({
  projectPath,
  initialTimeFilter,
  onTimeFilterApplied,
  onNavigateToLogs,
}: TraceExplorerPageProps) {
  const {
    traces,
    selectedTrace,
    selectedSpan,
    stats,
    totalCount,
    hasMore,
    isLoading,
    isLoadingMore,
    isLoadingTrace,
    error,
    loadMore,
    selectTrace,
    selectSpan,
    refresh,
  } = useTraceExplorer(projectPath);

  // Handle initial time filter (currently just acknowledges it)
  useEffect(() => {
    if (initialTimeFilter) {
      // TODO: Could filter traces by time range here if needed
      onTimeFilterApplied?.();
    }
  }, [initialTimeFilter, onTimeFilterApplied]);

  const handleTraceClick = useCallback(
    (traceId: string) => {
      if (selectedTrace?.traceId === traceId) {
        selectTrace(null);
      } else {
        selectTrace(traceId);
      }
    },
    [selectedTrace, selectTrace],
  );

  /** Get time range for the selected trace */
  const getSelectedTraceTimeRange = useCallback(():
    | TimeRangeFilter
    | undefined => {
    if (!selectedTrace?.startTime || !selectedTrace?.endTime) return undefined;
    return {
      startTime: selectedTrace.startTime,
      endTime: selectedTrace.endTime,
    };
  }, [selectedTrace]);

  return (
    <div className="h-full flex flex-col bg-agentprism-background text-agentprism-foreground">
      {/* Header */}
      <div className="px-4 py-3 border-b border-agentprism-border flex items-center gap-3 flex-shrink-0">
        <Activity className="h-5 w-5 text-agentprism-muted-foreground" />
        <h1 className="text-lg font-semibold">Trace Explorer</h1>
        {projectPath && (
          <span className="text-sm text-agentprism-muted-foreground">
            — {projectPath.split("/").pop()}
          </span>
        )}
        <div className="flex-1" />
        {stats && (
          <span className="text-sm text-agentprism-muted-foreground">
            {stats.totalTraces} traces, {stats.totalSpans} spans
          </span>
        )}
        {onNavigateToLogs && (
          <button
            onClick={() => onNavigateToLogs(getSelectedTraceTimeRange())}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-agentprism-muted-foreground hover:text-agentprism-foreground hover:bg-agentprism-secondary rounded-md transition-colors"
            title={
              selectedTrace
                ? "View logs for this trace's time range"
                : "View logs"
            }
          >
            <FileText className="h-4 w-4" />
            View Logs
          </button>
        )}
        <button
          onClick={refresh}
          disabled={isLoading}
          className="p-1.5 rounded hover:bg-agentprism-secondary transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-4 py-2 bg-agentprism-error-muted text-agentprism-error-muted-foreground flex items-center gap-2 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* No project selected */}
      {!projectPath && (
        <div className="flex-1 flex items-center justify-center text-agentprism-muted-foreground">
          No project specified. Open the Trace Explorer from within a project.
        </div>
      )}

      {/* No traces */}
      {projectPath && traces.length === 0 && !isLoading && (
        <div className="flex-1 flex items-center justify-center text-agentprism-muted-foreground flex-col gap-2">
          <span>No traces found in project.</span>
          <span className="text-xs">
            Run your workflow to generate traces in the logs/ directory.
          </span>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center text-agentprism-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" />
          Loading traces...
        </div>
      )}

      {/* Main content */}
      {projectPath && traces.length > 0 && !isLoading && (
        <div className="flex-1 flex overflow-hidden">
          {/* Trace list */}
          <div className="w-80 border-r border-agentprism-border flex flex-col flex-shrink-0">
            <div className="flex-1 overflow-auto">
              {traces.map((trace) => (
                <TraceListItem
                  key={trace.traceId}
                  trace={trace}
                  isSelected={selectedTrace?.traceId === trace.traceId}
                  onClick={() => handleTraceClick(trace.traceId)}
                />
              ))}
              {hasMore && (
                <button
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="w-full py-2 text-sm text-agentprism-muted-foreground hover:bg-agentprism-secondary transition-colors disabled:opacity-50"
                >
                  {isLoadingMore ? "Loading..." : "Load more"}
                </button>
              )}
            </div>
            <div className="px-3 py-2 text-xs text-agentprism-muted-foreground border-t border-agentprism-border">
              {totalCount} total traces
            </div>
          </div>

          {/* Span tree and details */}
          {selectedTrace ? (
            <div className="flex-1 flex overflow-hidden">
              {/* Span tree */}
              <div className="w-96 border-r border-agentprism-border overflow-auto flex-shrink-0">
                <div className="p-2">
                  <div className="text-xs text-agentprism-muted-foreground mb-2">
                    {selectedTrace.spanCount} spans •{" "}
                    {formatDuration(selectedTrace.durationMs)}
                  </div>
                  {selectedTrace.spans.map((span) => (
                    <SpanTreeNode
                      key={span.spanId}
                      span={span}
                      depth={0}
                      selectedSpan={selectedSpan}
                      onSelectSpan={selectSpan}
                    />
                  ))}
                </div>
              </div>

              {/* Span details */}
              <div className="flex-1 overflow-hidden">
                {selectedSpan ? (
                  <SpanDetailsPanel span={selectedSpan} />
                ) : (
                  <div className="h-full flex items-center justify-center text-agentprism-muted-foreground">
                    Select a span to view details
                  </div>
                )}
              </div>
            </div>
          ) : isLoadingTrace ? (
            <div className="flex-1 flex items-center justify-center text-agentprism-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" />
              Loading trace...
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-agentprism-muted-foreground">
              Select a trace to view details
            </div>
          )}
        </div>
      )}
    </div>
  );
}
