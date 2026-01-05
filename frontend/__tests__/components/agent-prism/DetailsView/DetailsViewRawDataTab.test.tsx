import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DetailsViewRawDataTab } from "@/components/agent-prism/DetailsView/DetailsViewRawDataTab";
import type { TraceSpan } from "@evilmartians/agent-prism-types";

// Mock CopyButton
vi.mock("@/components/agent-prism/CopyButton", () => ({
  CopyButton: ({ label, content }: { label: string; content: string }) => (
    <button data-testid="copy-button" data-content={content}>
      {label}
    </button>
  ),
}));

// Mock DetailsViewJsonOutput
vi.mock("@/components/agent-prism/DetailsView/DetailsViewJsonOutput", () => ({
  DetailsViewJsonOutput: ({ content, id }: { content: string; id: string }) => (
    <pre data-testid="json-output" id={id}>
      {content}
    </pre>
  ),
}));

const createMockSpan = (raw: string): TraceSpan => ({
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
  raw,
});

describe("DetailsViewRawDataTab", () => {
  describe("rendering", () => {
    it("should render CopyButton with correct label", () => {
      const span = createMockSpan('{"test": true}');
      render(<DetailsViewRawDataTab data={span} />);
      expect(screen.getByText("Raw")).toBeInTheDocument();
    });

    it("should render CopyButton with raw content", () => {
      const rawContent = '{"key": "value"}';
      const span = createMockSpan(rawContent);
      render(<DetailsViewRawDataTab data={span} />);
      expect(screen.getByTestId("copy-button")).toHaveAttribute(
        "data-content",
        rawContent,
      );
    });

    it("should render DetailsViewJsonOutput", () => {
      const span = createMockSpan('{"test": true}');
      render(<DetailsViewRawDataTab data={span} />);
      expect(screen.getByTestId("json-output")).toBeInTheDocument();
    });

    it("should pass raw content to DetailsViewJsonOutput", () => {
      const rawContent = '{"test": true}';
      const span = createMockSpan(rawContent);
      render(<DetailsViewRawDataTab data={span} />);
      expect(screen.getByTestId("json-output").textContent).toBe(rawContent);
    });

    it("should use span id for json output id", () => {
      const span = createMockSpan("{}");
      span.id = "my-span-id";
      render(<DetailsViewRawDataTab data={span} />);
      expect(screen.getByTestId("json-output")).toHaveAttribute(
        "id",
        "my-span-id",
      );
    });

    it("should use fallback id when span has no id", () => {
      const span = createMockSpan("{}");
      span.id = "";
      render(<DetailsViewRawDataTab data={span} />);
      expect(screen.getByTestId("json-output")).toHaveAttribute(
        "id",
        "span-details",
      );
    });
  });
});
