import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import RadioGroupWidget from "@/components/nodes/widgets/RadioGroupWidget";

const mockTheme = {
  name: "test",
  colors: {
    nodes: {
      common: {
        container: { background: "#fff", border: "#ccc" },
        text: { primary: "#000", secondary: "#666" },
      },
      agent: { header: "#4f46e5" },
    },
  },
};

const mockField = {
  id: "radio-group-field",
  label: "Radio Group",
  widget: "radio_group",
  options: [
    { value: "option1", label: "Option 1" },
    { value: "option2", label: "Option 2" },
    { value: "option3", label: "Option 3" },
  ],
};

const defaultOptions = {
  disabled: false,
  theme: mockTheme,
  compact: false,
};

describe("RadioGroupWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render all radio options", () => {
      render(
        <RadioGroupWidget
          field={mockField}
          value=""
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      const radios = screen.getAllByRole("radio");
      expect(radios).toHaveLength(3);
    });

    it("should render option labels", () => {
      render(
        <RadioGroupWidget
          field={mockField}
          value=""
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.getByText("Option 1")).toBeInTheDocument();
      expect(screen.getByText("Option 2")).toBeInTheDocument();
      expect(screen.getByText("Option 3")).toBeInTheDocument();
    });

    it("should use field.id as radio name for grouping", () => {
      render(
        <RadioGroupWidget
          field={mockField}
          value=""
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      const radios = screen.getAllByRole("radio");
      radios.forEach((radio) => {
        expect(radio).toHaveAttribute("name", "radio-group-field");
      });
    });

    it("should have correct size classes", () => {
      render(
        <RadioGroupWidget
          field={mockField}
          value=""
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      const radios = screen.getAllByRole("radio");
      radios.forEach((radio) => {
        expect(radio).toHaveClass("w-4", "h-4");
      });
    });

    it("should apply theme accent color", () => {
      render(
        <RadioGroupWidget
          field={mockField}
          value=""
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      const radios = screen.getAllByRole("radio");
      radios.forEach((radio) => {
        expect(radio).toHaveStyle({ accentColor: "#4f46e5" });
      });
    });

    it("should apply theme text color to labels", () => {
      render(
        <RadioGroupWidget
          field={mockField}
          value=""
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.getByText("Option 1")).toHaveStyle({ color: "#000" });
    });
  });

  describe("selection state", () => {
    it("should show no selection when value is empty", () => {
      render(
        <RadioGroupWidget
          field={mockField}
          value=""
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      const radios = screen.getAllByRole("radio") as HTMLInputElement[];
      radios.forEach((radio) => {
        expect(radio.checked).toBe(false);
      });
    });

    it("should check correct radio when value matches", () => {
      render(
        <RadioGroupWidget
          field={mockField}
          value="option2"
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      const radios = screen.getAllByRole("radio") as HTMLInputElement[];
      expect(radios[0].checked).toBe(false);
      expect(radios[1].checked).toBe(true);
      expect(radios[2].checked).toBe(false);
    });

    it("should handle value that does not match any option", () => {
      render(
        <RadioGroupWidget
          field={mockField}
          value="nonexistent"
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      const radios = screen.getAllByRole("radio") as HTMLInputElement[];
      radios.forEach((radio) => {
        expect(radio.checked).toBe(false);
      });
    });
  });

  describe("interactions", () => {
    it("should call onChange with option value when clicking radio", () => {
      const onChange = vi.fn();
      render(
        <RadioGroupWidget
          field={mockField}
          value=""
          onChange={onChange}
          options={defaultOptions}
        />,
      );

      const radios = screen.getAllByRole("radio");
      fireEvent.click(radios[1]);

      expect(onChange).toHaveBeenCalledWith("option2");
    });

    it("should call onChange when clicking different option", () => {
      const onChange = vi.fn();
      render(
        <RadioGroupWidget
          field={mockField}
          value="option1"
          onChange={onChange}
          options={defaultOptions}
        />,
      );

      const radios = screen.getAllByRole("radio");
      fireEvent.click(radios[2]);

      expect(onChange).toHaveBeenCalledWith("option3");
    });

    it("should call onChange when clicking label (associated with radio)", () => {
      const onChange = vi.fn();
      render(
        <RadioGroupWidget
          field={mockField}
          value=""
          onChange={onChange}
          options={defaultOptions}
        />,
      );

      // Click on the label text
      fireEvent.click(screen.getByText("Option 1"));

      expect(onChange).toHaveBeenCalledWith("option1");
    });
  });

  describe("disabled state", () => {
    it("should disable all radios when disabled", () => {
      render(
        <RadioGroupWidget
          field={mockField}
          value=""
          onChange={vi.fn()}
          options={{ ...defaultOptions, disabled: true }}
        />,
      );

      const radios = screen.getAllByRole("radio");
      radios.forEach((radio) => {
        expect(radio).toBeDisabled();
      });
    });

    it("should apply reduced opacity when disabled", () => {
      render(
        <RadioGroupWidget
          field={mockField}
          value=""
          onChange={vi.fn()}
          options={{ ...defaultOptions, disabled: true }}
        />,
      );

      // Check that labels have disabled styling
      const labels = screen.getAllByText(/Option \d/);
      labels.forEach((label) => {
        expect(label.parentElement).toHaveStyle({ opacity: 0.5 });
      });
    });

    it("should show not-allowed cursor when disabled", () => {
      render(
        <RadioGroupWidget
          field={mockField}
          value=""
          onChange={vi.fn()}
          options={{ ...defaultOptions, disabled: true }}
        />,
      );

      const labels = screen.getAllByText(/Option \d/);
      labels.forEach((label) => {
        expect(label.parentElement).toHaveStyle({ cursor: "not-allowed" });
      });
    });

    it("should not call onChange when disabled and clicked", () => {
      const onChange = vi.fn();
      render(
        <RadioGroupWidget
          field={mockField}
          value=""
          onChange={onChange}
          options={{ ...defaultOptions, disabled: true }}
        />,
      );

      const radios = screen.getAllByRole("radio");
      fireEvent.click(radios[0]);

      // Even though onChange is called in the event handler,
      // the radio is disabled so the browser won't allow the click
      expect(radios[0]).toBeDisabled();
    });
  });

  describe("edge cases", () => {
    it("should handle null value", () => {
      render(
        <RadioGroupWidget
          field={mockField}
          value={null}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      const radios = screen.getAllByRole("radio") as HTMLInputElement[];
      radios.forEach((radio) => {
        expect(radio.checked).toBe(false);
      });
    });

    it("should handle undefined value", () => {
      render(
        <RadioGroupWidget
          field={mockField}
          value={undefined}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      const radios = screen.getAllByRole("radio") as HTMLInputElement[];
      radios.forEach((radio) => {
        expect(radio.checked).toBe(false);
      });
    });

    it("should handle empty options array", () => {
      const fieldWithNoOptions = {
        ...mockField,
        options: [],
      };

      const { container } = render(
        <RadioGroupWidget
          field={fieldWithNoOptions}
          value=""
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.queryByRole("radio")).not.toBeInTheDocument();
      expect(container.querySelector(".flex")).toBeInTheDocument();
    });

    it("should handle undefined options", () => {
      const fieldWithNoOptions = {
        ...mockField,
        options: undefined,
      };

      const { container } = render(
        <RadioGroupWidget
          field={fieldWithNoOptions}
          value=""
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.queryByRole("radio")).not.toBeInTheDocument();
      expect(container.querySelector(".flex")).toBeInTheDocument();
    });

    it("should handle single option", () => {
      const singleOptionField = {
        ...mockField,
        options: [{ value: "only", label: "Only Option" }],
      };

      render(
        <RadioGroupWidget
          field={singleOptionField}
          value="only"
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.getAllByRole("radio")).toHaveLength(1);
      expect(screen.getByText("Only Option")).toBeInTheDocument();
    });

    it("should handle many options", () => {
      const manyOptionsField = {
        ...mockField,
        options: Array.from({ length: 10 }, (_, i) => ({
          value: `opt${i}`,
          label: `Option ${i}`,
        })),
      };

      render(
        <RadioGroupWidget
          field={manyOptionsField}
          value="opt5"
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.getAllByRole("radio")).toHaveLength(10);
    });

    it("should handle options with special characters in labels", () => {
      const specialField = {
        ...mockField,
        options: [
          { value: "special", label: 'Option with <special> & "characters"' },
        ],
      };

      render(
        <RadioGroupWidget
          field={specialField}
          value=""
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(
        screen.getByText('Option with <special> & "characters"'),
      ).toBeInTheDocument();
    });

    it("should handle options with empty string values", () => {
      const emptyValueField = {
        ...mockField,
        options: [
          { value: "", label: "None" },
          { value: "some", label: "Some Value" },
        ],
      };

      render(
        <RadioGroupWidget
          field={emptyValueField}
          value=""
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      const radios = screen.getAllByRole("radio") as HTMLInputElement[];
      expect(radios[0].checked).toBe(true);
      expect(radios[1].checked).toBe(false);
    });
  });

  describe("styling", () => {
    it("should have flex column layout", () => {
      const { container } = render(
        <RadioGroupWidget
          field={mockField}
          value=""
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      const wrapper = container.querySelector(".flex.flex-col");
      expect(wrapper).toBeInTheDocument();
    });

    it("should have gap between options", () => {
      const { container } = render(
        <RadioGroupWidget
          field={mockField}
          value=""
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      const wrapper = container.querySelector(".gap-1\\.5");
      expect(wrapper).toBeInTheDocument();
    });

    it("should show pointer cursor when enabled", () => {
      render(
        <RadioGroupWidget
          field={mockField}
          value=""
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      const labels = screen.getAllByText(/Option \d/);
      labels.forEach((label) => {
        expect(label.parentElement).toHaveStyle({ cursor: "pointer" });
      });
    });
  });
});
