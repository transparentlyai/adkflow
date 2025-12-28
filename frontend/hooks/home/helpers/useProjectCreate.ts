import { useCallback } from "react";
import type { Node, Edge } from "@xyflow/react";
import type { ReactFlowCanvasRef } from "@/components/ReactFlowCanvas";
import type { RecentProject } from "@/lib/recentProjects";
import { getRecentProjects, addRecentProject } from "@/lib/recentProjects";

interface UseProjectCreateProps {
  canvasRef: React.RefObject<ReactFlowCanvasRef | null>;
  loadedTabIdRef: React.MutableRefObject<string | null>;
  setCurrentProjectPath: (path: string | null) => void;
  setWorkflowName: (name: string) => void;
  setIsProjectSwitcherOpen: (open: boolean) => void;
  setShowHomeScreen: (show: boolean) => void;
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

export function useProjectCreate({
  canvasRef,
  loadedTabIdRef,
  setCurrentProjectPath,
  setWorkflowName,
  setIsProjectSwitcherOpen,
  setShowHomeScreen,
  setRecentProjects,
  initializeTabs,
  createNewTab,
  loadTabFlow,
  syncTeleportersForTab,
}: UseProjectCreateProps) {
  const handleCreateNewProject = useCallback(
    async (projectPath: string, projectName?: string) => {
      try {
        const name = projectName || "Untitled Workflow";
        setCurrentProjectPath(projectPath);
        setWorkflowName(name);
        setIsProjectSwitcherOpen(false);
        setShowHomeScreen(false);

        const result = await initializeTabs(projectPath);
        let tabToLoad: { id: string; name: string } | null = null;

        if (!result || !result.firstTab) {
          const newTab = await createNewTab(projectPath, "Flow 1");
          if (newTab) {
            tabToLoad = newTab;
          }
        } else {
          tabToLoad = result.firstTab;
        }

        if (tabToLoad && canvasRef.current) {
          const flow = await loadTabFlow(projectPath, tabToLoad.id);
          if (flow) {
            canvasRef.current.restoreFlow(flow);
            if (flow.nodes.length === 0) {
              canvasRef.current.addBuiltinSchemaNode("start", { x: 100, y: 200 });
            }
            loadedTabIdRef.current = tabToLoad.id;
            syncTeleportersForTab(tabToLoad.id, tabToLoad.name, flow.nodes);
          }
        }

        addRecentProject({
          path: projectPath,
          name: name,
          lastOpened: Date.now(),
        });
        setRecentProjects(getRecentProjects());
      } catch (error) {
        console.error("Error creating project:", error);
        alert("Failed to create project: " + (error as Error).message);
      }
    },
    [
      canvasRef,
      loadedTabIdRef,
      setCurrentProjectPath,
      setWorkflowName,
      setIsProjectSwitcherOpen,
      setShowHomeScreen,
      setRecentProjects,
      initializeTabs,
      createNewTab,
      loadTabFlow,
      syncTeleportersForTab,
    ]
  );

  return { handleCreateNewProject };
}
