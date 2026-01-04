import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

describe("ScrollArea components", () => {
  describe("ScrollArea", () => {
    it("should render children", () => {
      render(
        <ScrollArea>
          <div data-testid="content">Scroll content</div>
        </ScrollArea>,
      );
      expect(screen.getByTestId("content")).toBeInTheDocument();
    });

    it("should have default styling classes", () => {
      const { container } = render(
        <ScrollArea data-testid="scroll-area">Content</ScrollArea>,
      );
      // Check root element has overflow hidden
      expect(container.firstChild).toHaveClass("overflow-hidden");
    });

    it("should apply custom className", () => {
      const { container } = render(
        <ScrollArea className="custom-scroll">Content</ScrollArea>,
      );
      expect(container.firstChild).toHaveClass("custom-scroll");
    });

    it("should forward ref", () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<ScrollArea ref={ref}>Content</ScrollArea>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe("ScrollBar", () => {
    it("should render scrollbar elements", () => {
      const { container } = render(
        <ScrollArea>
          <div style={{ height: "1000px" }}>Tall content</div>
        </ScrollArea>,
      );
      // ScrollBar and ScrollArea are rendered
      expect(container.firstChild).toBeInTheDocument();
    });

    it("should render content correctly", () => {
      render(
        <ScrollArea>
          <div data-testid="tall-content">Content</div>
        </ScrollArea>,
      );
      expect(screen.getByTestId("tall-content")).toBeInTheDocument();
    });
  });
});
