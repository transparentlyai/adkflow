"use client";

import { memo, useState, useCallback } from "react";
import { Handle, Position, type NodeProps, useReactFlow } from "@xyflow/react";
import Editor from "@monaco-editor/react";
import type { HandlePositions } from "@/lib/types";
import DraggableHandle from "@/components/DraggableHandle";
import EditorMenuBar from "@/components/EditorMenuBar";
import { useProject } from "@/contexts/ProjectContext";

const DEFAULT_CODE = `def tool(input_data: dict) -> dict:
    """
    Tool function that processes input and returns output.

    Args:
        input_data: Dictionary containing input parameters

    Returns:
        Dictionary with tool output
    """
    # Your tool logic here
    result = input_data

    return result
`;

interface ToolNodeData {
  name?: string;
  code?: string;
  file_path?: string;
  handlePositions?: HandlePositions;
}

const ToolNode = memo(({ data, id, selected }: NodeProps) => {
  const { name = "Tool", code = DEFAULT_CODE, file_path, handlePositions } = data as ToolNodeData;
  const { setNodes } = useReactFlow();
  const { onSaveFile, onRequestFilePicker } = useProject();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleDoubleClick = () => {
    setIsExpanded(!isExpanded);
  };

  const handleCodeChange = useCallback((value: string | undefined) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                code: value || "",
              },
            }
          : node
      )
    );
  }, [id, setNodes]);

  const handleSave = useCallback(async () => {
    if (!onSaveFile || !file_path) return;
    setIsSaving(true);
    try {
      await onSaveFile(file_path, code);
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  }, [onSaveFile, file_path, code]);

  const handleChangeFile = useCallback(() => {
    if (!onRequestFilePicker) return;
    onRequestFilePicker(file_path || "", (newPath) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  file_path: newPath,
                },
              }
            : node
        )
      );
    });
  }, [onRequestFilePicker, file_path, id, setNodes]);

  const lineCount = code?.split("\n").length || 0;

  // Collapsed view - circular tool icon
  if (!isExpanded) {
    return (
      <div
        onDoubleClick={handleDoubleClick}
        title={`${name} (double-click to expand)`}
        className={`bg-cyan-600 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-md cursor-pointer hover:bg-cyan-700 transition-all ${
          selected ? "ring-2 ring-cyan-400 shadow-xl" : ""
        }`}
      >
        <div className="text-xs">Tool</div>

        {/* Output Handle */}
        <Handle
          type="source"
          position={Position.Right}
          style={{ width: '10px', height: '10px', backgroundColor: '#0891b2', border: '2px solid white' }}
        />
      </div>
    );
  }

  // Expanded view - with code editor
  return (
    <div
      className={`bg-white rounded-lg shadow-lg transition-all ${
        selected ? "ring-2 ring-cyan-500 shadow-xl" : ""
      }`}
      style={{ width: 500 }}
    >
      {/* Header */}
      <div
        className="bg-cyan-600 text-white px-3 py-1.5 rounded-t-lg flex items-center justify-between cursor-pointer"
        onDoubleClick={handleDoubleClick}
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="font-semibold text-sm">Tool</span>
        </div>
        <span className="text-xs opacity-75">double-click to collapse</span>
      </div>

      {/* Menu Bar */}
      <EditorMenuBar
        onSave={handleSave}
        onChangeFile={handleChangeFile}
        filePath={file_path}
        isSaving={isSaving}
      />

      {/* Code Editor */}
      <div
        className="border-b border-gray-200 nodrag nowheel"
        style={{ height: 250 }}
      >
        <Editor
          height="100%"
          defaultLanguage="python"
          value={code}
          onChange={handleCodeChange}
          theme="vs-light"
          options={{
            minimap: { enabled: false },
            fontSize: 12,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            folding: false,
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 3,
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
          }}
        />
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-3 py-2 rounded-b-lg flex items-center justify-between">
        <span className="text-xs text-gray-500">{name}</span>
        <span className="text-xs text-gray-400">{lineCount} lines</span>
      </div>

      {/* Output Handle */}
      <DraggableHandle
        nodeId={id}
        handleId="output"
        type="source"
        defaultEdge="right"
        defaultPercent={50}
        handlePositions={handlePositions}
        style={{ width: '12px', height: '12px', backgroundColor: '#0891b2', border: '2px solid white' }}
      />
    </div>
  );
});

ToolNode.displayName = "ToolNode";

export default ToolNode;

/**
 * Default tool data for new nodes
 */
export function getDefaultToolData() {
  return {
    name: "Tool",
    code: DEFAULT_CODE,
  };
}
