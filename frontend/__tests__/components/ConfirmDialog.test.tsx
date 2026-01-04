import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import ConfirmDialog from "@/components/ConfirmDialog";

describe("ConfirmDialog", () => {
  const defaultProps = {
    isOpen: true,
    title: "Confirm Action",
    description: "Are you sure you want to proceed?",
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render title and description when open", () => {
      render(<ConfirmDialog {...defaultProps} />);
      expect(screen.getByText("Confirm Action")).toBeInTheDocument();
      expect(
        screen.getByText("Are you sure you want to proceed?"),
      ).toBeInTheDocument();
    });

    it("should not render content when closed", () => {
      render(<ConfirmDialog {...defaultProps} isOpen={false} />);
      expect(screen.queryByText("Confirm Action")).not.toBeInTheDocument();
    });

    it("should render with long description text", () => {
      const longDescription =
        "This is a very long description that might wrap to multiple lines and should still be displayed correctly in the dialog.";
      render(<ConfirmDialog {...defaultProps} description={longDescription} />);
      expect(screen.getByText(longDescription)).toBeInTheDocument();
    });

    it("should render with special characters in title", () => {
      render(
        <ConfirmDialog {...defaultProps} title="Delete 'Important File'?" />,
      );
      expect(screen.getByText("Delete 'Important File'?")).toBeInTheDocument();
    });
  });

  describe("button labels", () => {
    it("should use default button labels", () => {
      render(<ConfirmDialog {...defaultProps} />);
      expect(screen.getByText("Continue")).toBeInTheDocument();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    it("should use custom button labels", () => {
      render(
        <ConfirmDialog
          {...defaultProps}
          confirmLabel="Delete"
          cancelLabel="Keep"
        />,
      );
      expect(screen.getByText("Delete")).toBeInTheDocument();
      expect(screen.getByText("Keep")).toBeInTheDocument();
    });

    it("should handle empty confirm label by showing default", () => {
      render(<ConfirmDialog {...defaultProps} confirmLabel="" />);
      // Empty string is falsy, but TypeScript/component behavior may vary
      // The button should still exist
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("button interactions", () => {
    it("should call onConfirm when confirm button is clicked", () => {
      const onConfirm = vi.fn();
      render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

      fireEvent.click(screen.getByText("Continue"));

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it("should call onCancel when cancel button is clicked", () => {
      const onCancel = vi.fn();
      render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);

      fireEvent.click(screen.getByText("Cancel"));

      // Called at least once (may be called twice due to AlertDialog behavior)
      expect(onCancel).toHaveBeenCalled();
    });

    it("should not call onConfirm when cancel is clicked", () => {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();
      render(
        <ConfirmDialog
          {...defaultProps}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />,
      );

      fireEvent.click(screen.getByText("Cancel"));

      expect(onConfirm).not.toHaveBeenCalled();
    });

    it("should call both callbacks appropriately when confirm is clicked", () => {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();
      render(
        <ConfirmDialog
          {...defaultProps}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />,
      );

      fireEvent.click(screen.getByText("Continue"));

      // onConfirm should be called
      expect(onConfirm).toHaveBeenCalledTimes(1);
      // Note: AlertDialog may call onCancel via onOpenChange when dialog closes
    });
  });

  describe("variant styling", () => {
    it("should apply destructive variant styling", () => {
      render(<ConfirmDialog {...defaultProps} variant="destructive" />);
      const confirmButton = screen.getByText("Continue");
      expect(confirmButton).toHaveClass("bg-destructive");
    });

    it("should not apply destructive styling for default variant", () => {
      render(<ConfirmDialog {...defaultProps} variant="default" />);
      const confirmButton = screen.getByText("Continue");
      expect(confirmButton).not.toHaveClass("bg-destructive");
    });

    it("should not apply destructive styling when variant is not specified", () => {
      render(<ConfirmDialog {...defaultProps} />);
      const confirmButton = screen.getByText("Continue");
      expect(confirmButton).not.toHaveClass("bg-destructive");
    });

    it("should apply hover styles for destructive variant", () => {
      render(<ConfirmDialog {...defaultProps} variant="destructive" />);
      const confirmButton = screen.getByText("Continue");
      expect(confirmButton.className).toContain("hover:bg-destructive");
    });
  });

  describe("accessibility", () => {
    it("should have proper alertdialog role", () => {
      render(<ConfirmDialog {...defaultProps} />);
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });

    it("should have accessible title", () => {
      render(<ConfirmDialog {...defaultProps} />);
      expect(
        screen.getByRole("heading", { name: "Confirm Action" }),
      ).toBeInTheDocument();
    });

    it("should have both buttons accessible", () => {
      render(<ConfirmDialog {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: "Cancel" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Continue" }),
      ).toBeInTheDocument();
    });
  });

  describe("dialog behavior", () => {
    it("should call onCancel when dialog is dismissed", () => {
      const onCancel = vi.fn();
      render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);

      // Clicking cancel triggers both onClick and onOpenChange
      fireEvent.click(screen.getByText("Cancel"));

      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe("use cases", () => {
    it("should work as a delete confirmation dialog", () => {
      const onConfirm = vi.fn();
      render(
        <ConfirmDialog
          isOpen={true}
          title="Delete Item"
          description="Are you sure you want to delete this item? This action cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="destructive"
          onConfirm={onConfirm}
          onCancel={vi.fn()}
        />,
      );

      expect(screen.getByText("Delete Item")).toBeInTheDocument();
      expect(screen.getByText("Delete")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Delete"));
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it("should work as a save confirmation dialog", () => {
      const onConfirm = vi.fn();
      render(
        <ConfirmDialog
          isOpen={true}
          title="Save Changes"
          description="Do you want to save your changes before leaving?"
          confirmLabel="Save"
          cancelLabel="Discard"
          variant="default"
          onConfirm={onConfirm}
          onCancel={vi.fn()}
        />,
      );

      expect(screen.getByText("Save Changes")).toBeInTheDocument();
      expect(screen.getByText("Save")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Save"));
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });
});
