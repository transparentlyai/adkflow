import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LogExplorerPage } from "@/components/LogExplorer/LogExplorerPage";

// Mock the hook
vi.mock("@/hooks/logExplorer", () => ({
  useLogExplorer: vi.fn().mockReturnValue({
    files: [],
    selectedFile: null,
    setSelectedFile: vi.fn(),
    entries: [],
    stats: null,
    totalCount: 0,
    filters: {},
    setFilters: vi.fn(),
    resetFilters: vi.fn(),
    hasMore: false,
    loadMore: vi.fn(),
    isLoading: false,
    isLoadingMore: false,
    error: null,
    refresh: vi.fn(),
    exportFiltered: vi.fn(),
    runs: [],
    isLoadingRuns: false,
    setLastRunOnly: vi.fn(),
  }),
}));

// Mock child components
vi.mock("@/components/LogExplorer/LogExplorerHeader", () => ({
  LogExplorerHeader: () => <div data-testid="log-header">Header</div>,
}));

vi.mock("@/components/LogExplorer/LogExplorerToolbar", () => ({
  LogExplorerToolbar: () => <div data-testid="log-toolbar">Toolbar</div>,
}));

vi.mock("@/components/LogExplorer/LogExplorerList", () => ({
  LogExplorerList: () => <div data-testid="log-list">List</div>,
}));

const { useLogExplorer } = await import("@/hooks/logExplorer");
const mockUseLogExplorer = useLogExplorer as ReturnType<typeof vi.fn>;

describe("LogExplorerPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLogExplorer.mockReturnValue({
      files: [],
      selectedFile: null,
      setSelectedFile: vi.fn(),
      entries: [],
      stats: null,
      totalCount: 0,
      filters: {},
      setFilters: vi.fn(),
      resetFilters: vi.fn(),
      hasMore: false,
      loadMore: vi.fn(),
      isLoading: false,
      isLoadingMore: false,
      error: null,
      refresh: vi.fn(),
      exportFiltered: vi.fn(),
      runs: [],
      isLoadingRuns: false,
      setLastRunOnly: vi.fn(),
    });
  });

  describe("header", () => {
    it("should render title", () => {
      render(<LogExplorerPage projectPath="/test/project" />);
      expect(screen.getByText("Log Explorer")).toBeInTheDocument();
    });

    it("should show project name", () => {
      render(<LogExplorerPage projectPath="/test/myproject" />);
      expect(screen.getByText("— myproject")).toBeInTheDocument();
    });
  });

  describe("no project", () => {
    it("should show message when no project", () => {
      render(<LogExplorerPage projectPath={null} />);
      expect(screen.getByText(/No project specified/)).toBeInTheDocument();
    });
  });

  describe("no files", () => {
    it("should show empty message when no files", () => {
      render(<LogExplorerPage projectPath="/test/project" />);
      expect(screen.getByText(/No log files found/)).toBeInTheDocument();
    });
  });

  describe("with files", () => {
    beforeEach(() => {
      mockUseLogExplorer.mockReturnValue({
        files: [{ name: "app.log", path: "/logs/app.log", sizeBytes: 1024 }],
        selectedFile: "app.log",
        setSelectedFile: vi.fn(),
        entries: [],
        stats: { totalLines: 100 },
        totalCount: 100,
        filters: {},
        setFilters: vi.fn(),
        resetFilters: vi.fn(),
        hasMore: false,
        loadMore: vi.fn(),
        isLoading: false,
        isLoadingMore: false,
        error: null,
        refresh: vi.fn(),
        exportFiltered: vi.fn(),
        runs: [],
        isLoadingRuns: false,
        setLastRunOnly: vi.fn(),
      });
    });

    it("should render header component", () => {
      render(<LogExplorerPage projectPath="/test/project" />);
      expect(screen.getByTestId("log-header")).toBeInTheDocument();
    });

    it("should render toolbar component", () => {
      render(<LogExplorerPage projectPath="/test/project" />);
      expect(screen.getByTestId("log-toolbar")).toBeInTheDocument();
    });

    it("should render list component", () => {
      render(<LogExplorerPage projectPath="/test/project" />);
      expect(screen.getByTestId("log-list")).toBeInTheDocument();
    });
  });

  describe("error", () => {
    it("should show error banner", () => {
      mockUseLogExplorer.mockReturnValue({
        files: [],
        selectedFile: null,
        setSelectedFile: vi.fn(),
        entries: [],
        stats: null,
        totalCount: 0,
        filters: {},
        setFilters: vi.fn(),
        resetFilters: vi.fn(),
        hasMore: false,
        loadMore: vi.fn(),
        isLoading: false,
        isLoadingMore: false,
        error: "Failed to load logs",
        refresh: vi.fn(),
        exportFiltered: vi.fn(),
        runs: [],
        isLoadingRuns: false,
        setLastRunOnly: vi.fn(),
      });
      render(<LogExplorerPage projectPath="/test/project" />);
      expect(screen.getByText("Failed to load logs")).toBeInTheDocument();
    });
  });

  describe("view traces button", () => {
    it("should render when callback provided", () => {
      mockUseLogExplorer.mockReturnValue({
        files: [{ name: "app.log", path: "/logs/app.log", sizeBytes: 1024 }],
        selectedFile: "app.log",
        setSelectedFile: vi.fn(),
        entries: [],
        stats: null,
        totalCount: 0,
        filters: {},
        setFilters: vi.fn(),
        resetFilters: vi.fn(),
        hasMore: false,
        loadMore: vi.fn(),
        isLoading: false,
        isLoadingMore: false,
        error: null,
        refresh: vi.fn(),
        exportFiltered: vi.fn(),
        runs: [],
        isLoadingRuns: false,
        setLastRunOnly: vi.fn(),
      });
      render(
        <LogExplorerPage
          projectPath="/test/project"
          onNavigateToTraces={vi.fn()}
        />,
      );
      expect(screen.getByText("View Traces")).toBeInTheDocument();
    });

    it("should call onNavigateToTraces when clicked", () => {
      const onNavigateToTraces = vi.fn();
      mockUseLogExplorer.mockReturnValue({
        files: [{ name: "app.log", path: "/logs/app.log", sizeBytes: 1024 }],
        selectedFile: "app.log",
        setSelectedFile: vi.fn(),
        entries: [],
        stats: null,
        totalCount: 0,
        filters: {},
        setFilters: vi.fn(),
        resetFilters: vi.fn(),
        hasMore: false,
        loadMore: vi.fn(),
        isLoading: false,
        isLoadingMore: false,
        error: null,
        refresh: vi.fn(),
        exportFiltered: vi.fn(),
        runs: [],
        isLoadingRuns: false,
        setLastRunOnly: vi.fn(),
      });
      render(
        <LogExplorerPage
          projectPath="/test/project"
          onNavigateToTraces={onNavigateToTraces}
        />,
      );
      fireEvent.click(screen.getByText("View Traces"));
      expect(onNavigateToTraces).toHaveBeenCalled();
    });
  });

  describe("initial time filter", () => {
    it("should apply initial time filter", () => {
      const setFilters = vi.fn();
      const onTimeFilterApplied = vi.fn();
      mockUseLogExplorer.mockReturnValue({
        files: [],
        selectedFile: null,
        setSelectedFile: vi.fn(),
        entries: [],
        stats: null,
        totalCount: 0,
        filters: {},
        setFilters,
        resetFilters: vi.fn(),
        hasMore: false,
        loadMore: vi.fn(),
        isLoading: false,
        isLoadingMore: false,
        error: null,
        refresh: vi.fn(),
        exportFiltered: vi.fn(),
        runs: [],
        isLoadingRuns: false,
        setLastRunOnly: vi.fn(),
      });

      render(
        <LogExplorerPage
          projectPath="/test/project"
          initialTimeFilter={{
            startTime: "2024-01-01T00:00:00Z",
            endTime: "2024-01-01T01:00:00Z",
          }}
          onTimeFilterApplied={onTimeFilterApplied}
        />,
      );

      expect(setFilters).toHaveBeenCalledWith({
        startTime: "2024-01-01T00:00:00Z",
        endTime: "2024-01-01T01:00:00Z",
      });
      expect(onTimeFilterApplied).toHaveBeenCalled();
    });
  });
});
