import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { DetailsViewJsonOutput } from "@/components/agent-prism/DetailsView/DetailsViewJsonOutput";

// Mock react-json-pretty
vi.mock("react-json-pretty", () => ({
  default: ({
    data,
    id,
    className,
  }: {
    data: string;
    id: string;
    className?: string;
  }) => (
    <pre data-testid="json-pretty" id={id} className={className}>
      {data}
    </pre>
  ),
}));

describe("DetailsViewJsonOutput", () => {
  const defaultProps = {
    content: '{"key": "value"}',
    id: "test-id",
  };

  describe("rendering", () => {
    it("should render JSONPretty component", () => {
      const { container } = render(<DetailsViewJsonOutput {...defaultProps} />);
      expect(
        container.querySelector('[data-testid="json-pretty"]'),
      ).toBeInTheDocument();
    });

    it("should pass content to JSONPretty", () => {
      const { container } = render(
        <DetailsViewJsonOutput {...defaultProps} content='{"test": 123}' />,
      );
      expect(
        container.querySelector('[data-testid="json-pretty"]')?.textContent,
      ).toBe('{"test": 123}');
    });

    it("should generate correct id", () => {
      const { container } = render(
        <DetailsViewJsonOutput {...defaultProps} id="my-json" />,
      );
      expect(
        container.querySelector("#json-pretty-my-json"),
      ).toBeInTheDocument();
    });
  });

  describe("className", () => {
    it("should apply default classes", () => {
      const { container } = render(<DetailsViewJsonOutput {...defaultProps} />);
      const element = container.querySelector('[data-testid="json-pretty"]');
      expect(element).toHaveClass(
        "overflow-x-hidden",
        "rounded-xl",
        "p-4",
        "text-left",
      );
    });

    it("should apply custom className", () => {
      const { container } = render(
        <DetailsViewJsonOutput {...defaultProps} className="custom-class" />,
      );
      const element = container.querySelector('[data-testid="json-pretty"]');
      expect(element).toHaveClass("custom-class");
    });
  });
});
