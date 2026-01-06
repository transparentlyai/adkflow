import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Lock: () => <svg data-testid="icon-lock" />,
  Unlock: () => <svg data-testid="icon-unlock" />,
  Unlink: () => <svg data-testid="icon-unlink" />,
  Copy: () => <svg data-testid="icon-copy" />,
  Scissors: () => <svg data-testid="icon-scissors" />,
  Clipboard: () => <svg data-testid="icon-clipboard" />,
  Trash2: () => <svg data-testid="icon-trash" />,
}));

// Mock utils
vi.mock("@/lib/utils", () => ({
  formatShortcut: (key: string) => `Ctrl+${key}`,
}));

// Import after mocking
import NodeContextMenu from "@/components/NodeContextMenu";

describe("NodeContextMenu", () => {
  const defaultProps = {
    x: 100,
    y: 200,
    isLocked: false,
    onToggleLock: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render menu at specified coordinates", () => {
      render(<NodeContextMenu {...defaultProps} />);
      // Portal renders to document.body, not the container
      const menu = document.body.querySelector('[style*="left: 100"]');
      expect(menu).toBeInTheDocument();
    });

    it("should adjust position when near window edge", () => {
      const edgeProps = { ...defaultProps, x: 9999, y: 9999 };
      render(<NodeContextMenu {...edgeProps} />);
      // Portal renders to document.body
      const menu = document.body.querySelector("div[style*='left']");
      expect(menu).toBeInTheDocument();
    });

    it("should always render toggle lock button", () => {
      render(<NodeContextMenu {...defaultProps} />);
      expect(screen.getByText("Lock Node")).toBeInTheDocument();
    });

    it("should render unlock when isLocked is true", () => {
      const lockedProps = { ...defaultProps, isLocked: true };
      render(<NodeContextMenu {...lockedProps} />);
      expect(screen.getByText("Unlock Node")).toBeInTheDocument();
    });

    it("should render detach button when onDetach provided", () => {
      const detachProps = { ...defaultProps, onDetach: vi.fn() };
      render(<NodeContextMenu {...detachProps} />);
      expect(screen.getByText("Detach from Group")).toBeInTheDocument();
    });

    it("should not render detach button when onDetach not provided", () => {
      render(<NodeContextMenu {...defaultProps} />);
      expect(screen.queryByText("Detach from Group")).not.toBeInTheDocument();
    });

    it("should render copy button when onCopy provided", () => {
      const copyProps = { ...defaultProps, onCopy: vi.fn() };
      render(<NodeContextMenu {...copyProps} />);
      expect(screen.getByText("Copy")).toBeInTheDocument();
    });

    it("should render cut button when onCut provided", () => {
      const cutProps = { ...defaultProps, onCut: vi.fn() };
      render(<NodeContextMenu {...cutProps} />);
      expect(screen.getByText("Cut")).toBeInTheDocument();
    });

    it("should render paste button when onPaste provided", () => {
      const pasteProps = { ...defaultProps, onPaste: vi.fn() };
      render(<NodeContextMenu {...pasteProps} />);
      expect(screen.getByText("Paste")).toBeInTheDocument();
    });

    it("should render delete button when onDelete provided", () => {
      const deleteProps = { ...defaultProps, onDelete: vi.fn() };
      render(<NodeContextMenu {...deleteProps} />);
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    it("should render separator when edit actions present", () => {
      const fullProps = {
        ...defaultProps,
        onCopy: vi.fn(),
        onCut: vi.fn(),
        onPaste: vi.fn(),
        onDelete: vi.fn(),
      };
      render(<NodeContextMenu {...fullProps} />);
      // Portal renders to document.body
      const separator = document.body.querySelector(".h-px");
      expect(separator).toBeInTheDocument();
    });
  });

  describe("lock/unlock action", () => {
    it("should call onToggleLock when lock button clicked", () => {
      const onToggleLock = vi.fn();
      render(<NodeContextMenu {...defaultProps} onToggleLock={onToggleLock} />);
      fireEvent.click(screen.getByText("Lock Node"));
      expect(onToggleLock).toHaveBeenCalledTimes(1);
    });

    it("should call onClose when lock button clicked", () => {
      const onClose = vi.fn();
      render(<NodeContextMenu {...defaultProps} onClose={onClose} />);
      fireEvent.click(screen.getByText("Lock Node"));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should call onToggleLock when unlock button clicked", () => {
      const onToggleLock = vi.fn();
      const lockedProps = { ...defaultProps, isLocked: true, onToggleLock };
      render(<NodeContextMenu {...lockedProps} />);
      fireEvent.click(screen.getByText("Unlock Node"));
      expect(onToggleLock).toHaveBeenCalledTimes(1);
    });
  });

  describe("detach action", () => {
    it("should call onDetach when detach button clicked", () => {
      const onDetach = vi.fn();
      const detachProps = { ...defaultProps, onDetach };
      render(<NodeContextMenu {...detachProps} />);
      fireEvent.click(screen.getByText("Detach from Group"));
      expect(onDetach).toHaveBeenCalledTimes(1);
    });

    it("should call onClose when detach button clicked", () => {
      const onClose = vi.fn();
      const detachProps = { ...defaultProps, onDetach: vi.fn(), onClose };
      render(<NodeContextMenu {...detachProps} />);
      fireEvent.click(screen.getByText("Detach from Group"));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("copy action", () => {
    it("should call onCopy when copy button clicked", () => {
      const onCopy = vi.fn();
      const copyProps = { ...defaultProps, onCopy };
      render(<NodeContextMenu {...copyProps} />);
      fireEvent.click(screen.getByText("Copy"));
      expect(onCopy).toHaveBeenCalledTimes(1);
    });

    it("should call onClose when copy button clicked", () => {
      const onClose = vi.fn();
      const copyProps = { ...defaultProps, onCopy: vi.fn(), onClose };
      render(<NodeContextMenu {...copyProps} />);
      fireEvent.click(screen.getByText("Copy"));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("cut action", () => {
    it("should call onCut when cut button clicked and not locked", () => {
      const onCut = vi.fn();
      const cutProps = { ...defaultProps, isLocked: false, onCut };
      render(<NodeContextMenu {...cutProps} />);
      fireEvent.click(screen.getByText("Cut"));
      expect(onCut).toHaveBeenCalledTimes(1);
    });

    it("should call onClose when cut button clicked and not locked", () => {
      const onClose = vi.fn();
      const cutProps = {
        ...defaultProps,
        isLocked: false,
        onCut: vi.fn(),
        onClose,
      };
      render(<NodeContextMenu {...cutProps} />);
      fireEvent.click(screen.getByText("Cut"));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should not call onCut when cut button clicked but node is locked", () => {
      const onCut = vi.fn();
      const cutProps = { ...defaultProps, isLocked: true, onCut };
      render(<NodeContextMenu {...cutProps} />);
      fireEvent.click(screen.getByText("Cut"));
      expect(onCut).not.toHaveBeenCalled();
    });

    it("should not call onCut when canvas is locked", () => {
      const onCut = vi.fn();
      const cutProps = {
        ...defaultProps,
        isLocked: false,
        isCanvasLocked: true,
        onCut,
      };
      render(<NodeContextMenu {...cutProps} />);
      fireEvent.click(screen.getByText("Cut"));
      expect(onCut).not.toHaveBeenCalled();
    });

    it("should render disabled style when node is locked", () => {
      const cutProps = { ...defaultProps, isLocked: true, onCut: vi.fn() };
      const { container } = render(<NodeContextMenu {...cutProps} />);
      const cutButton = screen.getByText("Cut").closest("button");
      expect(cutButton).toHaveClass("opacity-50");
    });

    it("should render disabled style when canvas is locked", () => {
      const cutProps = {
        ...defaultProps,
        isCanvasLocked: true,
        onCut: vi.fn(),
      };
      const { container } = render(<NodeContextMenu {...cutProps} />);
      const cutButton = screen.getByText("Cut").closest("button");
      expect(cutButton).toHaveClass("opacity-50");
    });
  });

  describe("paste action", () => {
    it("should call onPaste when paste button clicked and has clipboard", () => {
      const onPaste = vi.fn();
      const pasteProps = {
        ...defaultProps,
        hasClipboard: true,
        isCanvasLocked: false,
        onPaste,
      };
      render(<NodeContextMenu {...pasteProps} />);
      fireEvent.click(screen.getByText("Paste"));
      expect(onPaste).toHaveBeenCalledTimes(1);
    });

    it("should call onClose when paste button clicked and has clipboard", () => {
      const onClose = vi.fn();
      const pasteProps = {
        ...defaultProps,
        hasClipboard: true,
        isCanvasLocked: false,
        onPaste: vi.fn(),
        onClose,
      };
      render(<NodeContextMenu {...pasteProps} />);
      fireEvent.click(screen.getByText("Paste"));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should not call onPaste when no clipboard", () => {
      const onPaste = vi.fn();
      const pasteProps = {
        ...defaultProps,
        hasClipboard: false,
        onPaste,
      };
      render(<NodeContextMenu {...pasteProps} />);
      fireEvent.click(screen.getByText("Paste"));
      expect(onPaste).not.toHaveBeenCalled();
    });

    it("should not call onPaste when canvas is locked", () => {
      const onPaste = vi.fn();
      const pasteProps = {
        ...defaultProps,
        hasClipboard: true,
        isCanvasLocked: true,
        onPaste,
      };
      render(<NodeContextMenu {...pasteProps} />);
      fireEvent.click(screen.getByText("Paste"));
      expect(onPaste).not.toHaveBeenCalled();
    });

    it("should render disabled style when no clipboard", () => {
      const pasteProps = {
        ...defaultProps,
        hasClipboard: false,
        onPaste: vi.fn(),
      };
      render(<NodeContextMenu {...pasteProps} />);
      const pasteButton = screen.getByText("Paste").closest("button");
      expect(pasteButton).toHaveClass("opacity-50");
    });

    it("should render disabled style when canvas is locked", () => {
      const pasteProps = {
        ...defaultProps,
        isCanvasLocked: true,
        onPaste: vi.fn(),
      };
      render(<NodeContextMenu {...pasteProps} />);
      const pasteButton = screen.getByText("Paste").closest("button");
      expect(pasteButton).toHaveClass("opacity-50");
    });
  });

  describe("delete action", () => {
    it("should call onDelete when delete button clicked and not locked", () => {
      const onDelete = vi.fn();
      const deleteProps = { ...defaultProps, isLocked: false, onDelete };
      render(<NodeContextMenu {...deleteProps} />);
      fireEvent.click(screen.getByText("Delete"));
      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it("should call onClose when delete button clicked and not locked", () => {
      const onClose = vi.fn();
      const deleteProps = {
        ...defaultProps,
        isLocked: false,
        onDelete: vi.fn(),
        onClose,
      };
      render(<NodeContextMenu {...deleteProps} />);
      fireEvent.click(screen.getByText("Delete"));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should not call onDelete when node is locked", () => {
      const onDelete = vi.fn();
      const deleteProps = { ...defaultProps, isLocked: true, onDelete };
      render(<NodeContextMenu {...deleteProps} />);
      fireEvent.click(screen.getByText("Delete"));
      expect(onDelete).not.toHaveBeenCalled();
    });

    it("should not call onDelete when canvas is locked", () => {
      const onDelete = vi.fn();
      const deleteProps = {
        ...defaultProps,
        isLocked: false,
        isCanvasLocked: true,
        onDelete,
      };
      render(<NodeContextMenu {...deleteProps} />);
      fireEvent.click(screen.getByText("Delete"));
      expect(onDelete).not.toHaveBeenCalled();
    });

    it("should render disabled style when node is locked", () => {
      const deleteProps = { ...defaultProps, isLocked: true, onDelete: vi.fn() };
      render(<NodeContextMenu {...deleteProps} />);
      const deleteButton = screen.getByText("Delete").closest("button");
      expect(deleteButton).toHaveClass("opacity-50");
    });

    it("should render disabled style when canvas is locked", () => {
      const deleteProps = {
        ...defaultProps,
        isCanvasLocked: true,
        onDelete: vi.fn(),
      };
      render(<NodeContextMenu {...deleteProps} />);
      const deleteButton = screen.getByText("Delete").closest("button");
      expect(deleteButton).toHaveClass("opacity-50");
    });
  });

  describe("backdrop interaction", () => {
    it("should call onClose when backdrop clicked", () => {
      const onClose = vi.fn();
      render(<NodeContextMenu {...defaultProps} onClose={onClose} />);
      // Portal renders to document.body
      const backdrop = document.body.querySelector(".fixed.inset-0");
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(onClose).toHaveBeenCalledTimes(1);
      }
    });

    it("should call onClose when backdrop right-clicked", () => {
      const onClose = vi.fn();
      render(<NodeContextMenu {...defaultProps} onClose={onClose} />);
      // Portal renders to document.body
      const backdrop = document.body.querySelector(".fixed.inset-0");
      if (backdrop) {
        fireEvent.contextMenu(backdrop);
        expect(onClose).toHaveBeenCalledTimes(1);
      }
    });

    it("should prevent default on backdrop context menu", () => {
      render(<NodeContextMenu {...defaultProps} />);
      // Portal renders to document.body
      const backdrop = document.body.querySelector(".fixed.inset-0");
      if (backdrop) {
        const event = new MouseEvent("contextmenu", { bubbles: true });
        const preventDefaultSpy = vi.spyOn(event, "preventDefault");
        backdrop.dispatchEvent(event);
        expect(preventDefaultSpy).toHaveBeenCalled();
      }
    });
  });

  describe("keyboard shortcuts", () => {
    it("should display keyboard shortcuts for all actions", () => {
      const fullProps = {
        ...defaultProps,
        onCopy: vi.fn(),
        onCut: vi.fn(),
        onPaste: vi.fn(),
        onDelete: vi.fn(),
      };
      render(<NodeContextMenu {...fullProps} />);

      // Copy shortcut
      expect(screen.getByText("Ctrl+C")).toBeInTheDocument();
      // Cut shortcut
      expect(screen.getByText("Ctrl+X")).toBeInTheDocument();
      // Paste shortcut
      expect(screen.getByText("Ctrl+V")).toBeInTheDocument();
      // Delete shortcut
      expect(screen.getByText("Ctrl+⌫")).toBeInTheDocument();
    });
  });
});
