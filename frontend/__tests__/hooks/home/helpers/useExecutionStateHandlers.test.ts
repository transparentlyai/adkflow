import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useExecutionStateHandlers } from "@/hooks/home/helpers/useExecutionStateHandlers";

describe("useExecutionStateHandlers", () => {
  const mockCanvasRef = {
    current: {
      updateNodeExecutionState: vi.fn(),
      updateToolExecutionState: vi.fn(),
      updateUserInputWaitingState: vi.fn(),
      clearExecutionState: vi.fn(),
      clearErrorHighlights: vi.fn(),
    },
  };
  const mockSetIsRunning = vi.fn();
  const mockSetIsRunPanelOpen = vi.fn();
  const mockSetCurrentRunId = vi.fn();

  const defaultProps = {
    canvasRef: mockCanvasRef as any,
    setIsRunning: mockSetIsRunning,
    setIsRunPanelOpen: mockSetIsRunPanelOpen,
    setCurrentRunId: mockSetCurrentRunId,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("handleRunComplete", () => {
    it("should set isRunning to false when run completes", () => {
      const { result } = renderHook(() =>
        useExecutionStateHandlers(defaultProps),
      );

      act(() => {
        result.current.handleRunComplete("completed");
      });

      expect(mockSetIsRunning).toHaveBeenCalledWith(false);
    });

    it("should set isRunning to false for failed status", () => {
      const { result } = renderHook(() =>
        useExecutionStateHandlers(defaultProps),
      );

      act(() => {
        result.current.handleRunComplete("failed");
      });

      expect(mockSetIsRunning).toHaveBeenCalledWith(false);
    });
  });

  describe("handleAgentStateChange", () => {
    it("should update node execution state on canvas", () => {
      const { result } = renderHook(() =>
        useExecutionStateHandlers(defaultProps),
      );

      act(() => {
        result.current.handleAgentStateChange("agent1", "running");
      });

      expect(
        mockCanvasRef.current.updateNodeExecutionState,
      ).toHaveBeenCalledWith("agent1", "running");
    });

    it("should handle null canvas ref", () => {
      const propsWithNullCanvas = {
        ...defaultProps,
        canvasRef: { current: null },
      };

      const { result } = renderHook(() =>
        useExecutionStateHandlers(propsWithNullCanvas),
      );

      // Should not throw
      act(() => {
        result.current.handleAgentStateChange("agent1", "running");
      });
    });
  });

  describe("handleToolStateChange", () => {
    it("should update tool execution state on canvas", () => {
      const { result } = renderHook(() =>
        useExecutionStateHandlers(defaultProps),
      );

      act(() => {
        result.current.handleToolStateChange("tool1", "completed");
      });

      expect(
        mockCanvasRef.current.updateToolExecutionState,
      ).toHaveBeenCalledWith("tool1", "completed");
    });

    it("should handle null canvas ref", () => {
      const propsWithNullCanvas = {
        ...defaultProps,
        canvasRef: { current: null },
      };

      const { result } = renderHook(() =>
        useExecutionStateHandlers(propsWithNullCanvas),
      );

      // Should not throw
      act(() => {
        result.current.handleToolStateChange("tool1", "completed");
      });
    });
  });

  describe("handleUserInputStateChange", () => {
    it("should update user input waiting state when waiting", () => {
      const { result } = renderHook(() =>
        useExecutionStateHandlers(defaultProps),
      );

      act(() => {
        result.current.handleUserInputStateChange("node1", true);
      });

      expect(
        mockCanvasRef.current.updateUserInputWaitingState,
      ).toHaveBeenCalledWith("node1", true);
    });

    it("should update user input waiting state when not waiting", () => {
      const { result } = renderHook(() =>
        useExecutionStateHandlers(defaultProps),
      );

      act(() => {
        result.current.handleUserInputStateChange("node1", false);
      });

      expect(
        mockCanvasRef.current.updateUserInputWaitingState,
      ).toHaveBeenCalledWith("node1", false);
    });

    it("should handle null canvas ref", () => {
      const propsWithNullCanvas = {
        ...defaultProps,
        canvasRef: { current: null },
      };

      const { result } = renderHook(() =>
        useExecutionStateHandlers(propsWithNullCanvas),
      );

      // Should not throw
      act(() => {
        result.current.handleUserInputStateChange("node1", true);
      });
    });
  });

  describe("handleClearExecutionState", () => {
    it("should clear execution state on canvas", () => {
      const { result } = renderHook(() =>
        useExecutionStateHandlers(defaultProps),
      );

      act(() => {
        result.current.handleClearExecutionState();
      });

      expect(mockCanvasRef.current.clearExecutionState).toHaveBeenCalled();
    });

    it("should handle null canvas ref", () => {
      const propsWithNullCanvas = {
        ...defaultProps,
        canvasRef: { current: null },
      };

      const { result } = renderHook(() =>
        useExecutionStateHandlers(propsWithNullCanvas),
      );

      // Should not throw
      act(() => {
        result.current.handleClearExecutionState();
      });
    });
  });

  describe("handleCloseRunPanel", () => {
    it("should close run panel and reset all state", () => {
      const { result } = renderHook(() =>
        useExecutionStateHandlers(defaultProps),
      );

      act(() => {
        result.current.handleCloseRunPanel();
      });

      expect(mockSetIsRunPanelOpen).toHaveBeenCalledWith(false);
      expect(mockSetCurrentRunId).toHaveBeenCalledWith(null);
      expect(mockSetIsRunning).toHaveBeenCalledWith(false);
      expect(mockCanvasRef.current.clearExecutionState).toHaveBeenCalled();
      expect(mockCanvasRef.current.clearErrorHighlights).toHaveBeenCalled();
    });

    it("should handle null canvas ref", () => {
      const propsWithNullCanvas = {
        ...defaultProps,
        canvasRef: { current: null },
      };

      const { result } = renderHook(() =>
        useExecutionStateHandlers(propsWithNullCanvas),
      );

      // Should not throw and still set state
      act(() => {
        result.current.handleCloseRunPanel();
      });

      expect(mockSetIsRunPanelOpen).toHaveBeenCalledWith(false);
      expect(mockSetCurrentRunId).toHaveBeenCalledWith(null);
      expect(mockSetIsRunning).toHaveBeenCalledWith(false);
    });
  });

  describe("return value stability", () => {
    it("should return all expected handlers", () => {
      const { result } = renderHook(() =>
        useExecutionStateHandlers(defaultProps),
      );

      expect(typeof result.current.handleRunComplete).toBe("function");
      expect(typeof result.current.handleAgentStateChange).toBe("function");
      expect(typeof result.current.handleToolStateChange).toBe("function");
      expect(typeof result.current.handleUserInputStateChange).toBe("function");
      expect(typeof result.current.handleClearExecutionState).toBe("function");
      expect(typeof result.current.handleCloseRunPanel).toBe("function");
    });
  });
});
