import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { Button } from "@/components/agent-prism/Button";

describe("Button", () => {
  it("should render children", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("should have type button by default", () => {
    render(<Button>Test</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("should accept submit type", () => {
    render(<Button type="submit">Test</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  it("should handle onClick", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Test</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("should render with default size 6", () => {
    render(<Button>Test</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-6");
  });

  it("should render with size 7", () => {
    render(<Button size="7">Test</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-7");
  });

  it("should render with size 8", () => {
    render(<Button size="8">Test</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-8");
  });

  it("should render with size 9", () => {
    render(<Button size="9">Test</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-9");
  });

  it("should render with size 10", () => {
    render(<Button size="10">Test</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-10");
  });

  it("should render with size 11", () => {
    render(<Button size="11">Test</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-11");
  });

  it("should render with size 12", () => {
    render(<Button size="12">Test</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-12");
  });

  it("should render with size 16", () => {
    render(<Button size="16">Test</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-16");
  });

  it("should render with default variant primary", () => {
    render(<Button>Test</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-agentprism-primary");
  });

  it("should render with brand variant", () => {
    render(<Button variant="brand">Test</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-agentprism-brand");
  });

  it("should render with outlined variant", () => {
    render(<Button variant="outlined">Test</Button>);
    expect(screen.getByRole("button")).toHaveClass("border");
  });

  it("should render with secondary variant", () => {
    render(<Button variant="secondary">Test</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-agentprism-secondary");
  });

  it("should render with ghost variant", () => {
    render(<Button variant="ghost">Test</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-transparent");
  });

  it("should render with destructive variant", () => {
    render(<Button variant="destructive">Test</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-agentprism-error");
  });

  it("should render with success variant", () => {
    render(<Button variant="success">Test</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-agentprism-success");
  });

  it("should render with default rounded md", () => {
    render(<Button>Test</Button>);
    expect(screen.getByRole("button")).toHaveClass("rounded-md");
  });

  it("should render with rounded none", () => {
    render(<Button rounded="none">Test</Button>);
    expect(screen.getByRole("button")).toHaveClass("rounded-none");
  });

  it("should render with rounded sm", () => {
    render(<Button rounded="sm">Test</Button>);
    expect(screen.getByRole("button")).toHaveClass("rounded-sm");
  });

  it("should render with rounded lg", () => {
    render(<Button rounded="lg">Test</Button>);
    expect(screen.getByRole("button")).toHaveClass("rounded-lg");
  });

  it("should render with rounded full", () => {
    render(<Button rounded="full">Test</Button>);
    expect(screen.getByRole("button")).toHaveClass("rounded-full");
  });

  it("should be full width when fullWidth is true", () => {
    render(<Button fullWidth>Test</Button>);
    expect(screen.getByRole("button")).toHaveClass("w-full");
  });

  it("should not be full width by default", () => {
    render(<Button>Test</Button>);
    expect(screen.getByRole("button")).not.toHaveClass("w-full");
  });

  it("should be disabled when disabled prop is true", () => {
    render(<Button disabled>Test</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("should have opacity-50 when disabled", () => {
    render(<Button disabled>Test</Button>);
    expect(screen.getByRole("button")).toHaveClass("opacity-50");
  });

  it("should render with start icon", () => {
    render(
      <Button iconStart={<span data-testid="start-icon">Icon</span>}>
        Test
      </Button>,
    );
    expect(screen.getByTestId("start-icon")).toBeInTheDocument();
  });

  it("should render with end icon", () => {
    render(
      <Button iconEnd={<span data-testid="end-icon">Icon</span>}>Test</Button>,
    );
    expect(screen.getByTestId("end-icon")).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    render(<Button className="custom-class">Test</Button>);
    expect(screen.getByRole("button")).toHaveClass("custom-class");
  });

  it("should render with both start and end icons", () => {
    render(
      <Button
        iconStart={<span data-testid="start-icon">Start</span>}
        iconEnd={<span data-testid="end-icon">End</span>}
      >
        Test
      </Button>,
    );
    expect(screen.getByTestId("start-icon")).toBeInTheDocument();
    expect(screen.getByTestId("end-icon")).toBeInTheDocument();
  });

  it("should not call onClick when disabled", () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Test
      </Button>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("should have cursor-not-allowed when disabled", () => {
    render(<Button disabled>Test</Button>);
    expect(screen.getByRole("button")).toHaveClass("cursor-not-allowed");
  });

  it("should pass through additional props", () => {
    render(
      <Button data-testid="test-button" title="Button title">
        Test
      </Button>,
    );
    expect(screen.getByTestId("test-button")).toHaveAttribute(
      "title",
      "Button title",
    );
  });
});
