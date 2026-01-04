import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TraceListItem } from "@/components/agent-prism/TraceList/TraceListItem";
import type { TraceRecord, TraceSpan } from "@evilmartians/agent-prism-types";

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

vi.mock("@/components/agent-prism/PriceBadge", () => ({
  PriceBadge: ({ cost }: { cost: number }) => (
    <span data-testid="price-badge">${cost.toFixed(2)}</span>
  ),
}));

vi.mock("@/components/agent-prism/TokensBadge", () => ({
  TokensBadge: ({ tokensCount }: { tokensCount: number }) => (
    <span data-testid="tokens-badge">{tokensCount} tokens</span>
  ),
}));

vi.mock("@/components/agent-prism/TimestampBadge", () => ({
  TimestampBadge: ({ timestamp }: { timestamp: number }) => (
    <span data-testid="timestamp-badge">{timestamp}</span>
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

const createMockTrace = (
  overrides: Partial<TraceRecord> = {},
): TraceRecord => ({
  id: "trace-1",
  name: "Test Trace",
  createdAt: "2024-01-01T00:00:00Z",
  durationMs: 1000,
  spanCount: 5,
  rootSpan: createMockSpan("root"),
  agentDescription: "A test agent",
  ...overrides,
});

describe("TraceListItem", () => {
  describe("rendering", () => {
    it("should render trace header", () => {
      render(<TraceListItem trace={createMockTrace()} />);
      expect(screen.getByTestId("trace-header")).toBeInTheDocument();
      expect(screen.getByText("Test Trace")).toBeInTheDocument();
    });

    it("should render agent description by default", () => {
      render(<TraceListItem trace={createMockTrace()} />);
      expect(screen.getByText("A test agent")).toBeInTheDocument();
    });

    it("should hide description when showDescription is false", () => {
      render(
        <TraceListItem trace={createMockTrace()} showDescription={false} />,
      );
      expect(screen.queryByText("A test agent")).not.toBeInTheDocument();
    });

    it("should have button role", () => {
      render(<TraceListItem trace={createMockTrace()} />);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("should have aria-label", () => {
      render(<TraceListItem trace={createMockTrace()} />);
      expect(
        screen.getByLabelText("Select trace Test Trace"),
      ).toBeInTheDocument();
    });
  });

  describe("badges", () => {
    it("should render custom badges", () => {
      render(
        <TraceListItem
          trace={createMockTrace()}
          badges={[{ label: "Custom" }, { label: "Badge" }]}
        />,
      );
      expect(screen.getByText("Custom")).toBeInTheDocument();
      expect(screen.getByText("Badge")).toBeInTheDocument();
    });

    it("should render price badge when totalCost is set", () => {
      render(<TraceListItem trace={createMockTrace({ totalCost: 0.05 })} />);
      expect(screen.getByTestId("price-badge")).toBeInTheDocument();
    });

    it("should render tokens badge when totalTokens is set", () => {
      render(<TraceListItem trace={createMockTrace({ totalTokens: 1500 })} />);
      expect(screen.getByTestId("tokens-badge")).toBeInTheDocument();
    });

    it("should render timestamp badge when startTime is set", () => {
      render(
        <TraceListItem trace={createMockTrace({ startTime: 1704067200000 })} />,
      );
      expect(screen.getByTestId("timestamp-badge")).toBeInTheDocument();
    });
  });

  describe("selection", () => {
    it("should apply selected styles when isSelected", () => {
      const { container } = render(
        <TraceListItem trace={createMockTrace()} isSelected={true} />,
      );
      const item = container.firstChild as HTMLElement;
      expect(item.className).toContain("bg-agentprism-secondary");
    });

    it("should not apply selected styles when not selected", () => {
      const { container } = render(
        <TraceListItem trace={createMockTrace()} isSelected={false} />,
      );
      const item = container.firstChild as HTMLElement;
      expect(item.className).toContain("bg-agentprism-background");
    });
  });

  describe("interaction", () => {
    it("should call onClick when clicked", () => {
      const onClick = vi.fn();
      render(<TraceListItem trace={createMockTrace()} onClick={onClick} />);
      fireEvent.click(screen.getByRole("button"));
      expect(onClick).toHaveBeenCalled();
    });

    it("should call onClick when Enter pressed", () => {
      const onClick = vi.fn();
      render(<TraceListItem trace={createMockTrace()} onClick={onClick} />);
      fireEvent.keyDown(screen.getByRole("button"), { key: "Enter" });
      expect(onClick).toHaveBeenCalled();
    });

    it("should call onClick when Space pressed", () => {
      const onClick = vi.fn();
      render(<TraceListItem trace={createMockTrace()} onClick={onClick} />);
      fireEvent.keyDown(screen.getByRole("button"), { key: " " });
      expect(onClick).toHaveBeenCalled();
    });

    it("should not call onClick for other keys", () => {
      const onClick = vi.fn();
      render(<TraceListItem trace={createMockTrace()} onClick={onClick} />);
      fireEvent.keyDown(screen.getByRole("button"), { key: "a" });
      expect(onClick).not.toHaveBeenCalled();
    });
  });
});
