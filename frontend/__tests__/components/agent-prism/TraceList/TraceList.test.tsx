import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TraceList } from "@/components/agent-prism/TraceList/TraceList";
import type { TraceRecord } from "@evilmartians/agent-prism-types";

// Mock TraceListItem
vi.mock("@/components/agent-prism/TraceList/TraceListItem", () => ({
  TraceListItem: ({
    trace,
    onClick,
    isSelected,
  }: {
    trace: TraceRecord;
    onClick: () => void;
    isSelected: boolean;
  }) => (
    <button
      data-testid={`trace-item-${trace.id}`}
      data-selected={isSelected}
      onClick={onClick}
    >
      {trace.name}
    </button>
  ),
}));

// Mock Badge
vi.mock("@/components/agent-prism/Badge", () => ({
  Badge: ({ label }: { label: number }) => (
    <span data-testid="badge">{label}</span>
  ),
}));

// Mock IconButton
vi.mock("@/components/agent-prism/IconButton", () => ({
  IconButton: ({
    children,
    onClick,
    "aria-label": ariaLabel,
  }: {
    children: React.ReactNode;
    onClick: () => void;
    "aria-label": string;
  }) => (
    <button
      data-testid="expand-button"
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  ),
}));

const createMockTrace = (id: string): TraceRecord => ({
  id,
  name: `Trace ${id}`,
  createdAt: "2024-01-01T00:00:00Z",
  durationMs: 1000,
  spanCount: 5,
  rootSpan: {
    id: `span-${id}`,
    traceId: id,
    name: "Root Span",
    type: "span",
    startTime: 0,
    endTime: 100,
    duration: 100,
    children: [],
    parent: null,
    parentId: null,
    depth: 0,
    raw: "{}",
  },
});

describe("TraceList", () => {
  const defaultProps = {
    traces: [createMockTrace("1"), createMockTrace("2")],
    expanded: true,
    onExpandStateChange: vi.fn(),
  };

  describe("expanded state", () => {
    it("should show header when expanded", () => {
      render(<TraceList {...defaultProps} />);
      expect(screen.getByText("Traces")).toBeInTheDocument();
    });

    it("should show trace count badge", () => {
      render(<TraceList {...defaultProps} />);
      expect(screen.getByTestId("badge")).toHaveTextContent("2");
    });

    it("should show all traces", () => {
      render(<TraceList {...defaultProps} />);
      expect(screen.getByTestId("trace-item-1")).toBeInTheDocument();
      expect(screen.getByTestId("trace-item-2")).toBeInTheDocument();
    });

    it("should show expand button with collapse label", () => {
      render(<TraceList {...defaultProps} />);
      expect(screen.getByLabelText("Collapse Trace List")).toBeInTheDocument();
    });
  });

  describe("collapsed state", () => {
    it("should hide traces when collapsed", () => {
      render(<TraceList {...defaultProps} expanded={false} />);
      expect(screen.queryByTestId("trace-item-1")).not.toBeInTheDocument();
    });

    it("should show expand button with expand label", () => {
      render(<TraceList {...defaultProps} expanded={false} />);
      expect(screen.getByLabelText("Expand Trace List")).toBeInTheDocument();
    });
  });

  describe("interactions", () => {
    it("should call onExpandStateChange when toggle clicked", async () => {
      const user = userEvent.setup();
      const onExpandStateChange = vi.fn();
      render(
        <TraceList
          {...defaultProps}
          onExpandStateChange={onExpandStateChange}
        />,
      );

      await user.click(screen.getByTestId("expand-button"));

      expect(onExpandStateChange).toHaveBeenCalledWith(false);
    });

    it("should call onTraceSelect when trace clicked", async () => {
      const user = userEvent.setup();
      const onTraceSelect = vi.fn();
      render(<TraceList {...defaultProps} onTraceSelect={onTraceSelect} />);

      await user.click(screen.getByTestId("trace-item-1"));

      expect(onTraceSelect).toHaveBeenCalledWith(defaultProps.traces[0]);
    });
  });

  describe("selection", () => {
    it("should mark selected trace", () => {
      render(
        <TraceList {...defaultProps} selectedTrace={defaultProps.traces[0]} />,
      );
      expect(screen.getByTestId("trace-item-1")).toHaveAttribute(
        "data-selected",
        "true",
      );
      expect(screen.getByTestId("trace-item-2")).toHaveAttribute(
        "data-selected",
        "false",
      );
    });

    it("should not mark any trace when none selected", () => {
      render(<TraceList {...defaultProps} />);
      expect(screen.getByTestId("trace-item-1")).toHaveAttribute(
        "data-selected",
        "false",
      );
      expect(screen.getByTestId("trace-item-2")).toHaveAttribute(
        "data-selected",
        "false",
      );
    });
  });

  describe("empty state", () => {
    it("should show empty list when no traces", () => {
      render(<TraceList {...defaultProps} traces={[]} />);
      expect(screen.getByTestId("badge")).toHaveTextContent("0");
    });
  });

  describe("className", () => {
    it("should apply custom className", () => {
      const { container } = render(
        <TraceList {...defaultProps} className="custom-class" />,
      );
      expect(container.firstChild).toHaveClass("custom-class");
    });
  });
});
