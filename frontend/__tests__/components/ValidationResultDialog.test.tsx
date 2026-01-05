import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ValidationResultDialog from "@/components/ValidationResultDialog";

describe("ValidationResultDialog", () => {
  const validResult = {
    valid: true,
    errors: [],
    warnings: [],
    agent_count: 5,
    tab_count: 3,
    teleporter_count: 2,
  };

  const invalidResult = {
    valid: false,
    errors: ["Missing required field", "Invalid connection"],
    warnings: ["Consider adding description"],
    agent_count: 3,
    tab_count: 2,
    teleporter_count: 1,
  };

  describe("when null result", () => {
    it("should return null", () => {
      const { container } = render(
        <ValidationResultDialog
          isOpen={true}
          result={null}
          onClose={vi.fn()}
        />,
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe("valid result", () => {
    it("should show valid title", () => {
      render(
        <ValidationResultDialog
          isOpen={true}
          result={validResult}
          onClose={vi.fn()}
        />,
      );
      expect(screen.getByText("Workflow Valid")).toBeInTheDocument();
    });

    it("should show agent count", () => {
      render(
        <ValidationResultDialog
          isOpen={true}
          result={validResult}
          onClose={vi.fn()}
        />,
      );
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("Agents")).toBeInTheDocument();
    });

    it("should show tab count", () => {
      render(
        <ValidationResultDialog
          isOpen={true}
          result={validResult}
          onClose={vi.fn()}
        />,
      );
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("Tabs")).toBeInTheDocument();
    });

    it("should show teleporter count", () => {
      render(
        <ValidationResultDialog
          isOpen={true}
          result={validResult}
          onClose={vi.fn()}
        />,
      );
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("Teleporters")).toBeInTheDocument();
    });
  });

  describe("invalid result", () => {
    it("should show validation failed title", () => {
      render(
        <ValidationResultDialog
          isOpen={true}
          result={invalidResult}
          onClose={vi.fn()}
        />,
      );
      expect(screen.getByText("Validation Failed")).toBeInTheDocument();
    });

    it("should show error count", () => {
      render(
        <ValidationResultDialog
          isOpen={true}
          result={invalidResult}
          onClose={vi.fn()}
        />,
      );
      expect(screen.getByText("Errors (2)")).toBeInTheDocument();
    });

    it("should show error messages", () => {
      render(
        <ValidationResultDialog
          isOpen={true}
          result={invalidResult}
          onClose={vi.fn()}
        />,
      );
      expect(screen.getByText("Missing required field")).toBeInTheDocument();
      expect(screen.getByText("Invalid connection")).toBeInTheDocument();
    });

    it("should show warning count", () => {
      render(
        <ValidationResultDialog
          isOpen={true}
          result={invalidResult}
          onClose={vi.fn()}
        />,
      );
      expect(screen.getByText("Warnings (1)")).toBeInTheDocument();
    });

    it("should show warning messages", () => {
      render(
        <ValidationResultDialog
          isOpen={true}
          result={invalidResult}
          onClose={vi.fn()}
        />,
      );
      expect(
        screen.getByText("Consider adding description"),
      ).toBeInTheDocument();
    });
  });

  describe("close button", () => {
    it("should call onClose when clicked", () => {
      const onClose = vi.fn();
      render(
        <ValidationResultDialog
          isOpen={true}
          result={validResult}
          onClose={onClose}
        />,
      );
      // There are multiple close buttons - use the footer one
      const closeButtons = screen.getAllByRole("button", { name: /close/i });
      const footerButton = closeButtons.find(
        (btn) => btn.textContent === "Close",
      );
      fireEvent.click(footerButton!);
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("when closed", () => {
    it("should not render content when not open", () => {
      render(
        <ValidationResultDialog
          isOpen={false}
          result={validResult}
          onClose={vi.fn()}
        />,
      );
      expect(screen.queryByText("Workflow Valid")).not.toBeInTheDocument();
    });
  });
});
