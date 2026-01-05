import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DetailsViewInputOutputTab } from "@/components/agent-prism/DetailsView/DetailsViewInputOutputTab";
import type { TraceSpan } from "@evilmartians/agent-prism-types";

// Mock CollapsibleSection
vi.mock("@/components/agent-prism/CollapsibleSection", () => ({
  CollapsibleSection: ({
    title,
    children,
    rightContent,
  }: {
    title: string;
    children: React.ReactNode;
    rightContent?: React.ReactNode;
  }) => (
    <div data-testid={`section-${title.toLowerCase()}`}>
      <span>{title}</span>
      {rightContent}
      {children}
    </div>
  ),
}));

// Mock TabSelector
vi.mock("@/components/agent-prism/TabSelector", () => ({
  TabSelector: ({
    items,
    value,
    onValueChange,
  }: {
    items: Array<{ value: string; label: string; disabled?: boolean }>;
    value: string;
    onValueChange: (v: string) => void;
  }) => (
    <div data-testid="tab-selector">
      {items.map((item) => (
        <button
          key={item.value}
          disabled={item.disabled}
          data-active={value === item.value}
          onClick={() => onValueChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  ),
}));

// Mock DetailsViewContentViewer
vi.mock(
  "@/components/agent-prism/DetailsView/DetailsViewContentViewer",
  () => ({
    DetailsViewContentViewer: ({
      content,
      mode,
      label,
    }: {
      content: string;
      mode: string;
      label: string;
    }) => (
      <div data-testid={`viewer-${label.toLowerCase()}`}>
        <span>Mode: {mode}</span>
        <span>Content: {content}</span>
      </div>
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

describe("DetailsViewInputOutputTab", () => {
  describe("with no input or output", () => {
    it("should show empty message", () => {
      const span = createMockSpan();
      render(<DetailsViewInputOutputTab data={span} />);
      expect(
        screen.getByText(/No input or output data available/),
      ).toBeInTheDocument();
    });
  });

  describe("with input only", () => {
    it("should show input section", () => {
      const span = createMockSpan({ input: "Hello World" });
      render(<DetailsViewInputOutputTab data={span} />);
      expect(screen.getByTestId("section-input")).toBeInTheDocument();
      expect(screen.queryByTestId("section-output")).not.toBeInTheDocument();
    });

    it("should show plain mode for non-JSON input", () => {
      const span = createMockSpan({ input: "Plain text" });
      render(<DetailsViewInputOutputTab data={span} />);
      expect(screen.getByText("Mode: plain")).toBeInTheDocument();
    });

    it("should show json mode for JSON input", () => {
      const span = createMockSpan({ input: '{"key": "value"}' });
      render(<DetailsViewInputOutputTab data={span} />);
      expect(screen.getByText("Mode: json")).toBeInTheDocument();
    });
  });

  describe("with output only", () => {
    it("should show output section", () => {
      const span = createMockSpan({ output: "Hello World" });
      render(<DetailsViewInputOutputTab data={span} />);
      expect(screen.getByTestId("section-output")).toBeInTheDocument();
      expect(screen.queryByTestId("section-input")).not.toBeInTheDocument();
    });

    it("should show plain mode for non-JSON output", () => {
      const span = createMockSpan({ output: "Plain text" });
      render(<DetailsViewInputOutputTab data={span} />);
      expect(screen.getByText("Mode: plain")).toBeInTheDocument();
    });

    it("should show json mode for JSON output", () => {
      const span = createMockSpan({ output: '{"result": true}' });
      render(<DetailsViewInputOutputTab data={span} />);
      expect(screen.getByText("Mode: json")).toBeInTheDocument();
    });
  });

  describe("with both input and output", () => {
    it("should show both sections", () => {
      const span = createMockSpan({
        input: "input data",
        output: "output data",
      });
      render(<DetailsViewInputOutputTab data={span} />);
      expect(screen.getByTestId("section-input")).toBeInTheDocument();
      expect(screen.getByTestId("section-output")).toBeInTheDocument();
    });

    it("should show content in viewers", () => {
      const span = createMockSpan({
        input: "my input",
        output: "my output",
      });
      render(<DetailsViewInputOutputTab data={span} />);
      expect(screen.getByText("Content: my input")).toBeInTheDocument();
      expect(screen.getByText("Content: my output")).toBeInTheDocument();
    });
  });

  describe("tab selector", () => {
    it("should disable JSON tab when content is not valid JSON", () => {
      const span = createMockSpan({ input: "not json" });
      render(<DetailsViewInputOutputTab data={span} />);
      const jsonButton = screen.getByText("JSON");
      expect(jsonButton).toBeDisabled();
    });

    it("should enable JSON tab when content is valid JSON", () => {
      const span = createMockSpan({ input: '{"valid": true}' });
      render(<DetailsViewInputOutputTab data={span} />);
      const jsonButton = screen.getByText("JSON");
      expect(jsonButton).not.toBeDisabled();
    });
  });
});
