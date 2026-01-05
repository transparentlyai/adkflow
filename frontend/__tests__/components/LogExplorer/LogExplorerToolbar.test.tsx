import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LogExplorerToolbar } from "@/components/LogExplorer/LogExplorerToolbar";
import type { LogFilters } from "@/hooks/logExplorer";
import type { LogStats, RunInfo } from "@/lib/api";

// Mock child components
vi.mock("@/components/LogExplorer/toolbar", () => ({
  LogRunFilter: ({
    runs,
    onRunIdChange,
    onLastRunOnlyChange,
    lastRunOnly,
  }: {
    runs: RunInfo[];
    onRunIdChange: (id: string | null) => void;
    onLastRunOnlyChange: (value: boolean) => void;
    lastRunOnly: boolean;
  }) => (
    <div data-testid="run-filter">
      <span>Runs: {runs.length}</span>
      <button onClick={() => onRunIdChange("run-1")}>Select Run</button>
      <button onClick={() => onLastRunOnlyChange(!lastRunOnly)}>
        Toggle Last Run
      </button>
    </div>
  ),
  LogLevelFilter: ({
    selectedLevels,
    onToggleLevel,
  }: {
    selectedLevels: string[];
    onToggleLevel: (level: string) => void;
  }) => (
    <div data-testid="level-filter">
      <span>Levels: {selectedLevels.join(",")}</span>
      <button onClick={() => onToggleLevel("error")}>Toggle Error</button>
    </div>
  ),
  LogCategoryFilter: ({
    category,
    onCategoryChange,
  }: {
    category: string | null;
    onCategoryChange: (category: string | null) => void;
  }) => (
    <div data-testid="category-filter">
      <span>{category || "No category"}</span>
      <button onClick={() => onCategoryChange("test.category")}>
        Set Category
      </button>
    </div>
  ),
  LogSearchInput: ({
    search,
    onSearchChange,
  }: {
    search: string | null;
    onSearchChange: (search: string | null) => void;
  }) => (
    <input
      data-testid="search-input"
      value={search || ""}
      onChange={(e) => onSearchChange(e.target.value || null)}
    />
  ),
  LogTimeRangeFilter: ({
    showTimeRange,
    onToggleTimeRange,
  }: {
    showTimeRange: boolean;
    onToggleTimeRange: () => void;
  }) => (
    <div data-testid="time-range-filter">
      <span>Time Range: {showTimeRange ? "visible" : "hidden"}</span>
      <button onClick={onToggleTimeRange}>Toggle Time Range</button>
    </div>
  ),
  TimeRangeRow: ({
    startTime,
    endTime,
  }: {
    startTime: string | null;
    endTime: string | null;
  }) => (
    <div data-testid="time-range-row">
      <span>Start: {startTime || "none"}</span>
      <span>End: {endTime || "none"}</span>
    </div>
  ),
  LogToolbarActions: ({
    hasActiveFilters,
    onResetFilters,
    formatJson,
    onFormatJsonChange,
  }: {
    hasActiveFilters: boolean;
    onResetFilters: () => void;
    formatJson: boolean;
    onFormatJsonChange: (value: boolean) => void;
  }) => (
    <div data-testid="toolbar-actions">
      <span>{hasActiveFilters ? "Has filters" : "No filters"}</span>
      <button onClick={onResetFilters}>Reset</button>
      <button onClick={() => onFormatJsonChange(!formatJson)}>
        Format JSON: {formatJson ? "on" : "off"}
      </button>
    </div>
  ),
}));

const mockStats: LogStats = {
  totalLines: 100,
  levels: { info: 80, error: 15, warn: 5 },
};

const mockRuns: RunInfo[] = [
  { id: "run-1", name: "Run 1", status: "completed", createdAt: "2024-01-01" },
];

describe("LogExplorerToolbar", () => {
  const defaultFilters: LogFilters = {
    level: null,
    category: null,
    search: null,
    startTime: null,
    endTime: null,
    runId: null,
    lastRunOnly: false,
  };

  const defaultProps = {
    filters: defaultFilters,
    onFiltersChange: vi.fn(),
    onResetFilters: vi.fn(),
    stats: mockStats,
    formatJson: false,
    onFormatJsonChange: vi.fn(),
    runs: mockRuns,
    isLoadingRuns: false,
    onLastRunOnlyChange: vi.fn(),
  };

  describe("rendering", () => {
    it("should render all filter components", () => {
      render(<LogExplorerToolbar {...defaultProps} />);
      expect(screen.getByTestId("run-filter")).toBeInTheDocument();
      expect(screen.getByTestId("level-filter")).toBeInTheDocument();
      expect(screen.getByTestId("category-filter")).toBeInTheDocument();
      expect(screen.getByTestId("search-input")).toBeInTheDocument();
      expect(screen.getByTestId("time-range-filter")).toBeInTheDocument();
      expect(screen.getByTestId("toolbar-actions")).toBeInTheDocument();
    });
  });

  describe("level filter", () => {
    it("should show selected levels", () => {
      render(
        <LogExplorerToolbar
          {...defaultProps}
          filters={{ ...defaultFilters, level: "error,warn" }}
        />,
      );
      expect(screen.getByText("Levels: error,warn")).toBeInTheDocument();
    });

    it("should show empty levels when no filter", () => {
      render(<LogExplorerToolbar {...defaultProps} />);
      expect(screen.getByText("Levels:")).toBeInTheDocument();
    });
  });

  describe("category filter", () => {
    it("should show selected category", () => {
      render(
        <LogExplorerToolbar
          {...defaultProps}
          filters={{ ...defaultFilters, category: "my.category" }}
        />,
      );
      expect(screen.getByText("my.category")).toBeInTheDocument();
    });
  });

  describe("active filters indicator", () => {
    it("should show no active filters when all null", () => {
      render(<LogExplorerToolbar {...defaultProps} />);
      expect(screen.getByText("No filters")).toBeInTheDocument();
    });

    it("should show has filters when level set", () => {
      render(
        <LogExplorerToolbar
          {...defaultProps}
          filters={{ ...defaultFilters, level: "error" }}
        />,
      );
      expect(screen.getByText("Has filters")).toBeInTheDocument();
    });

    it("should show has filters when category set", () => {
      render(
        <LogExplorerToolbar
          {...defaultProps}
          filters={{ ...defaultFilters, category: "test" }}
        />,
      );
      expect(screen.getByText("Has filters")).toBeInTheDocument();
    });

    it("should show has filters when search set", () => {
      render(
        <LogExplorerToolbar
          {...defaultProps}
          filters={{ ...defaultFilters, search: "query" }}
        />,
      );
      expect(screen.getByText("Has filters")).toBeInTheDocument();
    });

    it("should show has filters when lastRunOnly set", () => {
      render(
        <LogExplorerToolbar
          {...defaultProps}
          filters={{ ...defaultFilters, lastRunOnly: true }}
        />,
      );
      expect(screen.getByText("Has filters")).toBeInTheDocument();
    });
  });

  describe("time range", () => {
    it("should not show time range row by default", () => {
      render(<LogExplorerToolbar {...defaultProps} />);
      expect(screen.queryByTestId("time-range-row")).not.toBeInTheDocument();
    });

    it("should show time range hidden initially", () => {
      render(<LogExplorerToolbar {...defaultProps} />);
      expect(screen.getByText("Time Range: hidden")).toBeInTheDocument();
    });

    it("should show time range row when toggled", async () => {
      const { rerender } = render(<LogExplorerToolbar {...defaultProps} />);

      // Click the toggle button
      const toggleButton = screen.getByText("Toggle Time Range");
      toggleButton.click();

      // Re-render to reflect state change
      rerender(<LogExplorerToolbar {...defaultProps} />);

      // The component should now show "visible" in the filter
      expect(screen.getByText("Time Range: visible")).toBeInTheDocument();
      expect(screen.getByTestId("time-range-row")).toBeInTheDocument();
    });
  });

  describe("toggleLevel", () => {
    it("should add level when not selected", () => {
      const onFiltersChange = vi.fn();
      render(
        <LogExplorerToolbar
          {...defaultProps}
          onFiltersChange={onFiltersChange}
        />,
      );

      // Click toggle error button
      screen.getByText("Toggle Error").click();

      expect(onFiltersChange).toHaveBeenCalledWith({ level: "error" });
    });

    it("should remove level when already selected", () => {
      const onFiltersChange = vi.fn();
      render(
        <LogExplorerToolbar
          {...defaultProps}
          filters={{ ...defaultFilters, level: "error" }}
          onFiltersChange={onFiltersChange}
        />,
      );

      // Click toggle error button
      screen.getByText("Toggle Error").click();

      expect(onFiltersChange).toHaveBeenCalledWith({ level: null });
    });

    it("should keep other levels when removing one", () => {
      const onFiltersChange = vi.fn();
      render(
        <LogExplorerToolbar
          {...defaultProps}
          filters={{ ...defaultFilters, level: "error,warn" }}
          onFiltersChange={onFiltersChange}
        />,
      );

      // Click toggle error button
      screen.getByText("Toggle Error").click();

      expect(onFiltersChange).toHaveBeenCalledWith({ level: "warn" });
    });
  });

  describe("filter callbacks", () => {
    it("should call onFiltersChange when runId changes", () => {
      const onFiltersChange = vi.fn();
      render(
        <LogExplorerToolbar
          {...defaultProps}
          onFiltersChange={onFiltersChange}
        />,
      );

      screen.getByText("Select Run").click();

      expect(onFiltersChange).toHaveBeenCalledWith({ runId: "run-1" });
    });

    it("should call onLastRunOnlyChange", () => {
      const onLastRunOnlyChange = vi.fn();
      render(
        <LogExplorerToolbar
          {...defaultProps}
          onLastRunOnlyChange={onLastRunOnlyChange}
        />,
      );

      screen.getByText("Toggle Last Run").click();

      expect(onLastRunOnlyChange).toHaveBeenCalled();
    });

    it("should call onFiltersChange when category changes", () => {
      const onFiltersChange = vi.fn();
      render(
        <LogExplorerToolbar
          {...defaultProps}
          onFiltersChange={onFiltersChange}
        />,
      );

      screen.getByText("Set Category").click();

      expect(onFiltersChange).toHaveBeenCalledWith({
        category: "test.category",
      });
    });

    it("should call onResetFilters when reset clicked", () => {
      const onResetFilters = vi.fn();
      render(
        <LogExplorerToolbar
          {...defaultProps}
          onResetFilters={onResetFilters}
        />,
      );

      screen.getByText("Reset").click();

      expect(onResetFilters).toHaveBeenCalled();
    });

    it("should call onFormatJsonChange when format JSON toggled", () => {
      const onFormatJsonChange = vi.fn();
      render(
        <LogExplorerToolbar
          {...defaultProps}
          onFormatJsonChange={onFormatJsonChange}
        />,
      );

      screen.getByText(/Format JSON/).click();

      expect(onFormatJsonChange).toHaveBeenCalled();
    });
  });

  describe("has active filters", () => {
    it("should detect startTime as active filter", () => {
      render(
        <LogExplorerToolbar
          {...defaultProps}
          filters={{ ...defaultFilters, startTime: "2024-01-01T00:00:00Z" }}
        />,
      );
      expect(screen.getByText("Has filters")).toBeInTheDocument();
    });

    it("should detect endTime as active filter", () => {
      render(
        <LogExplorerToolbar
          {...defaultProps}
          filters={{ ...defaultFilters, endTime: "2024-01-31T23:59:59Z" }}
        />,
      );
      expect(screen.getByText("Has filters")).toBeInTheDocument();
    });

    it("should detect runId as active filter", () => {
      render(
        <LogExplorerToolbar
          {...defaultProps}
          filters={{ ...defaultFilters, runId: "run-123" }}
        />,
      );
      expect(screen.getByText("Has filters")).toBeInTheDocument();
    });
  });
});
