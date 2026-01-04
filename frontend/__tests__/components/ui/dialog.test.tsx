import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

describe("Dialog components", () => {
  describe("Dialog (Root)", () => {
    it("should render trigger button", () => {
      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
        </Dialog>,
      );
      expect(screen.getByText("Open Dialog")).toBeInTheDocument();
    });
  });

  describe("DialogContent", () => {
    it("should render content when dialog is open", () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <span>Dialog Content</span>
          </DialogContent>
        </Dialog>,
      );
      expect(screen.getByText("Dialog Content")).toBeInTheDocument();
    });

    it("should render close button", () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>Content</DialogContent>
        </Dialog>,
      );
      expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      render(
        <Dialog defaultOpen>
          <DialogContent className="custom-dialog">Content</DialogContent>
        </Dialog>,
      );
      expect(screen.getByRole("dialog")).toHaveClass("custom-dialog");
    });

    it("should forward ref", () => {
      const ref = React.createRef<HTMLDivElement>();
      render(
        <Dialog defaultOpen>
          <DialogContent ref={ref}>Content</DialogContent>
        </Dialog>,
      );
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe("DialogHeader", () => {
    it("should render header content", () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogHeader>Header Content</DialogHeader>
          </DialogContent>
        </Dialog>,
      );
      expect(screen.getByText("Header Content")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogHeader className="custom-header">Header</DialogHeader>
          </DialogContent>
        </Dialog>,
      );
      expect(screen.getByText("Header")).toHaveClass("custom-header");
    });
  });

  describe("DialogFooter", () => {
    it("should render footer content", () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogFooter>Footer Content</DialogFooter>
          </DialogContent>
        </Dialog>,
      );
      expect(screen.getByText("Footer Content")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogFooter className="custom-footer">Footer</DialogFooter>
          </DialogContent>
        </Dialog>,
      );
      expect(screen.getByText("Footer")).toHaveClass("custom-footer");
    });
  });

  describe("DialogTitle", () => {
    it("should render title text", () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Dialog Title</DialogTitle>
          </DialogContent>
        </Dialog>,
      );
      expect(screen.getByText("Dialog Title")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle className="custom-title">Title</DialogTitle>
          </DialogContent>
        </Dialog>,
      );
      expect(screen.getByText("Title")).toHaveClass("custom-title");
    });

    it("should forward ref", () => {
      const ref = React.createRef<HTMLHeadingElement>();
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle ref={ref}>Title</DialogTitle>
          </DialogContent>
        </Dialog>,
      );
      expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
    });
  });

  describe("DialogDescription", () => {
    it("should render description text", () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogDescription>Description text</DialogDescription>
          </DialogContent>
        </Dialog>,
      );
      expect(screen.getByText("Description text")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogDescription className="custom-desc">
              Description
            </DialogDescription>
          </DialogContent>
        </Dialog>,
      );
      expect(screen.getByText("Description")).toHaveClass("custom-desc");
    });

    it("should forward ref", () => {
      const ref = React.createRef<HTMLParagraphElement>();
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogDescription ref={ref}>Description</DialogDescription>
          </DialogContent>
        </Dialog>,
      );
      expect(ref.current).toBeInstanceOf(HTMLParagraphElement);
    });
  });
});
