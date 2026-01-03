"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState, useCallback } from "react";
import { FileText, Activity } from "lucide-react";
import { LogExplorerPage } from "@/components/LogExplorer/LogExplorerPage";
import { TraceExplorerPage } from "@/components/TraceExplorer/TraceExplorerPage";
import { cn } from "@/lib/utils";

type TabId = "logs" | "traces";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  { id: "logs", label: "Logs", icon: <FileText className="h-4 w-4" /> },
  { id: "traces", label: "Traces", icon: <Activity className="h-4 w-4" /> },
];

/** Time range filter for cross-tab correlation */
export interface TimeRangeFilter {
  startTime: string;
  endTime: string;
}

function DebugContent() {
  const searchParams = useSearchParams();
  const projectPath = searchParams.get("project");
  const initialTab = (searchParams.get("tab") as TabId) || "logs";

  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [logTimeFilter, setLogTimeFilter] = useState<TimeRangeFilter | null>(
    null,
  );
  const [traceTimeFilter, setTraceTimeFilter] =
    useState<TimeRangeFilter | null>(null);

  /** Navigate to logs tab with optional time filter */
  const navigateToLogs = useCallback((timeRange?: TimeRangeFilter) => {
    if (timeRange) {
      setLogTimeFilter(timeRange);
    }
    setActiveTab("logs");
  }, []);

  /** Navigate to traces tab with optional time filter */
  const navigateToTraces = useCallback((timeRange?: TimeRangeFilter) => {
    if (timeRange) {
      setTraceTimeFilter(timeRange);
    }
    setActiveTab("traces");
  }, []);

  /** Clear the log time filter after it's been applied */
  const clearLogTimeFilter = useCallback(() => {
    setLogTimeFilter(null);
  }, []);

  /** Clear the trace time filter after it's been applied */
  const clearTraceTimeFilter = useCallback(() => {
    setTraceTimeFilter(null);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Tab bar */}
      <div className="flex border-b border-border bg-card px-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted",
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "logs" && (
          <LogExplorerPage
            projectPath={projectPath}
            initialTimeFilter={logTimeFilter}
            onTimeFilterApplied={clearLogTimeFilter}
            onNavigateToTraces={navigateToTraces}
          />
        )}
        {activeTab === "traces" && (
          <TraceExplorerPage
            projectPath={projectPath}
            initialTimeFilter={traceTimeFilter}
            onTimeFilterApplied={clearTraceTimeFilter}
            onNavigateToLogs={navigateToLogs}
          />
        )}
      </div>
    </div>
  );
}

export default function DebugPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <DebugContent />
    </Suspense>
  );
}
