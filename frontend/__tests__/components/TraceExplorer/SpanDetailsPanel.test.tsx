import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SpanDetailsPanel } from "@/components/TraceExplorer/SpanDetailsPanel";
import type { TraceSpan } from "@/lib/api/traces";

// Mock Monaco editor
vi.mock("@monaco-editor/react", () => ({
  default: ({ value }: { value: string }) => (
    <div data-testid="monaco-editor">{value}</div>
  ),
}));

const createMockSpan = (overrides: Partial<TraceSpan> = {}): TraceSpan => ({
  spanId: "span-123",
  traceId: "trace-456",
  name: "LlmAgent",
  parentSpanId: null,
  startTime: "2024-01-01T00:00:00Z",
  endTime: "2024-01-01T00:00:01Z",
  durationMs: 1000,
  status: "OK",
  attributes: {},
  events: [],
  children: [],
  ...overrides,
});

describe("SpanDetailsPanel", () => {
  describe("basic rendering", () => {
    it("should render span name", () => {
      render(<SpanDetailsPanel span={createMockSpan()} />);
      expect(screen.getByText("LlmAgent")).toBeInTheDocument();
    });

    it("should render span ID", () => {
      render(<SpanDetailsPanel span={createMockSpan()} />);
      expect(screen.getByText("span-123")).toBeInTheDocument();
    });

    it("should show duration", () => {
      render(<SpanDetailsPanel span={createMockSpan({ durationMs: 1500 })} />);
      expect(screen.getByText("Duration:")).toBeInTheDocument();
    });
  });

  describe("status display", () => {
    it("should show OK status", () => {
      render(<SpanDetailsPanel span={createMockSpan({ status: "OK" })} />);
      expect(screen.getByText("OK")).toBeInTheDocument();
    });

    it("should show ERROR status with error styling", () => {
      render(<SpanDetailsPanel span={createMockSpan({ status: "ERROR" })} />);
      expect(screen.getByText("ERROR")).toBeInTheDocument();
    });

    it("should show OK for UNSET status", () => {
      render(<SpanDetailsPanel span={createMockSpan({ status: "UNSET" })} />);
      expect(screen.getByText("OK")).toBeInTheDocument();
    });
  });

  describe("parent span", () => {
    it("should not show parent ID when null", () => {
      render(
        <SpanDetailsPanel span={createMockSpan({ parentSpanId: null })} />,
      );
      expect(screen.queryByText("Parent ID:")).not.toBeInTheDocument();
    });

    it("should show parent ID when present", () => {
      render(
        <SpanDetailsPanel
          span={createMockSpan({ parentSpanId: "parent-789" })}
        />,
      );
      expect(screen.getByText("Parent ID:")).toBeInTheDocument();
      expect(screen.getByText("parent-789")).toBeInTheDocument();
    });
  });

  describe("attributes", () => {
    it("should not show attributes editor when empty", () => {
      render(<SpanDetailsPanel span={createMockSpan({ attributes: {} })} />);
      expect(screen.queryByTestId("monaco-editor")).not.toBeInTheDocument();
    });

    it("should show attributes editor when present", () => {
      render(
        <SpanDetailsPanel
          span={createMockSpan({
            attributes: { model: "gpt-4", temperature: 0.7 },
          })}
        />,
      );
      expect(screen.getByTestId("monaco-editor")).toBeInTheDocument();
    });

    it("should display attributes as JSON", () => {
      render(
        <SpanDetailsPanel
          span={createMockSpan({
            attributes: { key: "value" },
          })}
        />,
      );
      expect(screen.getByTestId("monaco-editor")).toHaveTextContent('"key"');
      expect(screen.getByTestId("monaco-editor")).toHaveTextContent('"value"');
    });
  });

  describe("model name badge", () => {
    it("should show model name when present", () => {
      render(
        <SpanDetailsPanel
          span={createMockSpan({
            attributes: { "llm.model_name": "gpt-4o" },
          })}
        />,
      );
      expect(screen.getByText("gpt-4o")).toBeInTheDocument();
    });
  });

  describe("tool name badge", () => {
    it("should show tool name when present on tool span", () => {
      render(
        <SpanDetailsPanel
          span={createMockSpan({
            name: "execute_tool",
            attributes: { "tool.name": "search_web" },
          })}
        />,
      );
      expect(screen.getByText("search_web")).toBeInTheDocument();
    });
  });
});
