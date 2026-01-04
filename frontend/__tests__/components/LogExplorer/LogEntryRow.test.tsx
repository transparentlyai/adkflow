import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LogEntryRow } from "@/components/LogExplorer/LogEntryRow";
import type { LogEntry } from "@/lib/api";

describe("LogEntryRow", () => {
  const mockEntry: LogEntry = {
    timestamp: "2024-01-15T10:30:45.123Z",
    level: "INFO",
    category: "runner",
    message: "Test message",
    context: null,
    durationMs: null,
    exception: null,
    runId: null,
  };

  const defaultProps = {
    entry: mockEntry,
    isExpanded: false,
    onToggleExpand: vi.fn(),
    searchTerm: undefined,
    formatJson: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render the log entry message", () => {
      render(<LogEntryRow {...defaultProps} />);
      expect(screen.getByText("Test message")).toBeInTheDocument();
    });

    it("should render the category", () => {
      render(<LogEntryRow {...defaultProps} />);
      expect(screen.getByText("runner")).toBeInTheDocument();
    });

    it("should render a timestamp element", () => {
      render(<LogEntryRow {...defaultProps} />);
      // The timestamp should be rendered in some format - look for the element
      const timestampElement = document.querySelector(".font-mono.w-24");
      expect(timestampElement).toBeInTheDocument();
    });

    it("should render collapsed icon when not expanded", () => {
      render(<LogEntryRow {...defaultProps} isExpanded={false} />);
      // ChevronRight is rendered when collapsed
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
    });

    it("should render expanded icon when expanded", () => {
      render(<LogEntryRow {...defaultProps} isExpanded={true} />);
      // ChevronDown is rendered when expanded - there may be multiple buttons
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe("log levels", () => {
    it.each(["INFO", "DEBUG", "WARNING", "ERROR", "CRITICAL"] as const)(
      "should render %s level entry",
      (level) => {
        const entry = { ...mockEntry, level };
        render(<LogEntryRow {...defaultProps} entry={entry} />);
        expect(screen.getByText("Test message")).toBeInTheDocument();
      },
    );
  });

  describe("optional fields", () => {
    it("should render duration when present", () => {
      const entry = { ...mockEntry, durationMs: 150 };
      render(<LogEntryRow {...defaultProps} entry={entry} />);
      expect(screen.getByText(/150/)).toBeInTheDocument();
    });

    it("should not render duration when null", () => {
      render(<LogEntryRow {...defaultProps} />);
      // No duration element should be present
      const durationElements = screen.queryAllByText(/ms$/);
      expect(durationElements.length).toBe(0);
    });

    it("should render run ID badge when present", () => {
      const entry = { ...mockEntry, runId: "run-123" };
      render(<LogEntryRow {...defaultProps} entry={entry} />);
      expect(screen.getByText("run-123")).toBeInTheDocument();
    });

    it("should not render run ID badge when null", () => {
      render(<LogEntryRow {...defaultProps} />);
      expect(screen.queryByText(/run-/)).not.toBeInTheDocument();
    });

    it("should render exception indicator when present", () => {
      const entry = { ...mockEntry, exception: "Error: Something went wrong" };
      render(<LogEntryRow {...defaultProps} entry={entry} />);
      expect(screen.getByText("Exception")).toBeInTheDocument();
    });

    it("should not render exception indicator when null", () => {
      render(<LogEntryRow {...defaultProps} />);
      expect(screen.queryByText("Exception")).not.toBeInTheDocument();
    });
  });

  describe("interaction", () => {
    it("should call onToggleExpand when clicked", () => {
      const onToggleExpand = vi.fn();
      render(<LogEntryRow {...defaultProps} onToggleExpand={onToggleExpand} />);

      fireEvent.click(screen.getByRole("button"));
      expect(onToggleExpand).toHaveBeenCalledTimes(1);
    });
  });

  describe("search highlighting", () => {
    it("should highlight search term in message", () => {
      render(<LogEntryRow {...defaultProps} searchTerm="message" />);
      const marks = document.querySelectorAll("mark");
      expect(marks.length).toBeGreaterThan(0);
    });

    it("should handle no search term", () => {
      render(<LogEntryRow {...defaultProps} searchTerm={undefined} />);
      expect(screen.getByText("Test message")).toBeInTheDocument();
      // No mark elements should be present
      const marks = document.querySelectorAll("mark");
      expect(marks.length).toBe(0);
    });

    it("should handle empty search term", () => {
      render(<LogEntryRow {...defaultProps} searchTerm="" />);
      expect(screen.getByText("Test message")).toBeInTheDocument();
      const marks = document.querySelectorAll("mark");
      expect(marks.length).toBe(0);
    });

    it("should handle special regex characters in search", () => {
      const entry = { ...mockEntry, message: "Test [special] (chars)" };
      render(
        <LogEntryRow {...defaultProps} entry={entry} searchTerm="[special]" />,
      );
      const marks = document.querySelectorAll("mark");
      expect(marks.length).toBeGreaterThan(0);
    });
  });

  describe("expanded state", () => {
    it("should render LogEntryDetail when expanded", () => {
      render(<LogEntryRow {...defaultProps} isExpanded={true} />);
      // When expanded, LogEntryDetail should be rendered
      // Look for the Message label from LogEntryDetail
      expect(screen.getByText("Message")).toBeInTheDocument();
    });

    it("should not render LogEntryDetail when collapsed", () => {
      const entryWithContext = {
        ...mockEntry,
        context: { key: "value" },
      };
      render(
        <LogEntryRow
          {...defaultProps}
          entry={entryWithContext}
          isExpanded={false}
        />,
      );
      // The Message label from LogEntryDetail should not be visible when collapsed
      expect(screen.queryByText("Message")).not.toBeInTheDocument();
    });
  });
});
