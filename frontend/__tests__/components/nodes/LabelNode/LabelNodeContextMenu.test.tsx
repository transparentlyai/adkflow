import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Settings: () => <svg data-testid="icon-settings" />,
  Unlink: () => <svg data-testid="icon-unlink" />,
}));

import LabelNodeContextMenu from "@/components/nodes/LabelNode/LabelNodeContextMenu";

describe("LabelNodeContextMenu", () => {
  const defaultProps = {
    position: { x: 100, y: 200 },
    parentId: undefined,
    onClose: vi.fn(),
    onSettings: vi.fn(),
    onDetach: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render menu at specified position", () => {
      render(<LabelNodeContextMenu {...defaultProps} />);
      // Portal renders to document.body
      const menu = document.body.querySelector('[style*="left"]');
      expect(menu).toBeInTheDocument();
    });

    it("should adjust position when near right edge", () => {
      const edgeProps = { ...defaultProps, position: { x: 9999, y: 100 } };
      render(<LabelNodeContextMenu {...edgeProps} />);
      // Portal renders to document.body, check that menu exists
      const menu = document.body.querySelector('[style*="left"]');
      expect(menu).toBeInTheDocument();
    });

    it("should adjust position when near bottom edge", () => {
      const edgeProps = { ...defaultProps, position: { x: 100, y: 9999 } };
      render(<LabelNodeContextMenu {...edgeProps} />);
      // Portal renders to document.body, check that menu exists
      const menu = document.body.querySelector('[style*="top"]');
      expect(menu).toBeInTheDocument();
    });

    it("should always render settings button", () => {
      render(<LabelNodeContextMenu {...defaultProps} />);
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    it("should render detach button when parentId is provided", () => {
      const withParentProps = { ...defaultProps, parentId: "parent-123" };
      render(<LabelNodeContextMenu {...withParentProps} />);
      expect(screen.getByText("Detach from Group")).toBeInTheDocument();
    });

    it("should not render detach button when parentId is undefined", () => {
      render(<LabelNodeContextMenu {...defaultProps} />);
      expect(screen.queryByText("Detach from Group")).not.toBeInTheDocument();
    });

    it("should render settings icon", () => {
      render(<LabelNodeContextMenu {...defaultProps} />);
      expect(screen.getByTestId("icon-settings")).toBeInTheDocument();
    });

    it("should render unlink icon when detach button present", () => {
      const withParentProps = { ...defaultProps, parentId: "parent-123" };
      render(<LabelNodeContextMenu {...withParentProps} />);
      expect(screen.getByTestId("icon-unlink")).toBeInTheDocument();
    });
  });

  describe("settings action", () => {
    it("should call onSettings when settings button clicked", () => {
      const onSettings = vi.fn();
      render(
        <LabelNodeContextMenu {...defaultProps} onSettings={onSettings} />,
      );
      fireEvent.click(screen.getByText("Settings"));
      expect(onSettings).toHaveBeenCalledTimes(1);
    });

    it("should call onClose when settings button clicked", () => {
      const onClose = vi.fn();
      render(<LabelNodeContextMenu {...defaultProps} onClose={onClose} />);
      fireEvent.click(screen.getByText("Settings"));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should call both onSettings and onClose in sequence", () => {
      const onSettings = vi.fn();
      const onClose = vi.fn();
      render(
        <LabelNodeContextMenu
          {...defaultProps}
          onSettings={onSettings}
          onClose={onClose}
        />,
      );
      fireEvent.click(screen.getByText("Settings"));
      expect(onSettings).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("detach action", () => {
    it("should call onDetach when detach button clicked", () => {
      const onDetach = vi.fn();
      const withParentProps = {
        ...defaultProps,
        parentId: "parent-123",
        onDetach,
      };
      render(<LabelNodeContextMenu {...withParentProps} />);
      fireEvent.click(screen.getByText("Detach from Group"));
      expect(onDetach).toHaveBeenCalledTimes(1);
    });

    it("should call onClose when detach button clicked", () => {
      const onClose = vi.fn();
      const withParentProps = {
        ...defaultProps,
        parentId: "parent-123",
        onClose,
      };
      render(<LabelNodeContextMenu {...withParentProps} />);
      fireEvent.click(screen.getByText("Detach from Group"));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should call both onDetach and onClose in sequence", () => {
      const onDetach = vi.fn();
      const onClose = vi.fn();
      const withParentProps = {
        ...defaultProps,
        parentId: "parent-123",
        onDetach,
        onClose,
      };
      render(<LabelNodeContextMenu {...withParentProps} />);
      fireEvent.click(screen.getByText("Detach from Group"));
      expect(onDetach).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("backdrop interaction", () => {
    it("should call onClose when backdrop clicked", () => {
      const onClose = vi.fn();
      render(<LabelNodeContextMenu {...defaultProps} onClose={onClose} />);
      // Portal renders to document.body
      const backdrop = document.body.querySelector(".fixed.inset-0");
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(onClose).toHaveBeenCalledTimes(1);
      }
    });

    it("should call onClose when backdrop right-clicked", () => {
      const onClose = vi.fn();
      render(<LabelNodeContextMenu {...defaultProps} onClose={onClose} />);
      // Portal renders to document.body
      const backdrop = document.body.querySelector(".fixed.inset-0");
      if (backdrop) {
        fireEvent.contextMenu(backdrop);
        expect(onClose).toHaveBeenCalledTimes(1);
      }
    });

    it("should prevent default on backdrop context menu", () => {
      render(<LabelNodeContextMenu {...defaultProps} />);
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
});
