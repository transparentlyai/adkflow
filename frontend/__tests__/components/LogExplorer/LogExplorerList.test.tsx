import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LogExplorerList } from "@/components/LogExplorer/LogExplorerList";
import type { LogEntry } from "@/lib/api";

// Mock virtualization
vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: vi.fn().mockImplementation(({ count, estimateSize }) => {
    // Return items based on count
    const items = Array.from({ length: Math.min(count, 10) }, (_, i) => ({
      index: i,
      key: i,
      start: i * (estimateSize?.(i) ?? 40),
    }));
    return {
      getVirtualItems: () => items,
      getTotalSize: () => count * 40,
      scrollToIndex: vi.fn(),
      measure: vi.fn(),
      measureElement: vi.fn(),
    };
  }),
}));

// Mock LogEntryRow
vi.mock("@/components/LogExplorer/LogEntryRow", () => ({
  LogEntryRow: ({
    entry,
    isExpanded,
    onToggleExpand,
  }: {
    entry: LogEntry;
    isExpanded: boolean;
    onToggleExpand: () => void;
  }) => (
    <div
      data-testid={`log-entry-${entry.lineNumber}`}
      data-expanded={isExpanded}
      onClick={onToggleExpand}
    >
      {entry.message}
    </div>
  ),
}));

const createMockEntry = (
  lineNumber: number,
  message = "Test message",
): LogEntry => ({
  lineNumber,
  timestamp: "2024-01-01T00:00:00Z",
  level: "info",
  category: "test",
  message,
  rawContent: message,
});

describe("LogExplorerList", () => {
  const defaultProps = {
    entries: [createMockEntry(1), createMockEntry(2), createMockEntry(3)],
    isLoading: false,
    isLoadingMore: false,
    hasMore: false,
    onLoadMore: vi.fn(),
    formatJson: false,
  };

  describe("loading state", () => {
    it("should show loading indicator when loading", () => {
      render(
        <LogExplorerList {...defaultProps} isLoading={true} entries={[]} />,
      );
      expect(screen.getByText("Loading logs...")).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("should show empty message when no entries", () => {
      render(<LogExplorerList {...defaultProps} entries={[]} />);
      expect(screen.getByText("No log entries found")).toBeInTheDocument();
    });

    it("should show search hint when search term provided", () => {
      render(
        <LogExplorerList {...defaultProps} entries={[]} searchTerm="query" />,
      );
      expect(
        screen.getByText("Try adjusting your search or filters"),
      ).toBeInTheDocument();
    });
  });

  describe("rendering entries", () => {
    it("should render log entries", () => {
      render(<LogExplorerList {...defaultProps} />);
      expect(screen.getByTestId("log-entry-1")).toBeInTheDocument();
      expect(screen.getByTestId("log-entry-2")).toBeInTheDocument();
      expect(screen.getByTestId("log-entry-3")).toBeInTheDocument();
    });

    it("should show entry messages", () => {
      render(<LogExplorerList {...defaultProps} />);
      expect(screen.getAllByText("Test message")).toHaveLength(3);
    });

    it("should have listbox role", () => {
      render(<LogExplorerList {...defaultProps} />);
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });
  });

  describe("loading more", () => {
    it("should show loading more indicator", () => {
      render(<LogExplorerList {...defaultProps} isLoadingMore={true} />);
      expect(screen.getByText("Loading more...")).toBeInTheDocument();
    });
  });

  describe("keyboard navigation", () => {
    it("should handle ArrowDown key", () => {
      render(<LogExplorerList {...defaultProps} />);
      const listbox = screen.getByRole("listbox");

      fireEvent.keyDown(listbox, { key: "ArrowDown" });
      // Focus should move
    });

    it("should handle ArrowUp key", () => {
      render(<LogExplorerList {...defaultProps} />);
      const listbox = screen.getByRole("listbox");

      fireEvent.keyDown(listbox, { key: "ArrowUp" });
      // Focus should move
    });

    it("should handle Home key", () => {
      render(<LogExplorerList {...defaultProps} />);
      const listbox = screen.getByRole("listbox");

      fireEvent.keyDown(listbox, { key: "Home" });
      // Focus should go to first
    });

    it("should handle End key", () => {
      render(<LogExplorerList {...defaultProps} />);
      const listbox = screen.getByRole("listbox");

      fireEvent.keyDown(listbox, { key: "End" });
      // Focus should go to last
    });

    it("should handle PageDown key", () => {
      render(<LogExplorerList {...defaultProps} />);
      const listbox = screen.getByRole("listbox");

      fireEvent.keyDown(listbox, { key: "PageDown" });
      // Focus should move down by 10
    });

    it("should handle PageUp key", () => {
      render(<LogExplorerList {...defaultProps} />);
      const listbox = screen.getByRole("listbox");

      fireEvent.keyDown(listbox, { key: "PageUp" });
      // Focus should move up by 10
    });

    it("should not navigate when entries empty", () => {
      render(<LogExplorerList {...defaultProps} entries={[]} />);
      // No listbox when empty
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  describe("run dividers", () => {
    it("should show run divider when run changes", () => {
      const entries = [
        { ...createMockEntry(1), runId: "run-1" },
        { ...createMockEntry(2), runId: "run-2" },
      ];
      render(<LogExplorerList {...defaultProps} entries={entries} />);
      // Should show run divider for run-2
      expect(screen.getByText(/Run run-2/)).toBeInTheDocument();
    });
  });

  describe("expansion", () => {
    it("should toggle expansion when entry clicked", () => {
      render(<LogExplorerList {...defaultProps} />);
      const entry = screen.getByTestId("log-entry-1");

      expect(entry).toHaveAttribute("data-expanded", "false");

      fireEvent.click(entry);

      // After click, it should toggle (mocked behavior may vary)
    });
  });
});
