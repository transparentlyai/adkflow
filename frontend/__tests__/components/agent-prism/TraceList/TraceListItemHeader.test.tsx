import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TraceListItemHeader } from "@/components/agent-prism/TraceList/TraceListItemHeader";
import type { TraceRecord, TraceSpan } from "@evilmartians/agent-prism-types";

// Mock child components
vi.mock("@/components/agent-prism/Avatar", () => ({
  Avatar: ({
    children,
    size,
  }: {
    children?: React.ReactNode;
    size: string;
  }) => (
    <div data-testid="avatar" data-size={size}>
      {children}
    </div>
  ),
}));

vi.mock("@/components/agent-prism/Badge", () => ({
  Badge: ({ label }: { label: string }) => (
    <span data-testid="badge">{label}</span>
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
  spansCount: 5,
  rootSpan: createMockSpan("root"),
  ...overrides,
});

describe("TraceListItemHeader", () => {
  describe("rendering", () => {
    it("should render trace name", () => {
      render(<TraceListItemHeader trace={createMockTrace()} />);
      expect(screen.getByText("Test Trace")).toBeInTheDocument();
    });

    it("should render span count badge", () => {
      render(
        <TraceListItemHeader trace={createMockTrace({ spansCount: 5 })} />,
      );
      expect(screen.getByText("5 spans")).toBeInTheDocument();
    });

    it("should render singular span for count of 1", () => {
      render(
        <TraceListItemHeader trace={createMockTrace({ spansCount: 1 })} />,
      );
      expect(screen.getByText("1 span")).toBeInTheDocument();
    });
  });

  describe("avatar", () => {
    it("should not render avatar when not provided", () => {
      render(<TraceListItemHeader trace={createMockTrace()} />);
      expect(screen.queryByTestId("avatar")).not.toBeInTheDocument();
    });

    it("should render avatar when provided", () => {
      render(
        <TraceListItemHeader
          trace={createMockTrace()}
          avatar={{ children: <span>A</span>, size: "4" }}
        />,
      );
      expect(screen.getByTestId("avatar")).toBeInTheDocument();
    });
  });

  describe("structure", () => {
    it("should render as header element", () => {
      render(<TraceListItemHeader trace={createMockTrace()} />);
      expect(screen.getByRole("banner")).toBeInTheDocument();
    });
  });
});
