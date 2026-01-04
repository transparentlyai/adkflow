import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { IconButton } from "@/components/agent-prism/IconButton";

describe("IconButton", () => {
  it("should render children", () => {
    render(
      <IconButton aria-label="Test">
        <span data-testid="icon">Icon</span>
      </IconButton>,
    );
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("should have aria-label", () => {
    render(<IconButton aria-label="Test button">Icon</IconButton>);
    expect(screen.getByRole("button")).toHaveAttribute(
      "aria-label",
      "Test button",
    );
  });

  it("should render with default size 6", () => {
    render(<IconButton aria-label="Test">Icon</IconButton>);
    expect(screen.getByRole("button")).toHaveClass("h-6");
  });

  it("should render with size 7", () => {
    render(
      <IconButton aria-label="Test" size="7">
        Icon
      </IconButton>,
    );
    expect(screen.getByRole("button")).toHaveClass("h-7");
  });

  it("should render with size 8", () => {
    render(
      <IconButton aria-label="Test" size="8">
        Icon
      </IconButton>,
    );
    expect(screen.getByRole("button")).toHaveClass("h-8");
  });

  it("should render with size 9", () => {
    render(
      <IconButton aria-label="Test" size="9">
        Icon
      </IconButton>,
    );
    expect(screen.getByRole("button")).toHaveClass("h-9");
  });

  it("should render with size 10", () => {
    render(
      <IconButton aria-label="Test" size="10">
        Icon
      </IconButton>,
    );
    expect(screen.getByRole("button")).toHaveClass("h-10");
  });

  it("should render with size 11", () => {
    render(
      <IconButton aria-label="Test" size="11">
        Icon
      </IconButton>,
    );
    expect(screen.getByRole("button")).toHaveClass("h-11");
  });

  it("should render with size 12", () => {
    render(
      <IconButton aria-label="Test" size="12">
        Icon
      </IconButton>,
    );
    expect(screen.getByRole("button")).toHaveClass("h-12");
  });

  it("should render with size 16", () => {
    render(
      <IconButton aria-label="Test" size="16">
        Icon
      </IconButton>,
    );
    expect(screen.getByRole("button")).toHaveClass("h-16");
  });

  it("should render with default variant", () => {
    render(<IconButton aria-label="Test">Icon</IconButton>);
    expect(screen.getByRole("button")).toHaveClass("border");
  });

  it("should render with ghost variant", () => {
    render(
      <IconButton aria-label="Test" variant="ghost">
        Icon
      </IconButton>,
    );
    const button = screen.getByRole("button");
    expect(button).not.toHaveClass("border");
    expect(button).toHaveClass("bg-transparent");
  });

  it("should handle onClick", () => {
    const onClick = vi.fn();
    render(
      <IconButton aria-label="Test" onClick={onClick}>
        Icon
      </IconButton>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("should apply custom className", () => {
    render(
      <IconButton aria-label="Test" className="custom-class">
        Icon
      </IconButton>,
    );
    expect(screen.getByRole("button")).toHaveClass("custom-class");
  });

  it("should have type button by default", () => {
    render(<IconButton aria-label="Test">Icon</IconButton>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("should accept submit type", () => {
    render(
      <IconButton aria-label="Test" type="submit">
        Icon
      </IconButton>,
    );
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  it("should be disabled when disabled prop is true", () => {
    render(
      <IconButton aria-label="Test" disabled>
        Icon
      </IconButton>,
    );
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("should pass through additional props", () => {
    render(
      <IconButton aria-label="Test" data-testid="icon-btn" title="Icon title">
        Icon
      </IconButton>,
    );
    expect(screen.getByTestId("icon-btn")).toHaveAttribute(
      "title",
      "Icon title",
    );
  });

  it("should have aspect-square class", () => {
    render(<IconButton aria-label="Test">Icon</IconButton>);
    expect(screen.getByRole("button")).toHaveClass("aspect-square");
  });

  it("should have rounded-md class", () => {
    render(<IconButton aria-label="Test">Icon</IconButton>);
    expect(screen.getByRole("button")).toHaveClass("rounded-md");
  });

  it("should apply hover styles on default variant", () => {
    render(<IconButton aria-label="Test">Icon</IconButton>);
    expect(screen.getByRole("button")).toHaveClass(
      "hover:bg-agentprism-secondary",
    );
  });

  it("should have shrink-0 class to prevent shrinking", () => {
    render(<IconButton aria-label="Test">Icon</IconButton>);
    expect(screen.getByRole("button")).toHaveClass("shrink-0");
  });
});
