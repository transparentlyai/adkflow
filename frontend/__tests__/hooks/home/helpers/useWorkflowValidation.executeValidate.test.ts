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

describe("useWorkflowValidation - executeValidateWorkflow", () => {
  const mockCanvasRef = createMockCanvasRef();
  const mockSetters = createMockSetters();
  const defaultProps = createDefaultProps(mockCanvasRef, mockSetters);

  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks(validateWorkflow, mockCanvasRef, mockSetters);
  });

  it("should validate and show success for valid workflow", async () => {
    const { result } = renderHook(() => useWorkflowValidation(defaultProps));

    await act(async () => {
      await result.current.executeValidateWorkflow();
    });

    expect(validateWorkflow).toHaveBeenCalledWith("/path/to/project");
    expect(mockSetters.mockSetRunEvents).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          type: "info",
          content: expect.stringContaining("Validation passed"),
        }),
      ]),
    );
    expect(mockSetters.mockSetLastRunStatus).toHaveBeenCalledWith("completed");
    expect(mockSetters.mockSetIsRunPanelOpen).toHaveBeenCalledWith(true);
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

    expect(mockSetters.mockSetRunEvents).toHaveBeenCalledWith(
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
    expect(mockSetters.mockSetLastRunStatus).toHaveBeenCalledWith("failed");
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
    expect(mockSetters.mockSetRunEvents).toHaveBeenCalled();
    expect(mockSetters.mockSetLastRunStatus).toHaveBeenCalledWith("failed");

    consoleSpy.mockRestore();
  });
});
