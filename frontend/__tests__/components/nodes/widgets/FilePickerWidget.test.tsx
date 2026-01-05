import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import FilePickerWidget from "@/components/nodes/widgets/FilePickerWidget";

// Mock the ProjectContext
vi.mock("@/contexts/ProjectContext", () => ({
  useProject: vi.fn(),
}));

import { useProject } from "@/contexts/ProjectContext";

const mockTheme = {
  name: "test",
  colors: {
    nodes: {
      common: {
        container: { background: "#fff", border: "#ccc" },
        footer: { background: "#f5f5f5" },
        text: { primary: "#000", secondary: "#666", muted: "#999" },
      },
      agent: { header: "#4f46e5" },
    },
  },
};

const mockField = {
  id: "file-picker",
  label: "File",
  widget: "filePicker",
};

const defaultOptions = {
  disabled: false,
  theme: mockTheme,
  compact: false,
};

describe("FilePickerWidget", () => {
  const mockOnRequestFilePicker = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useProject as any).mockReturnValue({
      onRequestFilePicker: mockOnRequestFilePicker,
    });
  });

  describe("rendering", () => {
    it("should render text input and browse button", () => {
      render(
        <FilePickerWidget
          field={mockField}
          value=""
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.getByRole("textbox")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /browse/i }),
      ).toBeInTheDocument();
    });

    it("should display file path value in input", () => {
      render(
        <FilePickerWidget
          field={mockField}
          value="path/to/file.py"
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.getByRole("textbox")).toHaveValue("path/to/file.py");
    });

    it("should display placeholder when no value", () => {
      const fieldWithPlaceholder = {
        ...mockField,
        placeholder: "Choose a file...",
      };

      render(
        <FilePickerWidget
          field={fieldWithPlaceholder}
          value=""
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(
        screen.getByPlaceholderText("Choose a file..."),
      ).toBeInTheDocument();
    });

    it("should use default placeholder when not specified", () => {
      render(
        <FilePickerWidget
          field={mockField}
          value=""
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(
        screen.getByPlaceholderText("Select a file..."),
      ).toBeInTheDocument();
    });

    it("should apply theme styles to input", () => {
      render(
        <FilePickerWidget
          field={mockField}
          value=""
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      const input = screen.getByRole("textbox");
      expect(input).toHaveStyle({
        backgroundColor: "#fff",
        borderColor: "#ccc",
        color: "#000",
      });
    });

    it("should apply theme styles to button", () => {
      render(
        <FilePickerWidget
          field={mockField}
          value=""
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      const button = screen.getByRole("button");
      expect(button).toHaveStyle({
        backgroundColor: "#f5f5f5",
        borderColor: "#ccc",
        color: "#000",
      });
    });
  });

  describe("interactions", () => {
    it("should call onChange when typing in input", () => {
      const onChange = vi.fn();

      render(
        <FilePickerWidget
          field={mockField}
          value=""
          onChange={onChange}
          options={defaultOptions}
        />,
      );

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "new/path.py" } });

      expect(onChange).toHaveBeenCalledWith("new/path.py");
    });

    it("should call onRequestFilePicker when clicking browse", () => {
      const onChange = vi.fn();

      render(
        <FilePickerWidget
          field={mockField}
          value="current/path.py"
          onChange={onChange}
          options={defaultOptions}
        />,
      );

      fireEvent.click(screen.getByRole("button"));

      expect(mockOnRequestFilePicker).toHaveBeenCalledWith(
        "current/path.py",
        expect.any(Function),
        {
          extensions: [".py", ".md", ".txt", ".json"],
          filterLabel: "Select a file",
        },
      );
    });

    it("should use field options for extensions if provided", () => {
      const fieldWithOptions = {
        ...mockField,
        options: [{ value: ".yaml" }, { value: ".yml" }],
      };

      render(
        <FilePickerWidget
          field={fieldWithOptions}
          value=""
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      fireEvent.click(screen.getByRole("button"));

      expect(mockOnRequestFilePicker).toHaveBeenCalledWith(
        "",
        expect.any(Function),
        expect.objectContaining({ extensions: [".yaml", ".yml"] }),
      );
    });

    it("should use field help_text for filterLabel if provided", () => {
      const fieldWithHelpText = {
        ...mockField,
        help_text: "Select a Python file",
      };

      render(
        <FilePickerWidget
          field={fieldWithHelpText}
          value=""
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      fireEvent.click(screen.getByRole("button"));

      expect(mockOnRequestFilePicker).toHaveBeenCalledWith(
        "",
        expect.any(Function),
        expect.objectContaining({ filterLabel: "Select a Python file" }),
      );
    });

    it("should call onChange when file is selected from picker", () => {
      const onChange = vi.fn();

      render(
        <FilePickerWidget
          field={mockField}
          value=""
          onChange={onChange}
          options={defaultOptions}
        />,
      );

      fireEvent.click(screen.getByRole("button"));

      // Get the callback that was passed to onRequestFilePicker
      const callback = mockOnRequestFilePicker.mock.calls[0][1];
      callback("selected/file.py");

      expect(onChange).toHaveBeenCalledWith("selected/file.py");
    });
  });

  describe("disabled state", () => {
    it("should disable input when disabled", () => {
      render(
        <FilePickerWidget
          field={mockField}
          value=""
          onChange={vi.fn()}
          options={{ ...defaultOptions, disabled: true }}
        />,
      );

      expect(screen.getByRole("textbox")).toBeDisabled();
    });

    it("should disable button when disabled", () => {
      render(
        <FilePickerWidget
          field={mockField}
          value=""
          onChange={vi.fn()}
          options={{ ...defaultOptions, disabled: true }}
        />,
      );

      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("should not call onRequestFilePicker when disabled", () => {
      render(
        <FilePickerWidget
          field={mockField}
          value=""
          onChange={vi.fn()}
          options={{ ...defaultOptions, disabled: true }}
        />,
      );

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(mockOnRequestFilePicker).not.toHaveBeenCalled();
    });
  });

  describe("without onRequestFilePicker", () => {
    it("should disable button when onRequestFilePicker is not available", () => {
      (useProject as any).mockReturnValue({
        onRequestFilePicker: null,
      });

      render(
        <FilePickerWidget
          field={mockField}
          value=""
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("should not throw when clicking browse without onRequestFilePicker", () => {
      (useProject as any).mockReturnValue({
        onRequestFilePicker: undefined,
      });

      render(
        <FilePickerWidget
          field={mockField}
          value=""
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      // Should not throw when clicking
      expect(() => {
        fireEvent.click(screen.getByRole("button"));
      }).not.toThrow();
    });
  });

  describe("edge cases", () => {
    it("should handle null value", () => {
      render(
        <FilePickerWidget
          field={mockField}
          value={null}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.getByRole("textbox")).toHaveValue("");
    });

    it("should handle undefined value", () => {
      render(
        <FilePickerWidget
          field={mockField}
          value={undefined}
          onChange={vi.fn()}
          options={defaultOptions}
        />,
      );

      expect(screen.getByRole("textbox")).toHaveValue("");
    });
  });
});
