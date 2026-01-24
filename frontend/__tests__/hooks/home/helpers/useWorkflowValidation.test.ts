import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWorkflowValidation } from "@/hooks/home/helpers/useWorkflowValidation";
import {
  createMockCanvasRef,
  createMockSetters,
  createDefaultProps,
  setupDefaultMocks,
} from "./useWorkflowValidation.fixtures";

vi.mock("@/lib/api", () => ({
  validateWorkflow: vi.fn(),
}));

import { validateWorkflow } from "@/lib/api";

describe("useWorkflowValidation", () => {
  const mockCanvasRef = createMockCanvasRef();
  const mockSetters = createMockSetters();
  const defaultProps = createDefaultProps(mockCanvasRef, mockSetters);

  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks(validateWorkflow, mockCanvasRef, mockSetters);
  });

  describe("showErrorsInConsole", () => {
    it("should clear error highlights and set error events", () => {
      const { result } = renderHook(() => useWorkflowValidation(defaultProps));

      act(() => {
        result.current.showErrorsInConsole(["Error 1", "Error 2"]);
      });

      expect(mockCanvasRef.current.clearErrorHighlights).toHaveBeenCalled();
      expect(mockSetters.mockSetRunEvents).toHaveBeenCalledWith(
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
      expect(mockSetters.mockSetLastRunStatus).toHaveBeenCalledWith("failed");
      expect(mockSetters.mockSetIsRunPanelOpen).toHaveBeenCalledWith(true);
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

      expect(mockSetters.mockSetIsValidationSaveDialogOpen).toHaveBeenCalledWith(true);
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

      expect(mockSetters.mockSetIsValidationSaveDialogOpen).toHaveBeenCalledWith(true);
      expect(validateWorkflow).not.toHaveBeenCalled();
    });

    it("should directly validate when saved", async () => {
      const { result } = renderHook(() => useWorkflowValidation(defaultProps));

      await act(async () => {
        await result.current.handleValidateWorkflow();
      });

      expect(mockSetters.mockSetIsValidationSaveDialogOpen).not.toHaveBeenCalled();
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

      expect(mockSetters.mockSetIsValidationSaveDialogOpen).toHaveBeenCalledWith(false);
      expect(mockSetters.mockSaveTabFlow).toHaveBeenCalled();
      expect(mockSetters.mockSetIsProjectSaved).toHaveBeenCalledWith(true);
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

      expect(mockSetters.mockSetIsValidationSaveDialogOpen).toHaveBeenCalledWith(false);
      expect(mockSetters.mockSaveTabFlow).not.toHaveBeenCalled();
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

      expect(mockSetters.mockSaveTabFlow).not.toHaveBeenCalled();
    });

    it("should not set saved when save fails", async () => {
      mockSetters.mockSaveTabFlow.mockResolvedValue(false);

      const { result } = renderHook(() => useWorkflowValidation(defaultProps));

      await act(async () => {
        await result.current.handleValidationSaveAndValidate();
      });

      expect(mockSetters.mockSetIsProjectSaved).not.toHaveBeenCalled();
    });
  });

  describe("handleValidationSaveCancel", () => {
    it("should close the save dialog", () => {
      const { result } = renderHook(() => useWorkflowValidation(defaultProps));

      act(() => {
        result.current.handleValidationSaveCancel();
      });

      expect(mockSetters.mockSetIsValidationSaveDialogOpen).toHaveBeenCalledWith(false);
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
