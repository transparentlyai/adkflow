import { useEffect } from "react";
import type { Node, Edge } from "@xyflow/react";
import type { ReactFlowCanvasRef } from "@/components/ReactFlowCanvas";
import type { RecentProject } from "@/lib/recentProjects";
import { loadSession, saveSession } from "@/lib/sessionStorage";
import { getRecentProjects, addRecentProject } from "@/lib/recentProjects";

interface UseSessionManagementProps {
  canvasRef: React.RefObject<ReactFlowCanvasRef | null>;
  loadedTabIdRef: React.MutableRefObject<string | null>;
  isSessionLoaded: boolean;
  currentProjectPath: string | null;
  workflowName: string;
  hasUnsavedChanges: boolean;
  setCurrentProjectPath: (path: string | null) => void;
  setWorkflowName: (name: string) => void;
  setIsProjectSaved: (saved: boolean) => void;
  setShowHomeScreen: (show: boolean) => void;
  setRecentProjects: (projects: RecentProject[]) => void;
  setIsSessionLoaded: (loaded: boolean) => void;
  initializeTabs: (projectPath: string) => Promise<{
    projectName: string;
    firstTab: { id: string; name: string } | null;
  } | null>;
  loadTabFlow: (
    projectPath: string,
    tabId: string,
  ) => Promise<{
    nodes: Node[];
    edges: Edge[];
    viewport: { x: number; y: number; zoom: number };
  } | null>;
  syncTeleportersForTab: (
    tabId: string,
    tabName: string,
    nodes: Node[],
  ) => void;
}

export function useSessionManagement({
  canvasRef,
  loadedTabIdRef,
  isSessionLoaded,
  currentProjectPath,
  workflowName,
  hasUnsavedChanges,
  setCurrentProjectPath,
  setWorkflowName,
  setIsProjectSaved,
  setShowHomeScreen,
  setRecentProjects,
  setIsSessionLoaded,
  initializeTabs,
  loadTabFlow,
  syncTeleportersForTab,
}: UseSessionManagementProps) {
  // Load session and recent projects on mount
  useEffect(() => {
    // Load recent projects from localStorage
    setRecentProjects(getRecentProjects());

    const session = loadSession();
    if (session && session.currentProjectPath) {
      const projectPath = session.currentProjectPath;
      setCurrentProjectPath(projectPath);
      setIsProjectSaved(true);

      // Initialize tabs and load first tab
      (async () => {
        const result = await initializeTabs(projectPath);
        if (result) {
          setWorkflowName(result.projectName);
          if (result.firstTab && canvasRef.current) {
            const flow = await loadTabFlow(projectPath, result.firstTab.id);
            if (flow) {
              canvasRef.current.restoreFlow(flow);
              loadedTabIdRef.current = result.firstTab.id;
              syncTeleportersForTab(
                result.firstTab.id,
                result.firstTab.name,
                flow.nodes,
              );
            }
          }
          addRecentProject({
            path: projectPath,
            name: result.projectName,
            lastOpened: Date.now(),
          });
          setRecentProjects(getRecentProjects());
        }
      })();

      setIsSessionLoaded(true);
    } else {
      // No session, show home screen
      setShowHomeScreen(true);
      setIsSessionLoaded(true);
    }
  }, [
    canvasRef,
    loadedTabIdRef,
    setCurrentProjectPath,
    setWorkflowName,
    setIsProjectSaved,
    setShowHomeScreen,
    setRecentProjects,
    setIsSessionLoaded,
    initializeTabs,
    loadTabFlow,
    syncTeleportersForTab,
  ]);

  // Save session whenever relevant state changes
  useEffect(() => {
    if (isSessionLoaded && currentProjectPath) {
      saveSession({
        currentProjectPath,
        workflowName,
        workflow: null, // Deprecated - using tabs now
        hasUnsavedChanges,
      });
    }
  }, [isSessionLoaded, currentProjectPath, workflowName, hasUnsavedChanges]);
}
