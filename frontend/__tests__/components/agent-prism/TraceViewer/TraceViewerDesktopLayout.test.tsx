import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TraceViewerDesktopLayout } from "@/components/agent-prism/TraceViewer/TraceViewerDesktopLayout";
import type { TraceRecord, TraceSpan } from "@evilmartians/agent-prism-types";

// Mock react-resizable-panels
vi.mock("react-resizable-panels", () => ({
  Panel: ({ children, id }: { children: React.ReactNode; id: string }) => (
    <div data-testid={`panel-${id}`}>{children}</div>
  ),
  Group: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="panel-group">{children}</div>
  ),
  Separator: () => <div data-testid="panel-separator" />,
}));

// Mock child components
vi.mock("@/components/agent-prism/TraceList/TraceList", () => ({
  TraceList: ({
    traces,
    expanded,
  }: {
    traces: TraceRecord[];
    expanded: boolean;
  }) => (
    <div data-testid="trace-list">
      <span>Traces: {traces.length}</span>
      <span>Expanded: {String(expanded)}</span>
    </div>
  ),
}));

vi.mock("@/components/agent-prism/DetailsView/DetailsView", () => ({
  DetailsView: ({ data }: { data: TraceSpan }) => (
    <div data-testid="details-view">{data.name}</div>
  ),
}));

vi.mock("@/components/agent-prism/TraceViewer/TraceViewerPlaceholder", () => ({
  TraceViewerPlaceholder: ({ title }: { title: string }) => (
    <div data-testid="placeholder">{title}</div>
  ),
}));

vi.mock(
  "@/components/agent-prism/TraceViewer/TraceViewerTreeViewContainer",
  () => ({
    TraceViewerTreeViewContainer: () => (
      <div data-testid="tree-view-container">Tree View</div>
    ),
  }),
);

const createMockSpan = (id: string): TraceSpan => ({
  id,
  traceId: "trace-1",
  name: `Span ${id}`,
  type: "span",
  startTime: 0,
  endTime: 100,
  duration: 100,
  children: [],
  parent: null,
  parentId: null,
  depth: 0,
  raw: "{}",
});

const createMockTrace = (id: string): TraceRecord => ({
  id,
  name: `Trace ${id}`,
  createdAt: "2024-01-01T00:00:00Z",
  durationMs: 1000,
  spanCount: 1,
  rootSpan: createMockSpan("root"),
});

describe("TraceViewerDesktopLayout", () => {
  const defaultProps = {
    traceRecords: [createMockTrace("1"), createMockTrace("2")],
    traceListExpanded: true,
    setTraceListExpanded: vi.fn(),
    selectedTrace: undefined,
    selectedTraceId: undefined,
    selectedSpan: undefined,
    setSelectedSpan: vi.fn(),
    searchValue: "",
    setSearchValue: vi.fn(),
    filteredSpans: [],
    expandedSpansIds: [],
    setExpandedSpansIds: vi.fn(),
    handleExpandAll: vi.fn(),
    handleCollapseAll: vi.fn(),
    handleTraceSelect: vi.fn(),
    onClearTraceSelection: vi.fn(),
  };

  describe("rendering", () => {
    it("should render panel group", () => {
      render(<TraceViewerDesktopLayout {...defaultProps} />);
      expect(screen.getByTestId("panel-group")).toBeInTheDocument();
    });

    it("should render trace list panel", () => {
      render(<TraceViewerDesktopLayout {...defaultProps} />);
      expect(screen.getByTestId("panel-trace-list")).toBeInTheDocument();
    });

    it("should render trace list", () => {
      render(<TraceViewerDesktopLayout {...defaultProps} />);
      expect(screen.getByTestId("trace-list")).toBeInTheDocument();
    });

    it("should show trace count", () => {
      render(<TraceViewerDesktopLayout {...defaultProps} />);
      expect(screen.getByText("Traces: 2")).toBeInTheDocument();
    });
  });

  describe("without selected trace", () => {
    it("should show trace placeholder", () => {
      render(<TraceViewerDesktopLayout {...defaultProps} />);
      expect(
        screen.getByText("Select a trace to see the details"),
      ).toBeInTheDocument();
    });

    it("should show span placeholder", () => {
      render(<TraceViewerDesktopLayout {...defaultProps} />);
      expect(
        screen.getByText("Select a span to see the details"),
      ).toBeInTheDocument();
    });
  });

  describe("with selected trace", () => {
    it("should show tree view container", () => {
      const selectedTrace = createMockTrace("1");
      render(
        <TraceViewerDesktopLayout
          {...defaultProps}
          selectedTrace={selectedTrace}
          selectedTraceId="1"
        />,
      );
      expect(screen.getByTestId("tree-view-container")).toBeInTheDocument();
    });

    it("should not show trace placeholder", () => {
      const selectedTrace = createMockTrace("1");
      render(
        <TraceViewerDesktopLayout
          {...defaultProps}
          selectedTrace={selectedTrace}
          selectedTraceId="1"
        />,
      );
      expect(
        screen.queryByText("Select a trace to see the details"),
      ).not.toBeInTheDocument();
    });
  });

  describe("with selected span", () => {
    it("should show details view", () => {
      const selectedTrace = createMockTrace("1");
      const selectedSpan = createMockSpan("span-1");
      render(
        <TraceViewerDesktopLayout
          {...defaultProps}
          selectedTrace={selectedTrace}
          selectedTraceId="1"
          selectedSpan={selectedSpan}
        />,
      );
      expect(screen.getByTestId("details-view")).toBeInTheDocument();
    });
  });

  describe("expand state", () => {
    it("should pass expanded state to trace list", () => {
      render(
        <TraceViewerDesktopLayout {...defaultProps} traceListExpanded={true} />,
      );
      expect(screen.getByText("Expanded: true")).toBeInTheDocument();
    });

    it("should pass collapsed state to trace list", () => {
      render(
        <TraceViewerDesktopLayout
          {...defaultProps}
          traceListExpanded={false}
        />,
      );
      expect(screen.getByText("Expanded: false")).toBeInTheDocument();
    });
  });
});
