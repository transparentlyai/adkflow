import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  type TestNodeData,
  type Node,
  mockHandleCreateNewProject,
  mockHandleLoadExistingProject,
  createDefaultProps,
  createDirtyNode,
  createCleanNode,
  createFlow,
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
import {
  collectDirtyFiles,
  saveAllDirtyFiles,
  clearDirtyStatesForNodes,
} from "@/lib/fileSave";
import { toast } from "sonner";

describe("useProjectManagement - handleSaveCurrentProject", () => {
  let defaultProps: ReturnType<typeof createDefaultProps>;

  beforeEach(() => {
    vi.clearAllMocks();
    defaultProps = createDefaultProps();
    defaultProps.tabFlowCacheRef.current = new Map();
  });

  describe("validation errors", () => {
    it("should show error toast if no project path", async () => {
      const props = createDefaultProps({ currentProjectPath: null });
      const { result } = renderHook(() => useProjectManagement(props));

      await act(async () => {
        await result.current.handleSaveCurrentProject();
      });

      expect(vi.mocked(toast).error).toHaveBeenCalledWith("No project loaded", {
        description: "Please create or load a project first.",
      });
      expect(props.setIsSaving).not.toHaveBeenCalled();
    });

    it("should show error toast if no active tab", async () => {
      const props = createDefaultProps({ activeTabId: null });
      const { result } = renderHook(() => useProjectManagement(props));

      await act(async () => {
        await result.current.handleSaveCurrentProject();
      });

      expect(vi.mocked(toast).error).toHaveBeenCalledWith("No project loaded", {
        description: "Please create or load a project first.",
      });
      expect(props.setIsSaving).not.toHaveBeenCalled();
    });

    it("should show error toast if no flow data from canvas", async () => {
      defaultProps.canvasRef.current.saveFlow.mockReturnValue(null as any);
      const { result } = renderHook(() => useProjectManagement(defaultProps));

      await act(async () => {
        await result.current.handleSaveCurrentProject();
      });

      expect(vi.mocked(toast).error).toHaveBeenCalledWith("Failed to save project", {
        id: "toast-id-123",
        description: "No flow data to save.",
      });
      expect(defaultProps.setIsSaving).toHaveBeenCalledWith(false);
    });
  });

  describe("save flow", () => {
    it("should show loading toast and set saving state during save", async () => {
      const { result } = renderHook(() => useProjectManagement(defaultProps));

      await act(async () => {
        await result.current.handleSaveCurrentProject();
      });

      expect(vi.mocked(toast).loading).toHaveBeenCalledWith("Saving project...");
      expect(defaultProps.setIsSaving).toHaveBeenCalledWith(true);
      expect(defaultProps.setIsSaving).toHaveBeenCalledWith(false);
    });

    it("should call saveTabFlow with flow data", async () => {
      const flow = createFlow();
      defaultProps.canvasRef.current.saveFlow.mockReturnValue(flow);
      const { result } = renderHook(() => useProjectManagement(defaultProps));

      await act(async () => {
        await result.current.handleSaveCurrentProject();
      });

      expect(defaultProps.saveTabFlow).toHaveBeenCalledWith(
        "/path/to/project",
        "tab-1",
        flow,
        "Test Workflow",
      );
    });

    it("should set project saved and show success toast on success", async () => {
      defaultProps.saveTabFlow.mockResolvedValue(true);
      const { result } = renderHook(() => useProjectManagement(defaultProps));

      await act(async () => {
        await result.current.handleSaveCurrentProject();
      });

      expect(defaultProps.setIsProjectSaved).toHaveBeenCalledWith(true);
      expect(vi.mocked(toast).success).toHaveBeenCalledWith("Project saved", { id: "toast-id-123" });
    });

    it("should clear tab flow cache on success", async () => {
      defaultProps.tabFlowCacheRef.current.set("tab-1", createFlow());
      defaultProps.saveTabFlow.mockResolvedValue(true);
      const { result } = renderHook(() => useProjectManagement(defaultProps));

      await act(async () => {
        await result.current.handleSaveCurrentProject();
      });

      expect(defaultProps.tabFlowCacheRef.current.has("tab-1")).toBe(false);
    });

    it("should show error toast on save failure", async () => {
      defaultProps.saveTabFlow.mockResolvedValue(false);
      const { result } = renderHook(() => useProjectManagement(defaultProps));

      await act(async () => {
        await result.current.handleSaveCurrentProject();
      });

      expect(vi.mocked(toast).error).toHaveBeenCalledWith("Failed to save project", {
        id: "toast-id-123",
        description: "Could not save workflow structure.",
      });
      expect(defaultProps.setIsSaving).toHaveBeenCalledWith(false);
    });

    it("should handle save error", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      defaultProps.canvasRef.current.saveFlow.mockReturnValue(createFlow());
      defaultProps.saveTabFlow.mockRejectedValue(new Error("Save failed"));
      const { result } = renderHook(() => useProjectManagement(defaultProps));

      await act(async () => {
        await result.current.handleSaveCurrentProject();
      });

      expect(vi.mocked(toast).error).toHaveBeenCalledWith("Failed to save project", {
        id: "toast-id-123",
        description: "Save failed",
      });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("dirty files handling", () => {
    it("should save project with dirty files successfully", async () => {
      const dirtyNodes = [
        createDirtyNode("node-1", "prompts/test.txt", "test content"),
        createDirtyNode("node-2", "prompts/test2.txt", "test content 2", { x: 100, y: 100 }),
      ];
      const flow = createFlow(dirtyNodes as Node[]);
      defaultProps.canvasRef.current.saveFlow.mockReturnValue(flow);

      const dirtyFiles = [
        { nodeId: "node-1", filePath: "prompts/test.txt", content: "test content" },
        { nodeId: "node-2", filePath: "prompts/test2.txt", content: "test content 2" },
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
        data: { ...node.data, fileSaveState: { ...node.data.fileSaveState!, isDirty: false } },
      }));
      vi.mocked(clearDirtyStatesForNodes).mockReturnValue(clearedNodes as Node[]);

      const { result } = renderHook(() => useProjectManagement(defaultProps));
      await act(async () => {
        await result.current.handleSaveCurrentProject();
      });

      expect(collectDirtyFiles).toHaveBeenCalledWith(dirtyNodes as Node[]);
      expect(saveAllDirtyFiles).toHaveBeenCalledWith("/path/to/project", dirtyFiles);
      expect(clearDirtyStatesForNodes).toHaveBeenCalledWith(
        dirtyNodes as Node[],
        new Set(["node-1", "node-2"]),
      );
      expect(defaultProps.canvasRef.current.restoreFlow).toHaveBeenCalledWith({
        ...flow,
        nodes: clearedNodes,
      });
      expect(vi.mocked(toast).success).toHaveBeenCalledWith("Project saved (2 files)", {
        id: "toast-id-123",
      });
    });

    it("should handle partial file save failure", async () => {
      const dirtyNodes = [
        createDirtyNode("node-1", "prompts/test.txt", "test content"),
        createDirtyNode("node-2", "prompts/test2.txt", "test content 2", { x: 100, y: 100 }),
      ];
      const flow = createFlow(dirtyNodes as Node[]);
      defaultProps.canvasRef.current.saveFlow.mockReturnValue(flow);

      const dirtyFiles = [
        { nodeId: "node-1", filePath: "prompts/test.txt", content: "test content" },
        { nodeId: "node-2", filePath: "prompts/test2.txt", content: "test content 2" },
      ];
      vi.mocked(collectDirtyFiles).mockReturnValue(dirtyFiles);
      vi.mocked(saveAllDirtyFiles).mockResolvedValue({
        totalFiles: 2,
        successCount: 1,
        errorCount: 1,
        results: [
          { nodeId: "node-1", filePath: "prompts/test.txt", success: true },
          { nodeId: "node-2", filePath: "prompts/test2.txt", success: false, error: "Permission denied" },
        ],
      });

      const partiallyCleared: Node<TestNodeData>[] = [
        {
          ...dirtyNodes[0],
          data: { ...dirtyNodes[0].data, fileSaveState: { ...dirtyNodes[0].data.fileSaveState!, isDirty: false } },
        },
        dirtyNodes[1],
      ];
      vi.mocked(clearDirtyStatesForNodes).mockReturnValue(partiallyCleared as Node[]);

      const { result } = renderHook(() => useProjectManagement(defaultProps));
      await act(async () => {
        await result.current.handleSaveCurrentProject();
      });

      expect(clearDirtyStatesForNodes).toHaveBeenCalledWith(dirtyNodes as Node[], new Set(["node-1"]));
      expect(defaultProps.canvasRef.current.restoreFlow).toHaveBeenCalledWith({
        ...flow,
        nodes: partiallyCleared,
      });
      expect(vi.mocked(toast).warning).toHaveBeenCalledWith("Project saved with errors", {
        id: "toast-id-123",
        description: "1 files saved, 1 failed",
      });
    });

    it("should save project with no dirty files", async () => {
      const cleanNodes = [createCleanNode("node-1", "Clean node")];
      const flow = createFlow(cleanNodes as Node[]);
      defaultProps.canvasRef.current.saveFlow.mockReturnValue(flow);
      vi.mocked(collectDirtyFiles).mockReturnValue([]);

      const { result } = renderHook(() => useProjectManagement(defaultProps));
      await act(async () => {
        await result.current.handleSaveCurrentProject();
      });

      expect(collectDirtyFiles).toHaveBeenCalledWith(cleanNodes as Node[]);
      expect(saveAllDirtyFiles).not.toHaveBeenCalled();
      expect(clearDirtyStatesForNodes).not.toHaveBeenCalled();
      expect(defaultProps.canvasRef.current.restoreFlow).not.toHaveBeenCalled();
      expect(vi.mocked(toast).success).toHaveBeenCalledWith("Project saved", { id: "toast-id-123" });
    });
  });
});
