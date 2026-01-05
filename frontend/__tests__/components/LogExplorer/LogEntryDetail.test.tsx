import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LogEntryDetail } from "@/components/LogExplorer/LogEntryDetail";
import type { LogEntry } from "@/lib/api";

// Mock Monaco Editor
vi.mock("@monaco-editor/react", () => ({
  default: ({ value }: { value: string }) => (
    <div data-testid="monaco-editor">{value}</div>
  ),
}));

// Mock clipboard API
const mockWriteText = vi.fn().mockResolvedValue(undefined);
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, "localStorage", { value: mockLocalStorage });

// Mock window.open
const mockWindowOpen = vi.fn();
Object.defineProperty(window, "open", { value: mockWindowOpen });

describe("LogEntryDetail", () => {
  const mockEntry: LogEntry = {
    timestamp: "2024-01-15T10:30:45.123Z",
    level: "INFO",
    category: "runner",
    message: "Test message",
    context: null,
    durationMs: null,
    exception: null,
    runId: null,
    lineNumber: 42,
  };

  const defaultProps = {
    entry: mockEntry,
    formatJson: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("rendering", () => {
    it("should render the message section", () => {
      render(<LogEntryDetail {...defaultProps} />);
      expect(screen.getByText("Message")).toBeInTheDocument();
      expect(screen.getByText("Test message")).toBeInTheDocument();
    });

    it("should render line number", () => {
      render(<LogEntryDetail {...defaultProps} />);
      expect(screen.getByText(/Line 42/)).toBeInTheDocument();
    });

    it("should render timestamp", () => {
      render(<LogEntryDetail {...defaultProps} />);
      // formatFullTimestamp should format the timestamp
      expect(screen.getByText(/2024/)).toBeInTheDocument();
    });

    it("should render duration when present", () => {
      const entry = { ...mockEntry, durationMs: 1500 };
      render(<LogEntryDetail {...defaultProps} entry={entry} />);
      // 1500ms formats to "1.50s"
      expect(screen.getByText(/1\.50s/)).toBeInTheDocument();
    });

    it("should not render duration when null", () => {
      render(<LogEntryDetail {...defaultProps} />);
      const text = screen.getByText(/Line 42/).textContent;
      // Should not contain duration separator if no duration
      expect(text?.split("|").length).toBeLessThanOrEqual(2);
    });
  });

  describe("copy functionality", () => {
    it("should render Copy JSON button", () => {
      render(<LogEntryDetail {...defaultProps} />);
      expect(screen.getByText("Copy JSON")).toBeInTheDocument();
    });

    it("should copy entry as JSON when clicked", async () => {
      render(<LogEntryDetail {...defaultProps} />);
      const copyButton = screen.getByText("Copy JSON");

      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalled();
      });
    });

    it("should show Copied text after copying", async () => {
      render(<LogEntryDetail {...defaultProps} />);
      const copyButton = screen.getByText("Copy JSON");

      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText("Copied")).toBeInTheDocument();
      });
    });
  });

  describe("context section", () => {
    it("should not render context section when context is null", () => {
      render(<LogEntryDetail {...defaultProps} />);
      expect(screen.queryByText("Context")).not.toBeInTheDocument();
    });

    it("should not render context section when context is empty object", () => {
      const entry = { ...mockEntry, context: {} };
      render(<LogEntryDetail {...defaultProps} entry={entry} />);
      expect(screen.queryByText("Context")).not.toBeInTheDocument();
    });

    it("should render context section when context has data", () => {
      const entry = { ...mockEntry, context: { key: "value" } };
      render(<LogEntryDetail {...defaultProps} entry={entry} />);
      expect(screen.getByText("Context")).toBeInTheDocument();
    });

    it("should render context as pre-formatted JSON when formatJson is false", () => {
      const entry = { ...mockEntry, context: { key: "value" } };
      render(
        <LogEntryDetail {...defaultProps} entry={entry} formatJson={false} />,
      );
      expect(screen.getByText(/key/)).toBeInTheDocument();
      expect(screen.queryByTestId("monaco-editor")).not.toBeInTheDocument();
    });

    it("should render context with Monaco Editor when formatJson is true", () => {
      const entry = { ...mockEntry, context: { key: "value" } };
      render(
        <LogEntryDetail {...defaultProps} entry={entry} formatJson={true} />,
      );
      expect(screen.getByTestId("monaco-editor")).toBeInTheDocument();
    });

    it("should open context in new tab when button clicked", () => {
      const entry = { ...mockEntry, context: { key: "value" } };
      render(
        <LogEntryDetail {...defaultProps} entry={entry} formatJson={true} />,
      );

      const openButton = screen.getByTitle("Open in new tab");
      fireEvent.click(openButton);

      expect(mockLocalStorage.setItem).toHaveBeenCalled();
      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining("/logs/context?key="),
        "_blank",
      );
    });
  });

  describe("exception section", () => {
    it("should not render exception section when null", () => {
      render(<LogEntryDetail {...defaultProps} />);
      expect(screen.queryByText(/Exception:/)).not.toBeInTheDocument();
    });

    it("should render exception type and message", () => {
      const entry = {
        ...mockEntry,
        exception: {
          type: "ValueError",
          message: "Invalid value",
          traceback: [],
        },
      };
      render(<LogEntryDetail {...defaultProps} entry={entry} />);
      expect(screen.getByText(/ValueError/)).toBeInTheDocument();
      expect(screen.getByText("Invalid value")).toBeInTheDocument();
    });

    it("should render traceback when present", () => {
      const entry = {
        ...mockEntry,
        exception: {
          type: "ValueError",
          message: "Invalid value",
          traceback: ["  File 'test.py', line 1\n", "    raise ValueError\n"],
        },
      };
      render(<LogEntryDetail {...defaultProps} entry={entry} />);
      expect(screen.getByText(/File 'test.py'/)).toBeInTheDocument();
    });

    it("should not render traceback section when empty", () => {
      const entry = {
        ...mockEntry,
        exception: {
          type: "ValueError",
          message: "Invalid value",
          traceback: [],
        },
      };
      render(<LogEntryDetail {...defaultProps} entry={entry} />);
      // The traceback pre element should not be present when traceback is empty
      const preElements = document.querySelectorAll("pre.bg-red-50");
      expect(preElements.length).toBe(0);
    });
  });

  describe("resize handle", () => {
    it("should render resize handle when formatJson is true and context exists", () => {
      const entry = { ...mockEntry, context: { key: "value" } };
      render(
        <LogEntryDetail {...defaultProps} entry={entry} formatJson={true} />,
      );
      // The resize handle is a div with cursor-ns-resize
      const resizeHandle = document.querySelector(".cursor-ns-resize");
      expect(resizeHandle).toBeInTheDocument();
    });

    it("should not render resize handle when formatJson is false", () => {
      const entry = { ...mockEntry, context: { key: "value" } };
      render(
        <LogEntryDetail {...defaultProps} entry={entry} formatJson={false} />,
      );
      const resizeHandle = document.querySelector(".cursor-ns-resize");
      expect(resizeHandle).not.toBeInTheDocument();
    });

    it("should handle resize drag", () => {
      const entry = { ...mockEntry, context: { key: "value" } };
      render(
        <LogEntryDetail {...defaultProps} entry={entry} formatJson={true} />,
      );

      const resizeHandle = document.querySelector(".cursor-ns-resize");
      expect(resizeHandle).toBeInTheDocument();

      // Start drag
      fireEvent.mouseDown(resizeHandle!, { clientY: 100 });

      // Move mouse
      fireEvent.mouseMove(document, { clientY: 150 });

      // End drag
      fireEvent.mouseUp(document);

      // Resize should have been handled (no errors thrown)
      expect(resizeHandle).toBeInTheDocument();
    });
  });
});
