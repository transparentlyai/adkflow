import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LogExplorerDialog } from "@/components/LogExplorer/LogExplorerDialog";

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

vi.mock("@/components/TraceExplorer/TraceExplorerPage", () => ({
  TraceExplorerPage: () => <div data-testid="trace-explorer">Traces</div>,
}));

const { useLogExplorer } = await import("@/hooks/logExplorer");
const mockUseLogExplorer = useLogExplorer as ReturnType<typeof vi.fn>;

describe("LogExplorerDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    projectPath: "/test/project",
  };

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

  describe("tabs", () => {
    it("should render logs tab", () => {
      render(<LogExplorerDialog {...defaultProps} />);
      expect(screen.getByText("Logs")).toBeInTheDocument();
    });

    it("should render traces tab", () => {
      render(<LogExplorerDialog {...defaultProps} />);
      expect(screen.getByText("Traces")).toBeInTheDocument();
    });

    it("should show logs content by default", () => {
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
      render(<LogExplorerDialog {...defaultProps} />);
      expect(screen.getByTestId("log-header")).toBeInTheDocument();
    });

    it("should switch to traces tab when clicked", () => {
      render(<LogExplorerDialog {...defaultProps} />);
      fireEvent.click(screen.getByText("Traces"));
      expect(screen.getByTestId("trace-explorer")).toBeInTheDocument();
    });
  });

  describe("no project", () => {
    it("should show no project message when projectPath is null", () => {
      render(<LogExplorerDialog {...defaultProps} projectPath={null} />);
      expect(screen.getByText(/No project selected/)).toBeInTheDocument();
    });
  });

  describe("no log files", () => {
    it("should show no files message when empty", () => {
      render(<LogExplorerDialog {...defaultProps} />);
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

    it("should render header component", () => {
      render(<LogExplorerDialog {...defaultProps} />);
      expect(screen.getByTestId("log-header")).toBeInTheDocument();
    });

    it("should render toolbar component", () => {
      render(<LogExplorerDialog {...defaultProps} />);
      expect(screen.getByTestId("log-toolbar")).toBeInTheDocument();
    });

    it("should render list component", () => {
      render(<LogExplorerDialog {...defaultProps} />);
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
      render(<LogExplorerDialog {...defaultProps} />);
      expect(screen.getByText("Failed to load logs")).toBeInTheDocument();
    });
  });

  describe("open in new tab", () => {
    it("should render open in new tab button", () => {
      render(<LogExplorerDialog {...defaultProps} />);
      expect(screen.getByTitle("Open in new tab")).toBeInTheDocument();
    });

    it("should open new window and close dialog", () => {
      const onOpenChange = vi.fn();
      const windowOpenSpy = vi
        .spyOn(window, "open")
        .mockImplementation(() => null);
      render(
        <LogExplorerDialog {...defaultProps} onOpenChange={onOpenChange} />,
      );
      fireEvent.click(screen.getByTitle("Open in new tab"));
      expect(windowOpenSpy).toHaveBeenCalledWith(
        expect.stringContaining("/debug"),
        "_blank",
      );
      expect(onOpenChange).toHaveBeenCalledWith(false);
      windowOpenSpy.mockRestore();
    });

    it("should open new window without project param when no projectPath", () => {
      const onOpenChange = vi.fn();
      const windowOpenSpy = vi
        .spyOn(window, "open")
        .mockImplementation(() => null);
      render(
        <LogExplorerDialog
          {...defaultProps}
          projectPath={null}
          onOpenChange={onOpenChange}
        />,
      );
      fireEvent.click(screen.getByTitle("Open in new tab"));
      expect(windowOpenSpy).toHaveBeenCalledWith("/debug?tab=logs", "_blank");
      expect(onOpenChange).toHaveBeenCalledWith(false);
      windowOpenSpy.mockRestore();
    });
  });

  describe("refresh on open", () => {
    it("should call refresh when dialog opens", () => {
      const refresh = vi.fn();
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
        refresh,
        exportFiltered: vi.fn(),
        runs: [],
        isLoadingRuns: false,
        setLastRunOnly: vi.fn(),
      });
      render(<LogExplorerDialog {...defaultProps} />);
      expect(refresh).toHaveBeenCalled();
    });
  });

  describe("when closed", () => {
    it("should not render content when not open", () => {
      render(<LogExplorerDialog {...defaultProps} open={false} />);
      expect(screen.queryByText("Logs")).not.toBeInTheDocument();
    });
  });
});
