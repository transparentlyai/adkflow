import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  SpanTimeline,
  SpanTreeNode,
} from "@/components/TraceExplorer/SpanTree";
import type { TraceSpan } from "@/lib/api/traces";

// Mock traceUtils
vi.mock("@/components/TraceExplorer/traceUtils", () => ({
  formatDuration: (ms: number | undefined) => `${ms || 0}ms`,
  formatSpanName: (name: string) => name,
  getSpanTypeClass: () => ({
    badge: "bg-blue-500",
    icon: ({ className }: { className?: string }) => (
      <span className={className} data-testid="span-icon" />
    ),
  }),
}));

const createMockSpan = (overrides: Partial<TraceSpan> = {}): TraceSpan => ({
  spanId: "span-1",
  traceId: "trace-1",
  name: "TestSpan",
  startTime: "2024-01-01T00:00:00Z",
  endTime: "2024-01-01T00:00:01Z",
  durationMs: 1000,
  status: "OK",
  attributes: {},
  children: [],
  ...overrides,
});

describe("SpanTimeline", () => {
  const defaultProps = {
    span: createMockSpan({
      startTime: "2024-01-01T00:00:00.500Z",
      durationMs: 500,
    }),
    traceStartMs: new Date("2024-01-01T00:00:00Z").getTime(),
    traceDurationMs: 1000,
  };

  it("should render timeline bar", () => {
    const { container } = render(<SpanTimeline {...defaultProps} />);
    const timeline = container.querySelector(".relative.flex.h-3");
    expect(timeline).toBeInTheDocument();
  });

  it("should calculate position based on trace timing", () => {
    const { container } = render(<SpanTimeline {...defaultProps} />);
    const bar = container.querySelector(".absolute.h-full");
    expect(bar).toHaveStyle({ left: "50%" });
    expect(bar).toHaveStyle({ width: "50%" });
  });

  it("should handle zero trace duration", () => {
    const { container } = render(
      <SpanTimeline {...defaultProps} traceDurationMs={0} />,
    );
    const bar = container.querySelector(".absolute.h-full");
    expect(bar).toHaveStyle({ left: "0%" });
  });

  it("should handle missing span duration", () => {
    const span = createMockSpan({ durationMs: undefined });
    const { container } = render(
      <SpanTimeline {...defaultProps} span={span} />,
    );
    const bar = container.querySelector(".absolute.h-full");
    // Should have minimum width of 1%
    expect(bar).toHaveStyle({ width: "1%" });
  });
});

describe("SpanTreeNode", () => {
  const defaultProps = {
    span: createMockSpan(),
    depth: 0,
    selectedSpan: null,
    onSelectSpan: vi.fn(),
    traceStartMs: new Date("2024-01-01T00:00:00Z").getTime(),
    traceDurationMs: 1000,
  };

  it("should render span name", () => {
    render(<SpanTreeNode {...defaultProps} />);
    expect(screen.getByText("TestSpan")).toBeInTheDocument();
  });

  it("should render duration", () => {
    render(<SpanTreeNode {...defaultProps} />);
    expect(screen.getByText("1000ms")).toBeInTheDocument();
  });

  it("should apply selection styling when selected", () => {
    const span = createMockSpan();
    render(<SpanTreeNode {...defaultProps} span={span} selectedSpan={span} />);
    const button = screen.getByRole("button", { name: /TestSpan/i });
    expect(button).toHaveClass("bg-agentprism-secondary");
  });

  it("should call onSelectSpan when clicked", async () => {
    const user = userEvent.setup();
    const onSelectSpan = vi.fn();
    const span = createMockSpan();
    render(
      <SpanTreeNode
        {...defaultProps}
        span={span}
        onSelectSpan={onSelectSpan}
      />,
    );

    await user.click(screen.getByRole("button", { name: /TestSpan/i }));

    expect(onSelectSpan).toHaveBeenCalledWith(span);
  });

  it("should indent based on depth", () => {
    render(<SpanTreeNode {...defaultProps} depth={2} />);
    const button = screen.getByRole("button", { name: /TestSpan/i });
    expect(button).toHaveStyle({ paddingLeft: "40px" }); // 2 * 16 + 8
  });

  it("should show error indicator for error spans", () => {
    const span = createMockSpan({ status: "ERROR" });
    render(<SpanTreeNode {...defaultProps} span={span} />);
    expect(screen.getByText("!")).toBeInTheDocument();
  });

  it("should not show error indicator for OK spans", () => {
    render(<SpanTreeNode {...defaultProps} />);
    expect(screen.queryByText("!")).not.toBeInTheDocument();
  });

  describe("with children", () => {
    const spanWithChildren = createMockSpan({
      children: [
        createMockSpan({ spanId: "child-1", name: "ChildSpan1" }),
        createMockSpan({ spanId: "child-2", name: "ChildSpan2" }),
      ],
    });

    it("should show expand/collapse button", () => {
      render(<SpanTreeNode {...defaultProps} span={spanWithChildren} />);
      // ChevronRight is rendered inside a span with role="button"
      const toggleButtons = screen.getAllByRole("button");
      expect(toggleButtons.length).toBeGreaterThan(1);
    });

    it("should render children by default (expanded)", () => {
      render(<SpanTreeNode {...defaultProps} span={spanWithChildren} />);
      expect(screen.getByText("ChildSpan1")).toBeInTheDocument();
      expect(screen.getByText("ChildSpan2")).toBeInTheDocument();
    });

    it("should collapse children when toggle clicked", async () => {
      const user = userEvent.setup();
      const { container } = render(
        <SpanTreeNode {...defaultProps} span={spanWithChildren} />,
      );

      // Find the toggle span (inside the button, has role="button" and tabIndex=0)
      const toggle = container.querySelector(
        'span[role="button"][tabindex="0"]',
      );
      expect(toggle).toBeInTheDocument();

      await user.click(toggle!);

      expect(screen.queryByText("ChildSpan1")).not.toBeInTheDocument();
    });

    it("should expand children when toggle clicked again", async () => {
      const user = userEvent.setup();
      const { container } = render(
        <SpanTreeNode {...defaultProps} span={spanWithChildren} />,
      );

      const toggle = container.querySelector(
        'span[role="button"][tabindex="0"]',
      );

      // Collapse
      await user.click(toggle!);
      expect(screen.queryByText("ChildSpan1")).not.toBeInTheDocument();

      // Expand
      await user.click(toggle!);
      expect(screen.getByText("ChildSpan1")).toBeInTheDocument();
    });

    it("should handle keyboard toggle with Enter", () => {
      const { container } = render(
        <SpanTreeNode {...defaultProps} span={spanWithChildren} />,
      );

      const toggle = container.querySelector(
        'span[role="button"][tabindex="0"]',
      );

      fireEvent.keyDown(toggle!, { key: "Enter" });

      expect(screen.queryByText("ChildSpan1")).not.toBeInTheDocument();
    });

    it("should handle keyboard toggle with Space", () => {
      const { container } = render(
        <SpanTreeNode {...defaultProps} span={spanWithChildren} />,
      );

      const toggle = container.querySelector(
        'span[role="button"][tabindex="0"]',
      );

      fireEvent.keyDown(toggle!, { key: " " });

      expect(screen.queryByText("ChildSpan1")).not.toBeInTheDocument();
    });
  });

  describe("without children", () => {
    it("should show spacer instead of expand button", () => {
      const { container } = render(<SpanTreeNode {...defaultProps} />);
      // Should have a w-4 spacer span
      const spacer = container.querySelector("span.w-4");
      expect(spacer).toBeInTheDocument();
    });
  });
});
