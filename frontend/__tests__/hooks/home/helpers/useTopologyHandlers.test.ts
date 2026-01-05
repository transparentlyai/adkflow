import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTopologyHandlers } from "@/hooks/home/helpers/useTopologyHandlers";

vi.mock("@/lib/api", () => ({
  getTopology: vi.fn(),
}));

import { getTopology } from "@/lib/api";

describe("useTopologyHandlers", () => {
  const mockCanvasRef = {
    current: {
      clearErrorHighlights: vi.fn(),
      saveFlow: vi.fn(),
    },
  };

  const mockSetTopologyResult = vi.fn();
  const mockSetIsTopologySaveDialogOpen = vi.fn();
  const mockSetRunEvents = vi.fn();
  const mockSetLastRunStatus = vi.fn();
  const mockSetIsRunPanelOpen = vi.fn();
  const mockSetIsProjectSaved = vi.fn();
  const mockSaveTabFlow = vi.fn();

  const defaultProps = {
    canvasRef: mockCanvasRef as any,
    currentProjectPath: "/path/to/project",
    activeTabId: "tab1",
    activeTab: { id: "tab1", name: "Tab 1", hasUnsavedChanges: false },
    workflowName: "Test Workflow",
    isProjectSaved: true,
    setIsProjectSaved: mockSetIsProjectSaved,
    setTopologyResult: mockSetTopologyResult,
    setIsTopologySaveDialogOpen: mockSetIsTopologySaveDialogOpen,
    setRunEvents: mockSetRunEvents,
    setLastRunStatus: mockSetLastRunStatus,
    setIsRunPanelOpen: mockSetIsRunPanelOpen,
    saveTabFlow: mockSaveTabFlow,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getTopology as any).mockResolvedValue({ agents: [], edges: [] });
    mockSaveTabFlow.mockResolvedValue(true);
    mockCanvasRef.current.saveFlow.mockReturnValue({
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    });
  });

  describe("showErrorsInConsole", () => {
    it("should clear error highlights and set error events", () => {
      const { result } = renderHook(() => useTopologyHandlers(defaultProps));

      act(() => {
        result.current.showErrorsInConsole(["Error 1", "Error 2"]);
      });

      expect(mockCanvasRef.current.clearErrorHighlights).toHaveBeenCalled();
      expect(mockSetRunEvents).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: "run_error",
            content: "Error 1",
          }),
          expect.objectContaining({
            type: "run_error",
            content: "Error 2",
          }),
        ]),
      );
      expect(mockSetLastRunStatus).toHaveBeenCalledWith("failed");
      expect(mockSetIsRunPanelOpen).toHaveBeenCalledWith(true);
    });

    it("should handle empty error array", () => {
      const { result } = renderHook(() => useTopologyHandlers(defaultProps));

      act(() => {
        result.current.showErrorsInConsole([]);
      });

      expect(mockCanvasRef.current.clearErrorHighlights).toHaveBeenCalled();
      expect(mockSetRunEvents).toHaveBeenCalledWith([]);
    });
  });

  describe("executeShowTopology", () => {
    it("should get topology and set result", async () => {
      const mockTopology = { agents: ["agent1"], edges: [] };
      (getTopology as any).mockResolvedValue(mockTopology);

      const { result } = renderHook(() => useTopologyHandlers(defaultProps));

      await act(async () => {
        await result.current.executeShowTopology();
      });

      expect(getTopology).toHaveBeenCalledWith("/path/to/project");
      expect(mockSetTopologyResult).toHaveBeenCalledWith(mockTopology);
    });

    it("should not call API when project path is null", async () => {
      const propsWithNullPath = {
        ...defaultProps,
        currentProjectPath: null,
      };

      const { result } = renderHook(() =>
        useTopologyHandlers(propsWithNullPath),
      );

      await act(async () => {
        await result.current.executeShowTopology();
      });

      expect(getTopology).not.toHaveBeenCalled();
    });

    it("should show errors on API failure", async () => {
      (getTopology as any).mockRejectedValue(new Error("API Error"));

      const { result } = renderHook(() => useTopologyHandlers(defaultProps));

      await act(async () => {
        await result.current.executeShowTopology();
      });

      expect(mockSetRunEvents).toHaveBeenCalled();
      expect(mockSetLastRunStatus).toHaveBeenCalledWith("failed");
    });
  });

  describe("handleShowTopology", () => {
    it("should open save dialog when there are unsaved changes", async () => {
      const propsWithUnsavedChanges = {
        ...defaultProps,
        activeTab: { id: "tab1", name: "Tab 1", hasUnsavedChanges: true },
      };

      const { result } = renderHook(() =>
        useTopologyHandlers(propsWithUnsavedChanges),
      );

      await act(async () => {
        await result.current.handleShowTopology();
      });

      expect(mockSetIsTopologySaveDialogOpen).toHaveBeenCalledWith(true);
      expect(getTopology).not.toHaveBeenCalled();
    });

    it("should open save dialog when project is not saved", async () => {
      const propsWithUnsavedProject = {
        ...defaultProps,
        isProjectSaved: false,
      };

      const { result } = renderHook(() =>
        useTopologyHandlers(propsWithUnsavedProject),
      );

      await act(async () => {
        await result.current.handleShowTopology();
      });

      expect(mockSetIsTopologySaveDialogOpen).toHaveBeenCalledWith(true);
      expect(getTopology).not.toHaveBeenCalled();
    });

    it("should directly execute topology when saved", async () => {
      const { result } = renderHook(() => useTopologyHandlers(defaultProps));

      await act(async () => {
        await result.current.handleShowTopology();
      });

      expect(mockSetIsTopologySaveDialogOpen).not.toHaveBeenCalled();
      expect(getTopology).toHaveBeenCalledWith("/path/to/project");
    });

    it("should not execute when project path is null", async () => {
      const propsWithNullPath = {
        ...defaultProps,
        currentProjectPath: null,
      };

      const { result } = renderHook(() =>
        useTopologyHandlers(propsWithNullPath),
      );

      await act(async () => {
        await result.current.handleShowTopology();
      });

      expect(getTopology).not.toHaveBeenCalled();
    });
  });

  describe("handleTopologySaveAndShow", () => {
    it("should save flow and show topology", async () => {
      const { result } = renderHook(() => useTopologyHandlers(defaultProps));

      await act(async () => {
        await result.current.handleTopologySaveAndShow();
      });

      expect(mockSetIsTopologySaveDialogOpen).toHaveBeenCalledWith(false);
      expect(mockSaveTabFlow).toHaveBeenCalled();
      expect(mockSetIsProjectSaved).toHaveBeenCalledWith(true);
      expect(getTopology).toHaveBeenCalledWith("/path/to/project");
    });

    it("should not save when canvas ref is null", async () => {
      const propsWithNullCanvas = {
        ...defaultProps,
        canvasRef: { current: null },
      };

      const { result } = renderHook(() =>
        useTopologyHandlers(propsWithNullCanvas),
      );

      await act(async () => {
        await result.current.handleTopologySaveAndShow();
      });

      expect(mockSetIsTopologySaveDialogOpen).toHaveBeenCalledWith(false);
      expect(mockSaveTabFlow).not.toHaveBeenCalled();
    });

    it("should not save when activeTabId is null", async () => {
      const propsWithNullTab = {
        ...defaultProps,
        activeTabId: null,
      };

      const { result } = renderHook(() =>
        useTopologyHandlers(propsWithNullTab),
      );

      await act(async () => {
        await result.current.handleTopologySaveAndShow();
      });

      expect(mockSaveTabFlow).not.toHaveBeenCalled();
    });

    it("should not set saved when save fails", async () => {
      mockSaveTabFlow.mockResolvedValue(false);

      const { result } = renderHook(() => useTopologyHandlers(defaultProps));

      await act(async () => {
        await result.current.handleTopologySaveAndShow();
      });

      expect(mockSetIsProjectSaved).not.toHaveBeenCalled();
    });
  });

  describe("handleTopologySaveCancel", () => {
    it("should close the save dialog", () => {
      const { result } = renderHook(() => useTopologyHandlers(defaultProps));

      act(() => {
        result.current.handleTopologySaveCancel();
      });

      expect(mockSetIsTopologySaveDialogOpen).toHaveBeenCalledWith(false);
    });
  });

  describe("return value", () => {
    it("should return all expected handlers", () => {
      const { result } = renderHook(() => useTopologyHandlers(defaultProps));

      expect(typeof result.current.showErrorsInConsole).toBe("function");
      expect(typeof result.current.executeShowTopology).toBe("function");
      expect(typeof result.current.handleShowTopology).toBe("function");
      expect(typeof result.current.handleTopologySaveAndShow).toBe("function");
      expect(typeof result.current.handleTopologySaveCancel).toBe("function");
    });
  });
});
