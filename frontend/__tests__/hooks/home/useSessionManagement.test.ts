import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
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

import { loadSession } from "@/lib/sessionStorage";
import { getRecentProjects, addRecentProject } from "@/lib/recentProjects";
import {
  createMockCanvasRef,
  createMockSetters,
  createDefaultProps,
  createMockSession,
  createMockFlow,
  createMockTabResult,
} from "./useSessionManagement.fixtures";

describe("useSessionManagement - session loading", () => {
  const mockCanvasRef = createMockCanvasRef();
  const mockLoadedTabIdRef = { current: null as string | null };
  let setters: ReturnType<typeof createMockSetters>;
  let defaultProps: ReturnType<typeof createDefaultProps>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadedTabIdRef.current = null;
    setters = createMockSetters();
    defaultProps = createDefaultProps(
      mockCanvasRef,
      mockLoadedTabIdRef,
      setters,
    );
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
      expect(setters.mockSetRecentProjects).toHaveBeenCalledWith(recentProjects);
    });

    it("should show home screen if no session", async () => {
      vi.mocked(loadSession).mockReturnValue(null);

      renderHook(() => useSessionManagement(defaultProps));

      await waitFor(() => {
        expect(setters.mockSetShowHomeScreen).toHaveBeenCalledWith(true);
        expect(setters.mockSetIsSessionLoaded).toHaveBeenCalledWith(true);
      });
    });

    it("should load project from session if available", async () => {
      const session = createMockSession();
      vi.mocked(loadSession).mockReturnValue(session);
      setters.mockInitializeTabs.mockResolvedValue(createMockTabResult());
      setters.mockLoadTabFlow.mockResolvedValue(
        createMockFlow({ nodes: [{ id: "node-1", type: "agent" }] }),
      );

      renderHook(() => useSessionManagement(defaultProps));

      await waitFor(() => {
        expect(setters.mockSetCurrentProjectPath).toHaveBeenCalledWith(
          "/path/to/project",
        );
        expect(setters.mockSetIsProjectSaved).toHaveBeenCalledWith(true);
        expect(setters.mockSetIsSessionLoaded).toHaveBeenCalledWith(true);
      });
    });

    it("should initialize tabs when loading session", async () => {
      const session = createMockSession();
      vi.mocked(loadSession).mockReturnValue(session);
      setters.mockInitializeTabs.mockResolvedValue(createMockTabResult());
      setters.mockLoadTabFlow.mockResolvedValue(createMockFlow());

      renderHook(() => useSessionManagement(defaultProps));

      await waitFor(() => {
        expect(setters.mockInitializeTabs).toHaveBeenCalledWith("/path/to/project");
      });
    });

    it("should load first tab flow and restore to canvas", async () => {
      const session = createMockSession();
      vi.mocked(loadSession).mockReturnValue(session);
      setters.mockInitializeTabs.mockResolvedValue(createMockTabResult());
      const flow = createMockFlow({ nodes: [{ id: "node-1", type: "agent" }] });
      setters.mockLoadTabFlow.mockResolvedValue(flow);

      renderHook(() => useSessionManagement(defaultProps));

      await waitFor(() => {
        expect(setters.mockLoadTabFlow).toHaveBeenCalledWith(
          "/path/to/project",
          "tab-1",
        );
        expect(mockCanvasRef.current.restoreFlow).toHaveBeenCalledWith(flow);
        expect(mockLoadedTabIdRef.current).toBe("tab-1");
      });
    });

    it("should sync teleporters after loading first tab", async () => {
      const session = createMockSession();
      vi.mocked(loadSession).mockReturnValue(session);
      setters.mockInitializeTabs.mockResolvedValue(createMockTabResult());
      const flow = createMockFlow({ nodes: [{ id: "node-1", type: "agent" }] });
      setters.mockLoadTabFlow.mockResolvedValue(flow);

      renderHook(() => useSessionManagement(defaultProps));

      await waitFor(() => {
        expect(setters.mockSyncTeleportersForTab).toHaveBeenCalledWith(
          "tab-1",
          "Flow 1",
          flow.nodes,
        );
      });
    });

    it("should set workflow name from project", async () => {
      const session = createMockSession({ workflowName: "Old Name" });
      vi.mocked(loadSession).mockReturnValue(session);
      setters.mockInitializeTabs.mockResolvedValue(
        createMockTabResult({ projectName: "New Project Name" }),
      );
      setters.mockLoadTabFlow.mockResolvedValue(createMockFlow());

      renderHook(() => useSessionManagement(defaultProps));

      await waitFor(() => {
        expect(setters.mockSetWorkflowName).toHaveBeenCalledWith("New Project Name");
      });
    });

    it("should add project to recent projects", async () => {
      const session = createMockSession();
      vi.mocked(loadSession).mockReturnValue(session);
      setters.mockInitializeTabs.mockResolvedValue(createMockTabResult());
      setters.mockLoadTabFlow.mockResolvedValue(createMockFlow());

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
      const session = createMockSession();
      vi.mocked(loadSession).mockReturnValue(session);
      setters.mockInitializeTabs.mockResolvedValue(
        createMockTabResult({ firstTab: null }),
      );

      renderHook(() => useSessionManagement(defaultProps));

      await waitFor(() => {
        expect(setters.mockSetIsSessionLoaded).toHaveBeenCalledWith(true);
      });

      expect(setters.mockLoadTabFlow).not.toHaveBeenCalled();
      expect(mockCanvasRef.current.restoreFlow).not.toHaveBeenCalled();
    });

    it("should handle initializeTabs returning null", async () => {
      const session = createMockSession();
      vi.mocked(loadSession).mockReturnValue(session);
      setters.mockInitializeTabs.mockResolvedValue(null);

      renderHook(() => useSessionManagement(defaultProps));

      await waitFor(() => {
        expect(setters.mockSetIsSessionLoaded).toHaveBeenCalledWith(true);
      });

      expect(setters.mockSetWorkflowName).not.toHaveBeenCalled();
    });
  });
});
