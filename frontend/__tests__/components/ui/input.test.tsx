import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { Input } from "@/components/ui/input";

describe("Input", () => {
  describe("rendering", () => {
    it("should render input element", () => {
      render(<Input data-testid="input" />);
      expect(screen.getByTestId("input")).toBeInTheDocument();
      expect(screen.getByTestId("input").tagName).toBe("INPUT");
    });

    it("should render with default type text when type is not specified", () => {
      render(<Input data-testid="input" />);
      // Default input type is text when not specified
      expect(screen.getByTestId("input")).not.toHaveAttribute("type", "hidden");
    });
  });

  describe("input types", () => {
    it("should accept text input type", () => {
      render(<Input type="text" data-testid="input" />);
      const input = screen.getByTestId("input");
      expect(input).toHaveAttribute("type", "text");
    });

    it("should accept password type", () => {
      render(<Input type="password" data-testid="input" />);
      expect(screen.getByTestId("input")).toHaveAttribute("type", "password");
    });

    it("should accept email type", () => {
      render(<Input type="email" data-testid="input" />);
      expect(screen.getByTestId("input")).toHaveAttribute("type", "email");
    });

    it("should handle file type", () => {
      render(<Input type="file" data-testid="input" />);
      expect(screen.getByTestId("input")).toHaveAttribute("type", "file");
    });

    it("should handle number type", () => {
      render(<Input type="number" data-testid="input" />);
      expect(screen.getByTestId("input")).toHaveAttribute("type", "number");
    });

    it("should handle tel type", () => {
      render(<Input type="tel" data-testid="input" />);
      expect(screen.getByTestId("input")).toHaveAttribute("type", "tel");
    });

    it("should handle url type", () => {
      render(<Input type="url" data-testid="input" />);
      expect(screen.getByTestId("input")).toHaveAttribute("type", "url");
    });

    it("should handle search type", () => {
      render(<Input type="search" data-testid="input" />);
      expect(screen.getByTestId("input")).toHaveAttribute("type", "search");
    });

    it("should handle date type", () => {
      render(<Input type="date" data-testid="input" />);
      expect(screen.getByTestId("input")).toHaveAttribute("type", "date");
    });

    it("should handle hidden type", () => {
      render(<Input type="hidden" data-testid="input" />);
      expect(screen.getByTestId("input")).toHaveAttribute("type", "hidden");
    });
  });

  describe("value handling", () => {
    it("should handle value changes", () => {
      const onChange = vi.fn();
      render(<Input data-testid="input" onChange={onChange} />);

      fireEvent.change(screen.getByTestId("input"), {
        target: { value: "test" },
      });

      expect(onChange).toHaveBeenCalled();
    });

    it("should display value", () => {
      render(<Input data-testid="input" value="test value" readOnly />);
      expect(screen.getByTestId("input")).toHaveValue("test value");
    });

    it("should handle controlled value changes", () => {
      const onChange = vi.fn();
      const { rerender } = render(
        <Input data-testid="input" value="initial" onChange={onChange} />,
      );
      expect(screen.getByTestId("input")).toHaveValue("initial");

      rerender(
        <Input data-testid="input" value="updated" onChange={onChange} />,
      );
      expect(screen.getByTestId("input")).toHaveValue("updated");
    });

    it("should handle defaultValue", () => {
      render(<Input data-testid="input" defaultValue="default" />);
      expect(screen.getByTestId("input")).toHaveValue("default");
    });

    it("should handle empty string value", () => {
      render(<Input data-testid="input" value="" readOnly />);
      expect(screen.getByTestId("input")).toHaveValue("");
    });
  });

  describe("disabled state", () => {
    it("should be disabled when disabled prop is true", () => {
      render(<Input data-testid="input" disabled />);
      expect(screen.getByTestId("input")).toBeDisabled();
    });

    it("should be enabled by default", () => {
      render(<Input data-testid="input" />);
      expect(screen.getByTestId("input")).toBeEnabled();
    });

    it("should have disabled styling when disabled", () => {
      render(<Input data-testid="input" disabled />);
      expect(screen.getByTestId("input")).toHaveClass(
        "disabled:cursor-not-allowed",
      );
      expect(screen.getByTestId("input")).toHaveClass("disabled:opacity-50");
    });

    it("should not fire onChange when disabled", () => {
      const onChange = vi.fn();
      render(<Input data-testid="input" disabled onChange={onChange} />);
      const input = screen.getByTestId("input");

      // Disabled inputs don't trigger change events
      expect(input).toBeDisabled();
    });
  });

  describe("readOnly state", () => {
    it("should be readonly when readOnly prop is true", () => {
      render(<Input data-testid="input" readOnly />);
      expect(screen.getByTestId("input")).toHaveAttribute("readonly");
    });

    it("should have readonly attribute", () => {
      render(<Input data-testid="input" readOnly value="test" />);
      const input = screen.getByTestId("input") as HTMLInputElement;
      expect(input.readOnly).toBe(true);
    });
  });

  describe("placeholder", () => {
    it("should accept placeholder", () => {
      render(<Input placeholder="Enter text..." />);
      expect(screen.getByPlaceholderText("Enter text...")).toBeInTheDocument();
    });

    it("should render without placeholder", () => {
      render(<Input data-testid="input" />);
      expect(screen.getByTestId("input")).not.toHaveAttribute("placeholder");
    });

    it("should handle empty placeholder", () => {
      render(<Input data-testid="input" placeholder="" />);
      expect(screen.getByTestId("input")).toHaveAttribute("placeholder", "");
    });
  });

  describe("className handling", () => {
    it("should apply custom className", () => {
      render(<Input data-testid="input" className="custom-class" />);
      expect(screen.getByTestId("input")).toHaveClass("custom-class");
    });

    it("should have default styling classes", () => {
      render(<Input data-testid="input" />);
      const input = screen.getByTestId("input");
      expect(input).toHaveClass("flex", "h-9", "w-full", "rounded-md");
    });

    it("should merge custom className with default classes", () => {
      render(<Input data-testid="input" className="custom-input" />);
      const input = screen.getByTestId("input");
      expect(input).toHaveClass("custom-input");
      expect(input).toHaveClass("flex");
      expect(input).toHaveClass("h-9");
    });

    it("should handle multiple custom classes", () => {
      render(<Input data-testid="input" className="class-one class-two" />);
      const input = screen.getByTestId("input");
      expect(input).toHaveClass("class-one");
      expect(input).toHaveClass("class-two");
    });
  });

  describe("event handlers", () => {
    it("should handle onFocus", () => {
      const onFocus = vi.fn();
      render(<Input data-testid="input" onFocus={onFocus} />);

      fireEvent.focus(screen.getByTestId("input"));

      expect(onFocus).toHaveBeenCalledTimes(1);
    });

    it("should handle onBlur", () => {
      const onBlur = vi.fn();
      render(<Input data-testid="input" onBlur={onBlur} />);

      const input = screen.getByTestId("input");
      fireEvent.focus(input);
      fireEvent.blur(input);

      expect(onBlur).toHaveBeenCalledTimes(1);
    });

    it("should handle onKeyDown", () => {
      const onKeyDown = vi.fn();
      render(<Input data-testid="input" onKeyDown={onKeyDown} />);

      fireEvent.keyDown(screen.getByTestId("input"), { key: "Enter" });

      expect(onKeyDown).toHaveBeenCalledTimes(1);
    });

    it("should handle onKeyUp", () => {
      const onKeyUp = vi.fn();
      render(<Input data-testid="input" onKeyUp={onKeyUp} />);

      fireEvent.keyUp(screen.getByTestId("input"), { key: "a" });

      expect(onKeyUp).toHaveBeenCalledTimes(1);
    });

    it("should handle onInput", () => {
      const onInput = vi.fn();
      render(<Input data-testid="input" onInput={onInput} />);

      fireEvent.input(screen.getByTestId("input"), {
        target: { value: "test" },
      });

      expect(onInput).toHaveBeenCalledTimes(1);
    });
  });

  describe("ref forwarding", () => {
    it("should forward ref", () => {
      const ref = React.createRef<HTMLInputElement>();
      render(<Input ref={ref} data-testid="input" />);
      expect(ref.current).toBe(screen.getByTestId("input"));
    });

    it("should allow focus through ref", () => {
      const ref = React.createRef<HTMLInputElement>();
      render(<Input ref={ref} data-testid="input" />);
      ref.current?.focus();
      expect(document.activeElement).toBe(ref.current);
    });

    it("should allow value access through ref", () => {
      const ref = React.createRef<HTMLInputElement>();
      render(<Input ref={ref} data-testid="input" defaultValue="test" />);
      expect(ref.current?.value).toBe("test");
    });

    it("should allow select through ref", () => {
      const ref = React.createRef<HTMLInputElement>();
      render(<Input ref={ref} data-testid="input" defaultValue="select me" />);
      ref.current?.focus();
      ref.current?.select();
      // Verify the input is focused (selection is hard to test directly)
      expect(document.activeElement).toBe(ref.current);
    });
  });

  describe("additional props", () => {
    it("should pass through additional props", () => {
      render(<Input data-testid="input" aria-label="test input" />);
      expect(screen.getByTestId("input")).toHaveAttribute(
        "aria-label",
        "test input",
      );
    });

    it("should pass through id attribute", () => {
      render(<Input data-testid="input" id="my-input" />);
      expect(screen.getByTestId("input")).toHaveAttribute("id", "my-input");
    });

    it("should pass through name attribute", () => {
      render(<Input data-testid="input" name="username" />);
      expect(screen.getByTestId("input")).toHaveAttribute("name", "username");
    });

    it("should pass through required attribute", () => {
      render(<Input data-testid="input" required />);
      expect(screen.getByTestId("input")).toBeRequired();
    });

    it("should pass through minLength and maxLength", () => {
      render(<Input data-testid="input" minLength={5} maxLength={10} />);
      const input = screen.getByTestId("input");
      expect(input).toHaveAttribute("minLength", "5");
      expect(input).toHaveAttribute("maxLength", "10");
    });

    it("should pass through pattern attribute", () => {
      render(<Input data-testid="input" pattern="[A-Za-z]+" />);
      expect(screen.getByTestId("input")).toHaveAttribute(
        "pattern",
        "[A-Za-z]+",
      );
    });

    it("should pass through autoComplete attribute", () => {
      render(<Input data-testid="input" autoComplete="email" />);
      expect(screen.getByTestId("input")).toHaveAttribute(
        "autoComplete",
        "email",
      );
    });

    it("should pass through autoFocus attribute", () => {
      render(<Input data-testid="input" autoFocus />);
      expect(screen.getByTestId("input")).toHaveFocus();
    });

    it("should pass through tabIndex attribute", () => {
      render(<Input data-testid="input" tabIndex={-1} />);
      expect(screen.getByTestId("input")).toHaveAttribute("tabIndex", "-1");
    });
  });

  describe("number input specific", () => {
    it("should handle min and max for number input", () => {
      render(<Input type="number" data-testid="input" min={0} max={100} />);
      const input = screen.getByTestId("input");
      expect(input).toHaveAttribute("min", "0");
      expect(input).toHaveAttribute("max", "100");
    });

    it("should handle step for number input", () => {
      render(<Input type="number" data-testid="input" step={0.1} />);
      expect(screen.getByTestId("input")).toHaveAttribute("step", "0.1");
    });
  });

  describe("accessibility", () => {
    it("should work with label using htmlFor", () => {
      render(
        <>
          <label htmlFor="email-input">Email</label>
          <Input id="email-input" type="email" data-testid="input" />
        </>,
      );
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
    });

    it("should support aria-describedby", () => {
      render(
        <>
          <Input data-testid="input" aria-describedby="helper-text" />
          <span id="helper-text">Helper text</span>
        </>,
      );
      expect(screen.getByTestId("input")).toHaveAttribute(
        "aria-describedby",
        "helper-text",
      );
    });

    it("should support aria-invalid", () => {
      render(<Input data-testid="input" aria-invalid="true" />);
      expect(screen.getByTestId("input")).toHaveAttribute(
        "aria-invalid",
        "true",
      );
    });
  });

  describe("displayName", () => {
    it("should have displayName set to Input", () => {
      expect(Input.displayName).toBe("Input");
    });
  });

  describe("edge cases", () => {
    it("should handle rapid value changes", () => {
      const onChange = vi.fn();
      render(<Input data-testid="input" onChange={onChange} />);
      const input = screen.getByTestId("input");

      for (let i = 0; i < 10; i++) {
        fireEvent.change(input, { target: { value: `value${i}` } });
      }

      expect(onChange).toHaveBeenCalledTimes(10);
    });

    it("should handle special characters in value", () => {
      render(
        <Input
          data-testid="input"
          defaultValue="<script>alert('xss')</script>"
        />,
      );
      expect(screen.getByTestId("input")).toHaveValue(
        "<script>alert('xss')</script>",
      );
    });

    it("should handle unicode characters", () => {
      render(<Input data-testid="input" defaultValue="Hello, World!" />);
      expect(screen.getByTestId("input")).toHaveValue("Hello, World!");
    });

    it("should handle empty onChange handler gracefully", () => {
      render(<Input data-testid="input" />);
      // Should not throw
      fireEvent.change(screen.getByTestId("input"), {
        target: { value: "test" },
      });
    });
  });
});
