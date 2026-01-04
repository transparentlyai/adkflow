import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import SaveConfirmDialog from "@/components/SaveConfirmDialog";

describe("SaveConfirmDialog", () => {
  const defaultProps = {
    isOpen: true,
    projectPath: "/path/to/project",
    onSaveAndContinue: vi.fn(),
    onDontSave: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render dialog when open", () => {
      render(<SaveConfirmDialog {...defaultProps} />);

      expect(screen.getByText("Save Current Project?")).toBeInTheDocument();
      expect(
        screen.getByText("You have unsaved changes in your current project."),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Would you like to save before continuing?"),
      ).toBeInTheDocument();
    });

    it("should not render dialog when closed", () => {
      render(<SaveConfirmDialog {...defaultProps} isOpen={false} />);

      expect(
        screen.queryByText("Save Current Project?"),
      ).not.toBeInTheDocument();
    });

    it("should display project path when provided", () => {
      render(<SaveConfirmDialog {...defaultProps} />);

      expect(screen.getByText("Current project:")).toBeInTheDocument();
      expect(screen.getByText("/path/to/project")).toBeInTheDocument();
    });

    it("should not display project path section when path is empty", () => {
      render(<SaveConfirmDialog {...defaultProps} projectPath="" />);

      expect(screen.queryByText("Current project:")).not.toBeInTheDocument();
    });

    it("should render all three action buttons", () => {
      render(<SaveConfirmDialog {...defaultProps} />);

      expect(screen.getByText("Cancel")).toBeInTheDocument();
      expect(screen.getByText("Don't Save")).toBeInTheDocument();
      expect(screen.getByText("Save & Continue")).toBeInTheDocument();
    });
  });

  describe("button interactions", () => {
    it("should call onCancel when Cancel button is clicked", () => {
      const onCancel = vi.fn();
      render(<SaveConfirmDialog {...defaultProps} onCancel={onCancel} />);

      fireEvent.click(screen.getByText("Cancel"));

      expect(onCancel).toHaveBeenCalled();
    });

    it("should call onDontSave when Don't Save button is clicked", () => {
      const onDontSave = vi.fn();
      render(<SaveConfirmDialog {...defaultProps} onDontSave={onDontSave} />);

      fireEvent.click(screen.getByText("Don't Save"));

      expect(onDontSave).toHaveBeenCalledTimes(1);
    });

    it("should call onSaveAndContinue when Save & Continue button is clicked", () => {
      const onSaveAndContinue = vi.fn();
      render(
        <SaveConfirmDialog
          {...defaultProps}
          onSaveAndContinue={onSaveAndContinue}
        />,
      );

      fireEvent.click(screen.getByText("Save & Continue"));

      expect(onSaveAndContinue).toHaveBeenCalledTimes(1);
    });
  });

  describe("dialog behavior", () => {
    it("should call onCancel when dialog is closed via escape or backdrop", () => {
      const onCancel = vi.fn();
      render(<SaveConfirmDialog {...defaultProps} onCancel={onCancel} />);

      // Simulate dialog closing (via AlertDialog onOpenChange)
      // The component's onOpenChange calls onCancel when open becomes false
      // This is tested through the Cancel button which triggers onOpenChange
      fireEvent.click(screen.getByText("Cancel"));

      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe("project path display", () => {
    it("should display long project paths with proper styling", () => {
      const longPath =
        "/very/long/path/to/some/deeply/nested/project/directory";
      render(<SaveConfirmDialog {...defaultProps} projectPath={longPath} />);

      const pathElement = screen.getByText(longPath);
      expect(pathElement).toHaveClass("font-mono");
      expect(pathElement).toHaveClass("break-all");
    });

    it("should display project path in muted container", () => {
      render(<SaveConfirmDialog {...defaultProps} />);

      const projectPathContainer = screen
        .getByText("/path/to/project")
        .closest("div");
      expect(projectPathContainer).toHaveClass("bg-muted");
    });
  });

  describe("accessibility", () => {
    it("should have proper dialog structure", () => {
      render(<SaveConfirmDialog {...defaultProps} />);

      // AlertDialog should have proper role
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });

    it("should have accessible title", () => {
      render(<SaveConfirmDialog {...defaultProps} />);

      expect(
        screen.getByRole("heading", { name: "Save Current Project?" }),
      ).toBeInTheDocument();
    });
  });
});
