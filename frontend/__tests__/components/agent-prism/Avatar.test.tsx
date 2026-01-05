import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { Avatar } from "@/components/agent-prism/Avatar";

describe("Avatar", () => {
  it("should render with letter fallback", () => {
    render(<Avatar category="llm_call" alt="Test" data-testid="avatar" />);
    expect(screen.getByText("T")).toBeInTheDocument();
  });

  it("should use custom letter when provided", () => {
    render(
      <Avatar category="llm_call" letter="X" alt="Test" data-testid="avatar" />,
    );
    expect(screen.getByText("X")).toBeInTheDocument();
    expect(screen.queryByText("T")).not.toBeInTheDocument();
  });

  it("should render image when src is provided", () => {
    render(
      <Avatar
        category="llm_call"
        src="https://example.com/avatar.png"
        alt="User Avatar"
      />,
    );
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/avatar.png");
    expect(img).toHaveAttribute("alt", "User Avatar");
  });

  it("should show fallback on image error", () => {
    render(<Avatar category="llm_call" src="invalid.png" alt="Test" />);
    const img = screen.getByRole("img");
    fireEvent.error(img);
    // After error, should show User icon (fallback)
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("should render children when provided", () => {
    render(
      <Avatar category="llm_call">
        <span data-testid="custom-content">Custom</span>
      </Avatar>,
    );
    expect(screen.getByTestId("custom-content")).toBeInTheDocument();
  });

  it("should apply default size 10", () => {
    render(<Avatar category="llm_call" data-testid="avatar" />);
    expect(screen.getByTestId("avatar")).toHaveClass("size-10");
  });

  it("should apply size 4", () => {
    render(<Avatar category="llm_call" size="4" data-testid="avatar" />);
    expect(screen.getByTestId("avatar")).toHaveClass("size-4");
  });

  it("should apply size 6", () => {
    render(<Avatar category="llm_call" size="6" data-testid="avatar" />);
    expect(screen.getByTestId("avatar")).toHaveClass("size-6");
  });

  it("should apply size 8", () => {
    render(<Avatar category="llm_call" size="8" data-testid="avatar" />);
    expect(screen.getByTestId("avatar")).toHaveClass("size-8");
  });

  it("should apply size 16", () => {
    render(<Avatar category="llm_call" size="16" data-testid="avatar" />);
    expect(screen.getByTestId("avatar")).toHaveClass("size-16");
  });

  it("should apply default rounded full", () => {
    render(<Avatar category="llm_call" data-testid="avatar" />);
    expect(screen.getByTestId("avatar")).toHaveClass("rounded-full");
  });

  it("should apply rounded none", () => {
    render(<Avatar category="llm_call" rounded="none" data-testid="avatar" />);
    expect(screen.getByTestId("avatar")).toHaveClass("rounded-none");
  });

  it("should apply rounded md", () => {
    render(<Avatar category="llm_call" rounded="md" data-testid="avatar" />);
    expect(screen.getByTestId("avatar")).toHaveClass("rounded-md");
  });

  it("should apply category-specific background color", () => {
    render(<Avatar category="llm_call" alt="T" />);
    const letterDiv = screen.getByText("T").closest("div");
    expect(letterDiv).toHaveClass("bg-agentprism-avatar-llm");
  });

  it("should apply tool_execution background", () => {
    render(<Avatar category="tool_execution" alt="T" />);
    const letterDiv = screen.getByText("T").closest("div");
    expect(letterDiv).toHaveClass("bg-agentprism-avatar-tool");
  });

  it("should apply custom className", () => {
    render(
      <Avatar
        category="llm_call"
        className="custom-class"
        data-testid="avatar"
      />,
    );
    expect(screen.getByTestId("avatar")).toHaveClass("custom-class");
  });

  it("should pass through additional props", () => {
    render(
      <Avatar category="llm_call" data-testid="avatar" title="Avatar title" />,
    );
    expect(screen.getByTestId("avatar")).toHaveAttribute(
      "title",
      "Avatar title",
    );
  });

  it("should apply size 9", () => {
    render(<Avatar category="llm_call" size="9" data-testid="avatar" />);
    expect(screen.getByTestId("avatar")).toHaveClass("size-9");
  });

  it("should apply size 11", () => {
    render(<Avatar category="llm_call" size="11" data-testid="avatar" />);
    expect(screen.getByTestId("avatar")).toHaveClass("size-11");
  });

  it("should apply size 12", () => {
    render(<Avatar category="llm_call" size="12" data-testid="avatar" />);
    expect(screen.getByTestId("avatar")).toHaveClass("size-12");
  });

  it("should apply agent_invocation background", () => {
    render(<Avatar category="agent_invocation" alt="A" />);
    const letterDiv = screen.getByText("A").closest("div");
    expect(letterDiv).toHaveClass("bg-agentprism-avatar-agent");
  });

  it("should apply chain_operation background", () => {
    render(<Avatar category="chain_operation" alt="C" />);
    const letterDiv = screen.getByText("C").closest("div");
    expect(letterDiv).toHaveClass("bg-agentprism-avatar-chain");
  });

  it("should apply retrieval background", () => {
    render(<Avatar category="retrieval" alt="R" />);
    const letterDiv = screen.getByText("R").closest("div");
    expect(letterDiv).toHaveClass("bg-agentprism-avatar-retrieval");
  });

  it("should apply embedding background", () => {
    render(<Avatar category="embedding" alt="E" />);
    const letterDiv = screen.getByText("E").closest("div");
    expect(letterDiv).toHaveClass("bg-agentprism-avatar-embedding");
  });

  it("should apply create_agent background", () => {
    render(<Avatar category="create_agent" alt="C" />);
    const letterDiv = screen.getByText("C").closest("div");
    expect(letterDiv).toHaveClass("bg-agentprism-avatar-create-agent");
  });

  it("should apply span background", () => {
    render(<Avatar category="span" alt="S" />);
    const letterDiv = screen.getByText("S").closest("div");
    expect(letterDiv).toHaveClass("bg-agentprism-avatar-span");
  });

  it("should apply event background", () => {
    render(<Avatar category="event" alt="E" />);
    const letterDiv = screen.getByText("E").closest("div");
    expect(letterDiv).toHaveClass("bg-agentprism-avatar-event");
  });

  it("should apply guardrail background", () => {
    render(<Avatar category="guardrail" alt="G" />);
    const letterDiv = screen.getByText("G").closest("div");
    expect(letterDiv).toHaveClass("bg-agentprism-avatar-guardrail");
  });

  it("should apply unknown background", () => {
    render(<Avatar category="unknown" alt="U" />);
    const letterDiv = screen.getByText("U").closest("div");
    expect(letterDiv).toHaveClass("bg-agentprism-avatar-unknown");
  });

  it("should use first letter of alt when letter prop not provided", () => {
    render(<Avatar category="llm_call" alt="Testing" />);
    expect(screen.getByText("T")).toBeInTheDocument();
  });

  it("should use first character of letter prop", () => {
    render(<Avatar category="llm_call" letter="ABC" alt="Test" />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("should apply rounded sm", () => {
    render(<Avatar category="llm_call" rounded="sm" data-testid="avatar" />);
    expect(screen.getByTestId("avatar")).toHaveClass("rounded-sm");
  });

  it("should apply rounded lg", () => {
    render(<Avatar category="llm_call" rounded="lg" data-testid="avatar" />);
    expect(screen.getByTestId("avatar")).toHaveClass("rounded-lg");
  });

  it("should have default alt value of Avatar", () => {
    render(<Avatar category="llm_call" />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });
});
