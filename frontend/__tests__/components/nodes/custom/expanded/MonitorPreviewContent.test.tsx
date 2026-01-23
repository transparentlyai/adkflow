import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { MonitorPreviewContent } from "@/components/nodes/custom/expanded/MonitorPreviewContent";

// Mock the ThemeContext
vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      colors: {
        monaco: "vs-dark",
        nodes: {
          common: {
            text: { muted: "#999" },
            container: { background: "#fff", border: "#ccc" },
            footer: { background: "#f5f5f5" },
          },
        },
      },
    },
  }),
}));

// Mock Monaco Editor
function MockMonacoEditor({
  value,
  language,
  theme,
  height,
  options,
}: {
  value?: string;
  language?: string;
  theme?: string;
  height?: string | number;
  options?: {
    readOnly?: boolean;
    lineNumbers?: string;
    minimap?: { enabled?: boolean };
    glyphMargin?: boolean;
    lineDecorationsWidth?: number;
    wordWrap?: string;
  };
}) {
  return (
    <div
      data-testid="monaco-editor"
      data-language={language}
      data-theme={theme}
      data-height={height}
      data-value={value}
      data-readonly={options?.readOnly?.toString()}
      data-line-numbers={options?.lineNumbers?.toString()}
      data-minimap={options?.minimap?.enabled?.toString()}
      data-glyph-margin={options?.glyphMargin?.toString()}
      data-line-decorations-width={options?.lineDecorationsWidth?.toString()}
      data-word-wrap={options?.wordWrap?.toString()}
    />
  );
}

vi.mock("@monaco-editor/react", () => ({
  default: MockMonacoEditor,
}));

describe("MonitorPreviewContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset clipboard mock
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(() => Promise.resolve()),
      },
    });
  });

  describe("empty state", () => {
    it("should show empty state when no value provided", () => {
      render(
        <MonitorPreviewContent
          value=""
          valueType="plaintext"
          timestamp=""
          height={200}
        />,
      );

      expect(screen.getByText("No value captured yet")).toBeInTheDocument();
      expect(
        screen.getByText("Run the workflow to see output"),
      ).toBeInTheDocument();
    });

    it("should use provided height in empty state", () => {
      const { container } = render(
        <MonitorPreviewContent
          value=""
          valueType="plaintext"
          timestamp=""
          height={300}
        />,
      );

      const emptyStateDiv = container.querySelector(".flex.flex-col");
      expect(emptyStateDiv).toHaveStyle({ height: "300px" });
    });

    it("should show clock icon in empty state", () => {
      const { container } = render(
        <MonitorPreviewContent
          value=""
          valueType="plaintext"
          timestamp=""
          height={200}
        />,
      );

      const clockIcon = container.querySelector(".w-8.h-8");
      expect(clockIcon).toBeInTheDocument();
    });
  });

  describe("rendering with content", () => {
    it("should render monaco editor when value is provided", () => {
      render(
        <MonitorPreviewContent
          value="test content"
          valueType="plaintext"
          timestamp="2024-01-01T12:00:00Z"
          height={200}
        />,
      );

      expect(screen.getByTestId("monaco-editor")).toBeInTheDocument();
    });

    it("should apply provided height to container", () => {
      const { container } = render(
        <MonitorPreviewContent
          value="test"
          valueType="plaintext"
          timestamp=""
          height={400}
        />,
      );

      const editorContainer = container.querySelector(".flex.flex-col");
      expect(editorContainer).toHaveStyle({ height: "400px" });
    });

    it("should use default height of 200 when not specified", () => {
      const { container } = render(
        <MonitorPreviewContent
          value="test"
          valueType="plaintext"
          timestamp=""
        />,
      );

      const editorContainer = container.querySelector(".flex.flex-col");
      expect(editorContainer).toHaveStyle({ height: "200px" });
    });
  });

  describe("language detection", () => {
    it("should detect JSON from valid JSON string", () => {
      render(
        <MonitorPreviewContent
          value='{"key": "value"}'
          valueType="plaintext"
          timestamp=""
        />,
      );

      const editor = screen.getByTestId("monaco-editor");
      expect(editor).toHaveAttribute("data-language", "json");
    });

    it("should detect markdown from markdown indicators", () => {
      render(
        <MonitorPreviewContent
          value="# Header"
          valueType="plaintext"
          timestamp=""
        />,
      );

      const editor = screen.getByTestId("monaco-editor");
      expect(editor).toHaveAttribute("data-language", "markdown");
    });

    it("should detect markdown from bold text", () => {
      render(
        <MonitorPreviewContent
          value="**bold text**"
          valueType="plaintext"
          timestamp=""
        />,
      );

      const editor = screen.getByTestId("monaco-editor");
      expect(editor).toHaveAttribute("data-language", "markdown");
    });

    it("should detect markdown from list", () => {
      render(
        <MonitorPreviewContent
          value="- item"
          valueType="plaintext"
          timestamp=""
        />,
      );

      const editor = screen.getByTestId("monaco-editor");
      expect(editor).toHaveAttribute("data-language", "markdown");
    });

    it("should detect markdown from links", () => {
      render(
        <MonitorPreviewContent
          value="[link](http://example.com)"
          valueType="plaintext"
          timestamp=""
        />,
      );

      const editor = screen.getByTestId("monaco-editor");
      expect(editor).toHaveAttribute("data-language", "markdown");
    });

    it("should detect markdown from code blocks", () => {
      render(
        <MonitorPreviewContent
          value="```code```"
          valueType="plaintext"
          timestamp=""
        />,
      );

      const editor = screen.getByTestId("monaco-editor");
      expect(editor).toHaveAttribute("data-language", "markdown");
    });

    it("should use plaintext for plain text content", () => {
      render(
        <MonitorPreviewContent
          value="plain text content"
          valueType="plaintext"
          timestamp=""
        />,
      );

      const editor = screen.getByTestId("monaco-editor");
      expect(editor).toHaveAttribute("data-language", "plaintext");
    });

    it("should use valueType when provided and not plaintext", () => {
      render(
        <MonitorPreviewContent
          value="some content"
          valueType="json"
          timestamp=""
        />,
      );

      const editor = screen.getByTestId("monaco-editor");
      expect(editor).toHaveAttribute("data-language", "json");
    });

    it("should auto-detect when valueType is plaintext", () => {
      render(
        <MonitorPreviewContent
          value='{"auto": "detect"}'
          valueType="plaintext"
          timestamp=""
        />,
      );

      const editor = screen.getByTestId("monaco-editor");
      expect(editor).toHaveAttribute("data-language", "json");
    });
  });

  describe("JSON formatting", () => {
    it("should pretty-print valid JSON", () => {
      render(
        <MonitorPreviewContent
          value='{"key":"value","nested":{"deep":"data"}}'
          valueType="json"
          timestamp=""
        />,
      );

      const editor = screen.getByTestId("monaco-editor");
      const value = editor.getAttribute("data-value");
      expect(value).toContain("\n");
      expect(value).toContain("  ");
    });

    it("should handle invalid JSON gracefully", () => {
      const invalidJson = "{ invalid json }";
      render(
        <MonitorPreviewContent
          value={invalidJson}
          valueType="json"
          timestamp=""
        />,
      );

      const editor = screen.getByTestId("monaco-editor");
      expect(editor).toHaveAttribute("data-value", invalidJson);
    });

    it("should handle complex nested JSON", () => {
      const complexJson = JSON.stringify({
        array: [1, 2, 3],
        nested: { deep: { value: true } },
      });

      render(
        <MonitorPreviewContent
          value={complexJson}
          valueType="json"
          timestamp=""
        />,
      );

      const editor = screen.getByTestId("monaco-editor");
      const value = editor.getAttribute("data-value");
      expect(value).toContain("array");
      expect(value).toContain("nested");
    });
  });

  describe("timestamp formatting", () => {
    it("should display formatted timestamp", () => {
      render(
        <MonitorPreviewContent
          value="test"
          valueType="plaintext"
          timestamp="2024-01-01T14:30:45Z"
        />,
      );

      const timestampElement = screen.getByText(/:/);
      expect(timestampElement).toBeInTheDocument();
    });

    it("should not show timestamp when empty", () => {
      const { container } = render(
        <MonitorPreviewContent
          value="test"
          valueType="plaintext"
          timestamp=""
        />,
      );

      const clockIcon = container.querySelector(".w-3.h-3");
      expect(clockIcon).not.toBeInTheDocument();
    });

    it("should handle invalid timestamp gracefully", () => {
      const { container } = render(
        <MonitorPreviewContent
          value="test"
          valueType="plaintext"
          timestamp="invalid-date"
        />,
      );

      // Invalid dates are rendered as the original timestamp string
      const timestampSpan = container.querySelector(
        ".flex.items-center.gap-1.text-\\[10px\\]",
      );
      expect(timestampSpan).toBeInTheDocument();
    });
  });

  describe("copy functionality", () => {
    it("should copy content when copy button clicked", async () => {
      const writeTextMock = vi.fn(() => Promise.resolve());
      Object.assign(navigator, {
        clipboard: { writeText: writeTextMock },
      });

      render(
        <MonitorPreviewContent
          value="content to copy"
          valueType="plaintext"
          timestamp=""
        />,
      );

      const copyButton = screen.getByTitle("Copy content");
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(writeTextMock).toHaveBeenCalledWith("content to copy");
      });
    });

    it("should show check icon after successful copy", async () => {
      render(
        <MonitorPreviewContent
          value="test content"
          valueType="plaintext"
          timestamp=""
        />,
      );

      const copyButton = screen.getByTitle("Copy content");
      fireEvent.click(copyButton);

      await waitFor(() => {
        const checkIcon = copyButton.querySelector(".text-green-500");
        expect(checkIcon).toBeInTheDocument();
      });
    });

    it("should revert to copy icon after 2 seconds", async () => {
      vi.useFakeTimers();

      render(
        <MonitorPreviewContent
          value="test"
          valueType="plaintext"
          timestamp=""
        />,
      );

      const copyButton = screen.getByTitle("Copy content");
      fireEvent.click(copyButton);

      // Wait for the check icon to appear
      await vi.waitFor(
        () => {
          const checkIcon = copyButton.querySelector(".text-green-500");
          expect(checkIcon).toBeInTheDocument();
        },
        { timeout: 100 },
      );

      // Advance timer by 2 seconds
      vi.advanceTimersByTime(2000);

      // Wait for the check icon to disappear
      await vi.waitFor(
        () => {
          const checkIcon = copyButton.querySelector(".text-green-500");
          expect(checkIcon).not.toBeInTheDocument();
        },
        { timeout: 100 },
      );

      vi.useRealTimers();
    });

    it("should copy formatted JSON content", async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: { writeText: writeTextMock },
      });

      render(
        <MonitorPreviewContent
          value='{"key":"value"}'
          valueType="json"
          timestamp=""
        />,
      );

      const copyButton = screen.getByTitle("Copy content");
      fireEvent.click(copyButton);

      await waitFor(
        () => {
          expect(writeTextMock).toHaveBeenCalled();
          const copiedText = writeTextMock.mock.calls[0][0];
          expect(copiedText).toContain("key");
          expect(copiedText).toContain("value");
        },
        { timeout: 1000 },
      );
    });
  });

  describe("editor options", () => {
    it("should set readOnly option", () => {
      render(
        <MonitorPreviewContent
          value="test"
          valueType="plaintext"
          timestamp=""
        />,
      );

      const editor = screen.getByTestId("monaco-editor");
      expect(editor).toHaveAttribute("data-readonly", "true");
    });

    it("should disable line numbers", () => {
      render(
        <MonitorPreviewContent
          value="test"
          valueType="plaintext"
          timestamp=""
        />,
      );

      const editor = screen.getByTestId("monaco-editor");
      expect(editor).toHaveAttribute("data-line-numbers", "off");
    });

    it("should disable minimap", () => {
      render(
        <MonitorPreviewContent
          value="test"
          valueType="plaintext"
          timestamp=""
        />,
      );

      const editor = screen.getByTestId("monaco-editor");
      expect(editor).toHaveAttribute("data-minimap", "false");
    });

    it("should disable glyph margin", () => {
      render(
        <MonitorPreviewContent
          value="test"
          valueType="plaintext"
          timestamp=""
        />,
      );

      const editor = screen.getByTestId("monaco-editor");
      expect(editor).toHaveAttribute("data-glyph-margin", "false");
    });

    it("should set line decorations width to 0", () => {
      render(
        <MonitorPreviewContent
          value="test"
          valueType="plaintext"
          timestamp=""
        />,
      );

      const editor = screen.getByTestId("monaco-editor");
      expect(editor).toHaveAttribute("data-line-decorations-width", "0");
    });

    it("should enable word wrap", () => {
      render(
        <MonitorPreviewContent
          value="test"
          valueType="plaintext"
          timestamp=""
        />,
      );

      const editor = screen.getByTestId("monaco-editor");
      expect(editor).toHaveAttribute("data-word-wrap", "on");
    });
  });

  describe("container classes", () => {
    it("should have nodrag nowheel nopan classes on editor container", () => {
      const { container } = render(
        <MonitorPreviewContent
          value="test"
          valueType="plaintext"
          timestamp=""
        />,
      );

      const editorWrapper = container.querySelector(".nodrag.nowheel.nopan");
      expect(editorWrapper).toBeInTheDocument();
    });
  });

  describe("language badge", () => {
    it("should display language type badge", () => {
      render(
        <MonitorPreviewContent value="test" valueType="json" timestamp="" />,
      );

      expect(screen.getByText("json")).toBeInTheDocument();
    });

    it("should display auto-detected language in badge", () => {
      render(
        <MonitorPreviewContent
          value="# Markdown"
          valueType="plaintext"
          timestamp=""
        />,
      );

      expect(screen.getByText("markdown")).toBeInTheDocument();
    });

    it("should display plaintext in badge for plain text", () => {
      render(
        <MonitorPreviewContent
          value="plain text"
          valueType="plaintext"
          timestamp=""
        />,
      );

      expect(screen.getByText("plaintext")).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("should handle empty string value", () => {
      render(
        <MonitorPreviewContent value="" valueType="plaintext" timestamp="" />,
      );

      expect(screen.getByText("No value captured yet")).toBeInTheDocument();
    });

    it("should handle very long text", () => {
      const longText = "x".repeat(10000);
      render(
        <MonitorPreviewContent
          value={longText}
          valueType="plaintext"
          timestamp=""
        />,
      );

      const editor = screen.getByTestId("monaco-editor");
      expect(editor).toHaveAttribute("data-value", longText);
    });

    it("should handle special characters", () => {
      const specialChars = "<script>alert('xss')</script>";
      render(
        <MonitorPreviewContent
          value={specialChars}
          valueType="plaintext"
          timestamp=""
        />,
      );

      const editor = screen.getByTestId("monaco-editor");
      expect(editor).toHaveAttribute("data-value", specialChars);
    });

    it("should handle unicode characters", () => {
      const unicode = "Hello 世界 🌍";
      render(
        <MonitorPreviewContent
          value={unicode}
          valueType="plaintext"
          timestamp=""
        />,
      );

      const editor = screen.getByTestId("monaco-editor");
      expect(editor).toHaveAttribute("data-value", unicode);
    });

    it("should handle multiline text", () => {
      const multiline = "line1\nline2\nline3";
      render(
        <MonitorPreviewContent
          value={multiline}
          valueType="plaintext"
          timestamp=""
        />,
      );

      const editor = screen.getByTestId("monaco-editor");
      expect(editor).toHaveAttribute("data-value", multiline);
    });
  });

  describe("theme integration", () => {
    it("should use theme colors for monaco", () => {
      render(
        <MonitorPreviewContent
          value="test"
          valueType="plaintext"
          timestamp=""
        />,
      );

      const editor = screen.getByTestId("monaco-editor");
      expect(editor).toHaveAttribute("data-theme", "vs-dark");
    });
  });
});
