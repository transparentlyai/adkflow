import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TraceViewerTreeViewContainer } from "@/components/agent-prism/TraceViewer/TraceViewerTreeViewContainer";
import type { TraceSpan } from "@evilmartians/agent-prism-types";

// Mock child components
vi.mock("@/components/agent-prism/TraceList/TraceListItemHeader", () => ({
  TraceListItemHeader: ({ trace }: { trace: { name: string } }) => (
    <div data-testid="trace-header">{trace.name}</div>
  ),
}));

vi.mock("@/components/agent-prism/Badge", () => ({
  Badge: ({ label }: { label: string }) => (
    <span data-testid="badge">{label}</span>
  ),
}));

vi.mock(
  "@/components/agent-prism/TraceViewer/TraceViewerSearchAndControls",
  () => ({
    TraceViewerSearchAndControls: ({
      searchValue,
      setSearchValue,
      handleExpandAll,
      handleCollapseAll,
    }: {
      searchValue: string;
      setSearchValue: (value: string) => void;
      handleExpandAll: () => void;
      handleCollapseAll: () => void;
    }) => (
      <div data-testid="search-controls">
        <input
          data-testid="search-input"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
        <button data-testid="expand-all" onClick={handleExpandAll}>
          Expand All
        </button>
        <button data-testid="collapse-all" onClick={handleCollapseAll}>
          Collapse All
        </button>
      </div>
    ),
  }),
);

vi.mock("@/components/agent-prism/TreeView", () => ({
  TreeView: ({
    spans,
    selectedSpan,
    onSpanSelect,
  }: {
    spans: TraceSpan[];
    selectedSpan?: TraceSpan;
    onSpanSelect: (span: TraceSpan | undefined) => void;
  }) => (
    <div data-testid="tree-view">
      <span>Spans: {spans.length}</span>
      {selectedSpan && <span>Selected: {selectedSpan.id}</span>}
      {spans.map((span) => (
        <button key={span.id} onClick={() => onSpanSelect(span)}>
          {span.name}
        </button>
      ))}
    </div>
  ),
}));

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

const createMockTrace = () => ({
  id: "trace-1",
  name: "Test Trace",
  createdAt: "2024-01-01T00:00:00Z",
  durationMs: 1000,
  spanCount: 1,
  rootSpan: createMockSpan("root"),
  badges: [{ label: "Success" }],
});

describe("TraceViewerTreeViewContainer", () => {
  const defaultProps = {
    searchValue: "",
    setSearchValue: vi.fn(),
    handleExpandAll: vi.fn(),
    handleCollapseAll: vi.fn(),
    filteredSpans: [createMockSpan("1"), createMockSpan("2")],
    selectedSpan: undefined,
    setSelectedSpan: vi.fn(),
    expandedSpansIds: [] as string[],
    setExpandedSpansIds: vi.fn(),
    spanCardViewOptions: {},
    selectedTrace: createMockTrace(),
  };

  describe("header visibility", () => {
    it("should render header when showHeader is true and trace exists", () => {
      render(<TraceViewerTreeViewContainer {...defaultProps} />);
      expect(screen.getByTestId("trace-header")).toBeInTheDocument();
    });

    it("should hide header when showHeader is false", () => {
      render(
        <TraceViewerTreeViewContainer {...defaultProps} showHeader={false} />,
      );
      expect(screen.queryByTestId("trace-header")).not.toBeInTheDocument();
    });

    it("should hide header when no selectedTrace", () => {
      render(
        <TraceViewerTreeViewContainer
          {...defaultProps}
          selectedTrace={undefined}
        />,
      );
      expect(screen.queryByTestId("trace-header")).not.toBeInTheDocument();
    });

    it("should show trace name in header", () => {
      render(<TraceViewerTreeViewContainer {...defaultProps} />);
      expect(screen.getByText("Test Trace")).toBeInTheDocument();
    });

    it("should show badges when trace has badges", () => {
      render(<TraceViewerTreeViewContainer {...defaultProps} />);
      expect(screen.getByTestId("badge")).toBeInTheDocument();
      expect(screen.getByText("Success")).toBeInTheDocument();
    });
  });

  describe("search and controls", () => {
    it("should render search controls", () => {
      render(<TraceViewerTreeViewContainer {...defaultProps} />);
      expect(screen.getByTestId("search-controls")).toBeInTheDocument();
    });

    it("should pass search value to controls", () => {
      render(
        <TraceViewerTreeViewContainer {...defaultProps} searchValue="test" />,
      );
      expect(screen.getByTestId("search-input")).toHaveValue("test");
    });

    it("should call setSearchValue on input change", async () => {
      const user = userEvent.setup();
      const setSearchValue = vi.fn();
      render(
        <TraceViewerTreeViewContainer
          {...defaultProps}
          setSearchValue={setSearchValue}
        />,
      );

      await user.type(screen.getByTestId("search-input"), "a");

      expect(setSearchValue).toHaveBeenCalled();
    });

    it("should call handleExpandAll when expand button clicked", async () => {
      const user = userEvent.setup();
      const handleExpandAll = vi.fn();
      render(
        <TraceViewerTreeViewContainer
          {...defaultProps}
          handleExpandAll={handleExpandAll}
        />,
      );

      await user.click(screen.getByTestId("expand-all"));

      expect(handleExpandAll).toHaveBeenCalled();
    });

    it("should call handleCollapseAll when collapse button clicked", async () => {
      const user = userEvent.setup();
      const handleCollapseAll = vi.fn();
      render(
        <TraceViewerTreeViewContainer
          {...defaultProps}
          handleCollapseAll={handleCollapseAll}
        />,
      );

      await user.click(screen.getByTestId("collapse-all"));

      expect(handleCollapseAll).toHaveBeenCalled();
    });
  });

  describe("tree view", () => {
    it("should render tree view when spans exist", () => {
      render(<TraceViewerTreeViewContainer {...defaultProps} />);
      expect(screen.getByTestId("tree-view")).toBeInTheDocument();
    });

    it("should show span count", () => {
      render(<TraceViewerTreeViewContainer {...defaultProps} />);
      expect(screen.getByText("Spans: 2")).toBeInTheDocument();
    });

    it("should show empty message when no spans", () => {
      render(
        <TraceViewerTreeViewContainer {...defaultProps} filteredSpans={[]} />,
      );
      expect(screen.getByText("No spans found")).toBeInTheDocument();
    });

    it("should not render tree view when no spans", () => {
      render(
        <TraceViewerTreeViewContainer {...defaultProps} filteredSpans={[]} />,
      );
      expect(screen.queryByTestId("tree-view")).not.toBeInTheDocument();
    });
  });

  describe("span selection", () => {
    it("should show selected span", () => {
      const selectedSpan = createMockSpan("selected");
      render(
        <TraceViewerTreeViewContainer
          {...defaultProps}
          selectedSpan={selectedSpan}
        />,
      );
      expect(screen.getByText("Selected: selected")).toBeInTheDocument();
    });

    it("should call setSelectedSpan when span clicked", async () => {
      const user = userEvent.setup();
      const setSelectedSpan = vi.fn();
      render(
        <TraceViewerTreeViewContainer
          {...defaultProps}
          setSelectedSpan={setSelectedSpan}
        />,
      );

      await user.click(screen.getByText("Span 1"));

      expect(setSelectedSpan).toHaveBeenCalledWith(
        expect.objectContaining({ id: "1" }),
      );
    });
  });
});
