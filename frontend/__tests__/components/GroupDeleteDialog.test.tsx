import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import GroupDeleteDialog from "@/components/GroupDeleteDialog";

describe("GroupDeleteDialog", () => {
  const defaultProps = {
    isOpen: true,
    groupCount: 1,
    childCount: 5,
    onCancel: vi.fn(),
    onDeleteGroupOnly: vi.fn(),
    onDeleteAll: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render when open", () => {
      render(<GroupDeleteDialog {...defaultProps} />);
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });

    it("should not render when closed", () => {
      render(<GroupDeleteDialog {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });

    it("should render title for single group", () => {
      render(<GroupDeleteDialog {...defaultProps} groupCount={1} />);
      expect(screen.getByText("Delete group?")).toBeInTheDocument();
    });

    it("should render title for multiple groups", () => {
      render(<GroupDeleteDialog {...defaultProps} groupCount={3} />);
      expect(screen.getByText("Delete groups?")).toBeInTheDocument();
    });

    it("should render description for single group with single child", () => {
      render(
        <GroupDeleteDialog {...defaultProps} groupCount={1} childCount={1} />,
      );
      expect(
        screen.getByText(/This group contains 1 node./),
      ).toBeInTheDocument();
    });

    it("should render description for single group with multiple children", () => {
      render(
        <GroupDeleteDialog {...defaultProps} groupCount={1} childCount={5} />,
      );
      expect(
        screen.getByText(/This group contains 5 nodes./),
      ).toBeInTheDocument();
    });

    it("should render description for multiple groups", () => {
      render(
        <GroupDeleteDialog {...defaultProps} groupCount={3} childCount={10} />,
      );
      expect(
        screen.getByText(/These 3 groups contain 10 nodes total./),
      ).toBeInTheDocument();
    });

    it("should render question text", () => {
      render(<GroupDeleteDialog {...defaultProps} />);
      expect(
        screen.getByText(/What would you like to do\?/),
      ).toBeInTheDocument();
    });
  });

  describe("buttons", () => {
    it("should render Cancel button", () => {
      render(<GroupDeleteDialog {...defaultProps} />);
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    it("should render 'Delete group only' button for single group", () => {
      render(<GroupDeleteDialog {...defaultProps} groupCount={1} />);
      expect(screen.getByText("Delete group only")).toBeInTheDocument();
    });

    it("should render 'Delete groups only' button for multiple groups", () => {
      render(<GroupDeleteDialog {...defaultProps} groupCount={3} />);
      expect(screen.getByText("Delete groups only")).toBeInTheDocument();
    });

    it("should render Delete all button", () => {
      render(<GroupDeleteDialog {...defaultProps} />);
      expect(screen.getByText("Delete all")).toBeInTheDocument();
    });
  });

  describe("button interactions", () => {
    it("should call onCancel when Cancel button is clicked", () => {
      const onCancel = vi.fn();
      render(<GroupDeleteDialog {...defaultProps} onCancel={onCancel} />);

      fireEvent.click(screen.getByText("Cancel"));

      // AlertDialog may call onCancel multiple times due to onOpenChange
      expect(onCancel).toHaveBeenCalled();
    });

    it("should call onDeleteGroupOnly when 'Delete group only' is clicked", () => {
      const onDeleteGroupOnly = vi.fn();
      render(
        <GroupDeleteDialog
          {...defaultProps}
          onDeleteGroupOnly={onDeleteGroupOnly}
        />,
      );

      fireEvent.click(screen.getByText("Delete group only"));

      expect(onDeleteGroupOnly).toHaveBeenCalledTimes(1);
    });

    it("should call onDeleteAll when 'Delete all' is clicked", () => {
      const onDeleteAll = vi.fn();
      render(<GroupDeleteDialog {...defaultProps} onDeleteAll={onDeleteAll} />);

      fireEvent.click(screen.getByText("Delete all"));

      expect(onDeleteAll).toHaveBeenCalledTimes(1);
    });

    it("should not call other handlers when Cancel is clicked", () => {
      const onCancel = vi.fn();
      const onDeleteGroupOnly = vi.fn();
      const onDeleteAll = vi.fn();
      render(
        <GroupDeleteDialog
          {...defaultProps}
          onCancel={onCancel}
          onDeleteGroupOnly={onDeleteGroupOnly}
          onDeleteAll={onDeleteAll}
        />,
      );

      fireEvent.click(screen.getByText("Cancel"));

      // onCancel is called, other handlers are not
      expect(onCancel).toHaveBeenCalled();
      expect(onDeleteGroupOnly).not.toHaveBeenCalled();
      expect(onDeleteAll).not.toHaveBeenCalled();
    });

    it("should not call other handlers when Delete group only is clicked", () => {
      const onCancel = vi.fn();
      const onDeleteGroupOnly = vi.fn();
      const onDeleteAll = vi.fn();
      render(
        <GroupDeleteDialog
          {...defaultProps}
          onCancel={onCancel}
          onDeleteGroupOnly={onDeleteGroupOnly}
          onDeleteAll={onDeleteAll}
        />,
      );

      fireEvent.click(screen.getByText("Delete group only"));

      expect(onDeleteGroupOnly).toHaveBeenCalledTimes(1);
      expect(onCancel).not.toHaveBeenCalled();
      expect(onDeleteAll).not.toHaveBeenCalled();
    });

    it("should not call other handlers when Delete all is clicked", () => {
      const onCancel = vi.fn();
      const onDeleteGroupOnly = vi.fn();
      const onDeleteAll = vi.fn();
      render(
        <GroupDeleteDialog
          {...defaultProps}
          onCancel={onCancel}
          onDeleteGroupOnly={onDeleteGroupOnly}
          onDeleteAll={onDeleteAll}
        />,
      );

      fireEvent.click(screen.getByText("Delete all"));

      expect(onDeleteAll).toHaveBeenCalledTimes(1);
      expect(onCancel).not.toHaveBeenCalled();
      expect(onDeleteGroupOnly).not.toHaveBeenCalled();
    });
  });

  describe("dialog behavior", () => {
    it("should call onCancel when dialog is dismissed via onOpenChange", () => {
      const onCancel = vi.fn();
      render(<GroupDeleteDialog {...defaultProps} onCancel={onCancel} />);

      // The AlertDialog calls onOpenChange when it closes
      // Clicking Cancel triggers both onClick and possibly onOpenChange
      fireEvent.click(screen.getByText("Cancel"));

      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe("button variants", () => {
    it("should render Delete all button with destructive variant", () => {
      render(<GroupDeleteDialog {...defaultProps} />);

      const deleteAllButton = screen.getByText("Delete all");
      expect(deleteAllButton).toHaveClass("bg-destructive");
    });

    it("should render 'Delete group only' button with outline variant", () => {
      render(<GroupDeleteDialog {...defaultProps} />);

      const deleteGroupOnlyButton = screen.getByText("Delete group only");
      expect(deleteGroupOnlyButton.className).toContain("border");
    });
  });

  describe("accessibility", () => {
    it("should have proper alertdialog role", () => {
      render(<GroupDeleteDialog {...defaultProps} />);
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });

    it("should have accessible title", () => {
      render(<GroupDeleteDialog {...defaultProps} />);
      expect(
        screen.getByRole("heading", { name: "Delete group?" }),
      ).toBeInTheDocument();
    });

    it("should have Cancel button accessible", () => {
      render(<GroupDeleteDialog {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: "Cancel" }),
      ).toBeInTheDocument();
    });

    it("should have Delete group only button accessible", () => {
      render(<GroupDeleteDialog {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: "Delete group only" }),
      ).toBeInTheDocument();
    });

    it("should have Delete all button accessible", () => {
      render(<GroupDeleteDialog {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: "Delete all" }),
      ).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("should handle zero children", () => {
      render(<GroupDeleteDialog {...defaultProps} childCount={0} />);
      expect(
        screen.getByText(/This group contains 0 nodes./),
      ).toBeInTheDocument();
    });

    it("should handle zero groups (edge case)", () => {
      render(<GroupDeleteDialog {...defaultProps} groupCount={0} />);
      // groupCount === 1 check is false, so should use plural
      expect(screen.getByText("Delete groups?")).toBeInTheDocument();
    });

    it("should handle large numbers", () => {
      render(
        <GroupDeleteDialog
          {...defaultProps}
          groupCount={100}
          childCount={1000}
        />,
      );
      expect(
        screen.getByText(/These 100 groups contain 1000 nodes total./),
      ).toBeInTheDocument();
    });

    it("should handle multiple groups with single child each", () => {
      render(
        <GroupDeleteDialog {...defaultProps} groupCount={5} childCount={1} />,
      );
      expect(
        screen.getByText(/These 5 groups contain 1 node total./),
      ).toBeInTheDocument();
    });
  });

  describe("footer layout", () => {
    it("should have proper footer classes", () => {
      render(<GroupDeleteDialog {...defaultProps} />);

      // AlertDialogFooter should have flex-col sm:flex-row layout
      const footer = screen.getByText("Cancel").closest("div");
      expect(footer).toHaveClass("flex-col");
      expect(footer).toHaveClass("sm:flex-row");
    });
  });
});
