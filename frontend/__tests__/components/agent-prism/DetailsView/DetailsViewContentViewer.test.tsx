import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DetailsViewContentViewer } from "@/components/agent-prism/DetailsView/DetailsViewContentViewer";

// Mock child components
vi.mock("@/components/agent-prism/CopyButton", () => ({
  CopyButton: ({ label }: { label: string }) => (
    <button data-testid="copy-button">{label}</button>
  ),
}));

vi.mock("@/components/agent-prism/DetailsView/DetailsViewJsonOutput", () => ({
  DetailsViewJsonOutput: ({ content, id }: { content: string; id: string }) => (
    <div data-testid="json-output" data-id={id}>
      {content}
    </div>
  ),
}));

describe("DetailsViewContentViewer", () => {
  const defaultProps = {
    content: "Test content",
    parsedContent: '{"key": "value"}',
    mode: "plain" as const,
    label: "Test Label",
    id: "test-id",
  };

  describe("no content", () => {
    it("should render no data message when content is empty", () => {
      render(<DetailsViewContentViewer {...defaultProps} content="" />);
      expect(screen.getByText("No data available")).toBeInTheDocument();
    });

    it("should not render copy button when no content", () => {
      render(<DetailsViewContentViewer {...defaultProps} content="" />);
      expect(screen.queryByTestId("copy-button")).not.toBeInTheDocument();
    });
  });

  describe("plain mode", () => {
    it("should render content in pre tag", () => {
      render(<DetailsViewContentViewer {...defaultProps} />);
      expect(screen.getByText("Test content")).toBeInTheDocument();
    });

    it("should render copy button with label", () => {
      render(<DetailsViewContentViewer {...defaultProps} />);
      expect(screen.getByTestId("copy-button")).toHaveTextContent("Test Label");
    });

    it("should not render JSON output in plain mode", () => {
      render(<DetailsViewContentViewer {...defaultProps} />);
      expect(screen.queryByTestId("json-output")).not.toBeInTheDocument();
    });
  });

  describe("json mode", () => {
    it("should render JSON output when mode is json and parsedContent exists", () => {
      render(<DetailsViewContentViewer {...defaultProps} mode="json" />);
      expect(screen.getByTestId("json-output")).toBeInTheDocument();
    });

    it("should pass correct id to JSON output", () => {
      render(<DetailsViewContentViewer {...defaultProps} mode="json" />);
      expect(screen.getByTestId("json-output")).toHaveAttribute(
        "data-id",
        "test-id",
      );
    });

    it("should render plain content if parsedContent is null in json mode", () => {
      render(
        <DetailsViewContentViewer
          {...defaultProps}
          mode="json"
          parsedContent={null}
        />,
      );
      expect(screen.queryByTestId("json-output")).not.toBeInTheDocument();
      expect(screen.getByText("Test content")).toBeInTheDocument();
    });
  });

  describe("className", () => {
    it("should apply custom className", () => {
      const { container } = render(
        <DetailsViewContentViewer {...defaultProps} className="custom-class" />,
      );
      expect(container.firstChild).toHaveClass("custom-class");
    });

    it("should have default styling classes", () => {
      const { container } = render(
        <DetailsViewContentViewer {...defaultProps} />,
      );
      expect(container.firstChild).toHaveClass("relative");
      expect(container.firstChild).toHaveClass("rounded-lg");
    });
  });
});
