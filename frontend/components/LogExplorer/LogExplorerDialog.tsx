/**
 * LogExplorerDialog - Main dialog for browsing logs and traces
 *
 * Provides a full-featured debug interface with:
 * - Logs tab: File selection, filtering, virtual scrolling, export
 * - Traces tab: OpenTelemetry trace visualization
 */

import { useState, useEffect, useRef } from "react";
import { AlertCircle, ExternalLink, FileText, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLogExplorer } from "@/hooks/logExplorer";
import { LogExplorerHeader } from "./LogExplorerHeader";
import { LogExplorerToolbar } from "./LogExplorerToolbar";
import { LogExplorerList } from "./LogExplorerList";
import { TraceExplorerPage } from "@/components/TraceExplorer/TraceExplorerPage";
import { cn } from "@/lib/utils";

type TabId = "logs" | "traces";

interface LogExplorerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectPath: string | null;
}

export function LogExplorerDialog({
  open,
  onOpenChange,
  projectPath,
}: LogExplorerDialogProps) {
  const {
    files,
    selectedFile,
    setSelectedFile,
    entries,
    stats,
    totalCount,
    filters,
    setFilters,
    resetFilters,
    hasMore,
    loadMore,
    isLoading,
    isLoadingMore,
    error,
    refresh,
    exportFiltered,
    runs,
    isLoadingRuns,
    setLastRunOnly,
  } = useLogExplorer(projectPath);

  const [formatJson, setFormatJson] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("logs");
  const wasOpenRef = useRef(false);

  // Refresh data when dialog opens
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      // Dialog just opened - refresh to get latest data
      refresh();
    }
    wasOpenRef.current = open;
  }, [open, refresh]);

  const handleOpenInNewTab = () => {
    const url = projectPath
      ? `/debug?project=${encodeURIComponent(projectPath)}&tab=${activeTab}`
      : `/debug?tab=${activeTab}`;
    window.open(url, "_blank");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-2 border-b flex-shrink-0 flex-row items-center space-y-0">
          <DialogTitle className="sr-only">Debug Explorer</DialogTitle>
          {/* Tabs */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab("logs")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                activeTab === "logs"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              <FileText className="h-4 w-4" />
              Logs
            </button>
            <button
              onClick={() => setActiveTab("traces")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                activeTab === "traces"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              <Activity className="h-4 w-4" />
              Traces
            </button>
          </div>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 mr-6"
            onClick={handleOpenInNewTab}
            title="Open in new tab"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </DialogHeader>

        {/* Logs tab content */}
        {activeTab === "logs" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Error banner */}
            {error && (
              <div className="px-4 py-2 bg-destructive/10 text-destructive flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* No project selected */}
            {!projectPath && (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                No project selected. Open a project to view logs.
              </div>
            )}

            {/* No log files */}
            {projectPath && files.length === 0 && !isLoading && (
              <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-2">
                <span>No log files found in project.</span>
                <span className="text-xs">
                  Run your workflow to generate logs in the logs/ directory.
                </span>
              </div>
            )}

            {/* Main content */}
            {projectPath && (files.length > 0 || isLoading) && (
              <>
                <LogExplorerHeader
                  files={files}
                  selectedFile={selectedFile}
                  onSelectFile={setSelectedFile}
                  stats={stats}
                  totalCount={totalCount}
                  isLoading={isLoading}
                  onRefresh={refresh}
                  onExport={exportFiltered}
                />

                <LogExplorerToolbar
                  filters={filters}
                  onFiltersChange={setFilters}
                  onResetFilters={resetFilters}
                  stats={stats}
                  formatJson={formatJson}
                  onFormatJsonChange={setFormatJson}
                  runs={runs}
                  isLoadingRuns={isLoadingRuns}
                  onLastRunOnlyChange={setLastRunOnly}
                />

                <LogExplorerList
                  entries={entries}
                  isLoading={isLoading}
                  isLoadingMore={isLoadingMore}
                  hasMore={hasMore}
                  onLoadMore={loadMore}
                  searchTerm={filters.search || undefined}
                  formatJson={formatJson}
                />
              </>
            )}
          </div>
        )}

        {/* Traces tab content */}
        {activeTab === "traces" && (
          <div className="flex-1 overflow-hidden">
            <TraceExplorerPage projectPath={projectPath} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
