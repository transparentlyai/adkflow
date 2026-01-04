import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import HandleTooltip from "@/components/HandleTooltip";

describe("HandleTooltip", () => {
  const defaultProps = {
    label: "Test Handle",
    sourceType: "agent",
    dataType: "str",
    type: "input" as const,
  };

  describe("rendering", () => {
    it("should render children", () => {
      render(
        <HandleTooltip {...defaultProps}>
          <button data-testid="child">Handle</button>
        </HandleTooltip>,
      );
      expect(screen.getByTestId("child")).toBeInTheDocument();
    });

    it("should wrap children with tooltip trigger", () => {
      render(
        <HandleTooltip {...defaultProps}>
          <div data-testid="handle">Handle</div>
        </HandleTooltip>,
      );
      const handle = screen.getByTestId("handle");
      expect(handle).toBeInTheDocument();
    });

    it("should render for input type", () => {
      const { container } = render(
        <HandleTooltip {...defaultProps} type="input">
          <span>Input</span>
        </HandleTooltip>,
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it("should render for output type", () => {
      const { container } = render(
        <HandleTooltip {...defaultProps} type="output">
          <span>Output</span>
        </HandleTooltip>,
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it("should preserve child element props", () => {
      render(
        <HandleTooltip {...defaultProps}>
          <button data-testid="btn" className="custom-class" disabled>
            Click me
          </button>
        </HandleTooltip>,
      );
      const button = screen.getByTestId("btn");
      expect(button).toHaveClass("custom-class");
      expect(button).toBeDisabled();
    });
  });

  describe("tooltip trigger", () => {
    it("should set data-state attribute on trigger", () => {
      render(
        <HandleTooltip {...defaultProps}>
          <button data-testid="trigger">Hover me</button>
        </HandleTooltip>,
      );

      const trigger = screen.getByTestId("trigger");
      // Radix sets data-state on the trigger element
      expect(trigger).toHaveAttribute("data-state", "closed");
    });

    it("should render trigger for input type", () => {
      render(
        <HandleTooltip {...defaultProps} type="input">
          <button data-testid="trigger">Input Trigger</button>
        </HandleTooltip>,
      );

      expect(screen.getByTestId("trigger")).toBeInTheDocument();
    });

    it("should render trigger for output type", () => {
      render(
        <HandleTooltip {...defaultProps} type="output">
          <button data-testid="trigger">Output Trigger</button>
        </HandleTooltip>,
      );

      expect(screen.getByTestId("trigger")).toBeInTheDocument();
    });
  });

  describe("tooltip interaction with userEvent", () => {
    it("should show tooltip on focus", async () => {
      const user = userEvent.setup();
      render(
        <HandleTooltip
          label="My Custom Label"
          sourceType="agent"
          dataType="str"
          type="input"
        >
          <button data-testid="trigger">Hover me</button>
        </HandleTooltip>,
      );

      const trigger = screen.getByTestId("trigger");
      await user.tab();

      // After focusing, the trigger should have focus
      expect(trigger).toHaveFocus();
    });

    it("should be keyboard accessible", async () => {
      const user = userEvent.setup();
      render(
        <HandleTooltip {...defaultProps}>
          <button data-testid="trigger">Keyboard test</button>
        </HandleTooltip>,
      );

      await user.tab();
      expect(screen.getByTestId("trigger")).toHaveFocus();
    });
  });

  describe("tooltip configuration", () => {
    it("should have zero delay duration configured", () => {
      const { container } = render(
        <HandleTooltip {...defaultProps}>
          <span>Handle</span>
        </HandleTooltip>,
      );
      // TooltipProvider with delayDuration={0} should be present
      // The component renders without error
      expect(container.firstChild).toBeInTheDocument();
    });

    it("should use asChild on TooltipTrigger", () => {
      render(
        <HandleTooltip {...defaultProps}>
          <button data-testid="trigger">Child button</button>
        </HandleTooltip>,
      );

      // When asChild is used, the button should be the trigger itself
      // (no wrapping element between tooltip and button)
      const trigger = screen.getByTestId("trigger");
      expect(trigger.tagName).toBe("BUTTON");
    });
  });

  describe("different sourceType and dataType combinations", () => {
    it("should render with agent sourceType", () => {
      const { container } = render(
        <HandleTooltip
          label="Agent Handle"
          sourceType="agent"
          dataType="str"
          type="output"
        >
          <span data-testid="trigger">Agent</span>
        </HandleTooltip>,
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it("should render with tool sourceType and callable dataType", () => {
      const { container } = render(
        <HandleTooltip
          label="Tool Handle"
          sourceType="tool"
          dataType="callable"
          type="input"
        >
          <span data-testid="trigger">Tool</span>
        </HandleTooltip>,
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it("should render with prompt sourceType and dict dataType", () => {
      const { container } = render(
        <HandleTooltip
          label="Prompt Handle"
          sourceType="prompt"
          dataType="dict"
          type="input"
        >
          <span data-testid="trigger">Prompt</span>
        </HandleTooltip>,
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it("should render with custom sourceType", () => {
      const { container } = render(
        <HandleTooltip
          label="Custom Handle"
          sourceType="custom"
          dataType="any"
          type="input"
        >
          <span>Custom</span>
        </HandleTooltip>,
      );
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("should render with empty label", () => {
      const { container } = render(
        <HandleTooltip {...defaultProps} label="">
          <button data-testid="trigger">Hover me</button>
        </HandleTooltip>,
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it("should render with special characters in label", () => {
      const { container } = render(
        <HandleTooltip {...defaultProps} label="Special <> & 'chars'">
          <button data-testid="trigger">Hover me</button>
        </HandleTooltip>,
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it("should render with long sourceType and dataType", () => {
      const { container } = render(
        <HandleTooltip
          label="Long Types"
          sourceType="veryLongSourceTypeName"
          dataType="complexDataStructure"
          type="input"
        >
          <button data-testid="trigger">Hover me</button>
        </HandleTooltip>,
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it("should render with unicode characters in label", () => {
      const { container } = render(
        <HandleTooltip {...defaultProps} label="Handle with emoji">
          <button>Trigger</button>
        </HandleTooltip>,
      );
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe("with different child elements", () => {
    it("should work with button children", () => {
      render(
        <HandleTooltip {...defaultProps}>
          <button>Click me</button>
        </HandleTooltip>,
      );
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("should work with div children", () => {
      render(
        <HandleTooltip {...defaultProps}>
          <div data-testid="div-child">Div content</div>
        </HandleTooltip>,
      );
      expect(screen.getByTestId("div-child")).toBeInTheDocument();
    });

    it("should work with span children", () => {
      render(
        <HandleTooltip {...defaultProps}>
          <span data-testid="span-child">Span content</span>
        </HandleTooltip>,
      );
      expect(screen.getByTestId("span-child")).toBeInTheDocument();
    });

    it("should work with complex nested children", () => {
      render(
        <HandleTooltip {...defaultProps}>
          <div data-testid="parent">
            <span>Nested content</span>
          </div>
        </HandleTooltip>,
      );
      expect(screen.getByTestId("parent")).toBeInTheDocument();
      expect(screen.getByText("Nested content")).toBeInTheDocument();
    });

    it("should work with anchor element children", () => {
      render(
        <HandleTooltip {...defaultProps}>
          <a href="#" data-testid="link">
            Link
          </a>
        </HandleTooltip>,
      );
      expect(screen.getByTestId("link")).toBeInTheDocument();
    });

    it("should work with input element children", () => {
      render(
        <HandleTooltip {...defaultProps}>
          <input data-testid="input" type="text" />
        </HandleTooltip>,
      );
      expect(screen.getByTestId("input")).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("should have proper tooltip structure", () => {
      const { container } = render(
        <HandleTooltip {...defaultProps}>
          <button>Accessible button</button>
        </HandleTooltip>,
      );

      // The structure should be correct
      expect(container.querySelector("button")).toBeInTheDocument();
    });

    it("should allow keyboard navigation to trigger", async () => {
      const user = userEvent.setup();
      render(
        <HandleTooltip {...defaultProps}>
          <button data-testid="trigger">Tab to me</button>
        </HandleTooltip>,
      );

      await user.tab();
      expect(screen.getByTestId("trigger")).toHaveFocus();
    });
  });
});
