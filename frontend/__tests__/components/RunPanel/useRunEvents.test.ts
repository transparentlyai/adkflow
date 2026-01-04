import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useRunEvents } from "@/components/RunPanel/useRunEvents";

// Mock the API
vi.mock("@/lib/api", () => ({
  createRunEventSource: vi.fn(),
  getRunStatus: vi.fn(),
}));

import { createRunEventSource, getRunStatus } from "@/lib/api";

describe("useRunEvents", () => {
  let mockEventSource: {
    addEventListener: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    onerror: ((event: Event) => void) | null;
  };

  const mockOnEventsChange = vi.fn();
  const mockOnStatusChange = vi.fn();
  const mockOnRunComplete = vi.fn();
  const mockOnAgentStateChange = vi.fn();
  const mockOnToolStateChange = vi.fn();
  const mockOnUserInputStateChange = vi.fn();
  const mockOnClearExecutionState = vi.fn();
  const mockOnUserInputRequired = vi.fn();
  const mockOnUserInputComplete = vi.fn();

  const defaultProps = {
    runId: "run-123",
    projectPath: "/path/to/project",
    onEventsChange: mockOnEventsChange,
    onStatusChange: mockOnStatusChange,
    onRunComplete: mockOnRunComplete,
    onAgentStateChange: mockOnAgentStateChange,
    onToolStateChange: mockOnToolStateChange,
    onUserInputStateChange: mockOnUserInputStateChange,
    onClearExecutionState: mockOnClearExecutionState,
    onUserInputRequired: mockOnUserInputRequired,
    onUserInputComplete: mockOnUserInputComplete,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockEventSource = {
      addEventListener: vi.fn(),
      close: vi.fn(),
      onerror: null,
    };

    (createRunEventSource as any).mockReturnValue(mockEventSource);
    (getRunStatus as any).mockResolvedValue({
      status: "completed",
      output: "test output",
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initialization", () => {
    it("should not create event source when runId is null", () => {
      const props = { ...defaultProps, runId: null };
      renderHook(() => useRunEvents(props));

      expect(createRunEventSource).not.toHaveBeenCalled();
    });

    it("should create event source when runId is provided", () => {
      renderHook(() => useRunEvents(defaultProps));

      expect(createRunEventSource).toHaveBeenCalledWith("run-123");
    });

    it("should set initial running status", () => {
      renderHook(() => useRunEvents(defaultProps));

      expect(mockOnStatusChange).toHaveBeenCalledWith("running");
    });

    it("should set initial start event", () => {
      renderHook(() => useRunEvents(defaultProps));

      expect(mockOnEventsChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: "info",
            content: expect.stringContaining("run-123"),
          }),
        ]),
      );
    });

    it("should register event listeners for all event types", () => {
      renderHook(() => useRunEvents(defaultProps));

      const eventTypes = [
        "run_start",
        "run_complete",
        "agent_start",
        "agent_end",
        "agent_output",
        "tool_call",
        "tool_result",
        "thinking",
        "run_error",
        "user_input_required",
        "user_input_received",
        "user_input_timeout",
        "complete",
      ];

      eventTypes.forEach((eventType) => {
        expect(mockEventSource.addEventListener).toHaveBeenCalledWith(
          eventType,
          expect.any(Function),
        );
      });
    });
  });

  describe("event handling", () => {
    it("should handle agent_start event", async () => {
      renderHook(() => useRunEvents(defaultProps));

      const agentStartHandler =
        mockEventSource.addEventListener.mock.calls.find(
          ([type]) => type === "agent_start",
        )?.[1];

      act(() => {
        agentStartHandler({
          data: JSON.stringify({
            type: "agent_start",
            agent_name: "TestAgent",
            timestamp: Date.now(),
            data: {},
          }),
        });
      });

      expect(mockOnAgentStateChange).toHaveBeenCalledWith(
        "TestAgent",
        "running",
      );
    });

    it("should handle agent_end event", async () => {
      renderHook(() => useRunEvents(defaultProps));

      const agentEndHandler = mockEventSource.addEventListener.mock.calls.find(
        ([type]) => type === "agent_end",
      )?.[1];

      act(() => {
        agentEndHandler({
          data: JSON.stringify({
            type: "agent_end",
            agent_name: "TestAgent",
            timestamp: Date.now(),
            data: {},
          }),
        });
      });

      expect(mockOnAgentStateChange).toHaveBeenCalledWith(
        "TestAgent",
        "completed",
      );
    });

    it("should handle tool_call event", async () => {
      renderHook(() => useRunEvents(defaultProps));

      const toolCallHandler = mockEventSource.addEventListener.mock.calls.find(
        ([type]) => type === "tool_call",
      )?.[1];

      act(() => {
        toolCallHandler({
          data: JSON.stringify({
            type: "tool_call",
            agent_name: "TestAgent",
            timestamp: Date.now(),
            data: { tool_name: "TestTool" },
          }),
        });
      });

      expect(mockOnToolStateChange).toHaveBeenCalledWith("TestTool", "running");
    });

    it("should handle tool_result event", async () => {
      renderHook(() => useRunEvents(defaultProps));

      const toolResultHandler =
        mockEventSource.addEventListener.mock.calls.find(
          ([type]) => type === "tool_result",
        )?.[1];

      act(() => {
        toolResultHandler({
          data: JSON.stringify({
            type: "tool_result",
            agent_name: "TestAgent",
            timestamp: Date.now(),
            data: { tool_name: "TestTool" },
          }),
        });
      });

      expect(mockOnToolStateChange).toHaveBeenCalledWith(
        "TestTool",
        "completed",
      );
    });

    it("should handle user_input_required event", async () => {
      renderHook(() => useRunEvents(defaultProps));

      const userInputHandler = mockEventSource.addEventListener.mock.calls.find(
        ([type]) => type === "user_input_required",
      )?.[1];

      act(() => {
        userInputHandler({
          data: JSON.stringify({
            type: "user_input_required",
            agent_name: "TestAgent",
            timestamp: Date.now(),
            data: {
              request_id: "req-1",
              node_id: "node-1",
              node_name: "InputNode",
              variable_name: "input",
              is_trigger: false,
              previous_output: null,
              timeout_seconds: 30,
            },
          }),
        });
      });

      expect(mockOnUserInputRequired).toHaveBeenCalledWith(
        expect.objectContaining({
          request_id: "req-1",
          node_id: "node-1",
        }),
      );
      expect(mockOnUserInputStateChange).toHaveBeenCalledWith("node-1", true);
    });

    it("should handle user_input_received event", async () => {
      renderHook(() => useRunEvents(defaultProps));

      const userInputReceivedHandler =
        mockEventSource.addEventListener.mock.calls.find(
          ([type]) => type === "user_input_received",
        )?.[1];

      act(() => {
        userInputReceivedHandler({
          data: JSON.stringify({
            type: "user_input_received",
            agent_name: "TestAgent",
            timestamp: Date.now(),
            data: { node_id: "node-1" },
          }),
        });
      });

      expect(mockOnUserInputStateChange).toHaveBeenCalledWith("node-1", false);
      expect(mockOnUserInputComplete).toHaveBeenCalled();
    });

    it("should handle run_complete event", async () => {
      renderHook(() => useRunEvents(defaultProps));

      const runCompleteHandler =
        mockEventSource.addEventListener.mock.calls.find(
          ([type]) => type === "run_complete",
        )?.[1];

      act(() => {
        runCompleteHandler({
          data: JSON.stringify({
            type: "run_complete",
            agent_name: null,
            timestamp: Date.now(),
            data: {},
          }),
        });
      });

      expect(mockOnStatusChange).toHaveBeenCalledWith("completed");
      expect(mockOnClearExecutionState).toHaveBeenCalled();
      expect(mockOnUserInputComplete).toHaveBeenCalled();
    });

    it("should handle run_error event", async () => {
      renderHook(() => useRunEvents(defaultProps));

      const runErrorHandler = mockEventSource.addEventListener.mock.calls.find(
        ([type]) => type === "run_error",
      )?.[1];

      act(() => {
        runErrorHandler({
          data: JSON.stringify({
            type: "run_error",
            agent_name: "TestAgent",
            timestamp: Date.now(),
            data: { error: "Something went wrong" },
          }),
        });
      });

      expect(mockOnStatusChange).toHaveBeenCalledWith("failed");
      expect(mockOnAgentStateChange).toHaveBeenCalledWith("TestAgent", "error");
      expect(mockOnClearExecutionState).toHaveBeenCalled();
    });
  });

  describe("completion handling", () => {
    it("should handle complete event", async () => {
      renderHook(() => useRunEvents(defaultProps));

      const completeHandler = mockEventSource.addEventListener.mock.calls.find(
        ([type]) => type === "complete",
      )?.[1];

      await act(async () => {
        completeHandler({});
      });

      expect(mockEventSource.close).toHaveBeenCalled();
      await waitFor(() => {
        expect(mockOnRunComplete).toHaveBeenCalledWith(
          "completed",
          "test output",
          null,
        );
      });
    });
  });

  describe("error handling", () => {
    it("should handle connection error with failed status", async () => {
      (getRunStatus as any).mockResolvedValue({
        status: "failed",
        output: null,
        error: "Run failed",
      });

      renderHook(() => useRunEvents(defaultProps));

      await act(async () => {
        mockEventSource.onerror?.(new Event("error"));
      });

      expect(mockEventSource.close).toHaveBeenCalled();
      await waitFor(() => {
        expect(mockOnStatusChange).toHaveBeenCalledWith("failed");
      });
    });

    it("should handle connection error with completed status", async () => {
      renderHook(() => useRunEvents(defaultProps));

      await act(async () => {
        mockEventSource.onerror?.(new Event("error"));
      });

      expect(mockEventSource.close).toHaveBeenCalled();
      await waitFor(() => {
        expect(mockOnStatusChange).toHaveBeenCalledWith("completed");
        expect(mockOnRunComplete).toHaveBeenCalled();
      });
    });

    it("should handle getRunStatus error", async () => {
      (getRunStatus as any).mockRejectedValue(new Error("Network error"));

      renderHook(() => useRunEvents(defaultProps));

      await act(async () => {
        mockEventSource.onerror?.(new Event("error"));
      });

      await waitFor(() => {
        expect(mockOnStatusChange).toHaveBeenCalledWith("failed");
        expect(mockOnClearExecutionState).toHaveBeenCalled();
      });
    });

    it("should handle unknown status from getRunStatus", async () => {
      // When status is neither 'failed' nor 'completed', show connection lost message
      (getRunStatus as any).mockResolvedValue({
        status: "running",
        output: null,
        error: null,
      });

      renderHook(() => useRunEvents(defaultProps));

      await act(async () => {
        mockEventSource.onerror?.(new Event("error"));
      });

      await waitFor(() => {
        expect(mockOnEventsChange).toHaveBeenCalled();
        expect(mockOnStatusChange).toHaveBeenCalledWith("failed");
        expect(mockOnClearExecutionState).toHaveBeenCalled();
      });
    });
  });

  describe("cleanup", () => {
    it("should close event source on unmount", () => {
      const { unmount } = renderHook(() => useRunEvents(defaultProps));

      unmount();

      expect(mockEventSource.close).toHaveBeenCalled();
    });
  });
});
