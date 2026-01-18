import { useCallback } from "react";
import type { Node, Edge } from "@xyflow/react";
import { toast } from "sonner";
import type { ReactFlowCanvasRef } from "@/components/ReactFlowCanvas";
import type { RecentProject } from "@/lib/recentProjects";
import { getRecentProjects, removeRecentProject } from "@/lib/recentProjects";
import {
  collectDirtyFiles,
  saveAllDirtyFiles,
  clearDirtyStatesForNodes,
} from "@/lib/fileSave";
import { useProjectCreate } from "./helpers/useProjectCreate";
import { useProjectLoad } from "./helpers/useProjectLoad";

interface UseProjectManagementProps {
  canvasRef: React.RefObject<ReactFlowCanvasRef | null>;
  loadedTabIdRef: React.MutableRefObject<string | null>;
  tabFlowCacheRef: React.MutableRefObject<
    Map<
      string,
      {
        nodes: Node[];
        edges: Edge[];
        viewport: { x: number; y: number; zoom: number };
      }
    >
  >;
  currentProjectPath: string | null;
  workflowName: string;
  activeTabId: string | null;
  hasUnsavedChanges: boolean;
  setCurrentProjectPath: (path: string | null) => void;
  setWorkflowName: (name: string) => void;
  setIsProjectSwitcherOpen: (open: boolean) => void;
  setShowHomeScreen: (show: boolean) => void;
  setIsProjectSaved: (saved: boolean) => void;
  setRecentProjects: (projects: RecentProject[]) => void;
  setIsSaving: (saving: boolean) => void;
  setIsSaveConfirmOpen: (open: boolean) => void;
  setProjectSwitcherMode: (mode: "create" | "open") => void;
  initializeTabs: (projectPath: string) => Promise<{
    projectName: string;
    firstTab: { id: string; name: string } | null;
  } | null>;
  createNewTab: (
    projectPath: string,
    name: string,
  ) => Promise<{ id: string; name: string } | null>;
  loadTabFlow: (
    projectPath: string,
    tabId: string,
  ) => Promise<{
    nodes: Node[];
    edges: Edge[];
    viewport: { x: number; y: number; zoom: number };
  } | null>;
  saveTabFlow: (
    projectPath: string,
    tabId: string,
    flow: {
      nodes: Node[];
      edges: Edge[];
      viewport: { x: number; y: number; zoom: number };
    },
    projectName?: string,
  ) => Promise<boolean>;
  syncTeleportersForTab: (
    tabId: string,
    tabName: string,
    nodes: Node[],
  ) => void;
}

export function useProjectManagement({
  canvasRef,
  loadedTabIdRef,
  tabFlowCacheRef,
  currentProjectPath,
  workflowName,
  activeTabId,
  hasUnsavedChanges,
  setCurrentProjectPath,
  setWorkflowName,
  setIsProjectSwitcherOpen,
  setShowHomeScreen,
  setIsProjectSaved,
  setRecentProjects,
  setIsSaving,
  setIsSaveConfirmOpen,
  setProjectSwitcherMode,
  initializeTabs,
  createNewTab,
  loadTabFlow,
  saveTabFlow,
  syncTeleportersForTab,
}: UseProjectManagementProps) {
  const { handleCreateNewProject } = useProjectCreate({
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
  });

  const { handleLoadExistingProject } = useProjectLoad({
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
  });

  const handleSaveCurrentProject = useCallback(async () => {
    if (!currentProjectPath || !activeTabId) {
      toast.error("No project loaded", {
        description: "Please create or load a project first.",
      });
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading("Saving project...");

    try {
      const flow = canvasRef.current?.saveFlow();
      if (!flow) {
        toast.error("Failed to save project", {
          id: toastId,
          description: "No flow data to save.",
        });
        return;
      }

      // Collect and save dirty files
      const dirtyFiles = collectDirtyFiles(flow.nodes);
      let fileSaveResult = {
        successCount: 0,
        errorCount: 0,
        totalFiles: 0,
        results: [] as { nodeId: string; success: boolean }[],
      };
      let successfulNodeIds = new Set<string>();

      if (dirtyFiles.length > 0) {
        fileSaveResult = await saveAllDirtyFiles(
          currentProjectPath,
          dirtyFiles,
        );
        successfulNodeIds = new Set(
          fileSaveResult.results.filter((r) => r.success).map((r) => r.nodeId),
        );

        // Clear dirty states for successfully saved files
        if (successfulNodeIds.size > 0) {
          const updatedNodes = clearDirtyStatesForNodes(
            flow.nodes,
            successfulNodeIds,
          );
          // Update the canvas with cleared dirty states
          canvasRef.current?.restoreFlow({
            ...flow,
            nodes: updatedNodes,
          });
          // Update flow for saving
          flow.nodes = updatedNodes;
        }
      }

      // Save the flow structure
      const success = await saveTabFlow(
        currentProjectPath,
        activeTabId,
        flow,
        workflowName,
      );

      if (success) {
        setIsProjectSaved(true);
        tabFlowCacheRef.current.delete(activeTabId);

        // Show success toast with file count
        if (fileSaveResult.errorCount > 0) {
          toast.warning("Project saved with errors", {
            id: toastId,
            description: `${fileSaveResult.successCount} files saved, ${fileSaveResult.errorCount} failed`,
          });
        } else if (fileSaveResult.successCount > 0) {
          toast.success(
            `Project saved (${fileSaveResult.successCount} files)`,
            {
              id: toastId,
            },
          );
        } else {
          toast.success("Project saved", { id: toastId });
        }
      } else {
        toast.error("Failed to save project", {
          id: toastId,
          description: "Could not save workflow structure.",
        });
      }
    } catch (error) {
      console.error("Error saving project:", error);
      toast.error("Failed to save project", {
        id: toastId,
        description: (error as Error).message,
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    currentProjectPath,
    activeTabId,
    workflowName,
    canvasRef,
    tabFlowCacheRef,
    setIsSaving,
    setIsProjectSaved,
    saveTabFlow,
  ]);

  const handleNewProject = useCallback(() => {
    setProjectSwitcherMode("create");
    if (hasUnsavedChanges) {
      setIsSaveConfirmOpen(true);
    } else {
      setIsProjectSwitcherOpen(true);
    }
  }, [
    hasUnsavedChanges,
    setProjectSwitcherMode,
    setIsSaveConfirmOpen,
    setIsProjectSwitcherOpen,
  ]);

  const handleLoadProject = useCallback(() => {
    setProjectSwitcherMode("open");
    if (hasUnsavedChanges) {
      setIsSaveConfirmOpen(true);
    } else {
      setIsProjectSwitcherOpen(true);
    }
  }, [
    hasUnsavedChanges,
    setProjectSwitcherMode,
    setIsSaveConfirmOpen,
    setIsProjectSwitcherOpen,
  ]);

  const handleSaveAndContinue = useCallback(async () => {
    await handleSaveCurrentProject();
    setIsSaveConfirmOpen(false);
    setIsProjectSwitcherOpen(true);
  }, [
    handleSaveCurrentProject,
    setIsSaveConfirmOpen,
    setIsProjectSwitcherOpen,
  ]);

  const handleDontSave = useCallback(() => {
    setIsSaveConfirmOpen(false);
    setIsProjectSwitcherOpen(true);
  }, [setIsSaveConfirmOpen, setIsProjectSwitcherOpen]);

  const handleRemoveRecentProject = useCallback(
    (path: string) => {
      removeRecentProject(path);
      setRecentProjects(getRecentProjects());
    },
    [setRecentProjects],
  );

  const handleCancelNewProject = useCallback(() => {
    setIsSaveConfirmOpen(false);
  }, [setIsSaveConfirmOpen]);

  return {
    handleCreateNewProject,
    handleLoadExistingProject,
    handleSaveCurrentProject,
    handleNewProject,
    handleLoadProject,
    handleSaveAndContinue,
    handleDontSave,
    handleRemoveRecentProject,
    handleCancelNewProject,
  };
}
