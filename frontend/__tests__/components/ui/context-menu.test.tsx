import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
} from "@/components/ui/context-menu";

describe("ContextMenu", () => {
  describe("ContextMenu basics", () => {
    it("should render trigger content", () => {
      render(
        <ContextMenu>
          <ContextMenuTrigger>Right click me</ContextMenuTrigger>
        </ContextMenu>,
      );

      expect(screen.getByText("Right click me")).toBeInTheDocument();
    });
  });

  describe("ContextMenuLabel", () => {
    it("should render label", () => {
      render(
        <ContextMenuLabel data-testid="label">Label Text</ContextMenuLabel>,
      );

      expect(screen.getByTestId("label")).toBeInTheDocument();
      expect(screen.getByText("Label Text")).toBeInTheDocument();
    });

    it("should apply inset class when inset prop is true", () => {
      render(
        <ContextMenuLabel inset data-testid="inset-label">
          Inset Label
        </ContextMenuLabel>,
      );

      expect(screen.getByTestId("inset-label")).toHaveClass("pl-8");
    });
  });

  describe("ContextMenuSeparator", () => {
    it("should render separator", () => {
      render(<ContextMenuSeparator data-testid="separator" />);

      expect(screen.getByTestId("separator")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      render(
        <ContextMenuSeparator className="custom-sep" data-testid="separator" />,
      );

      expect(screen.getByTestId("separator")).toHaveClass("custom-sep");
    });
  });

  describe("ContextMenuShortcut", () => {
    it("should render shortcut text", () => {
      render(
        <ContextMenuShortcut data-testid="shortcut">⌘C</ContextMenuShortcut>,
      );

      expect(screen.getByTestId("shortcut")).toBeInTheDocument();
      expect(screen.getByText("⌘C")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      render(
        <ContextMenuShortcut className="custom-shortcut" data-testid="shortcut">
          ⌘X
        </ContextMenuShortcut>,
      );

      expect(screen.getByTestId("shortcut")).toHaveClass("custom-shortcut");
    });

    it("should have display name set", () => {
      expect(ContextMenuShortcut.displayName).toBe("ContextMenuShortcut");
    });
  });

  describe("displayName", () => {
    it("should have correct displayName for all components", () => {
      expect(ContextMenuSubTrigger.displayName).toBeDefined();
      expect(ContextMenuSubContent.displayName).toBeDefined();
      expect(ContextMenuContent.displayName).toBeDefined();
      expect(ContextMenuItem.displayName).toBeDefined();
      expect(ContextMenuCheckboxItem.displayName).toBeDefined();
      expect(ContextMenuRadioItem.displayName).toBeDefined();
      expect(ContextMenuLabel.displayName).toBeDefined();
      expect(ContextMenuSeparator.displayName).toBeDefined();
    });
  });

  describe("exports", () => {
    it("should export all expected components", () => {
      expect(ContextMenu).toBeDefined();
      expect(ContextMenuTrigger).toBeDefined();
      expect(ContextMenuContent).toBeDefined();
      expect(ContextMenuItem).toBeDefined();
      expect(ContextMenuCheckboxItem).toBeDefined();
      expect(ContextMenuRadioItem).toBeDefined();
      expect(ContextMenuLabel).toBeDefined();
      expect(ContextMenuSeparator).toBeDefined();
      expect(ContextMenuShortcut).toBeDefined();
      expect(ContextMenuGroup).toBeDefined();
      expect(ContextMenuSub).toBeDefined();
      expect(ContextMenuSubContent).toBeDefined();
      expect(ContextMenuSubTrigger).toBeDefined();
      expect(ContextMenuRadioGroup).toBeDefined();
    });
  });
});
