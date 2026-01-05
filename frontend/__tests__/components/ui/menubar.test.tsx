import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarLabel,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarGroup,
  MenubarSub,
  MenubarShortcut,
} from "@/components/ui/menubar";

describe("Menubar", () => {
  describe("Menubar root", () => {
    it("should render menubar root", () => {
      render(
        <Menubar data-testid="menubar">
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
          </MenubarMenu>
        </Menubar>,
      );

      expect(screen.getByTestId("menubar")).toBeInTheDocument();
    });

    it("should render menu trigger", () => {
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
          </MenubarMenu>
        </Menubar>,
      );

      expect(screen.getByText("File")).toBeInTheDocument();
    });

    it("should apply custom className to Menubar", () => {
      render(
        <Menubar className="custom-menubar" data-testid="menubar">
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
          </MenubarMenu>
        </Menubar>,
      );

      expect(screen.getByTestId("menubar")).toHaveClass("custom-menubar");
    });

    it("should render multiple triggers", () => {
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>Edit</MenubarTrigger>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>View</MenubarTrigger>
          </MenubarMenu>
        </Menubar>,
      );

      expect(screen.getByText("File")).toBeInTheDocument();
      expect(screen.getByText("Edit")).toBeInTheDocument();
      expect(screen.getByText("View")).toBeInTheDocument();
    });
  });

  describe("MenubarTrigger", () => {
    it("should apply custom className", () => {
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger className="custom-trigger" data-testid="trigger">
              File
            </MenubarTrigger>
          </MenubarMenu>
        </Menubar>,
      );

      expect(screen.getByTestId("trigger")).toHaveClass("custom-trigger");
    });
  });

  describe("MenubarShortcut", () => {
    it("should render shortcut element", () => {
      render(<MenubarShortcut data-testid="shortcut">⌘Z</MenubarShortcut>);

      expect(screen.getByTestId("shortcut")).toBeInTheDocument();
      expect(screen.getByText("⌘Z")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      render(
        <MenubarShortcut className="custom-shortcut" data-testid="shortcut">
          ⌘C
        </MenubarShortcut>,
      );

      expect(screen.getByTestId("shortcut")).toHaveClass("custom-shortcut");
    });

    it("should have display name set", () => {
      expect(MenubarShortcut.displayName).toBe("MenubarShortcut");
    });
  });

  describe("displayName", () => {
    it("should have correct displayName for all components", () => {
      expect(Menubar.displayName).toBeDefined();
      expect(MenubarTrigger.displayName).toBeDefined();
      expect(MenubarContent.displayName).toBeDefined();
      expect(MenubarItem.displayName).toBeDefined();
      expect(MenubarSeparator.displayName).toBeDefined();
      expect(MenubarLabel.displayName).toBeDefined();
      expect(MenubarCheckboxItem.displayName).toBeDefined();
      expect(MenubarRadioItem.displayName).toBeDefined();
      expect(MenubarSubContent.displayName).toBeDefined();
      expect(MenubarSubTrigger.displayName).toBeDefined();
    });
  });

  describe("MenubarLabel", () => {
    it("should render label", () => {
      render(<MenubarLabel data-testid="label">Actions</MenubarLabel>);

      expect(screen.getByTestId("label")).toBeInTheDocument();
      expect(screen.getByText("Actions")).toBeInTheDocument();
    });

    it("should apply inset class", () => {
      render(
        <MenubarLabel inset data-testid="label">
          Actions
        </MenubarLabel>,
      );

      expect(screen.getByTestId("label")).toHaveClass("pl-8");
    });
  });

  describe("MenubarSeparator", () => {
    it("should render separator", () => {
      render(<MenubarSeparator data-testid="separator" />);

      expect(screen.getByTestId("separator")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      render(
        <MenubarSeparator className="custom-sep" data-testid="separator" />,
      );

      expect(screen.getByTestId("separator")).toHaveClass("custom-sep");
    });
  });

  describe("exports", () => {
    it("should export all expected components", () => {
      expect(Menubar).toBeDefined();
      expect(MenubarMenu).toBeDefined();
      expect(MenubarTrigger).toBeDefined();
      expect(MenubarContent).toBeDefined();
      expect(MenubarItem).toBeDefined();
      expect(MenubarSeparator).toBeDefined();
      expect(MenubarLabel).toBeDefined();
      expect(MenubarCheckboxItem).toBeDefined();
      expect(MenubarRadioGroup).toBeDefined();
      expect(MenubarRadioItem).toBeDefined();
      expect(MenubarSubContent).toBeDefined();
      expect(MenubarSubTrigger).toBeDefined();
      expect(MenubarGroup).toBeDefined();
      expect(MenubarSub).toBeDefined();
      expect(MenubarShortcut).toBeDefined();
    });
  });
});
