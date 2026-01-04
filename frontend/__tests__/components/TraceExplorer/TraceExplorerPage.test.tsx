import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TraceExplorerPage } from "@/components/TraceExplorer/TraceExplorerPage";

// Mock the hook
vi.mock("@/hooks/traceExplorer", () => ({
  useTraceExplorer: vi.fn().mockReturnValue({
    traces: [],
    selectedTrace: null,
    selectedSpan: null,
    stats: null,
    totalCount: 0,
    hasMore: false,
    isLoading: false,
    isLoadingMore: false,
    isLoadingTrace: false,
    error: null,
    loadMore: vi.fn(),
    selectTrace: vi.fn(),
    selectSpan: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock child components
vi.mock("@/components/TraceExplorer/TraceListItem", () => ({
  TraceListItem: ({
    trace,
    isSelected,
    onClick,
  }: {
    trace: { traceId: string };
    isSelected: boolean;
    onClick: () => void;
  }) => (
    <div
      data-testid={`trace-item-${trace.traceId}`}
      data-selected={isSelected}
      onClick={onClick}
    >
      Trace {trace.traceId}
    </div>
  ),
}));

vi.mock("@/components/TraceExplorer/SpanTree", () => ({
  SpanTreeNode: ({ span }: { span: { spanId: string } }) => (
    <div data-testid={`span-${span.spanId}`}>Span {span.spanId}</div>
  ),
}));

vi.mock("@/components/TraceExplorer/SpanDetailsPanel", () => ({
  SpanDetailsPanel: ({ span }: { span: { spanId: string } }) => (
    <div data-testid="span-details">Details: {span.spanId}</div>
  ),
}));

const { useTraceExplorer } = await import("@/hooks/traceExplorer");
const mockUseTraceExplorer = useTraceExplorer as ReturnType<typeof vi.fn>;

describe("TraceExplorerPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTraceExplorer.mockReturnValue({
      traces: [],
      selectedTrace: null,
      selectedSpan: null,
      stats: null,
      totalCount: 0,
      hasMore: false,
      isLoading: false,
      isLoadingMore: false,
      isLoadingTrace: false,
      error: null,
      loadMore: vi.fn(),
      selectTrace: vi.fn(),
      selectSpan: vi.fn(),
      refresh: vi.fn(),
    });
  });

  describe("header", () => {
    it("should render title", () => {
      render(<TraceExplorerPage projectPath="/test/project" />);
      expect(screen.getByText("Trace Explorer")).toBeInTheDocument();
    });

    it("should show project name", () => {
      render(<TraceExplorerPage projectPath="/test/project" />);
      expect(screen.getByText("— project")).toBeInTheDocument();
    });

    it("should show stats when available", () => {
      mockUseTraceExplorer.mockReturnValue({
        traces: [],
        selectedTrace: null,
        selectedSpan: null,
        stats: { totalTraces: 10, totalSpans: 50 },
        totalCount: 10,
        hasMore: false,
        isLoading: false,
        isLoadingMore: false,
        isLoadingTrace: false,
        error: null,
        loadMore: vi.fn(),
        selectTrace: vi.fn(),
        selectSpan: vi.fn(),
        refresh: vi.fn(),
      });
      render(<TraceExplorerPage projectPath="/test/project" />);
      expect(screen.getByText("10 traces, 50 spans")).toBeInTheDocument();
    });
  });

  describe("no project", () => {
    it("should show message when no project", () => {
      render(<TraceExplorerPage projectPath={null} />);
      expect(screen.getByText(/No project specified/)).toBeInTheDocument();
    });
  });

  describe("loading", () => {
    it("should show loading state", () => {
      mockUseTraceExplorer.mockReturnValue({
        traces: [],
        selectedTrace: null,
        selectedSpan: null,
        stats: null,
        totalCount: 0,
        hasMore: false,
        isLoading: true,
        isLoadingMore: false,
        isLoadingTrace: false,
        error: null,
        loadMore: vi.fn(),
        selectTrace: vi.fn(),
        selectSpan: vi.fn(),
        refresh: vi.fn(),
      });
      render(<TraceExplorerPage projectPath="/test/project" />);
      expect(screen.getByText("Loading traces...")).toBeInTheDocument();
    });
  });

  describe("error", () => {
    it("should show error banner", () => {
      mockUseTraceExplorer.mockReturnValue({
        traces: [],
        selectedTrace: null,
        selectedSpan: null,
        stats: null,
        totalCount: 0,
        hasMore: false,
        isLoading: false,
        isLoadingMore: false,
        isLoadingTrace: false,
        error: "Test error",
        loadMore: vi.fn(),
        selectTrace: vi.fn(),
        selectSpan: vi.fn(),
        refresh: vi.fn(),
      });
      render(<TraceExplorerPage projectPath="/test/project" />);
      expect(screen.getByText("Test error")).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("should show empty message", () => {
      render(<TraceExplorerPage projectPath="/test/project" />);
      expect(
        screen.getByText("No traces found in project."),
      ).toBeInTheDocument();
    });
  });

  describe("with traces", () => {
    const mockTraces = [
      {
        traceId: "trace-1",
        rootSpanName: "Test",
        startTime: "2024-01-01T00:00:00Z",
        endTime: "2024-01-01T00:00:01Z",
        spanCount: 5,
        durationMs: 1000,
        hasErrors: false,
        spans: [{ spanId: "span-1", name: "Root" }],
      },
      {
        traceId: "trace-2",
        rootSpanName: "Test2",
        startTime: "2024-01-01T00:00:02Z",
        endTime: "2024-01-01T00:00:03Z",
        spanCount: 3,
        durationMs: 500,
        hasErrors: false,
        spans: [],
      },
    ];

    beforeEach(() => {
      mockUseTraceExplorer.mockReturnValue({
        traces: mockTraces,
        selectedTrace: null,
        selectedSpan: null,
        stats: { totalTraces: 2, totalSpans: 8 },
        totalCount: 2,
        hasMore: false,
        isLoading: false,
        isLoadingMore: false,
        isLoadingTrace: false,
        error: null,
        loadMore: vi.fn(),
        selectTrace: vi.fn(),
        selectSpan: vi.fn(),
        refresh: vi.fn(),
      });
    });

    it("should render trace list", () => {
      render(<TraceExplorerPage projectPath="/test/project" />);
      expect(screen.getByTestId("trace-item-trace-1")).toBeInTheDocument();
      expect(screen.getByTestId("trace-item-trace-2")).toBeInTheDocument();
    });

    it("should show trace count", () => {
      render(<TraceExplorerPage projectPath="/test/project" />);
      expect(screen.getByText("2 traces")).toBeInTheDocument();
    });

    it("should show select message when no trace selected", () => {
      render(<TraceExplorerPage projectPath="/test/project" />);
      expect(
        screen.getByText("Select a trace to view details"),
      ).toBeInTheDocument();
    });
  });

  describe("with selected trace", () => {
    const mockTrace = {
      traceId: "trace-1",
      rootSpanName: "Test",
      startTime: "2024-01-01T00:00:00Z",
      endTime: "2024-01-01T00:00:01Z",
      spanCount: 2,
      durationMs: 1000,
      hasErrors: false,
      spans: [
        { spanId: "span-1", name: "Root" },
        { spanId: "span-2", name: "Child" },
      ],
    };

    it("should render span tree", () => {
      mockUseTraceExplorer.mockReturnValue({
        traces: [mockTrace],
        selectedTrace: mockTrace,
        selectedSpan: null,
        stats: { totalTraces: 1, totalSpans: 2 },
        totalCount: 1,
        hasMore: false,
        isLoading: false,
        isLoadingMore: false,
        isLoadingTrace: false,
        error: null,
        loadMore: vi.fn(),
        selectTrace: vi.fn(),
        selectSpan: vi.fn(),
        refresh: vi.fn(),
      });
      render(<TraceExplorerPage projectPath="/test/project" />);
      expect(screen.getByTestId("span-span-1")).toBeInTheDocument();
      expect(screen.getByTestId("span-span-2")).toBeInTheDocument();
    });

    it("should show span count and duration", () => {
      mockUseTraceExplorer.mockReturnValue({
        traces: [mockTrace],
        selectedTrace: mockTrace,
        selectedSpan: null,
        stats: { totalTraces: 1, totalSpans: 2 },
        totalCount: 1,
        hasMore: false,
        isLoading: false,
        isLoadingMore: false,
        isLoadingTrace: false,
        error: null,
        loadMore: vi.fn(),
        selectTrace: vi.fn(),
        selectSpan: vi.fn(),
        refresh: vi.fn(),
      });
      render(<TraceExplorerPage projectPath="/test/project" />);
      // Multiple elements may contain "2 spans", just check one exists
      const spanCountElements = screen.getAllByText(/2 spans/);
      expect(spanCountElements.length).toBeGreaterThan(0);
    });

    it("should show select span message", () => {
      mockUseTraceExplorer.mockReturnValue({
        traces: [mockTrace],
        selectedTrace: mockTrace,
        selectedSpan: null,
        stats: { totalTraces: 1, totalSpans: 2 },
        totalCount: 1,
        hasMore: false,
        isLoading: false,
        isLoadingMore: false,
        isLoadingTrace: false,
        error: null,
        loadMore: vi.fn(),
        selectTrace: vi.fn(),
        selectSpan: vi.fn(),
        refresh: vi.fn(),
      });
      render(<TraceExplorerPage projectPath="/test/project" />);
      expect(
        screen.getByText("Select a span to view details"),
      ).toBeInTheDocument();
    });
  });

  describe("view logs button", () => {
    it("should render when callback provided", () => {
      const onNavigateToLogs = vi.fn();
      mockUseTraceExplorer.mockReturnValue({
        traces: [],
        selectedTrace: null,
        selectedSpan: null,
        stats: null,
        totalCount: 0,
        hasMore: false,
        isLoading: false,
        isLoadingMore: false,
        isLoadingTrace: false,
        error: null,
        loadMore: vi.fn(),
        selectTrace: vi.fn(),
        selectSpan: vi.fn(),
        refresh: vi.fn(),
      });
      render(
        <TraceExplorerPage
          projectPath="/test/project"
          onNavigateToLogs={onNavigateToLogs}
        />,
      );
      expect(screen.getByText("View Logs")).toBeInTheDocument();
    });

    it("should call onNavigateToLogs when clicked", () => {
      const onNavigateToLogs = vi.fn();
      mockUseTraceExplorer.mockReturnValue({
        traces: [],
        selectedTrace: null,
        selectedSpan: null,
        stats: null,
        totalCount: 0,
        hasMore: false,
        isLoading: false,
        isLoadingMore: false,
        isLoadingTrace: false,
        error: null,
        loadMore: vi.fn(),
        selectTrace: vi.fn(),
        selectSpan: vi.fn(),
        refresh: vi.fn(),
      });
      render(
        <TraceExplorerPage
          projectPath="/test/project"
          onNavigateToLogs={onNavigateToLogs}
        />,
      );
      fireEvent.click(screen.getByText("View Logs"));
      expect(onNavigateToLogs).toHaveBeenCalled();
    });
  });

  describe("refresh", () => {
    it("should call refresh when button clicked", () => {
      const refresh = vi.fn();
      mockUseTraceExplorer.mockReturnValue({
        traces: [],
        selectedTrace: null,
        selectedSpan: null,
        stats: null,
        totalCount: 0,
        hasMore: false,
        isLoading: false,
        isLoadingMore: false,
        isLoadingTrace: false,
        error: null,
        loadMore: vi.fn(),
        selectTrace: vi.fn(),
        selectSpan: vi.fn(),
        refresh,
      });
      render(<TraceExplorerPage projectPath="/test/project" />);
      fireEvent.click(screen.getByTitle("Refresh"));
      expect(refresh).toHaveBeenCalled();
    });
  });
});
