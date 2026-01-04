import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useProjectLoad } from "@/hooks/home/helpers/useProjectLoad";

vi.mock("@/lib/recentProjects", () => ({
  getRecentProjects: vi.fn(() => []),
  addRecentProject: vi.fn(),
}));

import { getRecentProjects, addRecentProject } from "@/lib/recentProjects";

describe("useProjectLoad", () => {
  const mockCanvasRef = {
    current: {
      restoreFlow: vi.fn(),
    },
  };

  const mockLoadedTabIdRef = { current: null as string | null };
  const mockSetCurrentProjectPath = vi.fn();
  const mockSetWorkflowName = vi.fn();
  const mockSetIsProjectSwitcherOpen = vi.fn();
  const mockSetShowHomeScreen = vi.fn();
  const mockSetIsProjectSaved = vi.fn();
  const mockSetRecentProjects = vi.fn();
  const mockInitializeTabs = vi.fn();
  const mockCreateNewTab = vi.fn();
  const mockLoadTabFlow = vi.fn();
  const mockSyncTeleportersForTab = vi.fn();

  const defaultProps = {
    canvasRef: mockCanvasRef as any,
    loadedTabIdRef: mockLoadedTabIdRef,
    setCurrentProjectPath: mockSetCurrentProjectPath,
    setWorkflowName: mockSetWorkflowName,
    setIsProjectSwitcherOpen: mockSetIsProjectSwitcherOpen,
    setShowHomeScreen: mockSetShowHomeScreen,
    setIsProjectSaved: mockSetIsProjectSaved,
    setRecentProjects: mockSetRecentProjects,
    initializeTabs: mockInitializeTabs,
    createNewTab: mockCreateNewTab,
    loadTabFlow: mockLoadTabFlow,
    syncTeleportersForTab: mockSyncTeleportersForTab,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadedTabIdRef.current = null;
    mockInitializeTabs.mockResolvedValue({
      projectName: "Existing Project",
      firstTab: { id: "tab1", name: "Flow 1" },
    });
    mockCreateNewTab.mockResolvedValue({ id: "new-tab", name: "Flow 1" });
    mockLoadTabFlow.mockResolvedValue({
      nodes: [{ id: "node1" }],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    });
    (getRecentProjects as any).mockReturnValue([]);
  });

  describe("handleLoadExistingProject", () => {
    it("should initialize tabs for the project", async () => {
      const { result } = renderHook(() => useProjectLoad(defaultProps));

      await act(async () => {
        await result.current.handleLoadExistingProject("/path/to/project");
      });

      expect(mockInitializeTabs).toHaveBeenCalledWith("/path/to/project");
    });

    it("should load flow for first tab", async () => {
      const { result } = renderHook(() => useProjectLoad(defaultProps));

      await act(async () => {
        await result.current.handleLoadExistingProject("/path/to/project");
      });

      expect(mockLoadTabFlow).toHaveBeenCalledWith("/path/to/project", "tab1");
    });

    it("should restore flow on canvas", async () => {
      const mockFlow = {
        nodes: [{ id: "node1" }],
        edges: [],
        viewport: { x: 100, y: 200, zoom: 1.5 },
      };
      mockLoadTabFlow.mockResolvedValue(mockFlow);

      const { result } = renderHook(() => useProjectLoad(defaultProps));

      await act(async () => {
        await result.current.handleLoadExistingProject("/path/to/project");
      });

      expect(mockCanvasRef.current.restoreFlow).toHaveBeenCalledWith(mockFlow);
    });

    it("should update loadedTabIdRef", async () => {
      const { result } = renderHook(() => useProjectLoad(defaultProps));

      await act(async () => {
        await result.current.handleLoadExistingProject("/path/to/project");
      });

      expect(mockLoadedTabIdRef.current).toBe("tab1");
    });

    it("should sync teleporters for the tab", async () => {
      const mockFlow = {
        nodes: [{ id: "node1" }],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      };
      mockLoadTabFlow.mockResolvedValue(mockFlow);

      const { result } = renderHook(() => useProjectLoad(defaultProps));

      await act(async () => {
        await result.current.handleLoadExistingProject("/path/to/project");
      });

      expect(mockSyncTeleportersForTab).toHaveBeenCalledWith(
        "tab1",
        "Flow 1",
        mockFlow.nodes,
      );
    });

    it("should set workflow name from project", async () => {
      const { result } = renderHook(() => useProjectLoad(defaultProps));

      await act(async () => {
        await result.current.handleLoadExistingProject("/path/to/project");
      });

      expect(mockSetWorkflowName).toHaveBeenCalledWith("Existing Project");
    });

    it("should set project state", async () => {
      const { result } = renderHook(() => useProjectLoad(defaultProps));

      await act(async () => {
        await result.current.handleLoadExistingProject("/path/to/project");
      });

      expect(mockSetCurrentProjectPath).toHaveBeenCalledWith(
        "/path/to/project",
      );
      expect(mockSetIsProjectSaved).toHaveBeenCalledWith(true);
      expect(mockSetIsProjectSwitcherOpen).toHaveBeenCalledWith(false);
      expect(mockSetShowHomeScreen).toHaveBeenCalledWith(false);
    });

    it("should create new tab when no tabs exist", async () => {
      mockInitializeTabs.mockResolvedValue({
        projectName: "Test",
        firstTab: null,
      });
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

      const { result } = renderHook(() => useProjectLoad(defaultProps));

      await act(async () => {
        await result.current.handleLoadExistingProject("/path/to/project");
      });

      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining("No tabs found"),
      );
      expect(mockCreateNewTab).toHaveBeenCalledWith(
        "/path/to/project",
        "Flow 1",
      );

      alertSpy.mockRestore();
    });

    it("should add to recent projects", async () => {
      const { result } = renderHook(() => useProjectLoad(defaultProps));

      await act(async () => {
        await result.current.handleLoadExistingProject("/path/to/project");
      });

      expect(addRecentProject).toHaveBeenCalledWith(
        expect.objectContaining({
          path: "/path/to/project",
          name: "Existing Project",
        }),
      );
      expect(mockSetRecentProjects).toHaveBeenCalled();
    });

    it("should handle null canvas ref", async () => {
      const propsWithNullCanvas = {
        ...defaultProps,
        canvasRef: { current: null },
      };

      const { result } = renderHook(() => useProjectLoad(propsWithNullCanvas));

      // Should not throw
      await act(async () => {
        await result.current.handleLoadExistingProject("/path/to/project");
      });

      expect(mockSetCurrentProjectPath).toHaveBeenCalled();
    });

    it("should handle load error", async () => {
      mockInitializeTabs.mockRejectedValue(new Error("Load failed"));
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const { result } = renderHook(() => useProjectLoad(defaultProps));

      await act(async () => {
        await result.current.handleLoadExistingProject("/path/to/project");
      });

      expect(consoleSpy).toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to load project"),
      );

      alertSpy.mockRestore();
      consoleSpy.mockRestore();
    });

    it("should handle null result from initializeTabs", async () => {
      mockInitializeTabs.mockResolvedValue(null);
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

      const { result } = renderHook(() => useProjectLoad(defaultProps));

      await act(async () => {
        await result.current.handleLoadExistingProject("/path/to/project");
      });

      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining("No tabs found"),
      );
      expect(mockCreateNewTab).toHaveBeenCalled();

      alertSpy.mockRestore();
    });
  });

  describe("return value", () => {
    it("should return handleLoadExistingProject function", () => {
      const { result } = renderHook(() => useProjectLoad(defaultProps));

      expect(typeof result.current.handleLoadExistingProject).toBe("function");
    });
  });
});
