import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DetailsViewHeaderActions } from "@/components/agent-prism/DetailsView/DetailsViewHeaderActions";

describe("DetailsViewHeaderActions", () => {
  describe("rendering", () => {
    it("should return null when no children", () => {
      const { container } = render(<DetailsViewHeaderActions />);
      expect(container.firstChild).toBeNull();
    });

    it("should render children when provided", () => {
      render(
        <DetailsViewHeaderActions>
          <button>Action 1</button>
        </DetailsViewHeaderActions>,
      );
      expect(screen.getByText("Action 1")).toBeInTheDocument();
    });

    it("should render multiple children", () => {
      render(
        <DetailsViewHeaderActions>
          <button>Action 1</button>
          <button>Action 2</button>
        </DetailsViewHeaderActions>,
      );
      expect(screen.getByText("Action 1")).toBeInTheDocument();
      expect(screen.getByText("Action 2")).toBeInTheDocument();
    });
  });

  describe("className", () => {
    it("should apply default className", () => {
      const { container } = render(
        <DetailsViewHeaderActions>
          <button>Action</button>
        </DetailsViewHeaderActions>,
      );
      expect(container.firstChild).toHaveClass(
        "flex",
        "flex-wrap",
        "items-center",
        "gap-2",
      );
    });

    it("should apply custom className", () => {
      const { container } = render(
        <DetailsViewHeaderActions className="custom-class">
          <button>Action</button>
        </DetailsViewHeaderActions>,
      );
      expect(container.firstChild).toHaveClass("custom-class");
    });
  });
});
