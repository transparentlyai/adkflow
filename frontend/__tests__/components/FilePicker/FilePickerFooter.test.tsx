import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FilePickerFooter } from "@/components/FilePicker/FilePickerFooter";
import type { Theme } from "@/lib/themes/types";
import type { DirectoryEntry } from "@/lib/types";

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

const mockEntries: DirectoryEntry[] = [
  { name: "file1.txt", path: "/file1.txt", is_directory: false },
  { name: "file2.txt", path: "/file2.txt", is_directory: false },
  { name: "folder1", path: "/folder1", is_directory: true },
];

describe("FilePickerFooter", () => {
  const defaultProps = {
    theme: mockTheme,
    entries: mockEntries,
    showAllFiles: false,
    canSelect: true,
    newFileName: "",
    onShowAllFilesChange: vi.fn(),
    onCancel: vi.fn(),
    onSelect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should show file and folder count", () => {
      render(<FilePickerFooter {...defaultProps} />);
      expect(screen.getByText("2 files, 1 folders")).toBeInTheDocument();
    });

    it("should render Cancel button", () => {
      render(<FilePickerFooter {...defaultProps} />);
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    it("should render Select button", () => {
      render(<FilePickerFooter {...defaultProps} />);
      expect(screen.getByText("Select")).toBeInTheDocument();
    });

    it("should render Create button when allowCreate and newFileName", () => {
      render(
        <FilePickerFooter
          {...defaultProps}
          allowCreate={true}
          newFileName="newfile.txt"
        />,
      );
      expect(screen.getByText("Create")).toBeInTheDocument();
    });
  });

  describe("Show all files checkbox", () => {
    it("should not render when no defaultExtensions", () => {
      render(<FilePickerFooter {...defaultProps} />);
      expect(screen.queryByText("Show all files")).not.toBeInTheDocument();
    });

    it("should render when defaultExtensions provided", () => {
      render(
        <FilePickerFooter
          {...defaultProps}
          defaultExtensions={[".txt", ".md"]}
        />,
      );
      expect(screen.getByText("Show all files")).toBeInTheDocument();
    });

    it("should show filter label when not showing all files", () => {
      render(
        <FilePickerFooter
          {...defaultProps}
          defaultExtensions={[".txt"]}
          filterLabel="Text files"
          showAllFiles={false}
        />,
      );
      expect(screen.getByText("(Text files)")).toBeInTheDocument();
    });

    it("should not show filter label when showing all files", () => {
      render(
        <FilePickerFooter
          {...defaultProps}
          defaultExtensions={[".txt"]}
          filterLabel="Text files"
          showAllFiles={true}
        />,
      );
      expect(screen.queryByText("(Text files)")).not.toBeInTheDocument();
    });

    it("should call onShowAllFilesChange when checkbox clicked", () => {
      const onShowAllFilesChange = vi.fn();
      render(
        <FilePickerFooter
          {...defaultProps}
          defaultExtensions={[".txt"]}
          onShowAllFilesChange={onShowAllFilesChange}
        />,
      );

      fireEvent.click(screen.getByRole("checkbox"));
      expect(onShowAllFilesChange).toHaveBeenCalledWith(true);
    });
  });

  describe("button interaction", () => {
    it("should call onCancel when Cancel clicked", () => {
      const onCancel = vi.fn();
      render(<FilePickerFooter {...defaultProps} onCancel={onCancel} />);

      fireEvent.click(screen.getByText("Cancel"));
      expect(onCancel).toHaveBeenCalled();
    });

    it("should call onSelect when Select clicked", () => {
      const onSelect = vi.fn();
      render(<FilePickerFooter {...defaultProps} onSelect={onSelect} />);

      fireEvent.click(screen.getByText("Select"));
      expect(onSelect).toHaveBeenCalled();
    });

    it("should disable Select button when canSelect is false", () => {
      render(<FilePickerFooter {...defaultProps} canSelect={false} />);
      expect(screen.getByText("Select")).toBeDisabled();
    });
  });
});
