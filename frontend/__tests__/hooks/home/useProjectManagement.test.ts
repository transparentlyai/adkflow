import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useProjectManagement } from "@/hooks/home/useProjectManagement";
import type { Node } from "@xyflow/react";

/** Test node data type for file save state tests */
interface TestNodeData extends Record<string, unknown> {
  label?: string;
  fileSaveState?: {
    isDirty: boolean;
    filePath: string;
    content: string;
  };
}

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    loading: vi.fn().mockReturnValue("toast-id-123"),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

// Mock fileSave module
vi.mock("@/lib/fileSave", () => ({
  collectDirtyFiles: vi.fn(() => []),
  saveAllDirtyFiles: vi.fn(() =>
    Promise.resolve({
      totalFiles: 0,
      successCount: 0,
      errorCount: 0,
      results: [],
    }),
  ),
  clearDirtyStatesForNodes: vi.fn((nodes) => nodes),
}));

// Mock helper hooks
const mockHandleCreateNewProject = vi.fn();
const mockHandleLoadExistingProject = vi.fn();

vi.mock("@/hooks/home/helpers/useProjectCreate", () => ({
  useProjectCreate: () => ({
    handleCreateNewProject: mockHandleCreateNewProject,
  }),
}));

vi.mock("@/hooks/home/helpers/useProjectLoad", () => ({
  useProjectLoad: () => ({
    handleLoadExistingProject: mockHandleLoadExistingProject,
  }),
}));

// Mock recentProjects
vi.mock("@/lib/recentProjects", () => ({
  getRecentProjects: vi.fn(() => []),
  removeRecentProject: vi.fn(),
}));

import { getRecentProjects, removeRecentProject } from "@/lib/recentProjects";
import {
  collectDirtyFiles,
  saveAllDirtyFiles,
  clearDirtyStatesForNodes,
} from "@/lib/fileSave";
import { toast } from "sonner";

describe("useProjectManagement", () => {
  const mockCanvasRef = {
    current: {
      saveFlow: vi.fn(() => ({
        nodes: [] as Node[],
        edges: [] as Node[],
        viewport: { x: 0, y: 0, zoom: 1 },
      })),
      clearCanvas: vi.fn(),
      restoreFlow: vi.fn(),
    },
  };

  const mockLoadedTabIdRef = { current: "tab-1" };
  const mockTabFlowCacheRef = { current: new Map() };

  const mockSaveTabFlow = vi.fn();
  const mockSetIsSaving = vi.fn();
  const mockSetIsProjectSaved = vi.fn();
  const mockSetProjectSwitcherMode = vi.fn();
  const mockSetIsSaveConfirmOpen = vi.fn();
  const mockSetIsProjectSwitcherOpen = vi.fn();
  const mockSetRecentProjects = vi.fn();

  const defaultProps = {
    canvasRef: mockCanvasRef as any,
    loadedTabIdRef: mockLoadedTabIdRef as any,
    tabFlowCacheRef: mockTabFlowCacheRef as any,
    currentProjectPath: "/path/to/project",
    workflowName: "Test Workflow",
    activeTabId: "tab-1",
    hasUnsavedChanges: false,
    setCurrentProjectPath: vi.fn(),
    setWorkflowName: vi.fn(),
    setIsProjectSwitcherOpen: mockSetIsProjectSwitcherOpen,
    setShowHomeScreen: vi.fn(),
    setIsProjectSaved: mockSetIsProjectSaved,
    setRecentProjects: mockSetRecentProjects,
    setIsSaving: mockSetIsSaving,
    setIsSaveConfirmOpen: mockSetIsSaveConfirmOpen,
    setProjectSwitcherMode: mockSetProjectSwitcherMode,
    initializeTabs: vi.fn(),
    createNewTab: vi.fn(),
    loadTabFlow: vi.fn(),
    saveTabFlow: mockSaveTabFlow,
    syncTeleportersForTab: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockTabFlowCacheRef.current = new Map();
    mockSaveTabFlow.mockResolvedValue(true);
  });

  describe("delegated handlers", () => {
    it("should return handleCreateNewProject from useProjectCreate", () => {
      const { result } = renderHook(() => useProjectManagement(defaultProps));

      expect(result.current.handleCreateNewProject).toBe(
        mockHandleCreateNewProject,
      );
    });

    it("should return handleLoadExistingProject from useProjectLoad", () => {
      const { result } = renderHook(() => useProjectManagement(defaultProps));

      expect(result.current.handleLoadExistingProject).toBe(
        mockHandleLoadExistingProject,
      );
    });
  });

  describe("handleSaveCurrentProject", () => {
    it("should show error toast if no project path", async () => {
      const props = { ...defaultProps, currentProjectPath: null };

      const { result } = renderHook(() => useProjectManagement(props));

      await act(async () => {
        await result.current.handleSaveCurrentProject();
      });

      expect(vi.mocked(toast).error).toHaveBeenCalledWith("No project loaded", {
        description: "Please create or load a project first.",
      });
      expect(mockSetIsSaving).not.toHaveBeenCalled();
    });

    it("should show error toast if no active tab", async () => {
      const props = { ...defaultProps, activeTabId: null };

      const { result } = renderHook(() => useProjectManagement(props));

      await act(async () => {
        await result.current.handleSaveCurrentProject();
      });

      expect(vi.mocked(toast).error).toHaveBeenCalledWith("No project loaded", {
        description: "Please create or load a project first.",
      });
      expect(mockSetIsSaving).not.toHaveBeenCalled();
    });

    it("should show loading toast and set saving state during save", async () => {
      const { result } = renderHook(() => useProjectManagement(defaultProps));

      await act(async () => {
        await result.current.handleSaveCurrentProject();
      });

      expect(vi.mocked(toast).loading).toHaveBeenCalledWith(
        "Saving project...",
      );
      expect(mockSetIsSaving).toHaveBeenCalledWith(true);
      expect(mockSetIsSaving).toHaveBeenCalledWith(false);
    });

    it("should call saveTabFlow with flow data", async () => {
      const flow = { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } };
      mockCanvasRef.current.saveFlow.mockReturnValue(flow);

      const { result } = renderHook(() => useProjectManagement(defaultProps));

      await act(async () => {
        await result.current.handleSaveCurrentProject();
      });

      expect(mockSaveTabFlow).toHaveBeenCalledWith(
        "/path/to/project",
        "tab-1",
        flow,
        "Test Workflow",
      );
    });

    it("should set project saved and show success toast on success", async () => {
      mockSaveTabFlow.mockResolvedValue(true);

      const { result } = renderHook(() => useProjectManagement(defaultProps));

      await act(async () => {
        await result.current.handleSaveCurrentProject();
      });

      expect(mockSetIsProjectSaved).toHaveBeenCalledWith(true);
      expect(vi.mocked(toast).success).toHaveBeenCalledWith("Project saved", {
        id: "toast-id-123",
      });
    });

    it("should clear tab flow cache on success", async () => {
      mockTabFlowCacheRef.current.set("tab-1", {
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      });
      mockSaveTabFlow.mockResolvedValue(true);

      const { result } = renderHook(() => useProjectManagement(defaultProps));

      await act(async () => {
        await result.current.handleSaveCurrentProject();
      });

      expect(mockTabFlowCacheRef.current.has("tab-1")).toBe(false);
    });

    it("should show error toast on save failure", async () => {
      mockSaveTabFlow.mockResolvedValue(false);

      const { result } = renderHook(() => useProjectManagement(defaultProps));

      await act(async () => {
        await result.current.handleSaveCurrentProject();
      });

      expect(vi.mocked(toast).error).toHaveBeenCalledWith(
        "Failed to save project",
        {
          id: "toast-id-123",
          description: "Could not save workflow structure.",
        },
      );
      expect(mockSetIsSaving).toHaveBeenCalledWith(false);
    });

    it("should show error toast if no flow data from canvas", async () => {
      mockCanvasRef.current.saveFlow.mockReturnValue(
        null as unknown as ReturnType<typeof mockCanvasRef.current.saveFlow>,
      );

      const { result } = renderHook(() => useProjectManagement(defaultProps));

      await act(async () => {
        await result.current.handleSaveCurrentProject();
      });

      expect(vi.mocked(toast).error).toHaveBeenCalledWith(
        "Failed to save project",
        {
          id: "toast-id-123",
          description: "No flow data to save.",
        },
      );
      expect(mockSetIsSaving).toHaveBeenCalledWith(false);
    });

    it("should handle save error", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const flow = { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } };
      mockCanvasRef.current.saveFlow.mockReturnValue(flow);
      mockSaveTabFlow.mockRejectedValue(new Error("Save failed"));

      const { result } = renderHook(() => useProjectManagement(defaultProps));

      await act(async () => {
        await result.current.handleSaveCurrentProject();
      });

      expect(vi.mocked(toast).error).toHaveBeenCalledWith(
        "Failed to save project",
        {
          id: "toast-id-123",
          description: "Save failed",
        },
      );
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should save project with dirty files successfully", async () => {
      const dirtyNodes: Node<TestNodeData>[] = [
        {
          id: "node-1",
          type: "custom",
          position: { x: 0, y: 0 },
          data: {
            fileSaveState: {
              isDirty: true,
              filePath: "prompts/test.txt",
              content: "test content",
            },
          },
        },
        {
          id: "node-2",
          type: "custom",
          position: { x: 100, y: 100 },
          data: {
            fileSaveState: {
              isDirty: true,
              filePath: "prompts/test2.txt",
              content: "test content 2",
            },
          },
        },
      ];

      const flow = {
        nodes: dirtyNodes as Node[],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      };
      mockCanvasRef.current.saveFlow.mockReturnValue(flow);

      const dirtyFiles = [
        {
          nodeId: "node-1",
          filePath: "prompts/test.txt",
          content: "test content",
        },
        {
          nodeId: "node-2",
          filePath: "prompts/test2.txt",
          content: "test content 2",
        },
      ];

      vi.mocked(collectDirtyFiles).mockReturnValue(dirtyFiles);
      vi.mocked(saveAllDirtyFiles).mockResolvedValue({
        totalFiles: 2,
        successCount: 2,
        errorCount: 0,
        results: [
          { nodeId: "node-1", filePath: "prompts/test.txt", success: true },
          { nodeId: "node-2", filePath: "prompts/test2.txt", success: true },
        ],
      });

      const clearedNodes: Node<TestNodeData>[] = dirtyNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          fileSaveState: {
            ...node.data.fileSaveState!,
            isDirty: false,
          },
        },
      }));

      vi.mocked(clearDirtyStatesForNodes).mockReturnValue(
        clearedNodes as Node[],
      );

      const { result } = renderHook(() => useProjectManagement(defaultProps));

      await act(async () => {
        await result.current.handleSaveCurrentProject();
      });

      expect(collectDirtyFiles).toHaveBeenCalledWith(dirtyNodes as Node[]);
      expect(saveAllDirtyFiles).toHaveBeenCalledWith(
        "/path/to/project",
        dirtyFiles,
      );
      expect(clearDirtyStatesForNodes).toHaveBeenCalledWith(
        dirtyNodes as Node[],
        new Set(["node-1", "node-2"]),
      );
      expect(mockCanvasRef.current.restoreFlow).toHaveBeenCalledWith({
        ...flow,
        nodes: clearedNodes,
      });
      expect(vi.mocked(toast).success).toHaveBeenCalledWith(
        "Project saved (2 files)",
        {
          id: "toast-id-123",
        },
      );
    });

    it("should handle partial file save failure", async () => {
      const dirtyNodes: Node<TestNodeData>[] = [
        {
          id: "node-1",
          type: "custom",
          position: { x: 0, y: 0 },
          data: {
            fileSaveState: {
              isDirty: true,
              filePath: "prompts/test.txt",
              content: "test content",
            },
          },
        },
        {
          id: "node-2",
          type: "custom",
          position: { x: 100, y: 100 },
          data: {
            fileSaveState: {
              isDirty: true,
              filePath: "prompts/test2.txt",
              content: "test content 2",
            },
          },
        },
      ];

      const flow = {
        nodes: dirtyNodes as Node[],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      };
      mockCanvasRef.current.saveFlow.mockReturnValue(flow);

      const dirtyFiles = [
        {
          nodeId: "node-1",
          filePath: "prompts/test.txt",
          content: "test content",
        },
        {
          nodeId: "node-2",
          filePath: "prompts/test2.txt",
          content: "test content 2",
        },
      ];

      vi.mocked(collectDirtyFiles).mockReturnValue(dirtyFiles);
      vi.mocked(saveAllDirtyFiles).mockResolvedValue({
        totalFiles: 2,
        successCount: 1,
        errorCount: 1,
        results: [
          { nodeId: "node-1", filePath: "prompts/test.txt", success: true },
          {
            nodeId: "node-2",
            filePath: "prompts/test2.txt",
            success: false,
            error: "Permission denied",
          },
        ],
      });

      const partiallyCleared: Node<TestNodeData>[] = [
        {
          ...dirtyNodes[0],
          data: {
            ...dirtyNodes[0].data,
            fileSaveState: {
              ...dirtyNodes[0].data.fileSaveState!,
              isDirty: false,
            },
          },
        },
        dirtyNodes[1],
      ];

      vi.mocked(clearDirtyStatesForNodes).mockReturnValue(
        partiallyCleared as Node[],
      );

      const { result } = renderHook(() => useProjectManagement(defaultProps));

      await act(async () => {
        await result.current.handleSaveCurrentProject();
      });

      expect(clearDirtyStatesForNodes).toHaveBeenCalledWith(
        dirtyNodes as Node[],
        new Set(["node-1"]),
      );
      expect(mockCanvasRef.current.restoreFlow).toHaveBeenCalledWith({
        ...flow,
        nodes: partiallyCleared,
      });
      expect(vi.mocked(toast).warning).toHaveBeenCalledWith(
        "Project saved with errors",
        {
          id: "toast-id-123",
          description: "1 files saved, 1 failed",
        },
      );
    });

    it("should save project with no dirty files", async () => {
      const cleanNodes: Node<TestNodeData>[] = [
        {
          id: "node-1",
          type: "custom",
          position: { x: 0, y: 0 },
          data: { label: "Clean node" },
        },
      ];

      const flow = {
        nodes: cleanNodes as Node[],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      };
      mockCanvasRef.current.saveFlow.mockReturnValue(flow);

      vi.mocked(collectDirtyFiles).mockReturnValue([]);

      const { result } = renderHook(() => useProjectManagement(defaultProps));

      await act(async () => {
        await result.current.handleSaveCurrentProject();
      });

      expect(collectDirtyFiles).toHaveBeenCalledWith(cleanNodes as Node[]);
      expect(saveAllDirtyFiles).not.toHaveBeenCalled();
      expect(clearDirtyStatesForNodes).not.toHaveBeenCalled();
      expect(mockCanvasRef.current.restoreFlow).not.toHaveBeenCalled();
      expect(vi.mocked(toast).success).toHaveBeenCalledWith("Project saved", {
        id: "toast-id-123",
      });
    });
  });

  describe("handleNewProject", () => {
    it("should set project switcher mode to create", () => {
      const { result } = renderHook(() => useProjectManagement(defaultProps));

      act(() => {
        result.current.handleNewProject();
      });

      expect(mockSetProjectSwitcherMode).toHaveBeenCalledWith("create");
    });

    it("should open save confirm dialog if has unsaved changes", () => {
      const props = { ...defaultProps, hasUnsavedChanges: true };
      const { result } = renderHook(() => useProjectManagement(props));

      act(() => {
        result.current.handleNewProject();
      });

      expect(mockSetIsSaveConfirmOpen).toHaveBeenCalledWith(true);
      expect(mockSetIsProjectSwitcherOpen).not.toHaveBeenCalled();
    });

    it("should open project switcher directly if no unsaved changes", () => {
      const { result } = renderHook(() => useProjectManagement(defaultProps));

      act(() => {
        result.current.handleNewProject();
      });

      expect(mockSetIsProjectSwitcherOpen).toHaveBeenCalledWith(true);
      expect(mockSetIsSaveConfirmOpen).not.toHaveBeenCalled();
    });
  });

  describe("handleLoadProject", () => {
    it("should set project switcher mode to open", () => {
      const { result } = renderHook(() => useProjectManagement(defaultProps));

      act(() => {
        result.current.handleLoadProject();
      });

      expect(mockSetProjectSwitcherMode).toHaveBeenCalledWith("open");
    });

    it("should open save confirm dialog if has unsaved changes", () => {
      const props = { ...defaultProps, hasUnsavedChanges: true };
      const { result } = renderHook(() => useProjectManagement(props));

      act(() => {
        result.current.handleLoadProject();
      });

      expect(mockSetIsSaveConfirmOpen).toHaveBeenCalledWith(true);
      expect(mockSetIsProjectSwitcherOpen).not.toHaveBeenCalled();
    });

    it("should open project switcher directly if no unsaved changes", () => {
      const { result } = renderHook(() => useProjectManagement(defaultProps));

      act(() => {
        result.current.handleLoadProject();
      });

      expect(mockSetIsProjectSwitcherOpen).toHaveBeenCalledWith(true);
      expect(mockSetIsSaveConfirmOpen).not.toHaveBeenCalled();
    });
  });

  describe("handleSaveAndContinue", () => {
    it("should save project and then open switcher", async () => {
      // Ensure saveFlow returns valid data
      const flow = { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } };
      mockCanvasRef.current.saveFlow.mockReturnValue(flow);
      mockSaveTabFlow.mockResolvedValue(true);

      const { result } = renderHook(() => useProjectManagement(defaultProps));

      await act(async () => {
        await result.current.handleSaveAndContinue();
      });

      expect(mockSaveTabFlow).toHaveBeenCalled();
      expect(mockSetIsSaveConfirmOpen).toHaveBeenCalledWith(false);
      expect(mockSetIsProjectSwitcherOpen).toHaveBeenCalledWith(true);
    });
  });

  describe("handleDontSave", () => {
    it("should close save confirm and open project switcher", () => {
      const { result } = renderHook(() => useProjectManagement(defaultProps));

      act(() => {
        result.current.handleDontSave();
      });

      expect(mockSetIsSaveConfirmOpen).toHaveBeenCalledWith(false);
      expect(mockSetIsProjectSwitcherOpen).toHaveBeenCalledWith(true);
    });
  });

  describe("handleRemoveRecentProject", () => {
    it("should remove project and refresh recent projects", () => {
      vi.mocked(getRecentProjects).mockReturnValue([]);

      const { result } = renderHook(() => useProjectManagement(defaultProps));

      act(() => {
        result.current.handleRemoveRecentProject("/path/to/old-project");
      });

      expect(removeRecentProject).toHaveBeenCalledWith("/path/to/old-project");
      expect(mockSetRecentProjects).toHaveBeenCalledWith([]);
    });
  });

  describe("handleCancelNewProject", () => {
    it("should close save confirm dialog", () => {
      const { result } = renderHook(() => useProjectManagement(defaultProps));

      act(() => {
        result.current.handleCancelNewProject();
      });

      expect(mockSetIsSaveConfirmOpen).toHaveBeenCalledWith(false);
    });
  });

  describe("return values", () => {
    it("should return all expected handlers", () => {
      const { result } = renderHook(() => useProjectManagement(defaultProps));

      expect(result.current).toHaveProperty("handleCreateNewProject");
      expect(result.current).toHaveProperty("handleLoadExistingProject");
      expect(result.current).toHaveProperty("handleSaveCurrentProject");
      expect(result.current).toHaveProperty("handleNewProject");
      expect(result.current).toHaveProperty("handleLoadProject");
      expect(result.current).toHaveProperty("handleSaveAndContinue");
      expect(result.current).toHaveProperty("handleDontSave");
      expect(result.current).toHaveProperty("handleRemoveRecentProject");
      expect(result.current).toHaveProperty("handleCancelNewProject");
    });
  });
});
