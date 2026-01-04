import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

describe("RadioGroup components", () => {
  describe("RadioGroup (Root)", () => {
    it("should render radio group", () => {
      render(
        <RadioGroup defaultValue="option1">
          <RadioGroupItem value="option1" />
          <RadioGroupItem value="option2" />
        </RadioGroup>,
      );
      expect(screen.getByRole("radiogroup")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      render(
        <RadioGroup className="custom-group">
          <RadioGroupItem value="option1" />
        </RadioGroup>,
      );
      expect(screen.getByRole("radiogroup")).toHaveClass("custom-group");
    });

    it("should forward ref", () => {
      const ref = React.createRef<HTMLDivElement>();
      render(
        <RadioGroup ref={ref}>
          <RadioGroupItem value="option1" />
        </RadioGroup>,
      );
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe("RadioGroupItem", () => {
    it("should render radio button", () => {
      render(
        <RadioGroup defaultValue="option1">
          <RadioGroupItem value="option1" />
        </RadioGroup>,
      );
      expect(screen.getByRole("radio")).toBeInTheDocument();
    });

    it("should show checked state for selected value", () => {
      render(
        <RadioGroup defaultValue="option1">
          <RadioGroupItem value="option1" />
          <RadioGroupItem value="option2" />
        </RadioGroup>,
      );
      const radios = screen.getAllByRole("radio");
      expect(radios[0]).toHaveAttribute("data-state", "checked");
      expect(radios[1]).toHaveAttribute("data-state", "unchecked");
    });

    it("should apply custom className", () => {
      render(
        <RadioGroup>
          <RadioGroupItem value="option1" className="custom-radio" />
        </RadioGroup>,
      );
      expect(screen.getByRole("radio")).toHaveClass("custom-radio");
    });

    it("should forward ref", () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(
        <RadioGroup>
          <RadioGroupItem ref={ref} value="option1" />
        </RadioGroup>,
      );
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });

    it("should be disabled when disabled prop is true", () => {
      render(
        <RadioGroup>
          <RadioGroupItem value="option1" disabled />
        </RadioGroup>,
      );
      expect(screen.getByRole("radio")).toBeDisabled();
    });
  });

  describe("RadioGroup selection", () => {
    it("should call onValueChange when selection changes", () => {
      const onChange = vi.fn();
      render(
        <RadioGroup onValueChange={onChange}>
          <RadioGroupItem value="option1" />
          <RadioGroupItem value="option2" />
        </RadioGroup>,
      );

      fireEvent.click(screen.getAllByRole("radio")[1]);
      expect(onChange).toHaveBeenCalledWith("option2");
    });

    it("should render multiple radio items", () => {
      render(
        <RadioGroup>
          <RadioGroupItem value="a" />
          <RadioGroupItem value="b" />
          <RadioGroupItem value="c" />
        </RadioGroup>,
      );
      expect(screen.getAllByRole("radio")).toHaveLength(3);
    });
  });
});
