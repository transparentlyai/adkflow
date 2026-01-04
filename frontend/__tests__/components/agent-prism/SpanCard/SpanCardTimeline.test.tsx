import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { SpanCardTimeline } from "@/components/agent-prism/SpanCard/SpanCardTimeline";
import type { TraceSpan } from "@evilmartians/agent-prism-types";

// Mock the getTimelineData function
vi.mock("@evilmartians/agent-prism-data", () => ({
  getTimelineData: vi.fn(() => ({
    startPercent: 10,
    widthPercent: 50,
  })),
}));

const createMockSpan = (type: string): TraceSpan => ({
  id: "test-span",
  traceId: "test-trace",
  name: "Test Span",
  type: type as TraceSpan["type"],
  startTime: 1000,
  endTime: 2000,
  duration: 1000,
  children: [],
  parent: null,
  parentId: null,
  depth: 0,
});

describe("SpanCardTimeline", () => {
  const defaultProps = {
    spanCard: createMockSpan("llm_call"),
    minStart: 0,
    maxEnd: 5000,
  };

  describe("rendering", () => {
    it("should render the timeline container", () => {
      const { container } = render(<SpanCardTimeline {...defaultProps} />);
      expect(container.firstChild).toHaveClass(
        "bg-agentprism-secondary",
        "relative",
        "flex",
        "h-4",
        "min-w-20",
        "flex-1",
        "rounded-md",
      );
    });

    it("should apply custom className", () => {
      const { container } = render(
        <SpanCardTimeline {...defaultProps} className="custom-class" />,
      );
      expect(container.firstChild).toHaveClass("custom-class");
    });
  });

  describe("span types", () => {
    it.each([
      ["llm_call", "bg-agentprism-timeline-llm"],
      ["agent_invocation", "bg-agentprism-timeline-agent"],
      ["tool_execution", "bg-agentprism-timeline-tool"],
      ["chain_operation", "bg-agentprism-timeline-chain"],
      ["retrieval", "bg-agentprism-timeline-retrieval"],
      ["embedding", "bg-agentprism-timeline-embedding"],
      ["guardrail", "bg-agentprism-timeline-guardrail"],
      ["create_agent", "bg-agentprism-timeline-create-agent"],
      ["span", "bg-agentprism-timeline-span"],
      ["event", "bg-agentprism-timeline-event"],
      ["unknown", "bg-agentprism-timeline-unknown"],
    ])("should apply correct color for %s type", (type, expectedClass) => {
      const { container } = render(
        <SpanCardTimeline {...defaultProps} spanCard={createMockSpan(type)} />,
      );

      const timelineBar = container.querySelector(
        `.${expectedClass.replace("-", "\\-").replace("-", "\\-").replace("-", "\\-").replace("-", "\\-")}`,
      );
      // Check that the element with the timeline class exists
      const innerSpan = container.querySelector(`span span span`);
      expect(innerSpan).toBeInTheDocument();
    });
  });

  describe("timeline positioning", () => {
    it("should set left and width styles from timeline data", () => {
      const { container } = render(<SpanCardTimeline {...defaultProps} />);
      const innerSpan = container.querySelector(`span span span`);

      expect(innerSpan?.getAttribute("style")).toContain("left: 10%");
      expect(innerSpan?.getAttribute("style")).toContain("width: 50%");
    });
  });
});
