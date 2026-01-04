import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

describe("AlertDialog components", () => {
  describe("AlertDialog (Root)", () => {
    it("should render trigger button", () => {
      render(
        <AlertDialog>
          <AlertDialogTrigger>Open</AlertDialogTrigger>
        </AlertDialog>,
      );
      expect(screen.getByText("Open")).toBeInTheDocument();
    });
  });

  describe("AlertDialogContent", () => {
    it("should render content when dialog is open", () => {
      render(
        <AlertDialog defaultOpen>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Test Title</AlertDialogTitle>
              <AlertDialogDescription>Test Description</AlertDialogDescription>
            </AlertDialogHeader>
          </AlertDialogContent>
        </AlertDialog>,
      );
      expect(screen.getByText("Test Title")).toBeInTheDocument();
      expect(screen.getByText("Test Description")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      render(
        <AlertDialog defaultOpen>
          <AlertDialogContent className="custom-content">
            Content
          </AlertDialogContent>
        </AlertDialog>,
      );
      expect(screen.getByRole("alertdialog")).toHaveClass("custom-content");
    });
  });

  describe("AlertDialogHeader", () => {
    it("should render header with children", () => {
      render(
        <AlertDialog defaultOpen>
          <AlertDialogContent>
            <AlertDialogHeader>
              <span>Header Content</span>
            </AlertDialogHeader>
          </AlertDialogContent>
        </AlertDialog>,
      );
      expect(screen.getByText("Header Content")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      render(
        <AlertDialog defaultOpen>
          <AlertDialogContent>
            <AlertDialogHeader className="custom-header" data-testid="header">
              Header
            </AlertDialogHeader>
          </AlertDialogContent>
        </AlertDialog>,
      );
      expect(screen.getByTestId("header")).toHaveClass("custom-header");
    });
  });

  describe("AlertDialogFooter", () => {
    it("should render footer with actions", () => {
      render(
        <AlertDialog defaultOpen>
          <AlertDialogContent>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>,
      );
      expect(screen.getByText("Cancel")).toBeInTheDocument();
      expect(screen.getByText("Continue")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      render(
        <AlertDialog defaultOpen>
          <AlertDialogContent>
            <AlertDialogFooter className="custom-footer">
              Footer
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>,
      );
      expect(screen.getByText("Footer")).toHaveClass("custom-footer");
    });
  });

  describe("AlertDialogTitle", () => {
    it("should render title text", () => {
      render(
        <AlertDialog defaultOpen>
          <AlertDialogContent>
            <AlertDialogTitle>Dialog Title</AlertDialogTitle>
          </AlertDialogContent>
        </AlertDialog>,
      );
      expect(screen.getByText("Dialog Title")).toBeInTheDocument();
    });

    it("should forward ref", () => {
      const ref = React.createRef<HTMLHeadingElement>();
      render(
        <AlertDialog defaultOpen>
          <AlertDialogContent>
            <AlertDialogTitle ref={ref}>Title</AlertDialogTitle>
          </AlertDialogContent>
        </AlertDialog>,
      );
      expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
    });
  });

  describe("AlertDialogDescription", () => {
    it("should render description text", () => {
      render(
        <AlertDialog defaultOpen>
          <AlertDialogContent>
            <AlertDialogDescription>
              This is a description
            </AlertDialogDescription>
          </AlertDialogContent>
        </AlertDialog>,
      );
      expect(screen.getByText("This is a description")).toBeInTheDocument();
    });

    it("should forward ref", () => {
      const ref = React.createRef<HTMLParagraphElement>();
      render(
        <AlertDialog defaultOpen>
          <AlertDialogContent>
            <AlertDialogDescription ref={ref}>
              Description
            </AlertDialogDescription>
          </AlertDialogContent>
        </AlertDialog>,
      );
      expect(ref.current).toBeInstanceOf(HTMLParagraphElement);
    });
  });

  describe("AlertDialogAction", () => {
    it("should render action button", () => {
      render(
        <AlertDialog defaultOpen>
          <AlertDialogContent>
            <AlertDialogAction>Confirm</AlertDialogAction>
          </AlertDialogContent>
        </AlertDialog>,
      );
      expect(
        screen.getByRole("button", { name: "Confirm" }),
      ).toBeInTheDocument();
    });

    it("should forward ref", () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(
        <AlertDialog defaultOpen>
          <AlertDialogContent>
            <AlertDialogAction ref={ref}>Action</AlertDialogAction>
          </AlertDialogContent>
        </AlertDialog>,
      );
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
  });

  describe("AlertDialogCancel", () => {
    it("should render cancel button", () => {
      render(
        <AlertDialog defaultOpen>
          <AlertDialogContent>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogContent>
        </AlertDialog>,
      );
      expect(
        screen.getByRole("button", { name: "Cancel" }),
      ).toBeInTheDocument();
    });

    it("should forward ref", () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(
        <AlertDialog defaultOpen>
          <AlertDialogContent>
            <AlertDialogCancel ref={ref}>Cancel</AlertDialogCancel>
          </AlertDialogContent>
        </AlertDialog>,
      );
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
  });
});
