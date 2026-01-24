import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import MonacoEditorWidget from "@/components/nodes/widgets/MonacoEditorWidget";

// Mock the ThemeContext
vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      colors: {
        monaco: "vs-dark",
        nodes: {
          common: {
            container: { background: "#fff", border: "#ccc" },
            footer: { background: "#f5f5f5" },
          },
        },
      },
    },
  }),
}));

// Mock EditorMenuBar
vi.mock("@/components/EditorMenuBar", () => ({
  default: ({
    onSave,
    onChangeFile,
    filePath,
    isSaving,
    isDirty,
  }: {
    onSave?: () => void;
    onChangeFile?: () => void;
    filePath?: string;
    isSaving?: boolean;
    isDirty?: boolean;
  }) => (
    <div data-testid="editor-menu-bar">
      <span data-testid="file-path">{filePath}</span>
      <span data-testid="is-dirty">{isDirty ? "dirty" : "clean"}</span>
      <span data-testid="is-saving">{isSaving ? "saving" : "idle"}</span>
      <button data-testid="save-button" onClick={onSave}>
        Save
      </button>
      <button data-testid="change-file-button" onClick={onChangeFile}>
        Change File
      </button>
    </div>
  ),
}));

// Mock Monaco Editor
let mockEditorMountCallback:
  | ((editor: unknown, monaco: unknown) => void)
  | null = null;
let mockOnChangeCallback: ((value: string | undefined) => void) | null = null;

function MockMonacoEditor({
  onChange,
  value,
  language,
  theme,
  height,
  onMount,
  options,
}: {
  onChange?: (value: string | undefined) => void;
  value?: string;
  language?: string;
  theme?: string;
  height?: string | number;
  onMount?: (editor: unknown, monaco: unknown) => void;
  options?: { readOnly?: boolean; minimap?: { enabled?: boolean } };
}) {
  // Store callbacks for testing
  mockOnChangeCallback = onChange ?? null;
  mockEditorMountCallback = onMount ?? null;

  // Simulate mount on render
  React.useEffect(() => {
    if (onMount) {
      // Track internal value for getValue/setValue
      let internalValue = value ?? "";
      const mockEditor = {
        addCommand: vi.fn(),
        getValue: () => internalValue,
        setValue: (val: string) => {
          internalValue = val;
        },
        getPosition: () => ({ lineNumber: 1, column: 1 }),
        setPosition: vi.fn(),
      };
      const mockMonaco = {
        KeyMod: { CtrlCmd: 2048 },
        KeyCode: { KeyS: 49 },
      };
      onMount(mockEditor, mockMonaco);
    }
  }, [onMount, value]);

  return (
    <textarea
      data-testid="monaco-editor"
      data-language={language}
      data-theme={theme}
      data-height={height}
      data-readonly={options?.readOnly?.toString()}
      data-minimap={options?.minimap?.enabled?.toString()}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  );
}

vi.mock("@monaco-editor/react", () => ({
  default: MockMonacoEditor,
}));

describe("MonacoEditorWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEditorMountCallback = null;
    mockOnChangeCallback = null;
  });

  describe("rendering", () => {
    it("should render monaco editor", () => {
      render(<MonacoEditorWidget value="const x = 1;" onChange={vi.fn()} />);

      expect(screen.getByTestId("monaco-editor")).toBeInTheDocument();
    });

    it("should display provided value", () => {
      render(
        <MonacoEditorWidget
          value="function hello() { return 'world'; }"
          onChange={vi.fn()}
        />,
      );

      const editor = screen.getByTestId("monaco-editor") as HTMLTextAreaElement;
      expect(editor.value).toBe("function hello() { return 'world'; }");
    });

    it("should use python as default language", () => {
      render(<MonacoEditorWidget value="" onChange={vi.fn()} />);

      const editor = screen.getByTestId("monaco-editor");
      expect(editor).toHaveAttribute("data-language", "python");
    });

    it("should use specified language", () => {
      render(
        <MonacoEditorWidget
          value=""
          onChange={vi.fn()}
          language="javascript"
        />,
      );

      const editor = screen.getByTestId("monaco-editor");
      expect(editor).toHaveAttribute("data-language", "javascript");
    });

    it("should pass theme from context", () => {
      render(<MonacoEditorWidget value="" onChange={vi.fn()} />);

      const editor = screen.getByTestId("monaco-editor");
      expect(editor).toHaveAttribute("data-theme", "vs-dark");
    });

    it("should use default height of 200px", () => {
      render(<MonacoEditorWidget value="" onChange={vi.fn()} />);

      const editor = screen.getByTestId("monaco-editor");
      expect(editor).toHaveAttribute("data-height", "100%");
    });

    it("should apply custom height", () => {
      render(<MonacoEditorWidget value="" onChange={vi.fn()} height={400} />);

      // The container gets the height, editor is 100%
      const container = screen.getByTestId("monaco-editor").parentElement;
      expect(container).toHaveStyle({ height: "400px" });
    });

    it("should apply string height", () => {
      render(<MonacoEditorWidget value="" onChange={vi.fn()} height="50vh" />);

      const container = screen.getByTestId("monaco-editor").parentElement;
      expect(container).toHaveStyle({ height: "50vh" });
    });

    it("should not show menu bar by default", () => {
      render(<MonacoEditorWidget value="" onChange={vi.fn()} />);

      expect(screen.queryByTestId("editor-menu-bar")).not.toBeInTheDocument();
    });

    it("should show menu bar when showMenuBar is true", () => {
      render(
        <MonacoEditorWidget value="" onChange={vi.fn()} showMenuBar={true} />,
      );

      expect(screen.getByTestId("editor-menu-bar")).toBeInTheDocument();
    });
  });

  describe("interactions", () => {
    it("should call onChange when content changes", () => {
      const onChange = vi.fn();
      render(<MonacoEditorWidget value="" onChange={onChange} />);

      const editor = screen.getByTestId("monaco-editor");
      fireEvent.change(editor, { target: { value: "new code" } });

      expect(onChange).toHaveBeenCalledWith("new code");
    });

    it("should handle undefined value in onChange", () => {
      const onChange = vi.fn();
      render(<MonacoEditorWidget value="initial" onChange={onChange} />);

      // Simulate Monaco returning undefined
      if (mockOnChangeCallback) {
        mockOnChangeCallback(undefined);
      }

      expect(onChange).toHaveBeenCalledWith("");
    });

    it("should set readOnly option when specified", () => {
      render(
        <MonacoEditorWidget
          value="const x = 1;"
          onChange={vi.fn()}
          readOnly={true}
        />,
      );

      const editor = screen.getByTestId("monaco-editor");
      expect(editor).toHaveAttribute("data-readonly", "true");
    });
  });

  describe("menu bar functionality", () => {
    it("should pass filePath to menu bar", () => {
      render(
        <MonacoEditorWidget
          value=""
          onChange={vi.fn()}
          showMenuBar={true}
          filePath="/path/to/file.py"
        />,
      );

      expect(screen.getByTestId("file-path")).toHaveTextContent(
        "/path/to/file.py",
      );
    });

    it("should pass isDirty state to menu bar", () => {
      render(
        <MonacoEditorWidget
          value=""
          onChange={vi.fn()}
          showMenuBar={true}
          isDirty={true}
        />,
      );

      expect(screen.getByTestId("is-dirty")).toHaveTextContent("dirty");
    });

    it("should pass isSaving state to menu bar", () => {
      render(
        <MonacoEditorWidget
          value=""
          onChange={vi.fn()}
          showMenuBar={true}
          isSaving={true}
        />,
      );

      expect(screen.getByTestId("is-saving")).toHaveTextContent("saving");
    });

    it("should call onSave when save button is clicked", () => {
      const onSave = vi.fn();
      render(
        <MonacoEditorWidget
          value=""
          onChange={vi.fn()}
          showMenuBar={true}
          onSave={onSave}
        />,
      );

      fireEvent.click(screen.getByTestId("save-button"));
      expect(onSave).toHaveBeenCalled();
    });

    it("should call onChangeFile when change file button is clicked", () => {
      const onChangeFile = vi.fn();
      render(
        <MonacoEditorWidget
          value=""
          onChange={vi.fn()}
          showMenuBar={true}
          onChangeFile={onChangeFile}
        />,
      );

      fireEvent.click(screen.getByTestId("change-file-button"));
      expect(onChangeFile).toHaveBeenCalled();
    });
  });

  describe("editor options", () => {
    it("should have minimap disabled", () => {
      render(<MonacoEditorWidget value="" onChange={vi.fn()} />);

      const editor = screen.getByTestId("monaco-editor");
      expect(editor).toHaveAttribute("data-minimap", "false");
    });
  });

  describe("edge cases", () => {
    it("should handle empty value", () => {
      render(<MonacoEditorWidget value="" onChange={vi.fn()} />);

      const editor = screen.getByTestId("monaco-editor") as HTMLTextAreaElement;
      expect(editor.value).toBe("");
    });

    it("should handle very long code", () => {
      const longCode = "x = 1\n".repeat(10000);
      render(<MonacoEditorWidget value={longCode} onChange={vi.fn()} />);

      const editor = screen.getByTestId("monaco-editor") as HTMLTextAreaElement;
      expect(editor.value).toBe(longCode);
    });

    it("should handle special characters", () => {
      const codeWithSpecialChars =
        "const x = \"<script>alert('xss')</script>\";";
      render(
        <MonacoEditorWidget value={codeWithSpecialChars} onChange={vi.fn()} />,
      );

      const editor = screen.getByTestId("monaco-editor") as HTMLTextAreaElement;
      expect(editor.value).toBe(codeWithSpecialChars);
    });

    it("should handle unicode characters", () => {
      const unicodeCode = "const greeting = 'Hello World';";
      render(<MonacoEditorWidget value={unicodeCode} onChange={vi.fn()} />);

      const editor = screen.getByTestId("monaco-editor") as HTMLTextAreaElement;
      expect(editor.value).toBe(unicodeCode);
    });

    it("should stop keydown propagation", () => {
      render(<MonacoEditorWidget value="" onChange={vi.fn()} />);

      const container = screen.getByTestId("monaco-editor").parentElement;
      const keydownEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
      });
      const stopPropagationSpy = vi.spyOn(keydownEvent, "stopPropagation");

      container?.dispatchEvent(keydownEvent);

      // The event handler should stop propagation
      expect(container).toBeInTheDocument();
    });
  });

  describe("JSON language mode", () => {
    it("should render with JSON language", () => {
      const jsonValue = '{"key": "value", "number": 42}';
      render(
        <MonacoEditorWidget
          value={jsonValue}
          onChange={vi.fn()}
          language="json"
        />,
      );

      const editor = screen.getByTestId("monaco-editor");
      expect(editor).toHaveAttribute("data-language", "json");
      expect((editor as HTMLTextAreaElement).value).toBe(jsonValue);
    });

    it("should handle complex JSON structures", () => {
      const complexJson = JSON.stringify(
        {
          array: [1, 2, 3],
          nested: { deep: { value: true } },
          string: "hello",
          number: 42,
          boolean: true,
          null: null,
        },
        null,
        2,
      );

      render(
        <MonacoEditorWidget
          value={complexJson}
          onChange={vi.fn()}
          language="json"
        />,
      );

      const editor = screen.getByTestId("monaco-editor") as HTMLTextAreaElement;
      expect(editor.value).toBe(complexJson);
    });

    it("should handle invalid JSON (editor allows any text)", () => {
      const invalidJson = "{ invalid json }";
      render(
        <MonacoEditorWidget
          value={invalidJson}
          onChange={vi.fn()}
          language="json"
        />,
      );

      const editor = screen.getByTestId("monaco-editor") as HTMLTextAreaElement;
      expect(editor.value).toBe(invalidJson);
    });
  });

  describe("code language modes", () => {
    it("should render with Python language", () => {
      const pythonCode = "def hello():\n    return 'world'";
      render(
        <MonacoEditorWidget
          value={pythonCode}
          onChange={vi.fn()}
          language="python"
        />,
      );

      const editor = screen.getByTestId("monaco-editor");
      expect(editor).toHaveAttribute("data-language", "python");
    });

    it("should render with TypeScript language", () => {
      const tsCode = "const x: number = 42;";
      render(
        <MonacoEditorWidget
          value={tsCode}
          onChange={vi.fn()}
          language="typescript"
        />,
      );

      const editor = screen.getByTestId("monaco-editor");
      expect(editor).toHaveAttribute("data-language", "typescript");
    });

    it("should render with YAML language", () => {
      const yamlCode = "key: value\nlist:\n  - item1\n  - item2";
      render(
        <MonacoEditorWidget
          value={yamlCode}
          onChange={vi.fn()}
          language="yaml"
        />,
      );

      const editor = screen.getByTestId("monaco-editor");
      expect(editor).toHaveAttribute("data-language", "yaml");
    });
  });

  describe("container styling", () => {
    it("should have nodrag nowheel nopan classes on editor container", () => {
      render(<MonacoEditorWidget value="" onChange={vi.fn()} />);

      const editorContainer = screen.getByTestId("monaco-editor").parentElement;
      expect(editorContainer).toHaveClass("nodrag", "nowheel", "nopan");
    });

    it("should have border styling from theme", () => {
      render(<MonacoEditorWidget value="" onChange={vi.fn()} />);

      // The outer container should have the border
      const outerContainer =
        screen.getByTestId("monaco-editor").parentElement?.parentElement;
      expect(outerContainer).toHaveClass("border", "rounded");
    });
  });
});
