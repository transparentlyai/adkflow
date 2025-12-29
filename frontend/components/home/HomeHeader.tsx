import TopMenubar from "@/components/TopMenubar";
import GlobalSearch from "@/components/GlobalSearch";
import { Lock, Save, Sun, Moon } from "lucide-react";
import type { Node, Edge } from "@xyflow/react";
import type { TabState } from "@/lib/types";
import type { ReactFlowCanvasRef } from "@/components/ReactFlowCanvas";

interface HomeHeaderProps {
  workflowName: string;
  setWorkflowName: (name: string) => void;
  currentProjectPath: string | null;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  isCanvasLocked: boolean;
  isRunning: boolean;
  isRunPanelOpen: boolean;
  themeId: string;
  tabs: TabState[];
  activeTabId: string | null;
  canvasRef: React.RefObject<ReactFlowCanvasRef | null>;
  onNewProject: () => void;
  onLoadProject: () => void;
  onSaveProject: () => void;
  onClearCanvas: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onToggleLock: () => void;
  onRunWorkflow: () => void;
  onValidateWorkflow: () => void;
  onShowTopology: () => void;
  onToggleRunConsole: () => void;
  onToggleTheme: () => void;
  onOpenProjectSettings: () => void;
  loadTabFlow: (
    projectPath: string,
    tabId: string,
  ) => Promise<{
    nodes: Node[];
    edges: Edge[];
    viewport: { x: number; y: number; zoom: number };
  } | null>;
  navigateToNode: (tabId: string, nodeId: string) => void;
}

export function HomeHeader({
  workflowName,
  setWorkflowName,
  currentProjectPath,
  hasUnsavedChanges,
  isSaving,
  isCanvasLocked,
  isRunning,
  isRunPanelOpen,
  themeId,
  tabs,
  activeTabId,
  canvasRef,
  onNewProject,
  onLoadProject,
  onSaveProject,
  onClearCanvas,
  onZoomIn,
  onZoomOut,
  onFitView,
  onToggleLock,
  onRunWorkflow,
  onValidateWorkflow,
  onShowTopology,
  onToggleRunConsole,
  onToggleTheme,
  onOpenProjectSettings,
  loadTabFlow,
  navigateToNode,
}: HomeHeaderProps) {
  return (
    <header className="bg-background border-b border-border px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-primary">ADKFlow</h1>
          <TopMenubar
            onNewProject={onNewProject}
            onLoadProject={onLoadProject}
            onSaveProject={onSaveProject}
            onClearCanvas={onClearCanvas}
            onZoomIn={onZoomIn}
            onZoomOut={onZoomOut}
            onFitView={onFitView}
            hasProjectPath={!!currentProjectPath}
            isLocked={isCanvasLocked}
            onToggleLock={onToggleLock}
            onRunWorkflow={onRunWorkflow}
            onValidateWorkflow={onValidateWorkflow}
            onShowTopology={onShowTopology}
            isRunning={isRunning}
            showRunConsole={isRunPanelOpen}
            onToggleRunConsole={onToggleRunConsole}
            onOpenProjectSettings={onOpenProjectSettings}
          />
          {currentProjectPath && (
            <GlobalSearch
              projectPath={currentProjectPath}
              tabs={tabs}
              activeTabId={activeTabId}
              loadTabFlow={loadTabFlow}
              navigateToNode={navigateToNode}
              canvasRef={canvasRef}
            />
          )}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-md hover:bg-accent transition-colors"
            title={
              themeId === "dark"
                ? "Switch to light mode"
                : "Switch to dark mode"
            }
          >
            {themeId === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="text-sm font-medium border-none focus:outline-none focus:ring-2 focus:ring-ring rounded px-2 py-1 bg-transparent"
            placeholder="Workflow Name"
          />
          {currentProjectPath && (
            <span className="text-xs text-muted-foreground font-mono max-w-[300px] truncate">
              {currentProjectPath}
            </span>
          )}
          {hasUnsavedChanges && (
            <button
              onClick={onSaveProject}
              disabled={isSaving}
              className="flex items-center gap-1 text-xs text-orange-500 font-medium hover:bg-accent rounded px-1.5 py-0.5 transition-colors disabled:opacity-50"
              title="Save changes"
            >
              <Save className={`w-3 h-3 ${isSaving ? "animate-pulse" : ""}`} />
              <span>{isSaving ? "Saving..." : "Save"}</span>
            </button>
          )}
          {isCanvasLocked && (
            <span className="flex items-center gap-1 text-xs text-blue-500 font-medium">
              <Lock className="h-3 w-3" />
              Locked
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
