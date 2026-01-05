import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useProjectManagement } from "@/hooks/home/useProjectManagement";

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

describe("useProjectManagement", () => {
  const mockCanvasRef = {
    current: {
      saveFlow: vi.fn(() => ({
        nodes: [],
        edges: [],
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
    it("should alert if no project path", async () => {
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
      const props = { ...defaultProps, currentProjectPath: null };

      const { result } = renderHook(() => useProjectManagement(props));

      await act(async () => {
        await result.current.handleSaveCurrentProject();
      });

      expect(alertSpy).toHaveBeenCalledWith(
        "No project or tab loaded. Please create or load a project first.",
      );
      alertSpy.mockRestore();
    });

    it("should alert if no active tab", async () => {
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
      const props = { ...defaultProps, activeTabId: null };

      const { result } = renderHook(() => useProjectManagement(props));

      await act(async () => {
        await result.current.handleSaveCurrentProject();
      });

      expect(alertSpy).toHaveBeenCalledWith(
        "No project or tab loaded. Please create or load a project first.",
      );
      alertSpy.mockRestore();
    });

    it("should set saving state during save", async () => {
      const { result } = renderHook(() => useProjectManagement(defaultProps));

      await act(async () => {
        await result.current.handleSaveCurrentProject();
      });

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

    it("should set project saved on success", async () => {
      mockSaveTabFlow.mockResolvedValue(true);

      const { result } = renderHook(() => useProjectManagement(defaultProps));

      await act(async () => {
        await result.current.handleSaveCurrentProject();
      });

      expect(mockSetIsProjectSaved).toHaveBeenCalledWith(true);
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

    it("should alert on save failure", async () => {
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
      mockSaveTabFlow.mockResolvedValue(false);

      const { result } = renderHook(() => useProjectManagement(defaultProps));

      await act(async () => {
        await result.current.handleSaveCurrentProject();
      });

      expect(alertSpy).toHaveBeenCalledWith("Failed to save tab.");
      alertSpy.mockRestore();
    });

    it("should alert if no flow data from canvas", async () => {
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
      mockCanvasRef.current.saveFlow.mockReturnValue(null);

      const { result } = renderHook(() => useProjectManagement(defaultProps));

      await act(async () => {
        await result.current.handleSaveCurrentProject();
      });

      expect(alertSpy).toHaveBeenCalledWith("No flow data to save.");
      alertSpy.mockRestore();
    });

    it("should handle save error", async () => {
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      // Ensure saveFlow returns valid data so the error happens during saveTabFlow
      const flow = { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } };
      mockCanvasRef.current.saveFlow.mockReturnValue(flow);
      mockSaveTabFlow.mockRejectedValue(new Error("Save failed"));

      const { result } = renderHook(() => useProjectManagement(defaultProps));

      await act(async () => {
        await result.current.handleSaveCurrentProject();
      });

      expect(alertSpy).toHaveBeenCalledWith(
        "Failed to save project: Save failed",
      );
      expect(consoleSpy).toHaveBeenCalled();
      alertSpy.mockRestore();
      consoleSpy.mockRestore();
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
