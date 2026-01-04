import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { SpanBadge } from "@/components/agent-prism/SpanBadge";

describe("SpanBadge", () => {
  it("should render llm_call category", () => {
    render(<SpanBadge category="llm_call" data-testid="badge" />);
    expect(screen.getByText("LLM")).toBeInTheDocument();
    expect(screen.getByTestId("badge")).toHaveClass("bg-agentprism-badge-llm");
  });

  it("should render tool_execution category", () => {
    render(<SpanBadge category="tool_execution" data-testid="badge" />);
    expect(screen.getByText("TOOL")).toBeInTheDocument();
    expect(screen.getByTestId("badge")).toHaveClass("bg-agentprism-badge-tool");
  });

  it("should render agent_invocation category", () => {
    render(<SpanBadge category="agent_invocation" data-testid="badge" />);
    expect(screen.getByText("AGENT INVOCATION")).toBeInTheDocument();
    expect(screen.getByTestId("badge")).toHaveClass(
      "bg-agentprism-badge-agent",
    );
  });

  it("should render chain_operation category", () => {
    render(<SpanBadge category="chain_operation" data-testid="badge" />);
    expect(screen.getByText("CHAIN")).toBeInTheDocument();
    expect(screen.getByTestId("badge")).toHaveClass(
      "bg-agentprism-badge-chain",
    );
  });

  it("should render retrieval category", () => {
    render(<SpanBadge category="retrieval" data-testid="badge" />);
    expect(screen.getByText("RETRIEVAL")).toBeInTheDocument();
  });

  it("should render embedding category", () => {
    render(<SpanBadge category="embedding" data-testid="badge" />);
    expect(screen.getByText("EMBEDDING")).toBeInTheDocument();
  });

  it("should render create_agent category", () => {
    render(<SpanBadge category="create_agent" data-testid="badge" />);
    expect(screen.getByText("CREATE AGENT")).toBeInTheDocument();
  });

  it("should render span category", () => {
    render(<SpanBadge category="span" data-testid="badge" />);
    expect(screen.getByText("SPAN")).toBeInTheDocument();
  });

  it("should render event category", () => {
    render(<SpanBadge category="event" data-testid="badge" />);
    expect(screen.getByText("EVENT")).toBeInTheDocument();
  });

  it("should render guardrail category", () => {
    render(<SpanBadge category="guardrail" data-testid="badge" />);
    expect(screen.getByText("GUARDRAIL")).toBeInTheDocument();
  });

  it("should render unknown category", () => {
    render(<SpanBadge category="unknown" data-testid="badge" />);
    expect(screen.getByText("UNKNOWN")).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    render(
      <SpanBadge
        category="llm_call"
        className="custom-class"
        data-testid="badge"
      />,
    );
    expect(screen.getByTestId("badge")).toHaveClass("custom-class");
  });

  it("should pass through additional props", () => {
    render(
      <SpanBadge category="llm_call" data-testid="badge" title="LLM Badge" />,
    );
    expect(screen.getByTestId("badge")).toHaveAttribute("title", "LLM Badge");
  });

  it("should render with icon for each category", () => {
    const { container: container1 } = render(
      <SpanBadge category="llm_call" data-testid="badge1" />,
    );
    // Each SpanBadge should have an icon (svg element inside)
    expect(container1.querySelector("svg")).toBeInTheDocument();
  });

  it("should use unstyled Badge internally", () => {
    render(<SpanBadge category="llm_call" data-testid="badge" />);
    // The badge should not have the default background
    expect(screen.getByTestId("badge")).not.toHaveClass(
      "bg-agentprism-badge-default",
    );
  });

  it("should accept size prop", () => {
    render(<SpanBadge category="llm_call" size="6" data-testid="badge" />);
    expect(screen.getByTestId("badge")).toHaveClass("h-6");
  });

  it("should accept size 5", () => {
    render(<SpanBadge category="llm_call" size="5" data-testid="badge" />);
    expect(screen.getByTestId("badge")).toHaveClass("h-5");
  });

  it("should accept size 7", () => {
    render(<SpanBadge category="llm_call" size="7" data-testid="badge" />);
    expect(screen.getByTestId("badge")).toHaveClass("h-7");
  });
});
