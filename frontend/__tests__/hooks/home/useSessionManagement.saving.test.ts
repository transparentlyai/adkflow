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

import { loadSession, saveSession } from "@/lib/sessionStorage";
import { getRecentProjects } from "@/lib/recentProjects";
import {
  createMockCanvasRef,
  createMockSetters,
  createDefaultProps,
} from "./useSessionManagement.fixtures";

describe("useSessionManagement - session saving", () => {
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
      setters.mockInitializeTabs.mockResolvedValue({
        projectName: "Test Workflow",
        firstTab: { id: "tab-1", name: "Flow 1" },
      });
      setters.mockLoadTabFlow.mockResolvedValue(null);

      renderHook(() => useSessionManagement(defaultProps));

      await waitFor(() => {
        expect(setters.mockSetIsSessionLoaded).toHaveBeenCalledWith(true);
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
      setters.mockInitializeTabs.mockResolvedValue({
        projectName: "Test Workflow",
        firstTab: { id: "tab-1", name: "Flow 1" },
      });
      setters.mockLoadTabFlow.mockResolvedValue({
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      });

      // Should not throw
      renderHook(() => useSessionManagement(props as any));

      await waitFor(() => {
        expect(setters.mockSetIsSessionLoaded).toHaveBeenCalledWith(true);
      });
    });
  });
});
