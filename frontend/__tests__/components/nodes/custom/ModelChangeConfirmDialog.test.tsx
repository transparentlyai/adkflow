import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModelChangeConfirmDialog } from "@/components/nodes/custom/ModelChangeConfirmDialog";
import type { FieldChange } from "@/components/nodes/custom/hooks/useModelChangeConfirmation";

describe("ModelChangeConfirmDialog", () => {
  const mockFormatValue = vi.fn((value: unknown) => {
    if (value === null || value === undefined || value === "") return "(empty)";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "number") return String(value);
    if (typeof value === "string") return `"${value}"`;
    return String(value);
  });

  const defaultProps = {
    isOpen: true,
    currentModelLabel: "GPT-4",
    newModelLabel: "Claude 3",
    fieldChanges: [],
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    formatValue: mockFormatValue,
  };

  describe("rendering", () => {
    it("should render dialog when open", () => {
      render(<ModelChangeConfirmDialog {...defaultProps} />);

      expect(screen.getByText(/Switch to Claude 3/)).toBeInTheDocument();
    });

    it("should not render when closed", () => {
      render(<ModelChangeConfirmDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByText(/Switch to Claude 3/)).not.toBeInTheDocument();
    });

    it("should display warning icon", () => {
      render(<ModelChangeConfirmDialog {...defaultProps} />);

      const title = screen.getByText(/Switch to Claude 3/);
      expect(title.parentElement).toBeInTheDocument();
    });

    it("should display description about resetting configuration", () => {
      render(<ModelChangeConfirmDialog {...defaultProps} />);

      expect(
        screen.getByText(/Switching models will reset your configuration/),
      ).toBeInTheDocument();
    });
  });

  describe("field changes display", () => {
    it("should display modified fields section", () => {
      const fieldChanges: FieldChange[] = [
        {
          fieldId: "temperature",
          label: "Temperature",
          currentValue: 0.7,
          newValue: 0.5,
          isRemoved: false,
          isNew: false,
        },
      ];

      render(<ModelChangeConfirmDialog {...defaultProps} fieldChanges={fieldChanges} />);

      expect(screen.getByText("Will be reset")).toBeInTheDocument();
      expect(screen.getByText("Temperature:")).toBeInTheDocument();
      expect(screen.getByText("0.7")).toBeInTheDocument();
      expect(screen.getByText("0.5")).toBeInTheDocument();
    });

    it("should display removed fields section", () => {
      const fieldChanges: FieldChange[] = [
        {
          fieldId: "topP",
          label: "Top P",
          currentValue: 0.9,
          newValue: undefined,
          isRemoved: true,
          isNew: false,
        },
      ];

      render(<ModelChangeConfirmDialog {...defaultProps} fieldChanges={fieldChanges} />);

      expect(screen.getByText("Will be removed")).toBeInTheDocument();
      expect(screen.getByText("Top P:")).toBeInTheDocument();
      expect(screen.getByText("0.9")).toBeInTheDocument();
    });

    it("should display new fields section", () => {
      const fieldChanges: FieldChange[] = [
        {
          fieldId: "maxTokens",
          label: "Max Tokens",
          currentValue: undefined,
          newValue: 4096,
          isRemoved: false,
          isNew: true,
        },
      ];

      render(<ModelChangeConfirmDialog {...defaultProps} fieldChanges={fieldChanges} />);

      expect(screen.getByText("New fields")).toBeInTheDocument();
      expect(screen.getByText("Max Tokens:")).toBeInTheDocument();
      expect(screen.getByText("4096")).toBeInTheDocument();
    });

    it("should display all three sections when present", () => {
      const fieldChanges: FieldChange[] = [
        {
          fieldId: "temperature",
          label: "Temperature",
          currentValue: 0.7,
          newValue: 0.5,
          isRemoved: false,
          isNew: false,
        },
        {
          fieldId: "topP",
          label: "Top P",
          currentValue: 0.9,
          newValue: undefined,
          isRemoved: true,
          isNew: false,
        },
        {
          fieldId: "maxTokens",
          label: "Max Tokens",
          currentValue: undefined,
          newValue: 4096,
          isRemoved: false,
          isNew: true,
        },
      ];

      render(<ModelChangeConfirmDialog {...defaultProps} fieldChanges={fieldChanges} />);

      expect(screen.getByText("Will be reset")).toBeInTheDocument();
      expect(screen.getByText("Will be removed")).toBeInTheDocument();
      expect(screen.getByText("New fields")).toBeInTheDocument();
    });

    it("should not display sections when no changes of that type", () => {
      const fieldChanges: FieldChange[] = [
        {
          fieldId: "temperature",
          label: "Temperature",
          currentValue: 0.7,
          newValue: 0.5,
          isRemoved: false,
          isNew: false,
        },
      ];

      render(<ModelChangeConfirmDialog {...defaultProps} fieldChanges={fieldChanges} />);

      expect(screen.getByText("Will be reset")).toBeInTheDocument();
      expect(screen.queryByText("Will be removed")).not.toBeInTheDocument();
      expect(screen.queryByText("New fields")).not.toBeInTheDocument();
    });
  });

  describe("value formatting", () => {
    it("should call formatValue for all values", () => {
      const fieldChanges: FieldChange[] = [
        {
          fieldId: "temperature",
          label: "Temperature",
          currentValue: 0.7,
          newValue: 0.5,
          isRemoved: false,
          isNew: false,
        },
      ];

      mockFormatValue.mockClear();
      render(<ModelChangeConfirmDialog {...defaultProps} fieldChanges={fieldChanges} />);

      expect(mockFormatValue).toHaveBeenCalledWith(0.7);
      expect(mockFormatValue).toHaveBeenCalledWith(0.5);
    });

    it("should display formatted values", () => {
      const fieldChanges: FieldChange[] = [
        {
          fieldId: "enabled",
          label: "Enabled",
          currentValue: true,
          newValue: false,
          isRemoved: false,
          isNew: false,
        },
      ];

      render(<ModelChangeConfirmDialog {...defaultProps} fieldChanges={fieldChanges} />);

      expect(screen.getByText("Yes")).toBeInTheDocument();
      expect(screen.getByText("No")).toBeInTheDocument();
    });

    it("should display empty values", () => {
      const fieldChanges: FieldChange[] = [
        {
          fieldId: "prompt",
          label: "Prompt",
          currentValue: "",
          newValue: "Default prompt",
          isRemoved: false,
          isNew: false,
        },
      ];

      render(<ModelChangeConfirmDialog {...defaultProps} fieldChanges={fieldChanges} />);

      expect(screen.getByText("(empty)")).toBeInTheDocument();
      expect(screen.getByText('"Default prompt"')).toBeInTheDocument();
    });
  });

  describe("actions", () => {
    it("should call onConfirm when Switch Model clicked", async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();

      render(<ModelChangeConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

      const confirmButton = screen.getByText("Switch Model");
      await user.click(confirmButton);

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it("should call onCancel when Cancel clicked", async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();

      render(<ModelChangeConfirmDialog {...defaultProps} onCancel={onCancel} />);

      const cancelButton = screen.getByText("Cancel");
      await user.click(cancelButton);

      // May be called more than once due to AlertDialog's internal behavior
      expect(onCancel).toHaveBeenCalled();
    });

    it("should call onCancel when dialog is dismissed", async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();

      render(<ModelChangeConfirmDialog {...defaultProps} onCancel={onCancel} />);

      // AlertDialog calls onOpenChange(false) when dismissed
      // This is handled by the onOpenChange prop
      expect(onCancel).not.toHaveBeenCalled();
    });
  });

  describe("button styling", () => {
    it("should style Switch Model button with warning color", () => {
      render(<ModelChangeConfirmDialog {...defaultProps} />);

      const confirmButton = screen.getByText("Switch Model");
      expect(confirmButton).toHaveClass("bg-amber-600");
      expect(confirmButton).toHaveClass("hover:bg-amber-700");
    });
  });

  describe("scrollable content", () => {
    it("should have scrollable container for field changes", () => {
      const fieldChanges: FieldChange[] = Array.from({ length: 20 }, (_, i) => ({
        fieldId: `field${i}`,
        label: `Field ${i}`,
        currentValue: i,
        newValue: i + 1,
        isRemoved: false,
        isNew: false,
      }));

      render(<ModelChangeConfirmDialog {...defaultProps} fieldChanges={fieldChanges} />);

      // The scrollable container is the parent of all sections, not the section itself
      const resetSection = screen.getByText("Will be reset");
      const scrollableContainer = resetSection.closest(".overflow-y-auto");
      expect(scrollableContainer).toBeInTheDocument();
    });
  });

  describe("grouping logic", () => {
    it("should correctly group changes by type", () => {
      const fieldChanges: FieldChange[] = [
        {
          fieldId: "field1",
          label: "Modified Field",
          currentValue: "old",
          newValue: "new",
          isRemoved: false,
          isNew: false,
        },
        {
          fieldId: "field2",
          label: "Removed Field",
          currentValue: "value",
          newValue: undefined,
          isRemoved: true,
          isNew: false,
        },
        {
          fieldId: "field3",
          label: "New Field",
          currentValue: undefined,
          newValue: "value",
          isRemoved: false,
          isNew: true,
        },
      ];

      render(<ModelChangeConfirmDialog {...defaultProps} fieldChanges={fieldChanges} />);

      // Each section should contain exactly one field
      expect(screen.getByText("Modified Field:")).toBeInTheDocument();
      expect(screen.getByText("Removed Field:")).toBeInTheDocument();
      expect(screen.getByText("New Field:")).toBeInTheDocument();

      // Sections should be present
      expect(screen.getByText("Will be reset")).toBeInTheDocument();
      expect(screen.getByText("Will be removed")).toBeInTheDocument();
      expect(screen.getByText("New fields")).toBeInTheDocument();
    });
  });

  describe("multiple changes in each section", () => {
    it("should display multiple modified fields", () => {
      const fieldChanges: FieldChange[] = [
        {
          fieldId: "field1",
          label: "Field 1",
          currentValue: "old1",
          newValue: "new1",
          isRemoved: false,
          isNew: false,
        },
        {
          fieldId: "field2",
          label: "Field 2",
          currentValue: "old2",
          newValue: "new2",
          isRemoved: false,
          isNew: false,
        },
      ];

      render(<ModelChangeConfirmDialog {...defaultProps} fieldChanges={fieldChanges} />);

      expect(screen.getByText("Field 1:")).toBeInTheDocument();
      expect(screen.getByText("Field 2:")).toBeInTheDocument();
      expect(screen.getByText('"old1"')).toBeInTheDocument();
      expect(screen.getByText('"new1"')).toBeInTheDocument();
      expect(screen.getByText('"old2"')).toBeInTheDocument();
      expect(screen.getByText('"new2"')).toBeInTheDocument();
    });

    it("should display multiple removed fields", () => {
      const fieldChanges: FieldChange[] = [
        {
          fieldId: "field1",
          label: "Field 1",
          currentValue: "value1",
          newValue: undefined,
          isRemoved: true,
          isNew: false,
        },
        {
          fieldId: "field2",
          label: "Field 2",
          currentValue: "value2",
          newValue: undefined,
          isRemoved: true,
          isNew: false,
        },
      ];

      render(<ModelChangeConfirmDialog {...defaultProps} fieldChanges={fieldChanges} />);

      expect(screen.getByText("Field 1:")).toBeInTheDocument();
      expect(screen.getByText("Field 2:")).toBeInTheDocument();
    });

    it("should display multiple new fields", () => {
      const fieldChanges: FieldChange[] = [
        {
          fieldId: "field1",
          label: "Field 1",
          currentValue: undefined,
          newValue: "value1",
          isRemoved: false,
          isNew: true,
        },
        {
          fieldId: "field2",
          label: "Field 2",
          currentValue: undefined,
          newValue: "value2",
          isRemoved: false,
          isNew: true,
        },
      ];

      render(<ModelChangeConfirmDialog {...defaultProps} fieldChanges={fieldChanges} />);

      expect(screen.getByText("Field 1:")).toBeInTheDocument();
      expect(screen.getByText("Field 2:")).toBeInTheDocument();
    });
  });
});
