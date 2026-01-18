"use client";

import { useCallback, useRef, useEffect } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useTheme } from "@/contexts/ThemeContext";
import EditorMenuBar from "@/components/EditorMenuBar";

export interface MonacoEditorWidgetProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  readOnly?: boolean;
  showMenuBar?: boolean;
  filePath?: string;
  onSave?: () => void;
  onChangeFile?: () => void;
  height?: string | number;
  isDirty?: boolean;
  isSaving?: boolean;
  hideGutter?: boolean;
}

export default function MonacoEditorWidget({
  value,
  onChange,
  language = "python",
  readOnly = false,
  showMenuBar = false,
  filePath,
  onSave,
  onChangeFile,
  height = 200,
  isDirty = false,
  isSaving = false,
  hideGutter = false,
}: MonacoEditorWidgetProps) {
  const { theme } = useTheme();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  // Track the last value we set programmatically to avoid loops
  const lastExternalValueRef = useRef<string>(value);

  // Sync external value changes to the editor
  // This handles updates from file sync (when another node modifies the same file)
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    // Update if the value prop differs from what we last tracked
    // This means it's an external change (not from user typing)
    if (value !== lastExternalValueRef.current) {
      lastExternalValueRef.current = value;

      // Only call setValue if the editor doesn't already have this value
      const currentEditorValue = editor.getValue();
      if (value !== currentEditorValue) {
        // Preserve cursor position when updating
        const position = editor.getPosition();
        editor.setValue(value);
        if (position) {
          editor.setPosition(position);
        }
      }
    }
  }, [value]);

  const handleEditorChange = useCallback(
    (newValue: string | undefined) => {
      lastExternalValueRef.current = newValue ?? "";
      onChange(newValue ?? "");
    },
    [onChange],
  );

  const handleEditorMount = useCallback(
    (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
      editorRef.current = editor;
      lastExternalValueRef.current = value;

      // Register Ctrl+S / Cmd+S keyboard shortcut for save
      if (onSave) {
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () =>
          onSave(),
        );
      }
    },
    [onSave, value],
  );

  const computedHeight = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      className="flex flex-col rounded overflow-hidden border"
      style={{
        borderColor: theme.colors.nodes.common.container.border,
      }}
    >
      {showMenuBar && (
        <EditorMenuBar
          onSave={onSave}
          onChangeFile={onChangeFile}
          filePath={filePath}
          isSaving={isSaving}
          isDirty={isDirty}
        />
      )}

      <div
        className="nodrag nowheel nopan"
        style={{
          height: computedHeight,
        }}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Editor
          height="100%"
          language={language}
          value={value}
          onChange={handleEditorChange}
          onMount={handleEditorMount}
          theme={theme.colors.monaco}
          options={{
            minimap: { enabled: false },
            fontSize: 12,
            lineNumbers: hideGutter ? "off" : "on",
            scrollBeyondLastLine: false,
            folding: hideGutter ? false : false,
            lineDecorationsWidth: hideGutter ? 0 : 10,
            lineNumbersMinChars: hideGutter ? 0 : 4,
            glyphMargin: hideGutter ? false : false,
            renderLineHighlight: "none",
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            overviewRulerBorder: false,
            scrollbar: {
              vertical: "auto",
              horizontal: "hidden",
              verticalScrollbarSize: 8,
            },
            wordWrap: "on",
            automaticLayout: true,
            padding: { top: 8, bottom: 8 },
            readOnly,
          }}
        />
      </div>
    </div>
  );
}
