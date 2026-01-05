import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useProjectCreate } from "@/hooks/home/helpers/useProjectCreate";

vi.mock("@/lib/recentProjects", () => ({
  getRecentProjects: vi.fn(() => []),
  addRecentProject: vi.fn(),
}));

import { getRecentProjects, addRecentProject } from "@/lib/recentProjects";

describe("useProjectCreate", () => {
  const mockCanvasRef = {
    current: {
      restoreFlow: vi.fn(),
      addBuiltinSchemaNode: vi.fn(),
    },
  };

  const mockLoadedTabIdRef = { current: null as string | null };
  const mockSetCurrentProjectPath = vi.fn();
  const mockSetWorkflowName = vi.fn();
  const mockSetIsProjectSwitcherOpen = vi.fn();
  const mockSetShowHomeScreen = vi.fn();
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
      projectName: "Test Project",
      firstTab: { id: "tab1", name: "Flow 1" },
    });
    mockCreateNewTab.mockResolvedValue({ id: "new-tab", name: "Flow 1" });
    mockLoadTabFlow.mockResolvedValue({
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    });
    (getRecentProjects as any).mockReturnValue([]);
  });

  describe("handleCreateNewProject", () => {
    it("should set project state and initialize tabs", async () => {
      const { result } = renderHook(() => useProjectCreate(defaultProps));

      await act(async () => {
        await result.current.handleCreateNewProject(
          "/path/to/project",
          "My Project",
        );
      });

      expect(mockSetCurrentProjectPath).toHaveBeenCalledWith(
        "/path/to/project",
      );
      expect(mockSetWorkflowName).toHaveBeenCalledWith("My Project");
      expect(mockSetIsProjectSwitcherOpen).toHaveBeenCalledWith(false);
      expect(mockSetShowHomeScreen).toHaveBeenCalledWith(false);
      expect(mockInitializeTabs).toHaveBeenCalledWith("/path/to/project");
    });

    it("should use 'Untitled Workflow' when project name is not provided", async () => {
      const { result } = renderHook(() => useProjectCreate(defaultProps));

      await act(async () => {
        await result.current.handleCreateNewProject("/path/to/project");
      });

      expect(mockSetWorkflowName).toHaveBeenCalledWith("Untitled Workflow");
    });

    it("should create new tab if no first tab exists", async () => {
      mockInitializeTabs.mockResolvedValue({
        projectName: "Test",
        firstTab: null,
      });

      const { result } = renderHook(() => useProjectCreate(defaultProps));

      await act(async () => {
        await result.current.handleCreateNewProject("/path/to/project");
      });

      expect(mockCreateNewTab).toHaveBeenCalledWith(
        "/path/to/project",
        "Flow 1",
      );
    });

    it("should load flow for first tab", async () => {
      const { result } = renderHook(() => useProjectCreate(defaultProps));

      await act(async () => {
        await result.current.handleCreateNewProject("/path/to/project");
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

      const { result } = renderHook(() => useProjectCreate(defaultProps));

      await act(async () => {
        await result.current.handleCreateNewProject("/path/to/project");
      });

      expect(mockCanvasRef.current.restoreFlow).toHaveBeenCalledWith(mockFlow);
    });

    it("should add start node when flow is empty", async () => {
      const mockFlow = {
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      };
      mockLoadTabFlow.mockResolvedValue(mockFlow);

      const { result } = renderHook(() => useProjectCreate(defaultProps));

      await act(async () => {
        await result.current.handleCreateNewProject("/path/to/project");
      });

      expect(mockCanvasRef.current.addBuiltinSchemaNode).toHaveBeenCalledWith(
        "start",
        {
          x: 100,
          y: 200,
        },
      );
    });

    it("should not add start node when flow has nodes", async () => {
      const mockFlow = {
        nodes: [{ id: "existing" }],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      };
      mockLoadTabFlow.mockResolvedValue(mockFlow);

      const { result } = renderHook(() => useProjectCreate(defaultProps));

      await act(async () => {
        await result.current.handleCreateNewProject("/path/to/project");
      });

      expect(mockCanvasRef.current.addBuiltinSchemaNode).not.toHaveBeenCalled();
    });

    it("should update loadedTabIdRef", async () => {
      const { result } = renderHook(() => useProjectCreate(defaultProps));

      await act(async () => {
        await result.current.handleCreateNewProject("/path/to/project");
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

      const { result } = renderHook(() => useProjectCreate(defaultProps));

      await act(async () => {
        await result.current.handleCreateNewProject("/path/to/project");
      });

      expect(mockSyncTeleportersForTab).toHaveBeenCalledWith(
        "tab1",
        "Flow 1",
        mockFlow.nodes,
      );
    });

    it("should add to recent projects", async () => {
      const { result } = renderHook(() => useProjectCreate(defaultProps));

      await act(async () => {
        await result.current.handleCreateNewProject(
          "/path/to/project",
          "My Project",
        );
      });

      expect(addRecentProject).toHaveBeenCalledWith(
        expect.objectContaining({
          path: "/path/to/project",
          name: "My Project",
        }),
      );
      expect(mockSetRecentProjects).toHaveBeenCalled();
    });

    it("should handle null canvas ref", async () => {
      const propsWithNullCanvas = {
        ...defaultProps,
        canvasRef: { current: null },
      };

      const { result } = renderHook(() =>
        useProjectCreate(propsWithNullCanvas),
      );

      // Should not throw
      await act(async () => {
        await result.current.handleCreateNewProject("/path/to/project");
      });

      expect(mockSetCurrentProjectPath).toHaveBeenCalled();
    });

    it("should handle initialization error", async () => {
      mockInitializeTabs.mockRejectedValue(new Error("Init failed"));
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const { result } = renderHook(() => useProjectCreate(defaultProps));

      await act(async () => {
        await result.current.handleCreateNewProject("/path/to/project");
      });

      expect(consoleSpy).toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to create project"),
      );

      alertSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  describe("return value", () => {
    it("should return handleCreateNewProject function", () => {
      const { result } = renderHook(() => useProjectCreate(defaultProps));

      expect(typeof result.current.handleCreateNewProject).toBe("function");
    });
  });
});
