/**
 * TraceExplorerPage - Full page trace visualization
 */

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Activity,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  FileText,
  List,
} from "lucide-react";
import { useTraceExplorer } from "@/hooks/traceExplorer";
import { cn } from "@/lib/utils";
import type { TimeRangeFilter } from "@/app/debug/page";
import { formatDuration } from "./traceUtils";
import { TraceListItem } from "./TraceListItem";
import { SpanTreeNode } from "./SpanTree";
import { SpanDetailsPanel } from "./SpanDetailsPanel";

interface TraceExplorerPageProps {
  projectPath: string | null;
  /** Initial time filter from cross-tab navigation */
  initialTimeFilter?: TimeRangeFilter | null;
  /** Called after the time filter has been applied */
  onTimeFilterApplied?: () => void;
  /** Navigate to logs tab with optional time filter */
  onNavigateToLogs?: (timeRange?: TimeRangeFilter) => void;
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

  const [isTraceListCollapsed, setIsTraceListCollapsed] = useState(false);
  const [treeWidth, setTreeWidth] = useState(420);
  const isResizing = useRef(false);
  const resizeRef = useRef<HTMLDivElement>(null);

  // Resize handlers for span tree panel
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const container = resizeRef.current?.parentElement;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const newWidth = e.clientX - containerRect.left;
      setTreeWidth(
        Math.max(200, Math.min(newWidth, containerRect.width - 200)),
      );
    };

    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // Auto-collapse trace list when a trace is selected
  useEffect(() => {
    if (selectedTrace) {
      setIsTraceListCollapsed(true);
    }
  }, [selectedTrace]);

  // Handle initial time filter
  useEffect(() => {
    if (initialTimeFilter) {
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
          {/* Trace list - collapsible */}
          <div
            className={cn(
              "border-r border-agentprism-border flex flex-col flex-shrink-0 transition-all duration-200",
              isTraceListCollapsed ? "w-12" : "w-48",
            )}
          >
            {/* Toggle button */}
            <button
              onClick={() => setIsTraceListCollapsed(!isTraceListCollapsed)}
              className="flex items-center justify-center gap-1 px-2 py-1.5 border-b border-agentprism-border hover:bg-agentprism-secondary transition-colors text-agentprism-muted-foreground"
              title={
                isTraceListCollapsed
                  ? "Expand trace list"
                  : "Collapse trace list"
              }
            >
              {isTraceListCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <List className="h-3.5 w-3.5" />
                  <span className="text-xs">Traces</span>
                  <ChevronLeft className="h-3.5 w-3.5 ml-auto" />
                </>
              )}
            </button>
            <div className="flex-1 overflow-auto">
              {traces.map((trace) => (
                <TraceListItem
                  key={trace.traceId}
                  trace={trace}
                  isSelected={selectedTrace?.traceId === trace.traceId}
                  onClick={() => handleTraceClick(trace.traceId)}
                  isCollapsed={isTraceListCollapsed}
                />
              ))}
              {hasMore && !isTraceListCollapsed && (
                <button
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="w-full py-1.5 text-xs text-agentprism-muted-foreground hover:bg-agentprism-secondary transition-colors disabled:opacity-50"
                >
                  {isLoadingMore ? "..." : "More"}
                </button>
              )}
            </div>
            {!isTraceListCollapsed && (
              <div className="px-2 py-1 text-[10px] text-agentprism-muted-foreground border-t border-agentprism-border">
                {totalCount} traces
              </div>
            )}
          </div>

          {/* Span tree and details */}
          {selectedTrace ? (
            <div className="flex-1 flex overflow-hidden" ref={resizeRef}>
              {/* Span tree */}
              <div
                className="border-r border-agentprism-border overflow-auto flex-shrink-0"
                style={{ width: `${treeWidth}px` }}
              >
                <div className="p-2">
                  <div className="text-xs text-agentprism-muted-foreground mb-2">
                    {selectedTrace.spanCount} spans •{" "}
                    {formatDuration(selectedTrace.durationMs)}
                  </div>
                  {(() => {
                    const traceStartMs = selectedTrace.startTime
                      ? new Date(selectedTrace.startTime).getTime()
                      : 0;
                    const traceDurationMs = selectedTrace.durationMs || 0;
                    return selectedTrace.spans.map((span) => (
                      <SpanTreeNode
                        key={span.spanId}
                        span={span}
                        depth={0}
                        selectedSpan={selectedSpan}
                        onSelectSpan={selectSpan}
                        traceStartMs={traceStartMs}
                        traceDurationMs={traceDurationMs}
                      />
                    ));
                  })()}
                </div>
              </div>

              {/* Resize handle */}
              <div
                className="w-4 cursor-col-resize flex items-center justify-center flex-shrink-0 group"
                onMouseDown={handleResizeStart}
                title="Drag to resize"
              >
                <div className="w-1 h-8 rounded-full bg-agentprism-border group-hover:bg-agentprism-muted-foreground transition-colors" />
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
