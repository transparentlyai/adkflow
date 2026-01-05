import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import React from "react";
import FileDisplayWidget from "@/components/nodes/widgets/FileDisplayWidget";

// Mock the ThemeContext
vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      colors: {
        monaco: "vs-dark",
        nodes: {
          common: {
            container: { background: "#1e1e1e", border: "#333" },
            footer: { background: "#252526" },
            text: { primary: "#fff", secondary: "#aaa", muted: "#666" },
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
  onMount,
  options,
}: {
  value?: string;
  language?: string;
  theme?: string;
  height?: string | number;
  onMount?: (editor: unknown, monaco: unknown) => void;
  options?: Record<string, unknown>;
}) {
  React.useEffect(() => {
    if (onMount) {
      const mockEditor = {
        onDidScrollChange: vi.fn((_callback) => {
          return { dispose: vi.fn() };
        }),
        getModel: vi.fn(() => ({
          getLineCount: vi.fn(() => 100),
        })),
        getVisibleRanges: vi.fn(() => [{ endLineNumber: 50 }]),
      };
      onMount(mockEditor, {});
    }
  }, [onMount]);

  return (
    <textarea
      data-testid="monaco-editor"
      data-language={language}
      data-theme={theme}
      data-readonly={options?.readOnly?.toString()}
      value={value}
      readOnly
    />
  );
}

vi.mock("@monaco-editor/react", () => ({
  default: MockMonacoEditor,
}));

describe("FileDisplayWidget", () => {
  const mockOnLoadChunk = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnLoadChunk.mockResolvedValue({
      content: "line 1\nline 2\nline 3",
      total_lines: 3,
      has_more: false,
    });
  });

  describe("rendering", () => {
    it("should render file path in header", async () => {
      await act(async () => {
        render(
          <FileDisplayWidget
            filePath="/path/to/file.py"
            onLoadChunk={mockOnLoadChunk}
          />,
        );
      });

      expect(screen.getByText("/path/to/file.py")).toBeInTheDocument();
    });

    it("should render 'No file selected' when filePath is empty", async () => {
      mockOnLoadChunk.mockResolvedValue({
        content: "",
        total_lines: 0,
        has_more: false,
      });

      await act(async () => {
        render(<FileDisplayWidget filePath="" onLoadChunk={mockOnLoadChunk} />);
      });

      expect(screen.getByText("No file selected")).toBeInTheDocument();
    });

    it("should render refresh button", async () => {
      await act(async () => {
        render(
          <FileDisplayWidget
            filePath="/path/to/file.py"
            onLoadChunk={mockOnLoadChunk}
          />,
        );
      });

      const refreshButton = screen.getByTitle("Refresh content");
      expect(refreshButton).toBeInTheDocument();
    });

    it("should display line count", async () => {
      await act(async () => {
        render(
          <FileDisplayWidget
            filePath="/path/to/file.py"
            onLoadChunk={mockOnLoadChunk}
          />,
        );
      });

      await waitFor(() => {
        expect(screen.getByText(/3 \/ 3 lines/)).toBeInTheDocument();
      });
    });

    it("should render monaco editor with content", async () => {
      await act(async () => {
        render(
          <FileDisplayWidget
            filePath="/path/to/file.py"
            onLoadChunk={mockOnLoadChunk}
          />,
        );
      });

      await waitFor(() => {
        const editor = screen.getByTestId(
          "monaco-editor",
        ) as HTMLTextAreaElement;
        expect(editor.value).toBe("line 1\nline 2\nline 3");
      });
    });
  });

  describe("file loading", () => {
    it("should call onLoadChunk on mount", async () => {
      await act(async () => {
        render(
          <FileDisplayWidget
            filePath="/path/to/file.py"
            onLoadChunk={mockOnLoadChunk}
          />,
        );
      });

      expect(mockOnLoadChunk).toHaveBeenCalledWith("/path/to/file.py", 0, 500);
    });

    it("should use custom chunkSize", async () => {
      await act(async () => {
        render(
          <FileDisplayWidget
            filePath="/path/to/file.py"
            onLoadChunk={mockOnLoadChunk}
            chunkSize={100}
          />,
        );
      });

      expect(mockOnLoadChunk).toHaveBeenCalledWith("/path/to/file.py", 0, 100);
    });

    it("should show loading indicator while initial loading", async () => {
      // Create a promise that we can control
      let resolvePromise: (value: unknown) => void;
      const loadPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockOnLoadChunk.mockReturnValue(loadPromise);

      const { container } = render(
        <FileDisplayWidget
          filePath="/path/to/file.py"
          onLoadChunk={mockOnLoadChunk}
        />,
      );

      // Should show loading state - look for Loader2 icon with animate-spin
      expect(container.querySelector(".animate-spin")).toBeInTheDocument();

      // Resolve the promise
      await act(async () => {
        resolvePromise!({
          content: "content",
          total_lines: 1,
          has_more: false,
        });
      });

      // After resolving, loading indicator should be gone
      await waitFor(() => {
        expect(screen.getByTestId("monaco-editor")).toBeInTheDocument();
      });
    });

    it("should handle load error gracefully", async () => {
      // Suppress console.error for this test
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      mockOnLoadChunk.mockRejectedValue(new Error("Load failed"));

      await act(async () => {
        render(
          <FileDisplayWidget
            filePath="/path/to/file.py"
            onLoadChunk={mockOnLoadChunk}
          />,
        );
      });

      // Should show empty content after error
      await waitFor(() => {
        const editor = screen.getByTestId(
          "monaco-editor",
        ) as HTMLTextAreaElement;
        expect(editor.value).toBe("");
      });

      consoleSpy.mockRestore();
    });

    it("should not log error for file not found", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      mockOnLoadChunk.mockRejectedValue(new Error("File not found"));

      await act(async () => {
        render(
          <FileDisplayWidget
            filePath="/path/to/nonexistent.py"
            onLoadChunk={mockOnLoadChunk}
          />,
        );
      });

      await waitFor(() => {
        expect(consoleSpy).not.toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });
  });

  describe("refresh functionality", () => {
    it("should reload content when refresh button is clicked", async () => {
      await act(async () => {
        render(
          <FileDisplayWidget
            filePath="/path/to/file.py"
            onLoadChunk={mockOnLoadChunk}
          />,
        );
      });

      await waitFor(() => {
        expect(mockOnLoadChunk).toHaveBeenCalledTimes(1);
      });

      const refreshButton = screen.getByTitle("Refresh content");

      await act(async () => {
        fireEvent.click(refreshButton);
      });

      await waitFor(() => {
        expect(mockOnLoadChunk).toHaveBeenCalledTimes(2);
      });
    });

    it("should disable refresh button while loading", async () => {
      let resolvePromise: (value: unknown) => void;
      const loadPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockOnLoadChunk.mockReturnValueOnce(loadPromise);

      render(
        <FileDisplayWidget
          filePath="/path/to/file.py"
          onLoadChunk={mockOnLoadChunk}
        />,
      );

      const refreshButton = screen.getByTitle("Refresh content");
      expect(refreshButton).toBeDisabled();

      await act(async () => {
        resolvePromise!({
          content: "content",
          total_lines: 1,
          has_more: false,
        });
      });

      await waitFor(() => {
        expect(refreshButton).not.toBeDisabled();
      });
    });
  });

  describe("has_more indicator", () => {
    it("should show ellipsis when has_more is true", async () => {
      mockOnLoadChunk.mockResolvedValue({
        content: "partial content",
        total_lines: 100,
        has_more: true,
      });

      await act(async () => {
        render(
          <FileDisplayWidget
            filePath="/path/to/file.py"
            onLoadChunk={mockOnLoadChunk}
          />,
        );
      });

      await waitFor(() => {
        expect(screen.getByText(/\.\.\./)).toBeInTheDocument();
      });
    });

    it("should not show ellipsis when has_more is false", async () => {
      mockOnLoadChunk.mockResolvedValue({
        content: "all content",
        total_lines: 10,
        has_more: false,
      });

      await act(async () => {
        render(
          <FileDisplayWidget
            filePath="/path/to/file.py"
            onLoadChunk={mockOnLoadChunk}
          />,
        );
      });

      await waitFor(() => {
        expect(screen.queryByText(/\.\.\.$/)).not.toBeInTheDocument();
      });
    });
  });

  describe("language detection", () => {
    it("should detect python language from .py extension", async () => {
      await act(async () => {
        render(
          <FileDisplayWidget
            filePath="/path/to/file.py"
            onLoadChunk={mockOnLoadChunk}
          />,
        );
      });

      await waitFor(() => {
        const editor = screen.getByTestId("monaco-editor");
        expect(editor).toHaveAttribute("data-language", "python");
      });
    });

    it("should detect javascript language from .js extension", async () => {
      await act(async () => {
        render(
          <FileDisplayWidget
            filePath="/path/to/file.js"
            onLoadChunk={mockOnLoadChunk}
          />,
        );
      });

      await waitFor(() => {
        const editor = screen.getByTestId("monaco-editor");
        expect(editor).toHaveAttribute("data-language", "javascript");
      });
    });

    it("should detect typescript language from .ts extension", async () => {
      await act(async () => {
        render(
          <FileDisplayWidget
            filePath="/path/to/file.ts"
            onLoadChunk={mockOnLoadChunk}
          />,
        );
      });

      await waitFor(() => {
        const editor = screen.getByTestId("monaco-editor");
        expect(editor).toHaveAttribute("data-language", "typescript");
      });
    });

    it("should detect json language from .json extension", async () => {
      await act(async () => {
        render(
          <FileDisplayWidget
            filePath="/path/to/config.json"
            onLoadChunk={mockOnLoadChunk}
          />,
        );
      });

      await waitFor(() => {
        const editor = screen.getByTestId("monaco-editor");
        expect(editor).toHaveAttribute("data-language", "json");
      });
    });

    it("should detect yaml language from .yaml extension", async () => {
      await act(async () => {
        render(
          <FileDisplayWidget
            filePath="/path/to/config.yaml"
            onLoadChunk={mockOnLoadChunk}
          />,
        );
      });

      await waitFor(() => {
        const editor = screen.getByTestId("monaco-editor");
        expect(editor).toHaveAttribute("data-language", "yaml");
      });
    });

    it("should use plaintext for unknown extensions", async () => {
      await act(async () => {
        render(
          <FileDisplayWidget
            filePath="/path/to/file.unknown"
            onLoadChunk={mockOnLoadChunk}
          />,
        );
      });

      await waitFor(() => {
        const editor = screen.getByTestId("monaco-editor");
        expect(editor).toHaveAttribute("data-language", "plaintext");
      });
    });
  });

  describe("height prop", () => {
    it("should use default height of 200px", async () => {
      await act(async () => {
        render(
          <FileDisplayWidget
            filePath="/path/to/file.py"
            onLoadChunk={mockOnLoadChunk}
          />,
        );
      });

      await waitFor(() => {
        const editorContainer =
          screen.getByTestId("monaco-editor").parentElement;
        expect(editorContainer).toHaveStyle({ height: "200px" });
      });
    });

    it("should apply custom number height", async () => {
      await act(async () => {
        render(
          <FileDisplayWidget
            filePath="/path/to/file.py"
            onLoadChunk={mockOnLoadChunk}
            height={400}
          />,
        );
      });

      await waitFor(() => {
        const editorContainer =
          screen.getByTestId("monaco-editor").parentElement;
        expect(editorContainer).toHaveStyle({ height: "400px" });
      });
    });

    it("should apply custom string height", async () => {
      await act(async () => {
        render(
          <FileDisplayWidget
            filePath="/path/to/file.py"
            onLoadChunk={mockOnLoadChunk}
            height="50vh"
          />,
        );
      });

      await waitFor(() => {
        const editorContainer =
          screen.getByTestId("monaco-editor").parentElement;
        expect(editorContainer).toHaveStyle({ height: "50vh" });
      });
    });
  });

  describe("editor options", () => {
    it("should render editor as read-only", async () => {
      await act(async () => {
        render(
          <FileDisplayWidget
            filePath="/path/to/file.py"
            onLoadChunk={mockOnLoadChunk}
          />,
        );
      });

      await waitFor(() => {
        const editor = screen.getByTestId("monaco-editor");
        expect(editor).toHaveAttribute("data-readonly", "true");
      });
    });

    it("should apply theme from context", async () => {
      await act(async () => {
        render(
          <FileDisplayWidget
            filePath="/path/to/file.py"
            onLoadChunk={mockOnLoadChunk}
          />,
        );
      });

      await waitFor(() => {
        const editor = screen.getByTestId("monaco-editor");
        expect(editor).toHaveAttribute("data-theme", "vs-dark");
      });
    });
  });

  describe("empty file path", () => {
    it("should not call onLoadChunk when filePath is empty", async () => {
      mockOnLoadChunk.mockClear();

      await act(async () => {
        render(<FileDisplayWidget filePath="" onLoadChunk={mockOnLoadChunk} />);
      });

      expect(mockOnLoadChunk).not.toHaveBeenCalled();
    });

    it("should clear content when filePath becomes empty", async () => {
      const { rerender } = render(
        <FileDisplayWidget
          filePath="/path/to/file.py"
          onLoadChunk={mockOnLoadChunk}
        />,
      );

      await waitFor(() => {
        const editor = screen.getByTestId(
          "monaco-editor",
        ) as HTMLTextAreaElement;
        expect(editor.value).toBe("line 1\nline 2\nline 3");
      });

      await act(async () => {
        rerender(
          <FileDisplayWidget filePath="" onLoadChunk={mockOnLoadChunk} />,
        );
      });

      await waitFor(() => {
        const editor = screen.getByTestId(
          "monaco-editor",
        ) as HTMLTextAreaElement;
        expect(editor.value).toBe("");
      });
    });
  });

  describe("styling", () => {
    it("should have nodrag nowheel nopan classes for React Flow compatibility", async () => {
      await act(async () => {
        render(
          <FileDisplayWidget
            filePath="/path/to/file.py"
            onLoadChunk={mockOnLoadChunk}
          />,
        );
      });

      await waitFor(() => {
        const editorContainer =
          screen.getByTestId("monaco-editor").parentElement;
        expect(editorContainer).toHaveClass("nodrag", "nowheel", "nopan");
      });
    });

    it("should have border styling", async () => {
      const { container } = await act(async () => {
        return render(
          <FileDisplayWidget
            filePath="/path/to/file.py"
            onLoadChunk={mockOnLoadChunk}
          />,
        );
      });

      const outerContainer = container.querySelector(".border");
      expect(outerContainer).toBeInTheDocument();
    });
  });
});
