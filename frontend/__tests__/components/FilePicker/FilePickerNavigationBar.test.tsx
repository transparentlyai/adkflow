import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FilePickerNavigationBar } from "@/components/FilePicker/FilePickerNavigationBar";
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

describe("FilePickerNavigationBar", () => {
  const defaultProps = {
    theme: mockTheme,
    parentPath: "/home/user",
    manualPath: "/home/user/projects",
    loading: false,
    onGoUp: vi.fn(),
    onManualPathChange: vi.fn(),
    onNavigate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render the Up button", () => {
      render(<FilePickerNavigationBar {...defaultProps} />);
      expect(screen.getByText("↑ Up")).toBeInTheDocument();
    });

    it("should render the path input", () => {
      render(<FilePickerNavigationBar {...defaultProps} />);
      expect(screen.getByPlaceholderText("Enter path...")).toBeInTheDocument();
    });

    it("should render the Go button", () => {
      render(<FilePickerNavigationBar {...defaultProps} />);
      expect(screen.getByText("Go")).toBeInTheDocument();
    });

    it("should display the current path in input", () => {
      render(<FilePickerNavigationBar {...defaultProps} />);
      expect(
        screen.getByDisplayValue("/home/user/projects"),
      ).toBeInTheDocument();
    });
  });

  describe("Up button", () => {
    it("should be disabled when parentPath is null", () => {
      render(<FilePickerNavigationBar {...defaultProps} parentPath={null} />);
      expect(screen.getByText("↑ Up")).toBeDisabled();
    });

    it("should be disabled when loading", () => {
      render(<FilePickerNavigationBar {...defaultProps} loading={true} />);
      expect(screen.getByText("↑ Up")).toBeDisabled();
    });

    it("should be enabled when parentPath exists and not loading", () => {
      render(<FilePickerNavigationBar {...defaultProps} />);
      expect(screen.getByText("↑ Up")).not.toBeDisabled();
    });

    it("should call onGoUp when clicked", () => {
      const onGoUp = vi.fn();
      render(<FilePickerNavigationBar {...defaultProps} onGoUp={onGoUp} />);

      fireEvent.click(screen.getByText("↑ Up"));
      expect(onGoUp).toHaveBeenCalled();
    });
  });

  describe("path input", () => {
    it("should call onManualPathChange when typing", () => {
      const onManualPathChange = vi.fn();
      render(
        <FilePickerNavigationBar
          {...defaultProps}
          onManualPathChange={onManualPathChange}
        />,
      );

      fireEvent.change(screen.getByPlaceholderText("Enter path..."), {
        target: { value: "/new/path" },
      });

      expect(onManualPathChange).toHaveBeenCalledWith("/new/path");
    });

    it("should call onNavigate when Enter is pressed with valid path", () => {
      const onNavigate = vi.fn();
      render(
        <FilePickerNavigationBar
          {...defaultProps}
          manualPath="/valid/path"
          onNavigate={onNavigate}
        />,
      );

      fireEvent.keyDown(screen.getByPlaceholderText("Enter path..."), {
        key: "Enter",
      });

      expect(onNavigate).toHaveBeenCalledWith("/valid/path");
    });

    it("should not call onNavigate when Enter is pressed with empty path", () => {
      const onNavigate = vi.fn();
      render(
        <FilePickerNavigationBar
          {...defaultProps}
          manualPath="   "
          onNavigate={onNavigate}
        />,
      );

      fireEvent.keyDown(screen.getByPlaceholderText("Enter path..."), {
        key: "Enter",
      });

      expect(onNavigate).not.toHaveBeenCalled();
    });
  });

  describe("Go button", () => {
    it("should be disabled when loading", () => {
      render(<FilePickerNavigationBar {...defaultProps} loading={true} />);
      expect(screen.getByText("Go")).toBeDisabled();
    });

    it("should be disabled when manualPath is empty", () => {
      render(<FilePickerNavigationBar {...defaultProps} manualPath="  " />);
      expect(screen.getByText("Go")).toBeDisabled();
    });

    it("should be enabled when not loading and path has value", () => {
      render(<FilePickerNavigationBar {...defaultProps} />);
      expect(screen.getByText("Go")).not.toBeDisabled();
    });

    it("should call onNavigate when clicked", () => {
      const onNavigate = vi.fn();
      render(
        <FilePickerNavigationBar
          {...defaultProps}
          manualPath="/test/path"
          onNavigate={onNavigate}
        />,
      );

      fireEvent.click(screen.getByText("Go"));
      expect(onNavigate).toHaveBeenCalledWith("/test/path");
    });
  });
});
