import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { PriceBadge } from "@/components/agent-prism/PriceBadge";

describe("PriceBadge", () => {
  it("should render cost with dollar sign", () => {
    render(<PriceBadge cost={10} />);
    expect(screen.getByText("$ 10")).toBeInTheDocument();
  });

  it("should render decimal cost", () => {
    render(<PriceBadge cost={0.05} />);
    expect(screen.getByText("$ 0.05")).toBeInTheDocument();
  });

  it("should render zero cost", () => {
    render(<PriceBadge cost={0} />);
    expect(screen.getByText("$ 0")).toBeInTheDocument();
  });

  it("should accept size prop", () => {
    render(<PriceBadge cost={5} size="6" data-testid="badge" />);
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("h-6");
  });

  it("should pass through additional props", () => {
    render(<PriceBadge cost={25} data-testid="price" />);
    expect(screen.getByTestId("price")).toBeInTheDocument();
  });

  it("should render with default size 4", () => {
    render(<PriceBadge cost={10} data-testid="badge" />);
    expect(screen.getByTestId("badge")).toHaveClass("h-4");
  });

  it("should accept size 5", () => {
    render(<PriceBadge cost={10} size="5" data-testid="badge" />);
    expect(screen.getByTestId("badge")).toHaveClass("h-5");
  });

  it("should accept size 7", () => {
    render(<PriceBadge cost={10} size="7" data-testid="badge" />);
    expect(screen.getByTestId("badge")).toHaveClass("h-7");
  });

  it("should accept custom className", () => {
    render(
      <PriceBadge cost={10} className="custom-class" data-testid="badge" />,
    );
    expect(screen.getByTestId("badge")).toHaveClass("custom-class");
  });

  it("should handle negative cost", () => {
    render(<PriceBadge cost={-5} />);
    expect(screen.getByText("$ -5")).toBeInTheDocument();
  });

  it("should handle large cost", () => {
    render(<PriceBadge cost={1000000} />);
    expect(screen.getByText("$ 1000000")).toBeInTheDocument();
  });

  it("should handle very small decimal cost", () => {
    render(<PriceBadge cost={0.001} />);
    expect(screen.getByText("$ 0.001")).toBeInTheDocument();
  });
});
