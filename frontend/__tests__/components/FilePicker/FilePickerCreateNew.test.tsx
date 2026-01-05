import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FilePickerCreateNew } from "@/components/FilePicker/FilePickerCreateNew";
import type { Theme } from "@/lib/themes/types";

// Mock theme
const mockTheme: Theme = {
  name: "test-theme",
  id: "test",
  colors: {
    nodes: {
      common: {
        footer: { background: "#fff" },
        container: { background: "#fff", border: "#ccc" },
        text: { secondary: "#666", muted: "#999", primary: "#000" },
        header: { background: "#fff", border: "#ccc" },
        selection: { background: "#fff", border: "#ccc" },
        handle: { background: "#fff", border: "#ccc" },
        expandedHeader: { background: "#fff", border: "#ccc" },
      },
      agent: { primary: "#000", secondary: "#000" },
      tool: { primary: "#000", secondary: "#000" },
      prompt: { primary: "#000", secondary: "#000" },
      model: { primary: "#000", secondary: "#000" },
      start: { primary: "#000", secondary: "#000" },
      end: { primary: "#000", secondary: "#000" },
      group: { primary: "#000", secondary: "#000" },
      label: { primary: "#000", secondary: "#000" },
      loop: { primary: "#000", secondary: "#000" },
      sequential: { primary: "#000", secondary: "#000" },
      parallel: { primary: "#000", secondary: "#000" },
      executor: { primary: "#000", secondary: "#000" },
      extension: { primary: "#000", secondary: "#000" },
      callback: { primary: "#000", secondary: "#000" },
    },
    ui: {
      border: "#ccc",
      muted: "#999",
      background: "#fff",
      foreground: "#000",
      card: { background: "#fff", foreground: "#000" },
      popover: { background: "#fff", foreground: "#000" },
      primary: { DEFAULT: "#000", foreground: "#fff" },
      secondary: { DEFAULT: "#000", foreground: "#fff" },
      muted: "#999",
      accent: { DEFAULT: "#000", foreground: "#fff" },
      destructive: { DEFAULT: "#000", foreground: "#fff" },
    },
    canvas: {
      background: "#fff",
      dots: "#ccc",
      selection: "#000",
    },
    syntax: {
      keyword: "#000",
      string: "#000",
      comment: "#000",
      function: "#000",
      variable: "#000",
      number: "#000",
      operator: "#000",
      type: "#000",
      property: "#000",
    },
  },
} as Theme;

describe("FilePickerCreateNew", () => {
  const defaultProps = {
    theme: mockTheme,
    currentPath: "/home/user/projects",
    newFileName: "",
    projectPath: "/home/user",
    onNewFileNameChange: vi.fn(),
    onSubmit: vi.fn(),
    getRelativePath: (path: string) => path.replace("/home/user", ""),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render the New file label", () => {
      render(<FilePickerCreateNew {...defaultProps} />);
      expect(screen.getByText("New file:")).toBeInTheDocument();
    });

    it("should render the filename input", () => {
      render(<FilePickerCreateNew {...defaultProps} />);
      expect(
        screen.getByPlaceholderText("Enter filename..."),
      ).toBeInTheDocument();
    });

    it("should display the current filename", () => {
      render(<FilePickerCreateNew {...defaultProps} newFileName="test.txt" />);
      expect(screen.getByDisplayValue("test.txt")).toBeInTheDocument();
    });

    it("should not show path preview when filename is empty", () => {
      render(<FilePickerCreateNew {...defaultProps} />);
      expect(screen.queryByText(/projects\//)).not.toBeInTheDocument();
    });

    it("should show path preview when filename has value", () => {
      render(<FilePickerCreateNew {...defaultProps} newFileName="test.txt" />);
      expect(screen.getByText("/projects/test.txt")).toBeInTheDocument();
    });
  });

  describe("input interaction", () => {
    it("should call onNewFileNameChange when typing", () => {
      const onNewFileNameChange = vi.fn();
      render(
        <FilePickerCreateNew
          {...defaultProps}
          onNewFileNameChange={onNewFileNameChange}
        />,
      );

      fireEvent.change(screen.getByPlaceholderText("Enter filename..."), {
        target: { value: "newfile.md" },
      });

      expect(onNewFileNameChange).toHaveBeenCalledWith("newfile.md");
    });

    it("should call onSubmit when Enter is pressed with valid filename", () => {
      const onSubmit = vi.fn();
      render(
        <FilePickerCreateNew
          {...defaultProps}
          newFileName="valid.txt"
          onSubmit={onSubmit}
        />,
      );

      fireEvent.keyDown(screen.getByPlaceholderText("Enter filename..."), {
        key: "Enter",
      });

      expect(onSubmit).toHaveBeenCalled();
    });

    it("should not call onSubmit when Enter is pressed with empty filename", () => {
      const onSubmit = vi.fn();
      render(
        <FilePickerCreateNew
          {...defaultProps}
          newFileName="   "
          onSubmit={onSubmit}
        />,
      );

      fireEvent.keyDown(screen.getByPlaceholderText("Enter filename..."), {
        key: "Enter",
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });
});
