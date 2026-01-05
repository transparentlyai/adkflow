import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TreeView } from "@/components/agent-prism/TreeView";
import type { TraceSpan } from "@evilmartians/agent-prism-types";

// Mock the SpanCard component
vi.mock("@/components/agent-prism/SpanCard/SpanCard", () => ({
  SpanCard: ({
    data,
    avatar,
  }: {
    data: TraceSpan;
    avatar?: { children: React.ReactNode };
  }) => (
    <li data-testid={`span-card-${data.id}`}>
      {data.name}
      {avatar && <div data-testid="avatar">{avatar.children}</div>}
    </li>
  ),
}));

// Mock the BrandLogo component
vi.mock("@/components/agent-prism/BrandLogo", () => ({
  BrandLogo: ({ brand }: { brand: string }) => (
    <span data-testid="brand-logo">{brand}</span>
  ),
}));

// Mock the data functions
vi.mock("@evilmartians/agent-prism-data", () => ({
  flattenSpans: vi.fn((spans) => spans),
  findTimeRange: vi.fn(() => ({ minStart: 0, maxEnd: 1000 })),
}));

const createMockSpan = (id: string, name: string): TraceSpan => ({
  id,
  traceId: "test-trace",
  name,
  type: "span",
  startTime: 0,
  endTime: 100,
  duration: 100,
  children: [],
  parent: null,
  parentId: null,
  depth: 0,
});

describe("TreeView", () => {
  const defaultProps = {
    spans: [createMockSpan("1", "Span 1"), createMockSpan("2", "Span 2")],
    expandedSpansIds: [] as string[],
    onExpandSpansIdsChange: vi.fn(),
  };

  describe("rendering", () => {
    it("should render a tree list", () => {
      render(<TreeView {...defaultProps} />);
      expect(screen.getByRole("tree")).toBeInTheDocument();
    });

    it("should have correct aria-label", () => {
      render(<TreeView {...defaultProps} />);
      expect(screen.getByRole("tree")).toHaveAttribute(
        "aria-label",
        "Hierarchical card list",
      );
    });

    it("should render all spans", () => {
      render(<TreeView {...defaultProps} />);
      expect(screen.getByTestId("span-card-1")).toBeInTheDocument();
      expect(screen.getByTestId("span-card-2")).toBeInTheDocument();
    });

    it("should render span names", () => {
      render(<TreeView {...defaultProps} />);
      expect(screen.getByText("Span 1")).toBeInTheDocument();
      expect(screen.getByText("Span 2")).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("should render empty tree when no spans", () => {
      render(<TreeView {...defaultProps} spans={[]} />);
      expect(screen.getByRole("tree")).toBeInTheDocument();
      expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    });
  });

  describe("className", () => {
    it("should apply custom className", () => {
      render(<TreeView {...defaultProps} className="custom-class" />);
      expect(screen.getByRole("tree")).toHaveClass("custom-class");
    });
  });

  describe("brand logo", () => {
    it("should render brand logo when span has metadata.brand", () => {
      const spanWithBrand = {
        ...createMockSpan("brand-span", "Brand Span"),
        metadata: { brand: { type: "openai" } },
      };
      render(<TreeView {...defaultProps} spans={[spanWithBrand]} />);

      expect(screen.getByTestId("avatar")).toBeInTheDocument();
      expect(screen.getByTestId("brand-logo")).toBeInTheDocument();
      expect(screen.getByText("openai")).toBeInTheDocument();
    });

    it("should not render avatar when span has no metadata.brand", () => {
      const spanWithoutBrand = createMockSpan("no-brand", "No Brand Span");
      render(<TreeView {...defaultProps} spans={[spanWithoutBrand]} />);

      expect(screen.queryByTestId("avatar")).not.toBeInTheDocument();
      expect(screen.queryByTestId("brand-logo")).not.toBeInTheDocument();
    });

    it("should render brand logo with different brand types", () => {
      const spanWithAnthropicBrand = {
        ...createMockSpan("anthropic-span", "Anthropic Span"),
        metadata: { brand: { type: "anthropic" } },
      };
      render(<TreeView {...defaultProps} spans={[spanWithAnthropicBrand]} />);

      expect(screen.getByText("anthropic")).toBeInTheDocument();
    });
  });
});
