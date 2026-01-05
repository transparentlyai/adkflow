import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

describe("Card components", () => {
  describe("Card", () => {
    it("should render card with content", () => {
      render(<Card data-testid="card">Content</Card>);
      expect(screen.getByTestId("card")).toHaveTextContent("Content");
    });

    it("should have default classes", () => {
      render(<Card data-testid="card">Content</Card>);
      expect(screen.getByTestId("card")).toHaveClass("rounded-xl", "border");
    });

    it("should apply custom className", () => {
      render(
        <Card data-testid="card" className="custom-card">
          Content
        </Card>,
      );
      expect(screen.getByTestId("card")).toHaveClass("custom-card");
    });
  });

  describe("CardHeader", () => {
    it("should render header with content", () => {
      render(<CardHeader data-testid="header">Header</CardHeader>);
      expect(screen.getByTestId("header")).toHaveTextContent("Header");
    });

    it("should have default classes", () => {
      render(<CardHeader data-testid="header">Header</CardHeader>);
      expect(screen.getByTestId("header")).toHaveClass("flex", "flex-col");
    });

    it("should apply custom className", () => {
      render(
        <CardHeader data-testid="header" className="custom-header">
          Header
        </CardHeader>,
      );
      expect(screen.getByTestId("header")).toHaveClass("custom-header");
    });
  });

  describe("CardTitle", () => {
    it("should render title with content", () => {
      render(<CardTitle>Title</CardTitle>);
      expect(screen.getByText("Title")).toBeInTheDocument();
    });

    it("should have default classes", () => {
      render(<CardTitle data-testid="title">Title</CardTitle>);
      expect(screen.getByTestId("title")).toHaveClass("font-semibold");
    });

    it("should apply custom className", () => {
      render(
        <CardTitle data-testid="title" className="custom-title">
          Title
        </CardTitle>,
      );
      expect(screen.getByTestId("title")).toHaveClass("custom-title");
    });
  });

  describe("CardDescription", () => {
    it("should render description with content", () => {
      render(<CardDescription>Description</CardDescription>);
      expect(screen.getByText("Description")).toBeInTheDocument();
    });

    it("should have default classes", () => {
      render(<CardDescription data-testid="desc">Description</CardDescription>);
      expect(screen.getByTestId("desc")).toHaveClass("text-sm");
    });

    it("should apply custom className", () => {
      render(
        <CardDescription data-testid="desc" className="custom-desc">
          Description
        </CardDescription>,
      );
      expect(screen.getByTestId("desc")).toHaveClass("custom-desc");
    });
  });

  describe("CardContent", () => {
    it("should render content", () => {
      render(<CardContent data-testid="content">Content</CardContent>);
      expect(screen.getByTestId("content")).toHaveTextContent("Content");
    });

    it("should have default classes", () => {
      render(<CardContent data-testid="content">Content</CardContent>);
      expect(screen.getByTestId("content")).toHaveClass("p-6");
    });

    it("should apply custom className", () => {
      render(
        <CardContent data-testid="content" className="custom-content">
          Content
        </CardContent>,
      );
      expect(screen.getByTestId("content")).toHaveClass("custom-content");
    });
  });

  describe("CardFooter", () => {
    it("should render footer with content", () => {
      render(<CardFooter data-testid="footer">Footer</CardFooter>);
      expect(screen.getByTestId("footer")).toHaveTextContent("Footer");
    });

    it("should have default classes", () => {
      render(<CardFooter data-testid="footer">Footer</CardFooter>);
      expect(screen.getByTestId("footer")).toHaveClass("flex", "items-center");
    });

    it("should apply custom className", () => {
      render(
        <CardFooter data-testid="footer" className="custom-footer">
          Footer
        </CardFooter>,
      );
      expect(screen.getByTestId("footer")).toHaveClass("custom-footer");
    });
  });

  it("should compose all card parts together", () => {
    render(
      <Card data-testid="card">
        <CardHeader>
          <CardTitle>Test Title</CardTitle>
          <CardDescription>Test Description</CardDescription>
        </CardHeader>
        <CardContent>Test Content</CardContent>
        <CardFooter>Test Footer</CardFooter>
      </Card>,
    );

    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Test Description")).toBeInTheDocument();
    expect(screen.getByText("Test Content")).toBeInTheDocument();
    expect(screen.getByText("Test Footer")).toBeInTheDocument();
  });
});
