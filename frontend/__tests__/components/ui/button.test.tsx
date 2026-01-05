import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { Button, buttonVariants } from "@/components/ui/button";

describe("Button", () => {
  describe("rendering", () => {
    it("should render button with text", () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole("button")).toHaveTextContent("Click me");
    });

    it("should render button element", () => {
      render(<Button>Test</Button>);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("should render button with submit type when specified", () => {
      render(<Button type="submit">Submit</Button>);
      expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
    });

    it("should render button with reset type when specified", () => {
      render(<Button type="reset">Reset</Button>);
      expect(screen.getByRole("button")).toHaveAttribute("type", "reset");
    });

    it("should render children elements", () => {
      render(
        <Button>
          <span data-testid="icon">Icon</span>
          Button Text
        </Button>,
      );
      expect(screen.getByTestId("icon")).toBeInTheDocument();
      expect(screen.getByText("Button Text")).toBeInTheDocument();
    });

    it("should render without children (empty button)", () => {
      render(<Button data-testid="empty-btn" />);
      expect(screen.getByTestId("empty-btn")).toBeInTheDocument();
    });
  });

  describe("event handlers", () => {
    it("should handle onClick", () => {
      const onClick = vi.fn();
      render(<Button onClick={onClick}>Click</Button>);

      fireEvent.click(screen.getByRole("button"));

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("should not trigger onClick when disabled", () => {
      const onClick = vi.fn();
      render(
        <Button onClick={onClick} disabled>
          Click
        </Button>,
      );

      fireEvent.click(screen.getByRole("button"));

      expect(onClick).not.toHaveBeenCalled();
    });

    it("should handle onFocus", () => {
      const onFocus = vi.fn();
      render(<Button onFocus={onFocus}>Focus me</Button>);

      fireEvent.focus(screen.getByRole("button"));

      expect(onFocus).toHaveBeenCalledTimes(1);
    });

    it("should handle onBlur", () => {
      const onBlur = vi.fn();
      render(<Button onBlur={onBlur}>Blur me</Button>);

      const button = screen.getByRole("button");
      fireEvent.focus(button);
      fireEvent.blur(button);

      expect(onBlur).toHaveBeenCalledTimes(1);
    });

    it("should handle onKeyDown", () => {
      const onKeyDown = vi.fn();
      render(<Button onKeyDown={onKeyDown}>Key me</Button>);

      fireEvent.keyDown(screen.getByRole("button"), { key: "Enter" });

      expect(onKeyDown).toHaveBeenCalledTimes(1);
    });

    it("should handle onMouseEnter and onMouseLeave", () => {
      const onMouseEnter = vi.fn();
      const onMouseLeave = vi.fn();
      render(
        <Button onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
          Hover me
        </Button>,
      );

      const button = screen.getByRole("button");
      fireEvent.mouseEnter(button);
      expect(onMouseEnter).toHaveBeenCalledTimes(1);

      fireEvent.mouseLeave(button);
      expect(onMouseLeave).toHaveBeenCalledTimes(1);
    });
  });

  describe("disabled state", () => {
    it("should be disabled when disabled prop is true", () => {
      render(<Button disabled>Disabled</Button>);
      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("should be enabled by default", () => {
      render(<Button>Enabled</Button>);
      expect(screen.getByRole("button")).toBeEnabled();
    });

    it("should have disabled styling when disabled", () => {
      render(<Button disabled>Disabled</Button>);
      expect(screen.getByRole("button")).toHaveClass("disabled:opacity-50");
    });
  });

  describe("variants", () => {
    it("should render default variant", () => {
      render(<Button variant="default">Default</Button>);
      expect(screen.getByRole("button")).toHaveClass("bg-primary");
    });

    it("should render destructive variant", () => {
      render(<Button variant="destructive">Destructive</Button>);
      expect(screen.getByRole("button")).toHaveClass("bg-destructive");
    });

    it("should render outline variant", () => {
      render(<Button variant="outline">Outline</Button>);
      expect(screen.getByRole("button")).toHaveClass("border");
    });

    it("should render secondary variant", () => {
      render(<Button variant="secondary">Secondary</Button>);
      expect(screen.getByRole("button")).toHaveClass("bg-secondary");
    });

    it("should render ghost variant", () => {
      render(<Button variant="ghost">Ghost</Button>);
      expect(screen.getByRole("button")).toHaveClass("hover:bg-accent");
    });

    it("should render link variant", () => {
      render(<Button variant="link">Link</Button>);
      expect(screen.getByRole("button")).toHaveClass("underline-offset-4");
    });

    it("should use default variant when variant is undefined", () => {
      render(<Button>Default Variant</Button>);
      expect(screen.getByRole("button")).toHaveClass("bg-primary");
    });
  });

  describe("sizes", () => {
    it("should render default size", () => {
      render(<Button size="default">Default</Button>);
      expect(screen.getByRole("button")).toHaveClass("h-9");
    });

    it("should render sm size", () => {
      render(<Button size="sm">Small</Button>);
      expect(screen.getByRole("button")).toHaveClass("h-8");
    });

    it("should render lg size", () => {
      render(<Button size="lg">Large</Button>);
      expect(screen.getByRole("button")).toHaveClass("h-10");
    });

    it("should render icon size", () => {
      render(<Button size="icon">Icon</Button>);
      expect(screen.getByRole("button")).toHaveClass("w-9");
    });

    it("should use default size when size is undefined", () => {
      render(<Button>Default Size</Button>);
      expect(screen.getByRole("button")).toHaveClass("h-9");
    });
  });

  describe("className handling", () => {
    it("should apply custom className", () => {
      render(<Button className="custom-class">Custom</Button>);
      expect(screen.getByRole("button")).toHaveClass("custom-class");
    });

    it("should merge custom className with variant classes", () => {
      render(
        <Button className="custom-class" variant="destructive">
          Merged
        </Button>,
      );
      const button = screen.getByRole("button");
      expect(button).toHaveClass("custom-class");
      expect(button).toHaveClass("bg-destructive");
    });

    it("should handle multiple custom classes", () => {
      render(<Button className="class-one class-two">Multiple</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("class-one");
      expect(button).toHaveClass("class-two");
    });

    it("should handle empty className", () => {
      render(<Button className="">Empty</Button>);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });
  });

  describe("asChild prop", () => {
    it("should render as child component when asChild is true", () => {
      render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>,
      );
      expect(screen.getByRole("link")).toBeInTheDocument();
      expect(screen.getByRole("link")).toHaveAttribute("href", "/test");
    });

    it("should apply button styles to child element", () => {
      render(
        <Button asChild variant="destructive">
          <a href="/test">Link Button</a>
        </Button>,
      );
      expect(screen.getByRole("link")).toHaveClass("bg-destructive");
    });

    it("should render as button when asChild is false", () => {
      render(<Button asChild={false}>Button</Button>);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });
  });

  describe("ref forwarding", () => {
    it("should forward ref to button element", () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(<Button ref={ref}>Test</Button>);
      expect(ref.current).toBe(screen.getByRole("button"));
    });

    it("should allow focus through ref", () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(<Button ref={ref}>Focus me</Button>);
      ref.current?.focus();
      expect(document.activeElement).toBe(ref.current);
    });

    it("should allow click through ref", () => {
      const onClick = vi.fn();
      const ref = React.createRef<HTMLButtonElement>();
      render(
        <Button ref={ref} onClick={onClick}>
          Click me
        </Button>,
      );
      ref.current?.click();
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("additional props", () => {
    it("should pass through additional props", () => {
      render(<Button data-testid="test-button">Test</Button>);
      expect(screen.getByTestId("test-button")).toBeInTheDocument();
    });

    it("should pass through aria attributes", () => {
      render(
        <Button aria-label="accessible button" aria-describedby="description">
          Accessible
        </Button>,
      );
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-label", "accessible button");
      expect(button).toHaveAttribute("aria-describedby", "description");
    });

    it("should pass through id attribute", () => {
      render(<Button id="my-button">ID Button</Button>);
      expect(screen.getByRole("button")).toHaveAttribute("id", "my-button");
    });

    it("should pass through name attribute", () => {
      render(<Button name="submit-btn">Named</Button>);
      expect(screen.getByRole("button")).toHaveAttribute("name", "submit-btn");
    });

    it("should pass through form attribute", () => {
      render(<Button form="my-form">Form Button</Button>);
      expect(screen.getByRole("button")).toHaveAttribute("form", "my-form");
    });

    it("should pass through tabIndex attribute", () => {
      render(<Button tabIndex={-1}>Not tabbable</Button>);
      expect(screen.getByRole("button")).toHaveAttribute("tabIndex", "-1");
    });
  });

  describe("buttonVariants helper", () => {
    it("buttonVariants should return class string", () => {
      const classes = buttonVariants({ variant: "default", size: "default" });
      expect(typeof classes).toBe("string");
      expect(classes).toContain("bg-primary");
    });

    it("buttonVariants should return default classes when no options", () => {
      const classes = buttonVariants();
      expect(classes).toContain("bg-primary");
      expect(classes).toContain("h-9");
    });

    it("buttonVariants should return correct classes for destructive variant", () => {
      const classes = buttonVariants({ variant: "destructive" });
      expect(classes).toContain("bg-destructive");
    });

    it("buttonVariants should return correct classes for sm size", () => {
      const classes = buttonVariants({ size: "sm" });
      expect(classes).toContain("h-8");
    });

    it("buttonVariants should combine variant and size classes", () => {
      const classes = buttonVariants({ variant: "outline", size: "lg" });
      expect(classes).toContain("border");
      expect(classes).toContain("h-10");
    });

    it("buttonVariants should include custom className", () => {
      const classes = buttonVariants({ className: "custom-class" });
      expect(classes).toContain("custom-class");
    });
  });

  describe("accessibility", () => {
    it("should have role button", () => {
      render(<Button>Accessible</Button>);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("should support aria-pressed for toggle buttons", () => {
      render(<Button aria-pressed="true">Toggle</Button>);
      expect(screen.getByRole("button")).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });

    it("should support aria-expanded for expandable buttons", () => {
      render(<Button aria-expanded="false">Expand</Button>);
      expect(screen.getByRole("button")).toHaveAttribute(
        "aria-expanded",
        "false",
      );
    });

    it("should support aria-haspopup", () => {
      render(<Button aria-haspopup="menu">Menu</Button>);
      expect(screen.getByRole("button")).toHaveAttribute(
        "aria-haspopup",
        "menu",
      );
    });
  });

  describe("displayName", () => {
    it("should have displayName set to Button", () => {
      expect(Button.displayName).toBe("Button");
    });
  });
});
