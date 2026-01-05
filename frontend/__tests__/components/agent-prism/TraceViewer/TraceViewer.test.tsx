import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TraceViewer } from "@/components/agent-prism/TraceViewer/TraceViewer";
import type { TraceRecord, TraceSpan } from "@evilmartians/agent-prism-types";

// Mock data functions
vi.mock("@evilmartians/agent-prism-data", () => ({
  filterSpansRecursively: vi.fn((spans: TraceSpan[], _query: string) => spans),
  flattenSpans: vi.fn((spans: TraceSpan[]) => spans),
}));

// Mock shared hooks
vi.mock("@/components/agent-prism/shared", () => ({
  useIsMobile: vi.fn(() => false),
}));

// Mock layout components
vi.mock(
  "@/components/agent-prism/TraceViewer/TraceViewerDesktopLayout",
  () => ({
    TraceViewerDesktopLayout: (props: Record<string, unknown>) => (
      <div data-testid="desktop-layout">
        <span>Selected Trace: {String(props.selectedTraceId)}</span>
        <span>Traces: {(props.traceRecords as { id: string }[])?.length}</span>
        <button
          data-testid="select-trace"
          onClick={() => {
            const handleTraceSelect = props.handleTraceSelect as (
              trace: TraceRecord,
            ) => void;
            if (
              handleTraceSelect &&
              (props.traceRecords as TraceRecord[])?.length > 1
            ) {
              handleTraceSelect((props.traceRecords as TraceRecord[])[1]);
            }
          }}
        >
          Select Second Trace
        </button>
        <button
          data-testid="clear-selection"
          onClick={() => {
            const onClearSelection = props.onClearTraceSelection as () => void;
            if (onClearSelection) onClearSelection();
          }}
        >
          Clear Selection
        </button>
      </div>
    ),
  }),
);

vi.mock("@/components/agent-prism/TraceViewer/TraceViewerMobileLayout", () => ({
  TraceViewerMobileLayout: () => (
    <div data-testid="mobile-layout">Mobile Layout</div>
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

const createMockTraceRecord = (id: string): TraceRecord => ({
  id,
  name: `Trace ${id}`,
  createdAt: "2024-01-01T00:00:00Z",
  durationMs: 1000,
  spanCount: 1,
  rootSpan: createMockSpan("root"),
});

describe("TraceViewer", () => {
  const defaultProps = {
    data: [
      {
        traceRecord: createMockTraceRecord("trace-1"),
        spans: [createMockSpan("span-1")],
      },
    ],
  };

  describe("rendering", () => {
    it("should render desktop layout", () => {
      render(<TraceViewer {...defaultProps} />);
      expect(screen.getByTestId("desktop-layout")).toBeInTheDocument();
    });

    it("should render mobile layout", () => {
      render(<TraceViewer {...defaultProps} />);
      expect(screen.getByTestId("mobile-layout")).toBeInTheDocument();
    });

    it("should pass trace records to layout", () => {
      render(<TraceViewer {...defaultProps} />);
      expect(screen.getByText("Traces: 1")).toBeInTheDocument();
    });

    it("should select first trace by default", () => {
      render(<TraceViewer {...defaultProps} />);
      expect(screen.getByText("Selected Trace: trace-1")).toBeInTheDocument();
    });
  });

  describe("with multiple traces", () => {
    const multipleTracesProps = {
      data: [
        {
          traceRecord: createMockTraceRecord("trace-1"),
          spans: [createMockSpan("span-1")],
        },
        {
          traceRecord: createMockTraceRecord("trace-2"),
          spans: [createMockSpan("span-2")],
        },
      ],
    };

    it("should show all traces count", () => {
      render(<TraceViewer {...multipleTracesProps} />);
      expect(screen.getByText("Traces: 2")).toBeInTheDocument();
    });
  });

  describe("with empty data", () => {
    it("should handle empty data", () => {
      render(<TraceViewer data={[]} />);
      expect(screen.getByTestId("desktop-layout")).toBeInTheDocument();
      expect(screen.getByText("Selected Trace: undefined")).toBeInTheDocument();
    });
  });

  describe("with badges", () => {
    it("should pass badges to trace records", () => {
      const propsWithBadges = {
        data: [
          {
            traceRecord: createMockTraceRecord("trace-1"),
            spans: [createMockSpan("span-1")],
            badges: [{ label: "Badge1" }],
          },
        ],
      };
      render(<TraceViewer {...propsWithBadges} />);
      expect(screen.getByTestId("desktop-layout")).toBeInTheDocument();
    });
  });

  describe("spanCardViewOptions", () => {
    it("should pass spanCardViewOptions from props", () => {
      const propsWithOptions = {
        ...defaultProps,
        spanCardViewOptions: { withStatus: false },
      };
      render(<TraceViewer {...propsWithOptions} />);
      expect(screen.getByTestId("desktop-layout")).toBeInTheDocument();
    });

    it("should pass spanCardViewOptions from data item", () => {
      const propsWithDataOptions = {
        data: [
          {
            traceRecord: createMockTraceRecord("trace-1"),
            spans: [createMockSpan("span-1")],
            spanCardViewOptions: { expandButton: "outside" as const },
          },
        ],
      };
      render(<TraceViewer {...propsWithDataOptions} />);
      expect(screen.getByTestId("desktop-layout")).toBeInTheDocument();
    });
  });

  describe("trace selection", () => {
    const multipleTracesProps = {
      data: [
        {
          traceRecord: createMockTraceRecord("trace-1"),
          spans: [createMockSpan("span-1")],
        },
        {
          traceRecord: createMockTraceRecord("trace-2"),
          spans: [createMockSpan("span-2")],
        },
      ],
    };

    it("should handle trace selection", () => {
      render(<TraceViewer {...multipleTracesProps} />);

      // Initially first trace is selected
      expect(screen.getByText("Selected Trace: trace-1")).toBeInTheDocument();

      // Click to select second trace
      fireEvent.click(screen.getByTestId("select-trace"));

      // Now second trace should be selected
      expect(screen.getByText("Selected Trace: trace-2")).toBeInTheDocument();
    });

    it("should handle clearing trace selection", () => {
      render(<TraceViewer {...multipleTracesProps} />);

      // Initially first trace is selected
      expect(screen.getByText("Selected Trace: trace-1")).toBeInTheDocument();

      // Click to clear selection
      fireEvent.click(screen.getByTestId("clear-selection"));

      // Now no trace should be selected
      expect(screen.getByText("Selected Trace: undefined")).toBeInTheDocument();
    });
  });
});
