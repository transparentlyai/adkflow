import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RunConfirmDialog from "@/components/RunConfirmDialog";

describe("RunConfirmDialog", () => {
  const defaultProps = {
    isOpen: true,
    onSaveAndRun: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render dialog when open", () => {
      render(<RunConfirmDialog {...defaultProps} />);
      expect(screen.getByText("Save Before Running?")).toBeInTheDocument();
    });

    it("should not render dialog content when closed", () => {
      render(<RunConfirmDialog {...defaultProps} isOpen={false} />);
      expect(
        screen.queryByText("Save Before Running?"),
      ).not.toBeInTheDocument();
    });

    it("should render description text", () => {
      render(<RunConfirmDialog {...defaultProps} />);
      expect(screen.getByText(/You have unsaved changes/)).toBeInTheDocument();
      expect(
        screen.getByText(
          /The workflow needs to be saved before it can be executed/,
        ),
      ).toBeInTheDocument();
    });

    it("should render Cancel button", () => {
      render(<RunConfirmDialog {...defaultProps} />);
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    it("should render Save & Run button", () => {
      render(<RunConfirmDialog {...defaultProps} />);
      expect(screen.getByText("Save & Run")).toBeInTheDocument();
    });
  });

  describe("interaction", () => {
    it("should call onCancel when Cancel button is clicked", () => {
      const onCancel = vi.fn();
      render(<RunConfirmDialog {...defaultProps} onCancel={onCancel} />);

      fireEvent.click(screen.getByText("Cancel"));
      expect(onCancel).toHaveBeenCalled();
    });

    it("should call onSaveAndRun when Save & Run button is clicked", () => {
      const onSaveAndRun = vi.fn();
      render(
        <RunConfirmDialog {...defaultProps} onSaveAndRun={onSaveAndRun} />,
      );

      fireEvent.click(screen.getByText("Save & Run"));
      expect(onSaveAndRun).toHaveBeenCalled();
    });

    it("should call onCancel when dialog is closed via overlay", () => {
      const onCancel = vi.fn();
      render(<RunConfirmDialog {...defaultProps} onCancel={onCancel} />);

      // Press Escape to close
      fireEvent.keyDown(document, { key: "Escape" });
      expect(onCancel).toHaveBeenCalled();
    });
  });
});
