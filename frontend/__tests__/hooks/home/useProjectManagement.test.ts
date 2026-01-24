import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  mockHandleCreateNewProject,
  mockHandleLoadExistingProject,
  createDefaultProps,
} from "./useProjectManagement.fixtures";

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

// Import after mocks
import { useProjectManagement } from "@/hooks/home/useProjectManagement";
import { getRecentProjects, removeRecentProject } from "@/lib/recentProjects";
import { toast } from "sonner";

describe("useProjectManagement", () => {
  let defaultProps: ReturnType<typeof createDefaultProps>;

  beforeEach(() => {
    vi.clearAllMocks();
    defaultProps = createDefaultProps();
    defaultProps.tabFlowCacheRef.current = new Map();
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

  describe("handleNewProject", () => {
    it("should set project switcher mode to create", () => {
      const { result } = renderHook(() => useProjectManagement(defaultProps));

      act(() => {
        result.current.handleNewProject();
      });

      expect(defaultProps.setProjectSwitcherMode).toHaveBeenCalledWith("create");
    });

    it("should open save confirm dialog if has unsaved changes", () => {
      const props = createDefaultProps({ hasUnsavedChanges: true });
      const { result } = renderHook(() => useProjectManagement(props));

      act(() => {
        result.current.handleNewProject();
      });

      expect(props.setIsSaveConfirmOpen).toHaveBeenCalledWith(true);
      expect(props.setIsProjectSwitcherOpen).not.toHaveBeenCalled();
    });

    it("should open project switcher directly if no unsaved changes", () => {
      const { result } = renderHook(() => useProjectManagement(defaultProps));

      act(() => {
        result.current.handleNewProject();
      });

      expect(defaultProps.setIsProjectSwitcherOpen).toHaveBeenCalledWith(true);
      expect(defaultProps.setIsSaveConfirmOpen).not.toHaveBeenCalled();
    });
  });

  describe("handleLoadProject", () => {
    it("should set project switcher mode to open", () => {
      const { result } = renderHook(() => useProjectManagement(defaultProps));

      act(() => {
        result.current.handleLoadProject();
      });

      expect(defaultProps.setProjectSwitcherMode).toHaveBeenCalledWith("open");
    });

    it("should open save confirm dialog if has unsaved changes", () => {
      const props = createDefaultProps({ hasUnsavedChanges: true });
      const { result } = renderHook(() => useProjectManagement(props));

      act(() => {
        result.current.handleLoadProject();
      });

      expect(props.setIsSaveConfirmOpen).toHaveBeenCalledWith(true);
      expect(props.setIsProjectSwitcherOpen).not.toHaveBeenCalled();
    });

    it("should open project switcher directly if no unsaved changes", () => {
      const { result } = renderHook(() => useProjectManagement(defaultProps));

      act(() => {
        result.current.handleLoadProject();
      });

      expect(defaultProps.setIsProjectSwitcherOpen).toHaveBeenCalledWith(true);
      expect(defaultProps.setIsSaveConfirmOpen).not.toHaveBeenCalled();
    });
  });

  describe("handleSaveAndContinue", () => {
    it("should save project and then open switcher", async () => {
      // Ensure saveFlow returns valid data
      const flow = { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } };
      defaultProps.canvasRef.current.saveFlow.mockReturnValue(flow);
      defaultProps.saveTabFlow.mockResolvedValue(true);

      const { result } = renderHook(() => useProjectManagement(defaultProps));

      await act(async () => {
        await result.current.handleSaveAndContinue();
      });

      expect(defaultProps.saveTabFlow).toHaveBeenCalled();
      expect(defaultProps.setIsSaveConfirmOpen).toHaveBeenCalledWith(false);
      expect(defaultProps.setIsProjectSwitcherOpen).toHaveBeenCalledWith(true);
    });
  });

  describe("handleDontSave", () => {
    it("should close save confirm and open project switcher", () => {
      const { result } = renderHook(() => useProjectManagement(defaultProps));

      act(() => {
        result.current.handleDontSave();
      });

      expect(defaultProps.setIsSaveConfirmOpen).toHaveBeenCalledWith(false);
      expect(defaultProps.setIsProjectSwitcherOpen).toHaveBeenCalledWith(true);
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
      expect(defaultProps.setRecentProjects).toHaveBeenCalledWith([]);
    });
  });

  describe("handleCancelNewProject", () => {
    it("should close save confirm dialog", () => {
      const { result } = renderHook(() => useProjectManagement(defaultProps));

      act(() => {
        result.current.handleCancelNewProject();
      });

      expect(defaultProps.setIsSaveConfirmOpen).toHaveBeenCalledWith(false);
    });
  });

  describe("handleSaveCurrentProject - basic validation", () => {
    it("should show error toast if no project path", async () => {
      const props = createDefaultProps({ currentProjectPath: null });

      const { result } = renderHook(() => useProjectManagement(props));

      await act(async () => {
        await result.current.handleSaveCurrentProject();
      });

      expect(vi.mocked(toast).error).toHaveBeenCalledWith("No project loaded", {
        description: "Please create or load a project first.",
      });
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
