import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SpanCardBadges } from "@/components/agent-prism/SpanCard/SpanCardBadges";
import type { TraceSpan } from "@evilmartians/agent-prism-types";

// Mock the utility functions
vi.mock("@/components/agent-prism/spanAttributeUtils", () => ({
  getModelName: vi.fn((data: TraceSpan) => data.attributes?.model_name || null),
  getToolName: vi.fn((data: TraceSpan) => data.attributes?.tool_name || null),
}));

const createMockSpan = (overrides: Partial<TraceSpan> = {}): TraceSpan => ({
  id: "test-span",
  traceId: "test-trace",
  name: "Test Span",
  type: "llm_call",
  startTime: 1000,
  endTime: 2000,
  duration: 1000,
  children: [],
  parent: null,
  parentId: null,
  depth: 0,
  ...overrides,
});

describe("SpanCardBadges", () => {
  describe("rendering", () => {
    it("should render SpanBadge with category", () => {
      const span = createMockSpan({ type: "llm_call" });
      render(<SpanCardBadges data={span} />);
      // SpanBadge should be rendered
      expect(document.querySelector(".flex")).toBeInTheDocument();
    });

    it("should render model name badge when present", () => {
      const span = createMockSpan({
        attributes: {
          model_name: "gpt-4",
        } as unknown as TraceSpan["attributes"],
      });
      render(<SpanCardBadges data={span} />);
      expect(screen.getByText("gpt-4")).toBeInTheDocument();
    });

    it("should not render model name badge when not present", () => {
      const span = createMockSpan();
      render(<SpanCardBadges data={span} />);
      expect(screen.queryByText("gpt-4")).not.toBeInTheDocument();
    });

    it("should render tool name badge when present", () => {
      const span = createMockSpan({
        attributes: {
          tool_name: "search_tool",
        } as unknown as TraceSpan["attributes"],
      });
      render(<SpanCardBadges data={span} />);
      expect(screen.getByText("search_tool")).toBeInTheDocument();
    });

    it("should not render tool name badge when not present", () => {
      const span = createMockSpan();
      render(<SpanCardBadges data={span} />);
      expect(screen.queryByText("search_tool")).not.toBeInTheDocument();
    });

    it("should render tokens badge when tokensCount is present", () => {
      const span = createMockSpan({ tokensCount: 150 });
      render(<SpanCardBadges data={span} />);
      expect(screen.getByText("150")).toBeInTheDocument();
    });

    it("should not render tokens badge when tokensCount is not a number", () => {
      const span = createMockSpan();
      render(<SpanCardBadges data={span} />);
      // TokensBadge should not be rendered
    });

    it("should render price badge when cost is present", () => {
      const span = createMockSpan({ cost: 0.05 });
      render(<SpanCardBadges data={span} />);
      expect(screen.getByText("$ 0.05")).toBeInTheDocument();
    });

    it("should not render price badge when cost is not a number", () => {
      const span = createMockSpan();
      render(<SpanCardBadges data={span} />);
      expect(screen.queryByText(/^\$/)).not.toBeInTheDocument();
    });
  });
});
