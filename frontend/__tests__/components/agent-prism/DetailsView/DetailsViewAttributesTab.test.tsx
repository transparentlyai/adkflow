import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DetailsViewAttributesTab } from "@/components/agent-prism/DetailsView/DetailsViewAttributesTab";
import type { TraceSpan } from "@evilmartians/agent-prism-types";

// Mock CollapsibleSection
vi.mock("@/components/agent-prism/CollapsibleSection", () => ({
  CollapsibleSection: ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <div data-testid={`section-${title}`}>
      <span>{title}</span>
      {children}
    </div>
  ),
}));

// Mock TabSelector
vi.mock("@/components/agent-prism/TabSelector", () => ({
  TabSelector: () => <div data-testid="tab-selector" />,
}));

// Mock DetailsViewContentViewer
vi.mock(
  "@/components/agent-prism/DetailsView/DetailsViewContentViewer",
  () => ({
    DetailsViewContentViewer: ({ content }: { content: string }) => (
      <div data-testid="viewer">{content}</div>
    ),
  }),
);

const createMockSpan = (overrides: Partial<TraceSpan> = {}): TraceSpan => ({
  id: "test-span",
  traceId: "test-trace",
  name: "Test Span",
  type: "span",
  startTime: 0,
  endTime: 100,
  duration: 100,
  children: [],
  parent: null,
  parentId: null,
  depth: 0,
  raw: "{}",
  ...overrides,
});

describe("DetailsViewAttributesTab", () => {
  describe("with no attributes", () => {
    it("should show empty message", () => {
      const span = createMockSpan({ attributes: [] });
      render(<DetailsViewAttributesTab data={span} />);
      expect(screen.getByText(/No attributes available/)).toBeInTheDocument();
    });

    it("should show empty message when attributes undefined", () => {
      const span = createMockSpan({ attributes: undefined });
      render(<DetailsViewAttributesTab data={span} />);
      expect(screen.getByText(/No attributes available/)).toBeInTheDocument();
    });
  });

  describe("with simple attributes", () => {
    it("should show string value", () => {
      const span = createMockSpan({
        attributes: [{ key: "name", value: { stringValue: "test" } }],
      });
      render(<DetailsViewAttributesTab data={span} />);
      expect(screen.getByText("name")).toBeInTheDocument();
      expect(screen.getByText("test")).toBeInTheDocument();
    });

    it("should show int value", () => {
      const span = createMockSpan({
        attributes: [{ key: "count", value: { intValue: 42 } }],
      });
      render(<DetailsViewAttributesTab data={span} />);
      expect(screen.getByText("count")).toBeInTheDocument();
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    it("should show bool value", () => {
      const span = createMockSpan({
        attributes: [{ key: "enabled", value: { boolValue: true } }],
      });
      render(<DetailsViewAttributesTab data={span} />);
      expect(screen.getByText("enabled")).toBeInTheDocument();
      expect(screen.getByText("true")).toBeInTheDocument();
    });

    it("should show N/A for empty value", () => {
      const span = createMockSpan({
        attributes: [{ key: "empty", value: {} }],
      });
      render(<DetailsViewAttributesTab data={span} />);
      expect(screen.getByText("empty")).toBeInTheDocument();
      expect(screen.getByText("N/A")).toBeInTheDocument();
    });
  });

  describe("with JSON attributes", () => {
    it("should show JSON attribute in collapsible section", () => {
      const span = createMockSpan({
        attributes: [
          { key: "config", value: { stringValue: '{"key": "value"}' } },
        ],
      });
      render(<DetailsViewAttributesTab data={span} />);
      expect(screen.getByTestId("section-config")).toBeInTheDocument();
    });

    it("should pass content to viewer", () => {
      const span = createMockSpan({
        attributes: [{ key: "data", value: { stringValue: '{"test": true}' } }],
      });
      render(<DetailsViewAttributesTab data={span} />);
      expect(screen.getByTestId("viewer")).toHaveTextContent('{"test": true}');
    });
  });

  describe("with multiple attributes", () => {
    it("should show all attributes", () => {
      const span = createMockSpan({
        attributes: [
          { key: "attr1", value: { stringValue: "value1" } },
          { key: "attr2", value: { intValue: 123 } },
          { key: "attr3", value: { stringValue: '{"json": true}' } },
        ],
      });
      render(<DetailsViewAttributesTab data={span} />);
      expect(screen.getByText("attr1")).toBeInTheDocument();
      expect(screen.getByText("attr2")).toBeInTheDocument();
      expect(screen.getByTestId("section-attr3")).toBeInTheDocument();
    });
  });

  describe("with invalid JSON string", () => {
    it("should show as simple value when JSON parsing fails", () => {
      const span = createMockSpan({
        attributes: [{ key: "invalid", value: { stringValue: "not { json" } }],
      });
      render(<DetailsViewAttributesTab data={span} />);
      expect(screen.getByText("invalid")).toBeInTheDocument();
      expect(screen.getByText("not { json")).toBeInTheDocument();
    });
  });
});
