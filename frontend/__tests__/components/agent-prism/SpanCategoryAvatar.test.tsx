import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { SpanCategoryAvatar } from "@/components/agent-prism/SpanCategoryAvatar";

describe("SpanCategoryAvatar", () => {
  it("should render with default size 4", () => {
    const { container } = render(<SpanCategoryAvatar category="llm_call" />);
    const avatar = container.firstChild as HTMLElement;
    expect(avatar).toHaveClass("size-4");
  });

  it("should render with size 3", () => {
    const { container } = render(
      <SpanCategoryAvatar category="llm_call" size="3" />,
    );
    const avatar = container.firstChild as HTMLElement;
    expect(avatar).toHaveClass("size-3");
  });

  it("should render with size 5", () => {
    const { container } = render(
      <SpanCategoryAvatar category="llm_call" size="5" />,
    );
    const avatar = container.firstChild as HTMLElement;
    expect(avatar).toHaveClass("size-5");
  });

  it("should apply llm_call background", () => {
    const { container } = render(<SpanCategoryAvatar category="llm_call" />);
    const avatar = container.firstChild as HTMLElement;
    expect(avatar).toHaveClass("bg-agentprism-avatar-llm");
  });

  it("should apply tool_execution background", () => {
    const { container } = render(
      <SpanCategoryAvatar category="tool_execution" />,
    );
    const avatar = container.firstChild as HTMLElement;
    expect(avatar).toHaveClass("bg-agentprism-avatar-tool");
  });

  it("should apply agent_invocation background", () => {
    const { container } = render(
      <SpanCategoryAvatar category="agent_invocation" />,
    );
    const avatar = container.firstChild as HTMLElement;
    expect(avatar).toHaveClass("bg-agentprism-avatar-agent");
  });

  it("should apply chain_operation background", () => {
    const { container } = render(
      <SpanCategoryAvatar category="chain_operation" />,
    );
    const avatar = container.firstChild as HTMLElement;
    expect(avatar).toHaveClass("bg-agentprism-avatar-chain");
  });

  it("should apply retrieval background", () => {
    const { container } = render(<SpanCategoryAvatar category="retrieval" />);
    const avatar = container.firstChild as HTMLElement;
    expect(avatar).toHaveClass("bg-agentprism-avatar-retrieval");
  });

  it("should apply embedding background", () => {
    const { container } = render(<SpanCategoryAvatar category="embedding" />);
    const avatar = container.firstChild as HTMLElement;
    expect(avatar).toHaveClass("bg-agentprism-avatar-embedding");
  });

  it("should apply create_agent background", () => {
    const { container } = render(
      <SpanCategoryAvatar category="create_agent" />,
    );
    const avatar = container.firstChild as HTMLElement;
    expect(avatar).toHaveClass("bg-agentprism-avatar-create-agent");
  });

  it("should apply span background", () => {
    const { container } = render(<SpanCategoryAvatar category="span" />);
    const avatar = container.firstChild as HTMLElement;
    expect(avatar).toHaveClass("bg-agentprism-avatar-span");
  });

  it("should apply event background", () => {
    const { container } = render(<SpanCategoryAvatar category="event" />);
    const avatar = container.firstChild as HTMLElement;
    expect(avatar).toHaveClass("bg-agentprism-avatar-event");
  });

  it("should apply guardrail background", () => {
    const { container } = render(<SpanCategoryAvatar category="guardrail" />);
    const avatar = container.firstChild as HTMLElement;
    expect(avatar).toHaveClass("bg-agentprism-avatar-guardrail");
  });

  it("should apply unknown background", () => {
    const { container } = render(<SpanCategoryAvatar category="unknown" />);
    const avatar = container.firstChild as HTMLElement;
    expect(avatar).toHaveClass("bg-agentprism-avatar-unknown");
  });

  it("should have rounded-full class", () => {
    const { container } = render(<SpanCategoryAvatar category="llm_call" />);
    const avatar = container.firstChild as HTMLElement;
    expect(avatar).toHaveClass("rounded-full");
  });

  it("should apply custom className", () => {
    const { container } = render(
      <SpanCategoryAvatar category="llm_call" className="custom-class" />,
    );
    const avatar = container.firstChild as HTMLElement;
    expect(avatar).toHaveClass("custom-class");
  });

  it("should render icon inside avatar", () => {
    const { container } = render(<SpanCategoryAvatar category="llm_call" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass("text-white");
  });
});
