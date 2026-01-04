import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TraceViewerMobileLayout } from "@/components/agent-prism/TraceViewer/TraceViewerMobileLayout";
import type { TraceRecord, TraceSpan } from "@evilmartians/agent-prism-types";

// Mock child components
vi.mock("@/components/agent-prism/Button", () => ({
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick: () => void;
  }) => <button onClick={onClick}>{children}</button>,
}));

vi.mock("@/components/agent-prism/TraceList/TraceList", () => ({
  TraceList: ({ traces }: { traces: TraceRecord[] }) => (
    <div data-testid="trace-list">Traces: {traces.length}</div>
  ),
}));

vi.mock("@/components/agent-prism/DetailsView/DetailsView", () => ({
  DetailsView: ({ data }: { data: TraceSpan }) => (
    <div data-testid="details-view">{data.name}</div>
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

describe("TraceViewerMobileLayout", () => {
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
    filteredSpans: [] as TraceSpan[],
    expandedSpansIds: [],
    setExpandedSpansIds: vi.fn(),
    handleExpandAll: vi.fn(),
    handleCollapseAll: vi.fn(),
    handleTraceSelect: vi.fn(),
    onClearTraceSelection: vi.fn(),
  };

  describe("no selection", () => {
    it("should show trace list", () => {
      render(<TraceViewerMobileLayout {...defaultProps} />);
      expect(screen.getByTestId("trace-list")).toBeInTheDocument();
    });

    it("should show trace count", () => {
      render(<TraceViewerMobileLayout {...defaultProps} />);
      expect(screen.getByText("Traces: 2")).toBeInTheDocument();
    });
  });

  describe("with selected trace but no selected span", () => {
    const propsWithTrace = {
      ...defaultProps,
      selectedTrace: createMockTrace("1"),
      selectedTraceId: "1",
      filteredSpans: [createMockSpan("span-1")],
    };

    it("should show tree view container", () => {
      render(<TraceViewerMobileLayout {...propsWithTrace} />);
      expect(screen.getByTestId("tree-view-container")).toBeInTheDocument();
    });

    it("should show back to traces button", () => {
      render(<TraceViewerMobileLayout {...propsWithTrace} />);
      expect(screen.getByText("Traces list")).toBeInTheDocument();
    });

    it("should call onClearTraceSelection when back clicked", async () => {
      const user = userEvent.setup();
      const onClearTraceSelection = vi.fn();
      render(
        <TraceViewerMobileLayout
          {...propsWithTrace}
          onClearTraceSelection={onClearTraceSelection}
        />,
      );

      await user.click(screen.getByText("Traces list"));

      expect(onClearTraceSelection).toHaveBeenCalled();
    });
  });

  describe("with selected span", () => {
    const propsWithSpan = {
      ...defaultProps,
      selectedTrace: createMockTrace("1"),
      selectedTraceId: "1",
      filteredSpans: [createMockSpan("span-1")],
      selectedSpan: createMockSpan("span-1"),
    };

    it("should show details view", () => {
      render(<TraceViewerMobileLayout {...propsWithSpan} />);
      expect(screen.getByTestId("details-view")).toBeInTheDocument();
    });

    it("should show back to tree view button", () => {
      render(<TraceViewerMobileLayout {...propsWithSpan} />);
      expect(screen.getByText("Tree View")).toBeInTheDocument();
    });

    it("should clear selected span when back clicked", async () => {
      const user = userEvent.setup();
      const setSelectedSpan = vi.fn();
      render(
        <TraceViewerMobileLayout
          {...propsWithSpan}
          setSelectedSpan={setSelectedSpan}
        />,
      );

      await user.click(screen.getByText("Tree View"));

      expect(setSelectedSpan).toHaveBeenCalledWith(undefined);
    });

    it("should show span name in details view", () => {
      render(<TraceViewerMobileLayout {...propsWithSpan} />);
      expect(screen.getByText("Span span-1")).toBeInTheDocument();
    });
  });
});
