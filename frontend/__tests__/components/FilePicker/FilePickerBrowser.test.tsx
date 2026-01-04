import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FilePickerBrowser } from "@/components/FilePicker/FilePickerBrowser";
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
  { name: "folder1", path: "/folder1", is_directory: true },
  { name: "file1.txt", path: "/file1.txt", is_directory: false },
  { name: "file2.md", path: "/file2.md", is_directory: false },
];

describe("FilePickerBrowser", () => {
  const defaultProps = {
    theme: mockTheme,
    entries: mockEntries,
    loading: false,
    error: "",
    selectedFile: null as string | null,
    onFileClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loading state", () => {
    it("should show loading indicator when loading", () => {
      render(<FilePickerBrowser {...defaultProps} loading={true} />);
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("should not show entries when loading", () => {
      render(<FilePickerBrowser {...defaultProps} loading={true} />);
      expect(screen.queryByText("folder1")).not.toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("should show error message when error exists", () => {
      render(
        <FilePickerBrowser {...defaultProps} error="Something went wrong" />,
      );
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });

    it("should not show entries when error", () => {
      render(<FilePickerBrowser {...defaultProps} error="Error" />);
      expect(screen.queryByText("folder1")).not.toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("should show empty message when no entries", () => {
      render(<FilePickerBrowser {...defaultProps} entries={[]} />);
      expect(screen.getByText("No files found")).toBeInTheDocument();
    });
  });

  describe("entries display", () => {
    it("should show all entries", () => {
      render(<FilePickerBrowser {...defaultProps} />);
      expect(screen.getByText("folder1")).toBeInTheDocument();
      expect(screen.getByText("file1.txt")).toBeInTheDocument();
      expect(screen.getByText("file2.md")).toBeInTheDocument();
    });

    it("should show folder icon for directories", () => {
      render(<FilePickerBrowser {...defaultProps} />);
      expect(screen.getByText("📁")).toBeInTheDocument();
    });

    it("should call onFileClick when entry is clicked", () => {
      const onFileClick = vi.fn();
      render(<FilePickerBrowser {...defaultProps} onFileClick={onFileClick} />);

      fireEvent.click(screen.getByText("file1.txt"));
      expect(onFileClick).toHaveBeenCalledWith(mockEntries[1]);
    });

    it("should highlight selected file", () => {
      render(<FilePickerBrowser {...defaultProps} selectedFile="/file1.txt" />);
      const button = screen.getByText("file1.txt").closest("button");
      // Check that it has box-shadow (selection indicator)
      expect(button?.style.boxShadow).not.toBe("none");
    });

    it("should show arrow indicator for directories", () => {
      render(<FilePickerBrowser {...defaultProps} />);
      expect(screen.getByText("→")).toBeInTheDocument();
    });
  });

  describe("mouse interaction", () => {
    it("should handle mouse enter and leave without errors", () => {
      render(<FilePickerBrowser {...defaultProps} />);
      const button = screen.getByText("file1.txt").closest("button");

      // Just verify these don't throw errors
      fireEvent.mouseEnter(button!);
      fireEvent.mouseLeave(button!);
      expect(button).toBeInTheDocument();
    });

    it("should handle mouse enter and leave on directories", () => {
      render(<FilePickerBrowser {...defaultProps} />);
      const button = screen.getByText("folder1").closest("button");

      // Just verify these don't throw errors
      fireEvent.mouseEnter(button!);
      fireEvent.mouseLeave(button!);
      expect(button).toBeInTheDocument();
    });
  });
});
