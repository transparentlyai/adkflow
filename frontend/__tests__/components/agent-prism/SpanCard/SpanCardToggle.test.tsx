import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SpanCardToggle } from "@/components/agent-prism/SpanCard/SpanCardToggle";
import * as Collapsible from "@radix-ui/react-collapsible";

// Wrap component in Collapsible.Root for it to work properly
const renderWithRoot = (props: Parameters<typeof SpanCardToggle>[0]) => {
  return render(
    <Collapsible.Root>
      <SpanCardToggle {...props} />
    </Collapsible.Root>,
  );
};

describe("SpanCardToggle", () => {
  const defaultProps = {
    isExpanded: false,
    title: "Test Span",
    onToggleClick: vi.fn(),
  };

  describe("rendering", () => {
    it("should render a button", () => {
      renderWithRoot(defaultProps);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("should have correct aria-label when collapsed", () => {
      renderWithRoot({ ...defaultProps, isExpanded: false });
      expect(screen.getByRole("button")).toHaveAttribute(
        "aria-label",
        "Expand Test Span children",
      );
    });

    it("should have correct aria-label when expanded", () => {
      renderWithRoot({ ...defaultProps, isExpanded: true });
      expect(screen.getByRole("button")).toHaveAttribute(
        "aria-label",
        "Collapse Test Span children",
      );
    });

    it("should have aria-expanded attribute", () => {
      renderWithRoot({ ...defaultProps, isExpanded: true });
      expect(screen.getByRole("button")).toHaveAttribute(
        "aria-expanded",
        "true",
      );
    });
  });

  describe("interaction", () => {
    it("should call onToggleClick when clicked", () => {
      const onToggleClick = vi.fn();
      renderWithRoot({ ...defaultProps, onToggleClick });

      fireEvent.click(screen.getByRole("button"));
      expect(onToggleClick).toHaveBeenCalled();
    });

    it("should call onToggleClick on key press", () => {
      const onToggleClick = vi.fn();
      renderWithRoot({ ...defaultProps, onToggleClick });

      fireEvent.keyDown(screen.getByRole("button"), { key: "Enter" });
      expect(onToggleClick).toHaveBeenCalled();
    });
  });
});
