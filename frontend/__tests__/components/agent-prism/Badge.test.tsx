import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { Badge } from "@/components/agent-prism/Badge";

describe("Badge", () => {
  it("should render label text", () => {
    render(<Badge label="Test Label" />);
    expect(screen.getByText("Test Label")).toBeInTheDocument();
  });

  it("should render with default size", () => {
    render(<Badge label="Test" data-testid="badge" />);
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("h-4"); // size 4 is default
  });

  it("should render with size 5", () => {
    render(<Badge label="Test" size="5" data-testid="badge" />);
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("h-5");
  });

  it("should render with size 6", () => {
    render(<Badge label="Test" size="6" data-testid="badge" />);
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("h-6");
  });

  it("should render with size 7", () => {
    render(<Badge label="Test" size="7" data-testid="badge" />);
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("h-7");
  });

  it("should render with start icon", () => {
    render(
      <Badge
        label="Test"
        iconStart={<span data-testid="start-icon">Icon</span>}
      />,
    );
    expect(screen.getByTestId("start-icon")).toBeInTheDocument();
  });

  it("should render with end icon", () => {
    render(
      <Badge label="Test" iconEnd={<span data-testid="end-icon">Icon</span>} />,
    );
    expect(screen.getByTestId("end-icon")).toBeInTheDocument();
  });

  it("should render with both icons", () => {
    render(
      <Badge
        label="Test"
        iconStart={<span data-testid="start-icon">Start</span>}
        iconEnd={<span data-testid="end-icon">End</span>}
      />,
    );
    expect(screen.getByTestId("start-icon")).toBeInTheDocument();
    expect(screen.getByTestId("end-icon")).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    render(<Badge label="Test" className="custom-class" data-testid="badge" />);
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("custom-class");
  });

  it("should render unstyled when unstyled prop is true", () => {
    render(<Badge label="Test" unstyled={true} data-testid="badge" />);
    const badge = screen.getByTestId("badge");
    expect(badge).not.toHaveClass("bg-agentprism-badge-default");
  });

  it("should render styled by default", () => {
    render(<Badge label="Test" data-testid="badge" />);
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("bg-agentprism-badge-default");
  });

  it("should pass through additional props", () => {
    render(<Badge label="Test" data-testid="badge" title="Badge title" />);
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveAttribute("title", "Badge title");
  });

  it("should render ReactNode as label", () => {
    render(
      <Badge label={<strong data-testid="strong-label">Strong</strong>} />,
    );
    expect(screen.getByTestId("strong-label")).toBeInTheDocument();
  });

  it("should have proper text truncation class", () => {
    render(
      <Badge
        label="Very long label that should truncate"
        data-testid="badge"
      />,
    );
    // Find the label span with truncate class
    const badge = screen.getByTestId("badge");
    const labelSpan = badge.querySelector("span.truncate");
    expect(labelSpan).toBeInTheDocument();
  });

  it("should render with proper flex layout", () => {
    render(<Badge label="Test" data-testid="badge" />);
    expect(screen.getByTestId("badge")).toHaveClass("inline-flex");
  });

  it("should have rounded-md class", () => {
    render(<Badge label="Test" data-testid="badge" />);
    expect(screen.getByTestId("badge")).toHaveClass("rounded-md");
  });

  it("should have font-medium class", () => {
    render(<Badge label="Test" data-testid="badge" />);
    expect(screen.getByTestId("badge")).toHaveClass("font-medium");
  });

  it("should accept number as label", () => {
    render(<Badge label={42} data-testid="badge" />);
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("should render iconStart and iconEnd in correct order", () => {
    render(
      <Badge
        label="Middle"
        iconStart={<span data-testid="start">Start</span>}
        iconEnd={<span data-testid="end">End</span>}
        data-testid="badge"
      />,
    );
    const badge = screen.getByTestId("badge");
    const children = Array.from(badge.children);
    expect(children[0]).toContainElement(screen.getByTestId("start"));
    expect(children[2]).toContainElement(screen.getByTestId("end"));
  });
});
