import ReactFlowCanvas, {
  type ReactFlowCanvasRef,
} from "@/components/ReactFlowCanvas";
import TabBar from "@/components/TabBar";
import ProjectSwitcher from "@/components/ProjectSwitcher";
import {
  ProjectProvider,
  type FilePickerOptions,
} from "@/contexts/ProjectContext";
import { RunWorkflowProvider } from "@/contexts/RunWorkflowContext";
import type { Node, Edge } from "@xyflow/react";
import type { TabState } from "@/lib/types";
import type { RecentProject } from "@/lib/recentProjects";

interface HomeLayoutProps {
  canvasRef: React.RefObject<ReactFlowCanvasRef | null>;
  currentProjectPath: string | null;
  tabs: TabState[];
  activeTabId: string | null;
  isCanvasLocked: boolean;
  isRunning: boolean;
  defaultModel?: string;

  // Tab handlers
  onTabClick: (tabId: string) => void;
  onTabDelete: (tabId: string) => void;
  onTabRename: (tabId: string, name: string) => void;
  onTabReorder: (tabIds: string[]) => void;
  onAddTab: () => void;
  onDuplicateTab: (tabId: string) => void;

  // Canvas handlers
  onWorkflowChange: (data: { nodes: Node[]; edges: Edge[] }) => void;
  onRequestPromptCreation: (position: { x: number; y: number }) => void;
  onRequestContextCreation: (position: { x: number; y: number }) => void;
  onRequestToolCreation: (position: { x: number; y: number }) => void;
  onRequestProcessCreation: (position: { x: number; y: number }) => void;
  onRequestOutputFileCreation: (position: { x: number; y: number }) => void;
  onToggleLock: () => void;
  onSave: () => void;
  onSaveFile: (filePath: string, content: string) => Promise<void>;
  onRequestFilePicker: (
    currentFilePath: string,
    onSelect: (newPath: string) => void,
    options?: FilePickerOptions,
  ) => void;
  onRunWorkflow: () => void;

  // Project switcher
  isProjectSwitcherOpen: boolean;
  projectSwitcherMode: "create" | "open";
  recentProjects: RecentProject[];
  onCloseProjectSwitcher: () => void;
  onCreateProject: (projectPath: string, projectName?: string) => void;
  onLoadProject: (projectPath: string) => void;
  onRemoveRecent: (path: string) => void;
}

export function HomeLayout({
  canvasRef,
  currentProjectPath,
  tabs,
  activeTabId,
  isCanvasLocked,
  isRunning,
  defaultModel,
  onTabClick,
  onTabDelete,
  onTabRename,
  onTabReorder,
  onAddTab,
  onDuplicateTab,
  onWorkflowChange,
  onRequestPromptCreation,
  onRequestContextCreation,
  onRequestToolCreation,
  onRequestProcessCreation,
  onRequestOutputFileCreation,
  onToggleLock,
  onSave,
  onSaveFile,
  onRequestFilePicker,
  onRunWorkflow,
  isProjectSwitcherOpen,
  projectSwitcherMode,
  recentProjects,
  onCloseProjectSwitcher,
  onCreateProject,
  onLoadProject,
  onRemoveRecent,
}: HomeLayoutProps) {
  return (
    <>
      {/* Tab Bar */}
      {currentProjectPath && tabs.length > 0 && (
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onTabClick={onTabClick}
          onTabDelete={onTabDelete}
          onTabRename={onTabRename}
          onTabReorder={onTabReorder}
          onAddTab={onAddTab}
          onDuplicateTab={onDuplicateTab}
        />
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas Area */}
        <main className="flex-1 relative">
          <div className="absolute inset-0">
            <ProjectProvider
              projectPath={currentProjectPath}
              onSaveFile={onSaveFile}
              onRequestFilePicker={onRequestFilePicker}
              isLocked={isCanvasLocked}
              defaultModel={defaultModel}
            >
              <RunWorkflowProvider
                runWorkflow={onRunWorkflow}
                isRunning={isRunning}
                hasProjectPath={!!currentProjectPath}
              >
                <ReactFlowCanvas
                  ref={canvasRef}
                  onWorkflowChange={onWorkflowChange}
                  onRequestPromptCreation={onRequestPromptCreation}
                  onRequestContextCreation={onRequestContextCreation}
                  onRequestToolCreation={onRequestToolCreation}
                  onRequestProcessCreation={onRequestProcessCreation}
                  onRequestOutputFileCreation={onRequestOutputFileCreation}
                  isLocked={isCanvasLocked}
                  onToggleLock={onToggleLock}
                  activeTabId={activeTabId ?? undefined}
                  onSave={onSave}
                />
              </RunWorkflowProvider>
            </ProjectProvider>
          </div>
        </main>
      </div>

      {/* Project Switcher */}
      <ProjectSwitcher
        isOpen={isProjectSwitcherOpen}
        onClose={onCloseProjectSwitcher}
        onCreateProject={onCreateProject}
        onLoadProject={onLoadProject}
        recentProjects={recentProjects}
        onRemoveRecent={onRemoveRecent}
        currentProjectPath={currentProjectPath}
        mode={projectSwitcherMode}
      />
    </>
  );
}
