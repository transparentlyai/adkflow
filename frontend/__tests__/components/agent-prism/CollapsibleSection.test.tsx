import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { CollapsibleSection } from "@/components/agent-prism/CollapsibleSection";

describe("CollapsibleSection", () => {
  it("should render title", () => {
    render(
      <CollapsibleSection title="Test Section">Content</CollapsibleSection>,
    );
    expect(screen.getByText("Test Section")).toBeInTheDocument();
  });

  it("should render rightContent when provided", () => {
    render(
      <CollapsibleSection
        title="Section"
        rightContent={<span data-testid="right">Right</span>}
      >
        Content
      </CollapsibleSection>,
    );
    expect(screen.getByTestId("right")).toBeInTheDocument();
  });

  it("should start collapsed by default", () => {
    render(
      <CollapsibleSection title="Section">
        <div data-testid="content">Content</div>
      </CollapsibleSection>,
    );
    const trigger = screen.getByRole("button");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("should start open when defaultOpen is true", () => {
    render(
      <CollapsibleSection title="Section" defaultOpen>
        <div data-testid="content">Content</div>
      </CollapsibleSection>,
    );
    const trigger = screen.getByRole("button");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("should toggle on click", () => {
    render(
      <CollapsibleSection title="Section">
        <div data-testid="content">Content</div>
      </CollapsibleSection>,
    );
    const trigger = screen.getByRole("button");

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("should toggle on Enter key", () => {
    render(<CollapsibleSection title="Section">Content</CollapsibleSection>);
    const trigger = screen.getByRole("button");

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.keyDown(trigger, { key: "Enter" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("should toggle on Space key", () => {
    render(<CollapsibleSection title="Section">Content</CollapsibleSection>);
    const trigger = screen.getByRole("button");

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.keyDown(trigger, { key: " " });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("should call onOpenChange when toggled", () => {
    const onOpenChange = vi.fn();
    render(
      <CollapsibleSection title="Section" onOpenChange={onOpenChange}>
        Content
      </CollapsibleSection>,
    );

    fireEvent.click(screen.getByRole("button"));

    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("should apply custom className", () => {
    const { container } = render(
      <CollapsibleSection title="Section" className="custom-root">
        Content
      </CollapsibleSection>,
    );
    expect(container.firstChild).toHaveClass("custom-root");
  });

  it("should apply triggerClassName", () => {
    render(
      <CollapsibleSection title="Section" triggerClassName="custom-trigger">
        Content
      </CollapsibleSection>,
    );
    expect(screen.getByRole("button")).toHaveClass("custom-trigger");
  });

  it("should have correct aria-label based on state", () => {
    render(<CollapsibleSection title="My Section">Content</CollapsibleSection>);
    const trigger = screen.getByRole("button");

    expect(trigger).toHaveAttribute(
      "aria-label",
      'Expand content of "My Section" section',
    );

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute(
      "aria-label",
      'Collapse content of "My Section" section',
    );
  });
});
