import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWorkflowExecution } from "@/hooks/home/helpers/useWorkflowExecution";

vi.mock("@/lib/api", () => ({
  validateWorkflow: vi.fn(),
  startRun: vi.fn(),
}));

import { validateWorkflow, startRun } from "@/lib/api";

describe("useWorkflowExecution", () => {
  const mockCanvasRef = {
    current: {
      clearErrorHighlights: vi.fn(),
      highlightErrorNodes: vi.fn(),
      highlightWarningNodes: vi.fn(),
      saveFlow: vi.fn(),
    },
  };

  const mockSetIsRunning = vi.fn();
  const mockSetCurrentRunId = vi.fn();
  const mockSetIsRunPanelOpen = vi.fn();
  const mockSetRunEvents = vi.fn();
  const mockSetLastRunStatus = vi.fn();
  const mockSetIsRunConfirmDialogOpen = vi.fn();
  const mockSetIsProjectSaved = vi.fn();
  const mockSaveTabFlow = vi.fn();

  const defaultProps = {
    canvasRef: mockCanvasRef as any,
    currentProjectPath: "/path/to/project",
    activeTabId: "tab1",
    activeTab: { id: "tab1", name: "Tab 1", hasUnsavedChanges: false },
    workflowName: "Test Workflow",
    isRunning: false,
    isProjectSaved: true,
    setIsRunning: mockSetIsRunning,
    setCurrentRunId: mockSetCurrentRunId,
    setIsRunPanelOpen: mockSetIsRunPanelOpen,
    setRunEvents: mockSetRunEvents,
    setLastRunStatus: mockSetLastRunStatus,
    setIsRunConfirmDialogOpen: mockSetIsRunConfirmDialogOpen,
    setIsProjectSaved: mockSetIsProjectSaved,
    saveTabFlow: mockSaveTabFlow,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (validateWorkflow as any).mockResolvedValue({
      valid: true,
      errors: [],
      warnings: [],
      agent_count: 3,
      tab_count: 1,
      node_errors: {},
      node_warnings: {},
    });
    (startRun as any).mockResolvedValue({ run_id: "run-123" });
    mockSaveTabFlow.mockResolvedValue(true);
    mockCanvasRef.current.saveFlow.mockReturnValue({
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    });
  });

  describe("handleRunWorkflow", () => {
    it("should open confirm dialog when there are unsaved changes", async () => {
      const propsWithUnsavedChanges = {
        ...defaultProps,
        activeTab: { id: "tab1", name: "Tab 1", hasUnsavedChanges: true },
      };

      const { result } = renderHook(() =>
        useWorkflowExecution(propsWithUnsavedChanges),
      );

      await act(async () => {
        await result.current.handleRunWorkflow();
      });

      expect(mockSetIsRunConfirmDialogOpen).toHaveBeenCalledWith(true);
      expect(validateWorkflow).not.toHaveBeenCalled();
    });

    it("should open confirm dialog when project is not saved", async () => {
      const propsWithUnsavedProject = {
        ...defaultProps,
        isProjectSaved: false,
      };

      const { result } = renderHook(() =>
        useWorkflowExecution(propsWithUnsavedProject),
      );

      await act(async () => {
        await result.current.handleRunWorkflow();
      });

      expect(mockSetIsRunConfirmDialogOpen).toHaveBeenCalledWith(true);
      expect(validateWorkflow).not.toHaveBeenCalled();
    });

    it("should directly run when saved", async () => {
      const { result } = renderHook(() => useWorkflowExecution(defaultProps));

      await act(async () => {
        await result.current.handleRunWorkflow();
      });

      expect(mockSetIsRunConfirmDialogOpen).not.toHaveBeenCalled();
      expect(validateWorkflow).toHaveBeenCalledWith("/path/to/project");
      expect(startRun).toHaveBeenCalled();
    });

    it("should not run when project path is null", async () => {
      const propsWithNullPath = {
        ...defaultProps,
        currentProjectPath: null,
      };

      const { result } = renderHook(() =>
        useWorkflowExecution(propsWithNullPath),
      );

      await act(async () => {
        await result.current.handleRunWorkflow();
      });

      expect(validateWorkflow).not.toHaveBeenCalled();
    });

    it("should not run when already running", async () => {
      const propsAlreadyRunning = {
        ...defaultProps,
        isRunning: true,
      };

      const { result } = renderHook(() =>
        useWorkflowExecution(propsAlreadyRunning),
      );

      await act(async () => {
        await result.current.handleRunWorkflow();
      });

      expect(validateWorkflow).not.toHaveBeenCalled();
    });
  });

  describe("handleRunConfirmSaveAndRun", () => {
    it("should save flow and run", async () => {
      const { result } = renderHook(() => useWorkflowExecution(defaultProps));

      await act(async () => {
        await result.current.handleRunConfirmSaveAndRun();
      });

      expect(mockSetIsRunConfirmDialogOpen).toHaveBeenCalledWith(false);
      expect(mockSaveTabFlow).toHaveBeenCalled();
      expect(mockSetIsProjectSaved).toHaveBeenCalledWith(true);
      expect(validateWorkflow).toHaveBeenCalledWith("/path/to/project");
      expect(startRun).toHaveBeenCalled();
    });

    it("should not save when canvas ref is null", async () => {
      const propsWithNullCanvas = {
        ...defaultProps,
        canvasRef: { current: null },
      };

      const { result } = renderHook(() =>
        useWorkflowExecution(propsWithNullCanvas),
      );

      await act(async () => {
        await result.current.handleRunConfirmSaveAndRun();
      });

      expect(mockSetIsRunConfirmDialogOpen).toHaveBeenCalledWith(false);
      expect(mockSaveTabFlow).not.toHaveBeenCalled();
    });

    it("should not save when activeTabId is null", async () => {
      const propsWithNullTab = {
        ...defaultProps,
        activeTabId: null,
      };

      const { result } = renderHook(() =>
        useWorkflowExecution(propsWithNullTab),
      );

      await act(async () => {
        await result.current.handleRunConfirmSaveAndRun();
      });

      expect(mockSaveTabFlow).not.toHaveBeenCalled();
    });

    it("should not set saved when save fails", async () => {
      mockSaveTabFlow.mockResolvedValue(false);

      const { result } = renderHook(() => useWorkflowExecution(defaultProps));

      await act(async () => {
        await result.current.handleRunConfirmSaveAndRun();
      });

      expect(mockSetIsProjectSaved).not.toHaveBeenCalled();
    });
  });

  describe("handleRunConfirmCancel", () => {
    it("should close the confirm dialog", () => {
      const { result } = renderHook(() => useWorkflowExecution(defaultProps));

      act(() => {
        result.current.handleRunConfirmCancel();
      });

      expect(mockSetIsRunConfirmDialogOpen).toHaveBeenCalledWith(false);
    });
  });

  describe("return value", () => {
    it("should return all expected handlers", () => {
      const { result } = renderHook(() => useWorkflowExecution(defaultProps));

      expect(typeof result.current.executeRunWorkflow).toBe("function");
      expect(typeof result.current.handleRunWorkflow).toBe("function");
      expect(typeof result.current.handleRunConfirmSaveAndRun).toBe("function");
      expect(typeof result.current.handleRunConfirmCancel).toBe("function");
    });
  });
});
