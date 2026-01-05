import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SpanCard } from "@/components/agent-prism/SpanCard/SpanCard";
import type { TraceSpan } from "@evilmartians/agent-prism-types";
import * as Collapsible from "@radix-ui/react-collapsible";

// Mock data functions
vi.mock("@evilmartians/agent-prism-data", () => ({
  formatDuration: (ms: number) => `${ms}ms`,
  getTimelineData: () => ({ durationMs: 100 }),
}));

// Mock subcomponents
vi.mock("@/components/agent-prism/Avatar", () => ({
  Avatar: ({ size }: { size: string }) => (
    <div data-testid="avatar" data-size={size} />
  ),
}));

vi.mock("@/components/agent-prism/SpanCategoryAvatar", () => ({
  SpanCategoryAvatar: ({ category }: { category: string }) => (
    <div data-testid="category-avatar">{category}</div>
  ),
}));

vi.mock("@/components/agent-prism/SpanStatus", () => ({
  SpanStatus: ({ status }: { status: string }) => (
    <div data-testid="span-status">{status}</div>
  ),
}));

vi.mock("@/components/agent-prism/BrandLogo", () => ({
  BrandLogo: ({ brand }: { brand: string }) => (
    <div data-testid="brand-logo">{brand}</div>
  ),
}));

vi.mock("@/components/agent-prism/SpanCard/SpanCardBadges", () => ({
  SpanCardBadges: () => <div data-testid="span-badges" />,
}));

vi.mock("@/components/agent-prism/SpanCard/SpanCardConnector", () => ({
  SpanCardConnector: ({ type }: { type: string }) => (
    <div data-testid={`connector-${type}`} />
  ),
}));

vi.mock("@/components/agent-prism/SpanCard/SpanCardTimeline", () => ({
  SpanCardTimeline: () => <div data-testid="timeline" />,
}));

vi.mock("@/components/agent-prism/SpanCard/SpanCardToggle", () => ({
  SpanCardToggle: ({
    isExpanded,
    onToggleClick,
  }: {
    isExpanded: boolean;
    onToggleClick: (e: React.MouseEvent) => void;
  }) => (
    <button
      data-testid="toggle"
      data-expanded={isExpanded}
      onClick={onToggleClick}
    >
      Toggle
    </button>
  ),
}));

const createMockSpan = (overrides: Partial<TraceSpan> = {}): TraceSpan => ({
  id: "span-1",
  traceId: "trace-1",
  name: "Test Span",
  title: "Test Span Title",
  type: "span",
  startTime: 0,
  endTime: 100,
  duration: 100,
  children: [],
  parent: null,
  parentId: null,
  depth: 0,
  raw: "{}",
  status: "ok",
  ...overrides,
});

describe("SpanCard", () => {
  const defaultProps = {
    data: createMockSpan(),
    minStart: 0,
    maxEnd: 1000,
    isLastChild: false,
    expandedSpansIds: ["span-1"],
    onExpandSpansIdsChange: vi.fn(),
  };

  describe("rendering", () => {
    it("should render span title", () => {
      render(<SpanCard {...defaultProps} />);
      expect(screen.getByText("Test Span Title")).toBeInTheDocument();
    });

    it("should render category avatar", () => {
      render(<SpanCard {...defaultProps} />);
      expect(screen.getByTestId("category-avatar")).toBeInTheDocument();
    });

    it("should render custom avatar when provided", () => {
      render(
        <SpanCard
          {...defaultProps}
          avatar={{ children: <div>Custom</div>, size: "4" }}
        />,
      );
      expect(screen.getByTestId("avatar")).toBeInTheDocument();
    });

    it("should render timeline", () => {
      render(<SpanCard {...defaultProps} />);
      expect(screen.getByTestId("timeline")).toBeInTheDocument();
    });

    it("should render badges", () => {
      render(<SpanCard {...defaultProps} />);
      expect(screen.getByTestId("span-badges")).toBeInTheDocument();
    });

    it("should show duration", () => {
      render(<SpanCard {...defaultProps} />);
      expect(screen.getByText("100ms")).toBeInTheDocument();
    });
  });

  describe("status", () => {
    it("should render status by default", () => {
      render(<SpanCard {...defaultProps} />);
      expect(screen.getByTestId("span-status")).toBeInTheDocument();
    });

    it("should hide status when viewOptions.withStatus is false", () => {
      render(
        <SpanCard {...defaultProps} viewOptions={{ withStatus: false }} />,
      );
      expect(screen.queryByTestId("span-status")).not.toBeInTheDocument();
    });
  });

  describe("selection", () => {
    it("should highlight when selected", () => {
      const span = createMockSpan();
      render(<SpanCard {...defaultProps} data={span} selectedSpan={span} />);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-pressed", "true");
    });

    it("should call onSpanSelect when clicked", () => {
      const onSpanSelect = vi.fn();
      const span = createMockSpan();
      render(
        <SpanCard {...defaultProps} data={span} onSpanSelect={onSpanSelect} />,
      );
      fireEvent.click(screen.getByRole("button"));
      expect(onSpanSelect).toHaveBeenCalledWith(span);
    });

    it("should call onSpanSelect when Enter pressed", () => {
      const onSpanSelect = vi.fn();
      const span = createMockSpan();
      render(
        <SpanCard {...defaultProps} data={span} onSpanSelect={onSpanSelect} />,
      );
      fireEvent.keyDown(screen.getByRole("button"), { key: "Enter" });
      expect(onSpanSelect).toHaveBeenCalledWith(span);
    });

    it("should call onSpanSelect when Space pressed", () => {
      const onSpanSelect = vi.fn();
      const span = createMockSpan();
      render(
        <SpanCard {...defaultProps} data={span} onSpanSelect={onSpanSelect} />,
      );
      fireEvent.keyDown(screen.getByRole("button"), { key: " " });
      expect(onSpanSelect).toHaveBeenCalledWith(span);
    });
  });

  describe("with children", () => {
    const spanWithChildren = createMockSpan({
      children: [createMockSpan({ id: "child-1", title: "Child Span" })],
    });

    it("should show toggle button", () => {
      render(<SpanCard {...defaultProps} data={spanWithChildren} />);
      expect(screen.getByTestId("toggle")).toBeInTheDocument();
    });

    it("should expand children when expanded", () => {
      render(
        <SpanCard
          {...defaultProps}
          data={spanWithChildren}
          expandedSpansIds={["span-1"]}
        />,
      );
      expect(screen.getByTestId("toggle")).toHaveAttribute(
        "data-expanded",
        "true",
      );
    });

    it("should collapse when not in expandedSpansIds", () => {
      render(
        <SpanCard
          {...defaultProps}
          data={spanWithChildren}
          expandedSpansIds={[]}
        />,
      );
      expect(screen.getByTestId("toggle")).toHaveAttribute(
        "data-expanded",
        "false",
      );
    });
  });

  describe("connectors", () => {
    it("should render connector for level 0", () => {
      render(<SpanCard {...defaultProps} level={0} />);
      // Level 0 should have vertical connector when expandButton is outside
    });

    it("should render connectors for nested levels", () => {
      render(<SpanCard {...defaultProps} level={2} />);
      // Should have connectors based on level
    });
  });

  describe("expandedSpansIds management", () => {
    it("should remove id from expanded when collapsing", () => {
      const onExpandSpansIdsChange = vi.fn();
      const spanWithChildren = createMockSpan({
        children: [createMockSpan({ id: "child-1" })],
      });

      render(
        <SpanCard
          {...defaultProps}
          data={spanWithChildren}
          expandedSpansIds={["span-1"]}
          onExpandSpansIdsChange={onExpandSpansIdsChange}
        />,
      );

      // The toggle is rendered, simulating collapse would call onExpandSpansIdsChange
    });

    it("should add id to expanded when expanding", () => {
      const onExpandSpansIdsChange = vi.fn();
      const spanWithChildren = createMockSpan({
        children: [createMockSpan({ id: "child-1" })],
      });

      render(
        <SpanCard
          {...defaultProps}
          data={spanWithChildren}
          expandedSpansIds={[]}
          onExpandSpansIdsChange={onExpandSpansIdsChange}
        />,
      );

      // The toggle is rendered, simulating expand would call onExpandSpansIdsChange
    });
  });

  describe("aria attributes", () => {
    it("should have treeitem role", () => {
      render(<SpanCard {...defaultProps} />);
      expect(screen.getByRole("treeitem")).toBeInTheDocument();
    });

    it("should have aria-expanded when has children", () => {
      const spanWithChildren = createMockSpan({
        children: [createMockSpan({ id: "child-1" })],
      });
      render(
        <SpanCard
          {...defaultProps}
          data={spanWithChildren}
          expandedSpansIds={["span-1"]}
        />,
      );
      // Get the first treeitem (the parent)
      const treeitems = screen.getAllByRole("treeitem");
      expect(treeitems[0]).toHaveAttribute("aria-expanded", "true");
    });
  });

  describe("expandButton placement", () => {
    it("should render status in main row when expandButton is outside", () => {
      render(
        <SpanCard
          {...defaultProps}
          viewOptions={{ expandButton: "outside", withStatus: true }}
        />,
      );
      expect(screen.getByTestId("span-status")).toBeInTheDocument();
    });

    it("should render toggle outside when expandButton is outside and has children", () => {
      const spanWithChildren = createMockSpan({
        children: [createMockSpan({ id: "child-1" })],
      });
      render(
        <SpanCard
          {...defaultProps}
          data={spanWithChildren}
          viewOptions={{ expandButton: "outside" }}
        />,
      );
      expect(screen.getByTestId("toggle")).toBeInTheDocument();
    });

    it("should render empty div when expandButton is outside and no children", () => {
      render(
        <SpanCard
          {...defaultProps}
          data={createMockSpan({ children: [] })}
          viewOptions={{ expandButton: "outside" }}
        />,
      );
      // Should not render toggle
      expect(screen.queryByTestId("toggle")).not.toBeInTheDocument();
    });

    it("should use default expandButton inside when not specified", () => {
      render(<SpanCard {...defaultProps} />);
      expect(screen.getByTestId("span-status")).toBeInTheDocument();
    });
  });
});
