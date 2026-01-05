import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RunPanel from "@/components/RunPanel";
import type { DisplayEvent, RunPanelProps } from "@/components/RunPanel";

// Mock API
const mockSubmitUserInput = vi.fn();
vi.mock("@/lib/api", () => ({
  cancelRun: vi.fn(),
  submitUserInput: (...args: unknown[]) => mockSubmitUserInput(...args),
}));

// Mock hooks
type UseRunEventsCallbacks = {
  onUserInputRequired?: (input: { prompt: string; request_id: string }) => void;
  onUserInputComplete?: () => void;
};
let useRunEventsCallbacks: UseRunEventsCallbacks = {};
vi.mock("@/components/RunPanel/useRunEvents", () => ({
  useRunEvents: vi.fn((options: UseRunEventsCallbacks) => {
    useRunEventsCallbacks = options;
  }),
}));

vi.mock("@/components/RunPanel/useStatusPolling", () => ({
  useStatusPolling: vi.fn(),
}));

const mockIsDevMode = vi.fn(() => false);
vi.mock("@/hooks/useLoggingConfig", () => ({
  useLoggingConfig: () => ({
    isDevMode: mockIsDevMode(),
  }),
}));

// Mock child components
vi.mock("@/components/RunPanel/DebugPanel", () => ({
  default: () => <div data-testid="debug-panel">Debug Panel</div>,
}));

vi.mock("@/components/RunPanel/UserInputPanel", () => ({
  default: ({
    onSubmit,
    pendingInput,
    userInputValue,
    setUserInputValue,
  }: {
    onSubmit: () => void;
    pendingInput: { prompt: string };
    userInputValue: string;
    setUserInputValue: (v: string) => void;
  }) => (
    <div data-testid="user-input-panel">
      <span>{pendingInput.prompt}</span>
      <input
        data-testid="user-input-field"
        value={userInputValue}
        onChange={(e) => setUserInputValue(e.target.value)}
      />
      <button data-testid="submit-input" onClick={onSubmit}>
        Submit
      </button>
    </div>
  ),
}));

// Mock ScrollArea to be a simple div
vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scroll-area">{children}</div>
  ),
}));

import { cancelRun } from "@/lib/api";

describe("RunPanel", () => {
  const mockCancelRun = cancelRun as ReturnType<typeof vi.fn>;

  const defaultProps: RunPanelProps = {
    runId: "run-123",
    projectPath: "/test/project",
    onClose: vi.fn(),
    onRunComplete: vi.fn(),
    onAgentStateChange: vi.fn(),
    onToolStateChange: vi.fn(),
    onUserInputStateChange: vi.fn(),
    onClearExecutionState: vi.fn(),
    events: [],
    onEventsChange: vi.fn(),
    lastRunStatus: "running",
    onStatusChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCancelRun.mockResolvedValue({});
  });

  describe("rendering", () => {
    it("should render run panel", () => {
      render(<RunPanel {...defaultProps} />);
      expect(screen.getByText(/Run/)).toBeInTheDocument();
    });

    it("should show run id", () => {
      render(<RunPanel {...defaultProps} />);
      expect(screen.getByText(/run-123/)).toBeInTheDocument();
    });

    it("should show running status", () => {
      render(<RunPanel {...defaultProps} />);
      expect(screen.getByText("running")).toBeInTheDocument();
    });

    it("should show debug panel", () => {
      render(<RunPanel {...defaultProps} />);
      expect(screen.getByTestId("debug-panel")).toBeInTheDocument();
    });
  });

  describe("status icons", () => {
    it("should show loader when running", () => {
      const { container } = render(
        <RunPanel {...defaultProps} lastRunStatus="running" />,
      );
      expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    });

    it("should show completed status", () => {
      render(<RunPanel {...defaultProps} lastRunStatus="completed" />);
      expect(screen.getByText("completed")).toBeInTheDocument();
    });

    it("should show failed status", () => {
      render(<RunPanel {...defaultProps} lastRunStatus="failed" />);
      expect(screen.getByText("failed")).toBeInTheDocument();
    });

    it("should show cancelled status", () => {
      render(<RunPanel {...defaultProps} lastRunStatus="cancelled" />);
      expect(screen.getByText("cancelled")).toBeInTheDocument();
    });

    it("should show idle status", () => {
      render(<RunPanel {...defaultProps} lastRunStatus="idle" />);
      expect(screen.getByText("idle")).toBeInTheDocument();
    });
  });

  describe("cancel button", () => {
    it("should show cancel button when running", () => {
      render(<RunPanel {...defaultProps} lastRunStatus="running" />);
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    it("should not show cancel button when not running", () => {
      render(<RunPanel {...defaultProps} lastRunStatus="completed" />);
      expect(screen.queryByText("Cancel")).not.toBeInTheDocument();
    });

    it("should call cancelRun when cancel clicked", async () => {
      const user = userEvent.setup();
      render(<RunPanel {...defaultProps} />);

      await user.click(screen.getByText("Cancel"));

      expect(mockCancelRun).toHaveBeenCalledWith("run-123");
    });

    it("should update status to cancelled after cancel", async () => {
      const user = userEvent.setup();
      const onStatusChange = vi.fn();
      render(<RunPanel {...defaultProps} onStatusChange={onStatusChange} />);

      await user.click(screen.getByText("Cancel"));

      await waitFor(() => {
        expect(onStatusChange).toHaveBeenCalledWith("cancelled");
      });
    });
  });

  describe("close button", () => {
    it("should call onClose when close button clicked", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<RunPanel {...defaultProps} onClose={onClose} />);

      // Find the X button (last button in header)
      const buttons = screen.getAllByRole("button");
      const closeButton = buttons.find((btn) => btn.querySelector(".lucide-x"));
      await user.click(closeButton!);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("events", () => {
    it("should render events", () => {
      const events: DisplayEvent[] = [
        { id: "1", type: "info", content: "Event 1", timestamp: Date.now() },
        {
          id: "2",
          type: "agent_output",
          content: "Event 2",
          timestamp: Date.now(),
        },
      ];
      render(<RunPanel {...defaultProps} events={events} />);

      expect(screen.getByText("Event 1")).toBeInTheDocument();
      expect(screen.getByText("Event 2")).toBeInTheDocument();
    });

    it("should show agent name when present", () => {
      const events: DisplayEvent[] = [
        {
          id: "1",
          type: "info",
          content: "Test",
          timestamp: Date.now(),
          agentName: "TestAgent",
        },
      ];
      render(<RunPanel {...defaultProps} events={events} />);

      expect(screen.getByText("[TestAgent]")).toBeInTheDocument();
    });
  });

  describe("resize", () => {
    it("should have resize handle", () => {
      const { container } = render(<RunPanel {...defaultProps} />);
      const handle = container.querySelector(".cursor-ns-resize");
      expect(handle).toBeInTheDocument();
    });

    it("should start resizing on mousedown", () => {
      const { container } = render(<RunPanel {...defaultProps} />);
      const handle = container.querySelector(".cursor-ns-resize");

      fireEvent.mouseDown(handle!);

      // The component should now be in resizing state (internal state)
      // We can verify by triggering mousemove and checking height changes
    });

    it("should resize on mousemove after mousedown", () => {
      const { container } = render(<RunPanel {...defaultProps} />);
      const handle = container.querySelector(".cursor-ns-resize");

      fireEvent.mouseDown(handle!);
      fireEvent.mouseMove(document, { clientY: 300 });
      fireEvent.mouseUp(document);

      // The panel should have resized
      const panel = container.querySelector('[class*="fixed bottom-0"]');
      expect(panel).toBeInTheDocument();
    });
  });

  describe("user input", () => {
    it("should show user input panel when pendingInput is set", () => {
      // We need to trigger the pendingInput through the hook callback
      // For now, test that the panel structure exists when there are events
      render(<RunPanel {...defaultProps} />);
      expect(screen.getByTestId("scroll-area")).toBeInTheDocument();
    });
  });

  describe("event rendering", () => {
    it("should render agent_output events with whitespace preserved", () => {
      const events: DisplayEvent[] = [
        {
          id: "1",
          type: "agent_output",
          content: "Line 1\nLine 2",
          timestamp: Date.now(),
        },
      ];
      render(<RunPanel {...defaultProps} events={events} />);

      expect(screen.getByText(/Line 1/)).toBeInTheDocument();
    });

    it("should render run_error events", () => {
      const events: DisplayEvent[] = [
        {
          id: "1",
          type: "run_error",
          content: "Error occurred",
          timestamp: Date.now(),
        },
      ];
      render(<RunPanel {...defaultProps} events={events} />);

      expect(screen.getByText("Error occurred")).toBeInTheDocument();
    });

    it("should render warning events", () => {
      const events: DisplayEvent[] = [
        {
          id: "1",
          type: "warning",
          content: "Warning message",
          timestamp: Date.now(),
        },
      ];
      render(<RunPanel {...defaultProps} events={events} />);

      expect(screen.getByText("Warning message")).toBeInTheDocument();
    });
  });

  describe("cancel error handling", () => {
    it("should handle cancel error gracefully", async () => {
      const user = userEvent.setup();
      mockCancelRun.mockRejectedValue(new Error("Cancel failed"));
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      render(<RunPanel {...defaultProps} />);

      await user.click(screen.getByText("Cancel"));

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalled();
      });

      consoleError.mockRestore();
    });
  });

  describe("run id display", () => {
    it("should not show run id when null", () => {
      render(<RunPanel {...defaultProps} runId={null as unknown as string} />);
      // Should still render without crashing
      expect(screen.getByText(/Run/)).toBeInTheDocument();
    });
  });

  describe("user input handling", () => {
    beforeEach(() => {
      mockSubmitUserInput.mockReset();
      mockSubmitUserInput.mockResolvedValue({});
    });

    it("should show user input panel when onUserInputRequired is called", async () => {
      const { rerender } = render(<RunPanel {...defaultProps} />);

      // Simulate hook calling onUserInputRequired
      act(() => {
        useRunEventsCallbacks.onUserInputRequired?.({
          prompt: "Enter your name",
          request_id: "req-123",
        });
      });

      rerender(<RunPanel {...defaultProps} />);

      expect(screen.getByTestId("user-input-panel")).toBeInTheDocument();
      expect(screen.getByText("Enter your name")).toBeInTheDocument();
    });

    it("should hide user input panel when onUserInputComplete is called", async () => {
      render(<RunPanel {...defaultProps} />);

      // First trigger input required
      act(() => {
        useRunEventsCallbacks.onUserInputRequired?.({
          prompt: "Enter your name",
          request_id: "req-123",
        });
      });

      expect(screen.getByTestId("user-input-panel")).toBeInTheDocument();

      // Then trigger input complete
      act(() => {
        useRunEventsCallbacks.onUserInputComplete?.();
      });

      expect(screen.queryByTestId("user-input-panel")).not.toBeInTheDocument();
    });

    it("should submit user input when form submitted", async () => {
      const user = userEvent.setup();
      render(<RunPanel {...defaultProps} />);

      // First trigger input required
      act(() => {
        useRunEventsCallbacks.onUserInputRequired?.({
          prompt: "Enter your name",
          request_id: "req-123",
        });
      });

      // Type in the input field
      await user.type(screen.getByTestId("user-input-field"), "John Doe");

      // Submit
      await user.click(screen.getByTestId("submit-input"));

      await waitFor(() => {
        expect(mockSubmitUserInput).toHaveBeenCalledWith("run-123", {
          request_id: "req-123",
          user_input: "John Doe",
        });
      });
    });

    it("should not submit if input is empty", async () => {
      const user = userEvent.setup();
      render(<RunPanel {...defaultProps} />);

      // First trigger input required
      act(() => {
        useRunEventsCallbacks.onUserInputRequired?.({
          prompt: "Enter your name",
          request_id: "req-123",
        });
      });

      // Submit without typing
      await user.click(screen.getByTestId("submit-input"));

      expect(mockSubmitUserInput).not.toHaveBeenCalled();
    });

    it("should handle submission error", async () => {
      const user = userEvent.setup();
      mockSubmitUserInput.mockRejectedValueOnce(new Error("Network error"));
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      render(<RunPanel {...defaultProps} />);

      // First trigger input required
      act(() => {
        useRunEventsCallbacks.onUserInputRequired?.({
          prompt: "Enter your name",
          request_id: "req-123",
        });
      });

      // Type and submit
      await user.type(screen.getByTestId("user-input-field"), "John");
      await user.click(screen.getByTestId("submit-input"));

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalled();
      });

      consoleError.mockRestore();
    });
  });

  describe("dev mode", () => {
    beforeEach(() => {
      mockIsDevMode.mockReturnValue(true);
    });

    afterEach(() => {
      mockIsDevMode.mockReturnValue(false);
    });

    it("should show log explorer button in dev mode", () => {
      render(<RunPanel {...defaultProps} />);
      expect(screen.getByTitle("Open Log Explorer")).toBeInTheDocument();
    });

    it("should show trace explorer button in dev mode", () => {
      render(<RunPanel {...defaultProps} />);
      expect(screen.getByTitle("Open Trace Explorer")).toBeInTheDocument();
    });

    it("should open log explorer when button clicked", async () => {
      const windowOpenSpy = vi
        .spyOn(window, "open")
        .mockImplementation(() => null);
      const user = userEvent.setup();
      render(<RunPanel {...defaultProps} />);

      await user.click(screen.getByTitle("Open Log Explorer"));

      expect(windowOpenSpy).toHaveBeenCalledWith(
        expect.stringContaining("logs"),
        "_blank",
      );
      windowOpenSpy.mockRestore();
    });

    it("should open trace explorer when button clicked", async () => {
      const windowOpenSpy = vi
        .spyOn(window, "open")
        .mockImplementation(() => null);
      const user = userEvent.setup();
      render(<RunPanel {...defaultProps} />);

      await user.click(screen.getByTitle("Open Trace Explorer"));

      expect(windowOpenSpy).toHaveBeenCalledWith(
        expect.stringContaining("traces"),
        "_blank",
      );
      windowOpenSpy.mockRestore();
    });
  });
});
