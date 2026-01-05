import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { Label } from "@/components/ui/label";

describe("Label", () => {
  describe("rendering", () => {
    it("should render label with text", () => {
      render(<Label>Username</Label>);
      expect(screen.getByText("Username")).toBeInTheDocument();
    });

    it("should render as a label element", () => {
      render(<Label data-testid="label">Test</Label>);
      expect(screen.getByTestId("label").tagName).toBe("LABEL");
    });

    it("should render children elements", () => {
      render(
        <Label>
          <span data-testid="child">Required</span> Field
        </Label>,
      );
      expect(screen.getByTestId("child")).toBeInTheDocument();
      expect(screen.getByText("Field")).toBeInTheDocument();
    });

    it("should render without children", () => {
      render(<Label data-testid="empty-label" />);
      expect(screen.getByTestId("empty-label")).toBeInTheDocument();
    });

    it("should render with complex children", () => {
      render(
        <Label data-testid="label">
          <span>Icon</span>
          <span>Label Text</span>
          <span>*</span>
        </Label>,
      );
      expect(screen.getByText("Icon")).toBeInTheDocument();
      expect(screen.getByText("Label Text")).toBeInTheDocument();
      expect(screen.getByText("*")).toBeInTheDocument();
    });
  });

  describe("association with inputs", () => {
    it("should associate with input via htmlFor", () => {
      render(
        <>
          <Label htmlFor="email">Email</Label>
          <input id="email" type="email" />
        </>,
      );
      const label = screen.getByText("Email");
      expect(label).toHaveAttribute("for", "email");
    });

    it("should have htmlFor attribute pointing to input id", () => {
      render(
        <>
          <Label htmlFor="username">Username</Label>
          <input id="username" data-testid="input" />
        </>,
      );

      const label = screen.getByText("Username");
      expect(label).toHaveAttribute("for", "username");
    });

    it("should work with nested input", () => {
      render(
        <Label data-testid="label">
          Email
          <input type="email" data-testid="input" />
        </Label>,
      );

      expect(screen.getByTestId("input")).toBeInTheDocument();
      expect(screen.getByTestId("label")).toContainElement(
        screen.getByTestId("input"),
      );
    });
  });

  describe("styling", () => {
    it("should have default styling classes", () => {
      render(<Label data-testid="label">Label</Label>);
      const label = screen.getByTestId("label");
      expect(label).toHaveClass("text-sm", "font-medium");
    });

    it("should have peer-disabled styles", () => {
      render(<Label data-testid="label">Label</Label>);
      const label = screen.getByTestId("label");
      expect(label).toHaveClass("peer-disabled:cursor-not-allowed");
      expect(label).toHaveClass("peer-disabled:opacity-70");
    });

    it("should apply custom className", () => {
      render(
        <Label data-testid="label" className="custom-label">
          Label
        </Label>,
      );
      expect(screen.getByTestId("label")).toHaveClass("custom-label");
    });

    it("should merge custom className with default classes", () => {
      render(
        <Label data-testid="label" className="custom-class">
          Label
        </Label>,
      );
      const label = screen.getByTestId("label");
      expect(label).toHaveClass("custom-class");
      expect(label).toHaveClass("text-sm");
      expect(label).toHaveClass("font-medium");
    });

    it("should handle multiple custom classes", () => {
      render(
        <Label data-testid="label" className="class-one class-two">
          Label
        </Label>,
      );
      const label = screen.getByTestId("label");
      expect(label).toHaveClass("class-one");
      expect(label).toHaveClass("class-two");
    });

    it("should handle empty className", () => {
      render(
        <Label data-testid="label" className="">
          Label
        </Label>,
      );
      expect(screen.getByTestId("label")).toBeInTheDocument();
    });
  });

  describe("ref forwarding", () => {
    it("should forward ref", () => {
      const ref = React.createRef<HTMLLabelElement>();
      render(<Label ref={ref}>Label</Label>);
      expect(ref.current).toBeInstanceOf(HTMLLabelElement);
    });

    it("should allow DOM operations through ref", () => {
      const ref = React.createRef<HTMLLabelElement>();
      render(<Label ref={ref}>Label</Label>);
      expect(ref.current?.textContent).toBe("Label");
    });

    it("should allow focus through ref", () => {
      const ref = React.createRef<HTMLLabelElement>();
      render(<Label ref={ref}>Focus me</Label>);
      ref.current?.focus();
      // Labels are not typically focusable, so this just verifies no error
      expect(ref.current).toBeTruthy();
    });
  });

  describe("additional props", () => {
    it("should pass through additional props", () => {
      render(
        <Label data-testid="label" id="test-label">
          Label
        </Label>,
      );
      expect(screen.getByTestId("label")).toHaveAttribute("id", "test-label");
    });

    it("should pass through aria attributes", () => {
      render(
        <Label data-testid="label" aria-describedby="description">
          Label
        </Label>,
      );
      expect(screen.getByTestId("label")).toHaveAttribute(
        "aria-describedby",
        "description",
      );
    });

    it("should pass through title attribute", () => {
      render(
        <Label data-testid="label" title="Helpful tooltip">
          Label
        </Label>,
      );
      expect(screen.getByTestId("label")).toHaveAttribute(
        "title",
        "Helpful tooltip",
      );
    });

    it("should pass through style attribute", () => {
      render(
        <Label data-testid="label" style={{ fontWeight: "bold" }}>
          Label
        </Label>,
      );
      expect(screen.getByTestId("label")).toHaveStyle({ fontWeight: "bold" });
    });
  });

  describe("event handlers", () => {
    it("should handle onClick", () => {
      const onClick = vi.fn();
      render(<Label onClick={onClick}>Click me</Label>);

      fireEvent.click(screen.getByText("Click me"));

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("should handle onMouseEnter and onMouseLeave", () => {
      const onMouseEnter = vi.fn();
      const onMouseLeave = vi.fn();
      render(
        <Label
          data-testid="label"
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          Hover me
        </Label>,
      );

      const label = screen.getByTestId("label");
      fireEvent.mouseEnter(label);
      expect(onMouseEnter).toHaveBeenCalledTimes(1);

      fireEvent.mouseLeave(label);
      expect(onMouseLeave).toHaveBeenCalledTimes(1);
    });
  });

  describe("accessibility", () => {
    it("should be accessible via getByLabelText when associated with input", () => {
      render(
        <>
          <Label htmlFor="password">Password</Label>
          <input id="password" type="password" />
        </>,
      );
      expect(screen.getByLabelText("Password")).toBeInTheDocument();
    });

    it("should work with form controls", () => {
      render(
        <>
          <Label htmlFor="checkbox">Accept terms</Label>
          <input id="checkbox" type="checkbox" />
        </>,
      );
      expect(screen.getByLabelText("Accept terms")).toBeInTheDocument();
    });

    it("should work with select elements", () => {
      render(
        <>
          <Label htmlFor="country">Country</Label>
          <select id="country">
            <option value="us">United States</option>
          </select>
        </>,
      );
      expect(screen.getByLabelText("Country")).toBeInTheDocument();
    });

    it("should work with textarea", () => {
      render(
        <>
          <Label htmlFor="bio">Biography</Label>
          <textarea id="bio" />
        </>,
      );
      expect(screen.getByLabelText("Biography")).toBeInTheDocument();
    });
  });

  describe("peer state interaction", () => {
    it("should render with disabled peer styling available", () => {
      render(
        <div>
          <input id="test" className="peer" disabled />
          <Label htmlFor="test" data-testid="label">
            Disabled Input Label
          </Label>
        </div>,
      );
      // The label has the peer-disabled classes available
      expect(screen.getByTestId("label")).toHaveClass(
        "peer-disabled:opacity-70",
      );
    });
  });

  describe("displayName", () => {
    it("should have correct displayName", () => {
      // Label uses LabelPrimitive.Root.displayName
      expect(Label.displayName).toBe("Label");
    });
  });

  describe("edge cases", () => {
    it("should handle empty htmlFor", () => {
      render(
        <Label data-testid="label" htmlFor="">
          Empty For
        </Label>,
      );
      expect(screen.getByTestId("label")).toHaveAttribute("for", "");
    });

    it("should handle htmlFor with non-existent element", () => {
      render(
        <Label data-testid="label" htmlFor="non-existent">
          No Target
        </Label>,
      );
      expect(screen.getByTestId("label")).toHaveAttribute(
        "for",
        "non-existent",
      );
    });

    it("should handle special characters in text", () => {
      render(<Label>Email &amp; Password *</Label>);
      expect(screen.getByText("Email & Password *")).toBeInTheDocument();
    });

    it("should handle whitespace content", () => {
      render(<Label data-testid="label"> </Label>);
      expect(screen.getByTestId("label")).toBeInTheDocument();
    });

    it("should handle numeric content", () => {
      render(<Label>{123}</Label>);
      expect(screen.getByText("123")).toBeInTheDocument();
    });
  });

  describe("form integration", () => {
    it("should work within a form", () => {
      render(
        <form>
          <Label htmlFor="name">Name</Label>
          <input id="name" name="name" />
        </form>,
      );
      expect(screen.getByLabelText("Name")).toBeInTheDocument();
    });

    it("should work with required indicator", () => {
      render(
        <>
          <Label htmlFor="required-field">
            Required Field <span aria-hidden="true">*</span>
          </Label>
          <input id="required-field" required />
        </>,
      );
      expect(screen.getByLabelText(/Required Field/)).toBeRequired();
    });
  });
});
