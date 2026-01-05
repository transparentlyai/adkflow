import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useSessionManagement } from "@/hooks/home/useSessionManagement";

// Mock sessionStorage
vi.mock("@/lib/sessionStorage", () => ({
  loadSession: vi.fn(),
  saveSession: vi.fn(),
}));

// Mock recentProjects
vi.mock("@/lib/recentProjects", () => ({
  getRecentProjects: vi.fn(() => []),
  addRecentProject: vi.fn(),
}));

import { loadSession, saveSession } from "@/lib/sessionStorage";
import { getRecentProjects, addRecentProject } from "@/lib/recentProjects";

describe("useSessionManagement", () => {
  const mockCanvasRef = {
    current: {
      restoreFlow: vi.fn(),
    },
  };

  const mockLoadedTabIdRef = { current: null as string | null };

  const mockSetCurrentProjectPath = vi.fn();
  const mockSetWorkflowName = vi.fn();
  const mockSetIsProjectSaved = vi.fn();
  const mockSetShowHomeScreen = vi.fn();
  const mockSetRecentProjects = vi.fn();
  const mockSetIsSessionLoaded = vi.fn();
  const mockInitializeTabs = vi.fn();
  const mockLoadTabFlow = vi.fn();
  const mockSyncTeleportersForTab = vi.fn();

  const defaultProps = {
    canvasRef: mockCanvasRef as any,
    loadedTabIdRef: mockLoadedTabIdRef as any,
    isSessionLoaded: false,
    currentProjectPath: null,
    workflowName: "Untitled Workflow",
    hasUnsavedChanges: false,
    setCurrentProjectPath: mockSetCurrentProjectPath,
    setWorkflowName: mockSetWorkflowName,
    setIsProjectSaved: mockSetIsProjectSaved,
    setShowHomeScreen: mockSetShowHomeScreen,
    setRecentProjects: mockSetRecentProjects,
    setIsSessionLoaded: mockSetIsSessionLoaded,
    initializeTabs: mockInitializeTabs,
    loadTabFlow: mockLoadTabFlow,
    syncTeleportersForTab: mockSyncTeleportersForTab,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadedTabIdRef.current = null;
    vi.mocked(getRecentProjects).mockReturnValue([]);
    vi.mocked(loadSession).mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("session loading on mount", () => {
    it("should load recent projects from localStorage", () => {
      const recentProjects = [
        { path: "/project1", name: "Project 1", lastOpened: Date.now() },
      ];
      vi.mocked(getRecentProjects).mockReturnValue(recentProjects);

      renderHook(() => useSessionManagement(defaultProps));

      expect(getRecentProjects).toHaveBeenCalled();
      expect(mockSetRecentProjects).toHaveBeenCalledWith(recentProjects);
    });

    it("should show home screen if no session", async () => {
      vi.mocked(loadSession).mockReturnValue(null);

      renderHook(() => useSessionManagement(defaultProps));

      await waitFor(() => {
        expect(mockSetShowHomeScreen).toHaveBeenCalledWith(true);
        expect(mockSetIsSessionLoaded).toHaveBeenCalledWith(true);
      });
    });

    it("should load project from session if available", async () => {
      const session = {
        currentProjectPath: "/path/to/project",
        workflowName: "Test Workflow",
        workflow: null,
        hasUnsavedChanges: false,
      };
      vi.mocked(loadSession).mockReturnValue(session);
      mockInitializeTabs.mockResolvedValue({
        projectName: "Test Workflow",
        firstTab: { id: "tab-1", name: "Flow 1" },
      });
      mockLoadTabFlow.mockResolvedValue({
        nodes: [{ id: "node-1", type: "agent" }],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      });

      renderHook(() => useSessionManagement(defaultProps));

      await waitFor(() => {
        expect(mockSetCurrentProjectPath).toHaveBeenCalledWith(
          "/path/to/project",
        );
        expect(mockSetIsProjectSaved).toHaveBeenCalledWith(true);
        expect(mockSetIsSessionLoaded).toHaveBeenCalledWith(true);
      });
    });

    it("should initialize tabs when loading session", async () => {
      const session = {
        currentProjectPath: "/path/to/project",
        workflowName: "Test Workflow",
        workflow: null,
        hasUnsavedChanges: false,
      };
      vi.mocked(loadSession).mockReturnValue(session);
      mockInitializeTabs.mockResolvedValue({
        projectName: "Test Workflow",
        firstTab: { id: "tab-1", name: "Flow 1" },
      });
      mockLoadTabFlow.mockResolvedValue({
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      });

      renderHook(() => useSessionManagement(defaultProps));

      await waitFor(() => {
        expect(mockInitializeTabs).toHaveBeenCalledWith("/path/to/project");
      });
    });

    it("should load first tab flow and restore to canvas", async () => {
      const session = {
        currentProjectPath: "/path/to/project",
        workflowName: "Test Workflow",
        workflow: null,
        hasUnsavedChanges: false,
      };
      vi.mocked(loadSession).mockReturnValue(session);
      mockInitializeTabs.mockResolvedValue({
        projectName: "Test Workflow",
        firstTab: { id: "tab-1", name: "Flow 1" },
      });
      const flow = {
        nodes: [{ id: "node-1", type: "agent" }],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      };
      mockLoadTabFlow.mockResolvedValue(flow);

      renderHook(() => useSessionManagement(defaultProps));

      await waitFor(() => {
        expect(mockLoadTabFlow).toHaveBeenCalledWith(
          "/path/to/project",
          "tab-1",
        );
        expect(mockCanvasRef.current.restoreFlow).toHaveBeenCalledWith(flow);
        expect(mockLoadedTabIdRef.current).toBe("tab-1");
      });
    });

    it("should sync teleporters after loading first tab", async () => {
      const session = {
        currentProjectPath: "/path/to/project",
        workflowName: "Test Workflow",
        workflow: null,
        hasUnsavedChanges: false,
      };
      vi.mocked(loadSession).mockReturnValue(session);
      mockInitializeTabs.mockResolvedValue({
        projectName: "Test Workflow",
        firstTab: { id: "tab-1", name: "Flow 1" },
      });
      const flow = {
        nodes: [{ id: "node-1", type: "agent" }],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      };
      mockLoadTabFlow.mockResolvedValue(flow);

      renderHook(() => useSessionManagement(defaultProps));

      await waitFor(() => {
        expect(mockSyncTeleportersForTab).toHaveBeenCalledWith(
          "tab-1",
          "Flow 1",
          flow.nodes,
        );
      });
    });

    it("should set workflow name from project", async () => {
      const session = {
        currentProjectPath: "/path/to/project",
        workflowName: "Old Name",
        workflow: null,
        hasUnsavedChanges: false,
      };
      vi.mocked(loadSession).mockReturnValue(session);
      mockInitializeTabs.mockResolvedValue({
        projectName: "New Project Name",
        firstTab: { id: "tab-1", name: "Flow 1" },
      });
      mockLoadTabFlow.mockResolvedValue({
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      });

      renderHook(() => useSessionManagement(defaultProps));

      await waitFor(() => {
        expect(mockSetWorkflowName).toHaveBeenCalledWith("New Project Name");
      });
    });

    it("should add project to recent projects", async () => {
      const session = {
        currentProjectPath: "/path/to/project",
        workflowName: "Test Workflow",
        workflow: null,
        hasUnsavedChanges: false,
      };
      vi.mocked(loadSession).mockReturnValue(session);
      mockInitializeTabs.mockResolvedValue({
        projectName: "Test Workflow",
        firstTab: { id: "tab-1", name: "Flow 1" },
      });
      mockLoadTabFlow.mockResolvedValue({
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      });

      renderHook(() => useSessionManagement(defaultProps));

      await waitFor(() => {
        expect(addRecentProject).toHaveBeenCalledWith(
          expect.objectContaining({
            path: "/path/to/project",
            name: "Test Workflow",
          }),
        );
      });
    });

    it("should handle missing firstTab", async () => {
      const session = {
        currentProjectPath: "/path/to/project",
        workflowName: "Test Workflow",
        workflow: null,
        hasUnsavedChanges: false,
      };
      vi.mocked(loadSession).mockReturnValue(session);
      mockInitializeTabs.mockResolvedValue({
        projectName: "Test Workflow",
        firstTab: null,
      });

      renderHook(() => useSessionManagement(defaultProps));

      await waitFor(() => {
        expect(mockSetIsSessionLoaded).toHaveBeenCalledWith(true);
      });

      expect(mockLoadTabFlow).not.toHaveBeenCalled();
      expect(mockCanvasRef.current.restoreFlow).not.toHaveBeenCalled();
    });

    it("should handle initializeTabs returning null", async () => {
      const session = {
        currentProjectPath: "/path/to/project",
        workflowName: "Test Workflow",
        workflow: null,
        hasUnsavedChanges: false,
      };
      vi.mocked(loadSession).mockReturnValue(session);
      mockInitializeTabs.mockResolvedValue(null);

      renderHook(() => useSessionManagement(defaultProps));

      await waitFor(() => {
        expect(mockSetIsSessionLoaded).toHaveBeenCalledWith(true);
      });

      expect(mockSetWorkflowName).not.toHaveBeenCalled();
    });
  });

  describe("session saving effect", () => {
    it("should save session when project path and session loaded are set", async () => {
      const props = {
        ...defaultProps,
        isSessionLoaded: true,
        currentProjectPath: "/path/to/project",
        workflowName: "Test Workflow",
        hasUnsavedChanges: false,
      };

      renderHook(() => useSessionManagement(props));

      await waitFor(() => {
        expect(saveSession).toHaveBeenCalledWith({
          currentProjectPath: "/path/to/project",
          workflowName: "Test Workflow",
          workflow: null,
          hasUnsavedChanges: false,
        });
      });
    });

    it("should not save session if not loaded yet", () => {
      const props = {
        ...defaultProps,
        isSessionLoaded: false,
        currentProjectPath: "/path/to/project",
      };

      renderHook(() => useSessionManagement(props));

      // Should not save since isSessionLoaded is false
      expect(saveSession).not.toHaveBeenCalled();
    });

    it("should not save session if no project path", async () => {
      const props = {
        ...defaultProps,
        isSessionLoaded: true,
        currentProjectPath: null,
      };

      renderHook(() => useSessionManagement(props));

      // Wait a bit for any potential async calls
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(saveSession).not.toHaveBeenCalled();
    });

    it("should update saved session when workflow name changes", async () => {
      const { rerender } = renderHook((props) => useSessionManagement(props), {
        initialProps: {
          ...defaultProps,
          isSessionLoaded: true,
          currentProjectPath: "/path/to/project",
          workflowName: "Initial Name",
        },
      });

      await waitFor(() => {
        expect(saveSession).toHaveBeenCalledWith(
          expect.objectContaining({ workflowName: "Initial Name" }),
        );
      });

      vi.clearAllMocks();

      rerender({
        ...defaultProps,
        isSessionLoaded: true,
        currentProjectPath: "/path/to/project",
        workflowName: "Updated Name",
      });

      await waitFor(() => {
        expect(saveSession).toHaveBeenCalledWith(
          expect.objectContaining({ workflowName: "Updated Name" }),
        );
      });
    });

    it("should update saved session when hasUnsavedChanges changes", async () => {
      const { rerender } = renderHook((props) => useSessionManagement(props), {
        initialProps: {
          ...defaultProps,
          isSessionLoaded: true,
          currentProjectPath: "/path/to/project",
          hasUnsavedChanges: false,
        },
      });

      await waitFor(() => {
        expect(saveSession).toHaveBeenCalledWith(
          expect.objectContaining({ hasUnsavedChanges: false }),
        );
      });

      vi.clearAllMocks();

      rerender({
        ...defaultProps,
        isSessionLoaded: true,
        currentProjectPath: "/path/to/project",
        hasUnsavedChanges: true,
      });

      await waitFor(() => {
        expect(saveSession).toHaveBeenCalledWith(
          expect.objectContaining({ hasUnsavedChanges: true }),
        );
      });
    });
  });

  describe("edge cases", () => {
    it("should handle loadTabFlow returning null", async () => {
      const session = {
        currentProjectPath: "/path/to/project",
        workflowName: "Test Workflow",
        workflow: null,
        hasUnsavedChanges: false,
      };
      vi.mocked(loadSession).mockReturnValue(session);
      mockInitializeTabs.mockResolvedValue({
        projectName: "Test Workflow",
        firstTab: { id: "tab-1", name: "Flow 1" },
      });
      mockLoadTabFlow.mockResolvedValue(null);

      renderHook(() => useSessionManagement(defaultProps));

      await waitFor(() => {
        expect(mockSetIsSessionLoaded).toHaveBeenCalledWith(true);
      });

      // restoreFlow should not be called if flow is null
      expect(mockCanvasRef.current.restoreFlow).not.toHaveBeenCalled();
    });

    it("should handle null canvasRef.current", async () => {
      const props = {
        ...defaultProps,
        canvasRef: { current: null },
      };
      const session = {
        currentProjectPath: "/path/to/project",
        workflowName: "Test Workflow",
        workflow: null,
        hasUnsavedChanges: false,
      };
      vi.mocked(loadSession).mockReturnValue(session);
      mockInitializeTabs.mockResolvedValue({
        projectName: "Test Workflow",
        firstTab: { id: "tab-1", name: "Flow 1" },
      });
      mockLoadTabFlow.mockResolvedValue({
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      });

      // Should not throw
      renderHook(() => useSessionManagement(props as any));

      await waitFor(() => {
        expect(mockSetIsSessionLoaded).toHaveBeenCalledWith(true);
      });
    });
  });
});
