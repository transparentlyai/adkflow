import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { TokensBadge } from "@/components/agent-prism/TokensBadge";

describe("TokensBadge", () => {
  it("should render tokens count", () => {
    render(<TokensBadge tokensCount={100} />);
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("should render large tokens count", () => {
    render(<TokensBadge tokensCount={1000000} />);
    expect(screen.getByText("1000000")).toBeInTheDocument();
  });

  it("should render zero tokens", () => {
    render(<TokensBadge tokensCount={0} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("should accept size prop", () => {
    render(<TokensBadge tokensCount={50} size="6" data-testid="badge" />);
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("h-6");
  });

  it("should pass through additional props", () => {
    render(<TokensBadge tokensCount={25} data-testid="tokens" />);
    expect(screen.getByTestId("tokens")).toBeInTheDocument();
  });

  it("should render with default size 4", () => {
    render(<TokensBadge tokensCount={100} data-testid="badge" />);
    expect(screen.getByTestId("badge")).toHaveClass("h-4");
  });

  it("should accept size 5", () => {
    render(<TokensBadge tokensCount={100} size="5" data-testid="badge" />);
    expect(screen.getByTestId("badge")).toHaveClass("h-5");
  });

  it("should accept size 7", () => {
    render(<TokensBadge tokensCount={100} size="7" data-testid="badge" />);
    expect(screen.getByTestId("badge")).toHaveClass("h-7");
  });

  it("should render the coins icon", () => {
    const { container } = render(<TokensBadge tokensCount={100} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("should accept custom className", () => {
    render(
      <TokensBadge
        tokensCount={100}
        className="custom-class"
        data-testid="badge"
      />,
    );
    expect(screen.getByTestId("badge")).toHaveClass("custom-class");
  });

  it("should handle negative token counts", () => {
    render(<TokensBadge tokensCount={-50} />);
    expect(screen.getByText("-50")).toBeInTheDocument();
  });
});
