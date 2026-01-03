/**
 * TraceExplorerPage - Full page trace visualization
 *
 * Uses AgentPrism components for rendering trace data.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Activity,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  FileText,
  Zap,
  Wrench,
  Bot,
  Link,
  Search,
  BarChart2,
  ShieldCheck,
  HelpCircle,
  Cpu,
  FunctionSquare,
  List,
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
 * Format span name - converts operation prefix to Title Case while keeping entity names unchanged
 * e.g., "invoke_agent seq_A1" → "Invoke Agent: seq_A1"
 *       "call_llm" → "Call LLM"
 *       "execute_tool retrieve" → "Execute Tool: retrieve"
 */
const ACRONYMS = new Set(["llm", "api", "id", "url", "sql", "http", "ai"]);
const OPERATION_PREFIXES = [
  "invoke_agent",
  "call_llm",
  "execute_tool",
  "create_agent",
  "run_agent",
  "agent_invocation",
  "tool_execution",
  "chain_operation",
];

function formatOperationWord(word: string): string {
  const lower = word.toLowerCase();
  if (ACRONYMS.has(lower)) {
    return lower.toUpperCase();
  }
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function formatSpanName(name: string): string {
  // Check if the name starts with a known operation prefix
  for (const prefix of OPERATION_PREFIXES) {
    if (name.toLowerCase().startsWith(prefix)) {
      const formattedPrefix = prefix
        .split("_")
        .map(formatOperationWord)
        .join(" ");
      const remainder = name.slice(prefix.length).trim();
      if (remainder) {
        // Remove leading underscore or space from remainder
        const cleanRemainder = remainder.replace(/^[_\s]+/, "");
        return `${formattedPrefix}: ${cleanRemainder}`;
      }
      return formattedPrefix;
    }
  }

  // For other names, just capitalize first letter
  return name.charAt(0).toUpperCase() + name.slice(1);
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
 * Get span type color class and icon based on span name
 */
function getSpanTypeClass(name: string): {
  bg: string;
  text: string;
  badge: string;
  icon: typeof Zap;
  label: string;
} {
  const lowerName = name.toLowerCase();

  if (lowerName.includes("llm") || lowerName.includes("call_llm")) {
    return {
      bg: "bg-agentprism-badge-llm",
      text: "text-agentprism-badge-llm-foreground",
      badge: "bg-agentprism-avatar-llm",
      icon: Zap,
      label: "LLM",
    };
  }
  if (lowerName.includes("agent") || lowerName.includes("invoke_agent")) {
    return {
      bg: "bg-agentprism-badge-agent",
      text: "text-agentprism-badge-agent-foreground",
      badge: "bg-agentprism-avatar-agent",
      icon: Bot,
      label: "AGENT",
    };
  }
  if (lowerName.includes("tool") || lowerName.includes("execute_tool")) {
    return {
      bg: "bg-agentprism-badge-tool",
      text: "text-agentprism-badge-tool-foreground",
      badge: "bg-agentprism-avatar-tool",
      icon: Wrench,
      label: "TOOL",
    };
  }
  if (lowerName.includes("chain")) {
    return {
      bg: "bg-agentprism-badge-chain",
      text: "text-agentprism-badge-chain-foreground",
      badge: "bg-agentprism-avatar-chain",
      icon: Link,
      label: "CHAIN",
    };
  }
  if (lowerName.includes("retrieval")) {
    return {
      bg: "bg-agentprism-badge-retrieval",
      text: "text-agentprism-badge-retrieval-foreground",
      badge: "bg-agentprism-avatar-retrieval",
      icon: Search,
      label: "RETRIEVAL",
    };
  }
  if (lowerName.includes("embedding")) {
    return {
      bg: "bg-agentprism-badge-embedding",
      text: "text-agentprism-badge-embedding-foreground",
      badge: "bg-agentprism-avatar-embedding",
      icon: BarChart2,
      label: "EMBEDDING",
    };
  }
  if (lowerName.includes("guardrail")) {
    return {
      bg: "bg-agentprism-badge-guardrail",
      text: "text-agentprism-badge-guardrail-foreground",
      badge: "bg-agentprism-avatar-guardrail",
      icon: ShieldCheck,
      label: "GUARDRAIL",
    };
  }

  return {
    bg: "bg-agentprism-badge-unknown",
    text: "text-agentprism-badge-unknown-foreground",
    badge: "bg-agentprism-avatar-unknown",
    icon: HelpCircle,
    label: "SPAN",
  };
}

/**
 * Extract model name from span attributes
 */
function getModelName(span: TraceSpan): string | undefined {
  const attrs = span.attributes || {};
  return (
    (attrs["gen_ai.request.model"] as string) ||
    (attrs["llm.model_name"] as string) ||
    (attrs["model"] as string) ||
    (attrs["model_name"] as string) ||
    undefined
  );
}

/**
 * Extract tool name from span attributes
 */
function getToolName(span: TraceSpan): string | undefined {
  const lowerName = span.name.toLowerCase();
  if (!lowerName.includes("tool") && !lowerName.includes("execute_tool")) {
    return undefined;
  }
  const attrs = span.attributes || {};
  return (
    (attrs["tool.name"] as string) ||
    (attrs["function.name"] as string) ||
    (attrs["gen_ai.tool.name"] as string) ||
    undefined
  );
}

/**
 * Trace list item component - compact version
 */
function TraceListItem({
  trace,
  isSelected,
  onClick,
  isCollapsed,
}: {
  trace: TraceInfo;
  isSelected: boolean;
  onClick: () => void;
  isCollapsed?: boolean;
}) {
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

/**
 * Timeline bar component for a span
 */
function SpanTimeline({
  span,
  traceStartMs,
  traceDurationMs,
}: {
  span: TraceSpan;
  traceStartMs: number;
  traceDurationMs: number;
}) {
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

/**
 * Span tree node component
 */
function SpanTreeNode({
  span,
  depth,
  selectedSpan,
  onSelectSpan,
  traceStartMs,
  traceDurationMs,
}: {
  span: TraceSpan;
  depth: number;
  selectedSpan: TraceSpan | null;
  onSelectSpan: (span: TraceSpan) => void;
  traceStartMs: number;
  traceDurationMs: number;
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

/**
 * Span details panel
 */
function SpanDetailsPanel({ span }: { span: TraceSpan }) {
  const typeClass = getSpanTypeClass(span.name);
  const modelName = getModelName(span);
  const toolName = getToolName(span);
  const Icon = typeClass.icon;

  return (
    <div className="h-full overflow-auto p-4">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span
            className={cn(
              "w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center",
              typeClass.badge,
            )}
          >
            <Icon className="w-3 h-3 text-white" />
          </span>
          <h3 className="text-lg font-semibold">{formatSpanName(span.name)}</h3>
          <span
            className={cn(
              span.status === "ERROR"
                ? "text-agentprism-error"
                : "text-agentprism-success",
              "text-sm",
            )}
          >
            {span.status === "UNSET" ? "OK" : span.status}
          </span>
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full",
              typeClass.bg,
              typeClass.text,
            )}
          >
            <Icon className="w-2.5 h-2.5" />
            {typeClass.label}
          </span>
          {modelName && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-agentprism-badge-llm text-agentprism-badge-llm-foreground">
              <Cpu className="w-2.5 h-2.5" />
              {modelName}
            </span>
          )}
          {toolName && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-agentprism-badge-tool text-agentprism-badge-tool-foreground">
              <FunctionSquare className="w-2.5 h-2.5" />
              {toolName}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-agentprism-muted-foreground">Duration:</span>{" "}
            {formatDuration(span.durationMs)}
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
