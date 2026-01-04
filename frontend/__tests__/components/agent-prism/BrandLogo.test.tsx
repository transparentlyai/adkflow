import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { BrandLogo } from "@/components/agent-prism/BrandLogo";

describe("BrandLogo", () => {
  it("should render OpenAI logo", () => {
    const { container } = render(<BrandLogo brand="openai" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass("size-4");
  });

  it("should render Anthropic logo", () => {
    const { container } = render(<BrandLogo brand="anthropic" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("should render Google logo", () => {
    const { container } = render(<BrandLogo brand="google" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("should render Meta logo", () => {
    const { container } = render(<BrandLogo brand="meta" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("should render Mistral logo", () => {
    const { container } = render(<BrandLogo brand="mistral" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("should render Perplexity logo", () => {
    const { container } = render(<BrandLogo brand="perplexity" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    const { container } = render(
      <BrandLogo brand="openai" className="custom-size" />,
    );
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("custom-size");
  });

  it("should return null for unknown brand without fallback", () => {
    const { container } = render(<BrandLogo brand="unknown-brand" />);
    expect(container.querySelector("svg")).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });

  it("should render fallback for unknown brand", () => {
    render(
      <BrandLogo
        brand="unknown-brand"
        fallback={<span data-testid="fallback">FB</span>}
      />,
    );
    expect(screen.getByTestId("fallback")).toBeInTheDocument();
    expect(screen.getByText("FB")).toBeInTheDocument();
  });
});
