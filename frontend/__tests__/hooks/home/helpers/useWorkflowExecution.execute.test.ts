import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWorkflowExecution } from "@/hooks/home/helpers/useWorkflowExecution";

vi.mock("@/lib/api", () => ({
  validateWorkflow: vi.fn(),
  startRun: vi.fn(),
}));

import { validateWorkflow, startRun } from "@/lib/api";

describe("useWorkflowExecution - executeRunWorkflow", () => {
  const mockCanvasRef = {
    current: {
      clearErrorHighlights: vi.fn(),
      clearAllMonitors: vi.fn(),
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

  it("should validate and start run for valid workflow", async () => {
    const { result } = renderHook(() => useWorkflowExecution(defaultProps));

    await act(async () => {
      await result.current.executeRunWorkflow();
    });

    expect(mockCanvasRef.current.clearErrorHighlights).toHaveBeenCalled();
    expect(mockCanvasRef.current.clearAllMonitors).toHaveBeenCalled();
    expect(validateWorkflow).toHaveBeenCalledWith("/path/to/project");
    expect(mockSetIsRunning).toHaveBeenCalledWith(true);
    expect(startRun).toHaveBeenCalledWith({
      project_path: "/path/to/project",
      tab_id: "tab1",
    });
    expect(mockSetCurrentRunId).toHaveBeenCalledWith("run-123");
    expect(mockSetIsRunPanelOpen).toHaveBeenCalledWith(true);
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
      await result.current.executeRunWorkflow();
    });

    expect(validateWorkflow).not.toHaveBeenCalled();
    expect(startRun).not.toHaveBeenCalled();
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
      await result.current.executeRunWorkflow();
    });

    expect(validateWorkflow).not.toHaveBeenCalled();
    expect(startRun).not.toHaveBeenCalled();
  });

  it("should show errors for invalid workflow", async () => {
    (validateWorkflow as any).mockResolvedValue({
      valid: false,
      errors: ["Error 1"],
      warnings: ["Warning 1"],
      agent_count: 0,
      tab_count: 0,
      node_errors: {},
      node_warnings: {},
    });

    const { result } = renderHook(() => useWorkflowExecution(defaultProps));

    await act(async () => {
      await result.current.executeRunWorkflow();
    });

    expect(mockSetRunEvents).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          type: "run_error",
          content: "Error 1",
        }),
        expect.objectContaining({
          type: "warning",
          content: "Warning 1",
        }),
      ]),
    );
    expect(mockSetLastRunStatus).toHaveBeenCalledWith("failed");
    expect(startRun).not.toHaveBeenCalled();
  });

  it("should highlight error and warning nodes", async () => {
    const nodeErrors = { node1: ["error1"] };
    const nodeWarnings = { node2: ["warning1"] };
    (validateWorkflow as any).mockResolvedValue({
      valid: true,
      errors: [],
      warnings: [],
      agent_count: 0,
      tab_count: 0,
      node_errors: nodeErrors,
      node_warnings: nodeWarnings,
    });

    const { result } = renderHook(() => useWorkflowExecution(defaultProps));

    await act(async () => {
      await result.current.executeRunWorkflow();
    });

    expect(mockCanvasRef.current.highlightErrorNodes).toHaveBeenCalledWith(
      nodeErrors,
    );
    expect(mockCanvasRef.current.highlightWarningNodes).toHaveBeenCalledWith(
      nodeWarnings,
    );
  });

  it("should handle validation error", async () => {
    (validateWorkflow as any).mockRejectedValue(new Error("Validation failed"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useWorkflowExecution(defaultProps));

    await act(async () => {
      await result.current.executeRunWorkflow();
    });

    expect(consoleSpy).toHaveBeenCalled();
    expect(mockSetRunEvents).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          type: "run_error",
          content: expect.stringContaining("Validation failed"),
        }),
      ]),
    );
    expect(mockSetLastRunStatus).toHaveBeenCalledWith("failed");
    expect(startRun).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should handle startRun error", async () => {
    (startRun as any).mockRejectedValue(new Error("Start failed"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useWorkflowExecution(defaultProps));

    await act(async () => {
      await result.current.executeRunWorkflow();
    });

    expect(mockSetIsRunning).toHaveBeenCalledWith(true);
    expect(mockSetRunEvents).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          type: "run_error",
          content: expect.stringContaining("Failed to start workflow"),
        }),
      ]),
    );
    expect(mockSetLastRunStatus).toHaveBeenCalledWith("failed");
    expect(mockSetIsRunning).toHaveBeenCalledWith(false);

    consoleSpy.mockRestore();
  });

  it("should pass undefined tab_id when activeTabId is null", async () => {
    const propsWithNullTab = {
      ...defaultProps,
      activeTabId: null,
    };

    const { result } = renderHook(() => useWorkflowExecution(propsWithNullTab));

    await act(async () => {
      await result.current.executeRunWorkflow();
    });

    expect(startRun).toHaveBeenCalledWith({
      project_path: "/path/to/project",
      tab_id: undefined,
    });
  });
});
