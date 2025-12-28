import { useCallback } from "react";
import type { Node, Edge } from "@xyflow/react";
import type { ReactFlowCanvasRef } from "@/components/ReactFlowCanvas";
import type { RecentProject } from "@/lib/recentProjects";
import { getRecentProjects, addRecentProject } from "@/lib/recentProjects";

interface UseProjectLoadProps {
  canvasRef: React.RefObject<ReactFlowCanvasRef | null>;
  loadedTabIdRef: React.MutableRefObject<string | null>;
  setCurrentProjectPath: (path: string | null) => void;
  setWorkflowName: (name: string) => void;
  setIsProjectSwitcherOpen: (open: boolean) => void;
  setShowHomeScreen: (show: boolean) => void;
  setIsProjectSaved: (saved: boolean) => void;
  setRecentProjects: (projects: RecentProject[]) => void;
  initializeTabs: (projectPath: string) => Promise<{
    projectName: string;
    firstTab: { id: string; name: string } | null;
  } | null>;
  createNewTab: (
    projectPath: string,
    name: string
  ) => Promise<{ id: string; name: string } | null>;
  loadTabFlow: (
    projectPath: string,
    tabId: string
  ) => Promise<{
    nodes: Node[];
    edges: Edge[];
    viewport: { x: number; y: number; zoom: number };
  } | null>;
  syncTeleportersForTab: (tabId: string, tabName: string, nodes: Node[]) => void;
}

export function useProjectLoad({
  canvasRef,
  loadedTabIdRef,
  setCurrentProjectPath,
  setWorkflowName,
  setIsProjectSwitcherOpen,
  setShowHomeScreen,
  setIsProjectSaved,
  setRecentProjects,
  initializeTabs,
  createNewTab,
  loadTabFlow,
  syncTeleportersForTab,
}: UseProjectLoadProps) {
  const handleLoadExistingProject = useCallback(
    async (projectPath: string) => {
      try {
        const result = await initializeTabs(projectPath);
        let projectName = "Untitled Workflow";

        if (!result || !result.firstTab) {
          alert(`No tabs found at ${projectPath}. Creating a new project instead.`);
          await createNewTab(projectPath, "Flow 1");
        } else {
          const flow = await loadTabFlow(projectPath, result.firstTab.id);
          if (flow && canvasRef.current) {
            canvasRef.current.restoreFlow(flow);
            loadedTabIdRef.current = result.firstTab.id;
            syncTeleportersForTab(result.firstTab.id, result.firstTab.name, flow.nodes);
          }
          projectName = result.projectName;
        }

        setWorkflowName(projectName);
        setCurrentProjectPath(projectPath);
        setIsProjectSaved(true);
        setIsProjectSwitcherOpen(false);
        setShowHomeScreen(false);

        addRecentProject({
          path: projectPath,
          name: projectName,
          lastOpened: Date.now(),
        });
        setRecentProjects(getRecentProjects());
      } catch (error) {
        console.error("Error loading project:", error);
        alert("Failed to load project: " + (error as Error).message);
      }
    },
    [
      canvasRef,
      loadedTabIdRef,
      setCurrentProjectPath,
      setWorkflowName,
      setIsProjectSwitcherOpen,
      setShowHomeScreen,
      setIsProjectSaved,
      setRecentProjects,
      initializeTabs,
      createNewTab,
      loadTabFlow,
      syncTeleportersForTab,
    ]
  );

  return { handleLoadExistingProject };
}
