import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWorkflowValidation } from "@/hooks/home/helpers/useWorkflowValidation";

vi.mock("@/lib/api", () => ({
  validateWorkflow: vi.fn(),
}));

import { validateWorkflow } from "@/lib/api";

describe("useWorkflowValidation", () => {
  const mockCanvasRef = {
    current: {
      clearErrorHighlights: vi.fn(),
      highlightErrorNodes: vi.fn(),
      highlightWarningNodes: vi.fn(),
      saveFlow: vi.fn(),
    },
  };

  const mockSetRunEvents = vi.fn();
  const mockSetLastRunStatus = vi.fn();
  const mockSetIsRunPanelOpen = vi.fn();
  const mockSetIsValidationSaveDialogOpen = vi.fn();
  const mockSetIsProjectSaved = vi.fn();
  const mockSaveTabFlow = vi.fn();

  const defaultProps = {
    canvasRef: mockCanvasRef as any,
    currentProjectPath: "/path/to/project",
    activeTabId: "tab1",
    activeTab: { id: "tab1", name: "Tab 1", hasUnsavedChanges: false },
    workflowName: "Test Workflow",
    isProjectSaved: true,
    setRunEvents: mockSetRunEvents,
    setLastRunStatus: mockSetLastRunStatus,
    setIsRunPanelOpen: mockSetIsRunPanelOpen,
    setIsValidationSaveDialogOpen: mockSetIsValidationSaveDialogOpen,
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
    mockSaveTabFlow.mockResolvedValue(true);
    mockCanvasRef.current.saveFlow.mockReturnValue({
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    });
  });

  describe("showErrorsInConsole", () => {
    it("should clear error highlights and set error events", () => {
      const { result } = renderHook(() => useWorkflowValidation(defaultProps));

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

    it("should highlight error nodes when nodeErrors provided", () => {
      const { result } = renderHook(() => useWorkflowValidation(defaultProps));
      const nodeErrors = { node1: ["error1"], node2: ["error2"] };

      act(() => {
        result.current.showErrorsInConsole(["Error"], nodeErrors);
      });

      expect(mockCanvasRef.current.highlightErrorNodes).toHaveBeenCalledWith(
        nodeErrors,
      );
    });

    it("should not highlight nodes when nodeErrors is empty", () => {
      const { result } = renderHook(() => useWorkflowValidation(defaultProps));

      act(() => {
        result.current.showErrorsInConsole(["Error"], {});
      });

      expect(mockCanvasRef.current.highlightErrorNodes).not.toHaveBeenCalled();
    });
  });

  describe("executeValidateWorkflow", () => {
    it("should validate and show success for valid workflow", async () => {
      const { result } = renderHook(() => useWorkflowValidation(defaultProps));

      await act(async () => {
        await result.current.executeValidateWorkflow();
      });

      expect(validateWorkflow).toHaveBeenCalledWith("/path/to/project");
      expect(mockSetRunEvents).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: "info",
            content: expect.stringContaining("Validation passed"),
          }),
        ]),
      );
      expect(mockSetLastRunStatus).toHaveBeenCalledWith("completed");
      expect(mockSetIsRunPanelOpen).toHaveBeenCalledWith(true);
    });

    it("should show errors and warnings", async () => {
      (validateWorkflow as any).mockResolvedValue({
        valid: false,
        errors: ["Error 1"],
        warnings: ["Warning 1"],
        agent_count: 0,
        tab_count: 0,
        node_errors: {},
        node_warnings: {},
      });

      const { result } = renderHook(() => useWorkflowValidation(defaultProps));

      await act(async () => {
        await result.current.executeValidateWorkflow();
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
    });

    it("should highlight error nodes", async () => {
      const nodeErrors = { node1: ["error1"] };
      (validateWorkflow as any).mockResolvedValue({
        valid: false,
        errors: [],
        warnings: [],
        agent_count: 0,
        tab_count: 0,
        node_errors: nodeErrors,
        node_warnings: {},
      });

      const { result } = renderHook(() => useWorkflowValidation(defaultProps));

      await act(async () => {
        await result.current.executeValidateWorkflow();
      });

      expect(mockCanvasRef.current.highlightErrorNodes).toHaveBeenCalledWith(
        nodeErrors,
      );
    });

    it("should highlight warning nodes", async () => {
      const nodeWarnings = { node1: ["warning1"] };
      (validateWorkflow as any).mockResolvedValue({
        valid: true,
        errors: [],
        warnings: [],
        agent_count: 0,
        tab_count: 0,
        node_errors: {},
        node_warnings: nodeWarnings,
      });

      const { result } = renderHook(() => useWorkflowValidation(defaultProps));

      await act(async () => {
        await result.current.executeValidateWorkflow();
      });

      expect(mockCanvasRef.current.highlightWarningNodes).toHaveBeenCalledWith(
        nodeWarnings,
      );
    });

    it("should not call API when project path is null", async () => {
      const propsWithNullPath = {
        ...defaultProps,
        currentProjectPath: null,
      };

      const { result } = renderHook(() =>
        useWorkflowValidation(propsWithNullPath),
      );

      await act(async () => {
        await result.current.executeValidateWorkflow();
      });

      expect(validateWorkflow).not.toHaveBeenCalled();
    });

    it("should handle API error", async () => {
      (validateWorkflow as any).mockRejectedValue(
        new Error("Validation failed"),
      );
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const { result } = renderHook(() => useWorkflowValidation(defaultProps));

      await act(async () => {
        await result.current.executeValidateWorkflow();
      });

      expect(consoleSpy).toHaveBeenCalled();
      expect(mockSetRunEvents).toHaveBeenCalled();
      expect(mockSetLastRunStatus).toHaveBeenCalledWith("failed");

      consoleSpy.mockRestore();
    });
  });

  describe("handleValidateWorkflow", () => {
    it("should open save dialog when there are unsaved changes", async () => {
      const propsWithUnsavedChanges = {
        ...defaultProps,
        activeTab: { id: "tab1", name: "Tab 1", hasUnsavedChanges: true },
      };

      const { result } = renderHook(() =>
        useWorkflowValidation(propsWithUnsavedChanges),
      );

      await act(async () => {
        await result.current.handleValidateWorkflow();
      });

      expect(mockSetIsValidationSaveDialogOpen).toHaveBeenCalledWith(true);
      expect(validateWorkflow).not.toHaveBeenCalled();
    });

    it("should open save dialog when project is not saved", async () => {
      const propsWithUnsavedProject = {
        ...defaultProps,
        isProjectSaved: false,
      };

      const { result } = renderHook(() =>
        useWorkflowValidation(propsWithUnsavedProject),
      );

      await act(async () => {
        await result.current.handleValidateWorkflow();
      });

      expect(mockSetIsValidationSaveDialogOpen).toHaveBeenCalledWith(true);
      expect(validateWorkflow).not.toHaveBeenCalled();
    });

    it("should directly validate when saved", async () => {
      const { result } = renderHook(() => useWorkflowValidation(defaultProps));

      await act(async () => {
        await result.current.handleValidateWorkflow();
      });

      expect(mockSetIsValidationSaveDialogOpen).not.toHaveBeenCalled();
      expect(validateWorkflow).toHaveBeenCalledWith("/path/to/project");
    });

    it("should not execute when project path is null", async () => {
      const propsWithNullPath = {
        ...defaultProps,
        currentProjectPath: null,
      };

      const { result } = renderHook(() =>
        useWorkflowValidation(propsWithNullPath),
      );

      await act(async () => {
        await result.current.handleValidateWorkflow();
      });

      expect(validateWorkflow).not.toHaveBeenCalled();
    });
  });

  describe("handleValidationSaveAndValidate", () => {
    it("should save flow and validate", async () => {
      const { result } = renderHook(() => useWorkflowValidation(defaultProps));

      await act(async () => {
        await result.current.handleValidationSaveAndValidate();
      });

      expect(mockSetIsValidationSaveDialogOpen).toHaveBeenCalledWith(false);
      expect(mockSaveTabFlow).toHaveBeenCalled();
      expect(mockSetIsProjectSaved).toHaveBeenCalledWith(true);
      expect(validateWorkflow).toHaveBeenCalledWith("/path/to/project");
    });

    it("should not save when canvas ref is null", async () => {
      const propsWithNullCanvas = {
        ...defaultProps,
        canvasRef: { current: null },
      };

      const { result } = renderHook(() =>
        useWorkflowValidation(propsWithNullCanvas),
      );

      await act(async () => {
        await result.current.handleValidationSaveAndValidate();
      });

      expect(mockSetIsValidationSaveDialogOpen).toHaveBeenCalledWith(false);
      expect(mockSaveTabFlow).not.toHaveBeenCalled();
    });

    it("should not save when activeTabId is null", async () => {
      const propsWithNullTab = {
        ...defaultProps,
        activeTabId: null,
      };

      const { result } = renderHook(() =>
        useWorkflowValidation(propsWithNullTab),
      );

      await act(async () => {
        await result.current.handleValidationSaveAndValidate();
      });

      expect(mockSaveTabFlow).not.toHaveBeenCalled();
    });

    it("should not set saved when save fails", async () => {
      mockSaveTabFlow.mockResolvedValue(false);

      const { result } = renderHook(() => useWorkflowValidation(defaultProps));

      await act(async () => {
        await result.current.handleValidationSaveAndValidate();
      });

      expect(mockSetIsProjectSaved).not.toHaveBeenCalled();
    });
  });

  describe("handleValidationSaveCancel", () => {
    it("should close the save dialog", () => {
      const { result } = renderHook(() => useWorkflowValidation(defaultProps));

      act(() => {
        result.current.handleValidationSaveCancel();
      });

      expect(mockSetIsValidationSaveDialogOpen).toHaveBeenCalledWith(false);
    });
  });

  describe("return value", () => {
    it("should return all expected handlers", () => {
      const { result } = renderHook(() => useWorkflowValidation(defaultProps));

      expect(typeof result.current.showErrorsInConsole).toBe("function");
      expect(typeof result.current.executeValidateWorkflow).toBe("function");
      expect(typeof result.current.handleValidateWorkflow).toBe("function");
      expect(typeof result.current.handleValidationSaveAndValidate).toBe(
        "function",
      );
      expect(typeof result.current.handleValidationSaveCancel).toBe("function");
    });
  });
});
