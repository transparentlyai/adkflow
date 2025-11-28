"use client";

import { memo, useState, useRef, useEffect, useCallback, useMemo } from "react";
import { type NodeProps, useReactFlow } from "@xyflow/react";
import Editor from "@monaco-editor/react";
import type { HandlePositions } from "@/lib/types";
import DraggableHandle from "@/components/DraggableHandle";
import EditorMenuBar from "@/components/EditorMenuBar";
import { useProject } from "@/contexts/ProjectContext";

export interface ProcessNodeData extends Record<string, unknown> {
  name: string;
  code: string;
  description?: string;
  file_path?: string;
  handlePositions?: HandlePositions;
}

const DEFAULT_CODE = `def process(input_data: dict) -> dict:
    """
    Process the input data and return the result.

    Args:
        input_data: Dictionary containing input from connected nodes

    Returns:
        Dictionary with processed output
    """
    # Your processing logic here
    result = input_data

    return result
`;

// Parse function signature from Python code
function parseFunctionSignature(code: string): { name: string; params: string; returnType: string } | null {
  // Match: def function_name(params) -> return_type:
  const match = code.match(/def\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*([^:]+))?:/);
  if (!match) return null;

  return {
    name: match[1],
    params: match[2].trim(),
    returnType: match[3]?.trim() || "None",
  };
}

const ProcessNode = memo(({ data, id, selected }: NodeProps) => {
  const { name, code, file_path, handlePositions } = data as unknown as ProcessNodeData;
  const { setNodes } = useReactFlow();
  const { onSaveFile, onRequestFilePicker } = useProject();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(name);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse function signature from code
  const signature = useMemo(() => parseFunctionSignature(code || ""), [code]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    setIsEditing(true);
    setEditedName(name);
  };

  const handleSave = () => {
    if (editedName.trim()) {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  name: editedName.trim(),
                },
              }
            : node
        )
      );
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setEditedName(name);
      setIsEditing(false);
    }
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

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleSaveFile = useCallback(async () => {
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

  // Calculate lines of code for display
  const lineCount = code?.split("\n").length || 0;

  return (
    <div
      className={`bg-white rounded-lg shadow-lg transition-all ${
        selected ? "ring-2 ring-emerald-500 shadow-xl" : ""
      }`}
      style={{
        width: isExpanded ? 600 : 220,
        minWidth: isExpanded ? 600 : 220,
      }}
    >
      {/* Input Handle */}
      <DraggableHandle
        nodeId={id}
        handleId="input"
        type="target"
        defaultEdge="left"
        defaultPercent={50}
        handlePositions={handlePositions}
        style={{ width: '12px', height: '12px', backgroundColor: '#10b981', border: '2px solid white' }}
      />

      {/* Header */}
      <div className={`bg-emerald-600 text-white px-3 py-1.5 flex items-center justify-between ${isExpanded ? 'rounded-t-lg' : 'rounded-lg'}`}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 bg-white text-gray-900 px-2 py-0.5 rounded text-sm font-semibold outline-none min-w-0"
            />
          ) : (
            <div
              className="font-semibold text-sm cursor-pointer hover:opacity-80 truncate"
              onDoubleClick={handleDoubleClick}
            >
              {name}
            </div>
          )}
        </div>
        <button
          onClick={toggleExpand}
          className="ml-2 p-1 hover:bg-emerald-700 rounded transition-colors flex-shrink-0"
          title={isExpanded ? "Collapse" : "Expand"}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isExpanded ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            )}
          </svg>
        </button>
      </div>

      {/* Collapsed: Function Signature View */}
      {!isExpanded && (
        <div className="px-3 py-3 bg-gray-50 rounded-b-lg">
          {signature ? (
            <div className="font-mono text-xs space-y-1.5">
              <div className="flex items-center gap-1">
                <span className="text-purple-600 font-semibold">def</span>
                <span className="text-emerald-700 font-semibold">{signature.name}</span>
              </div>
              <div className="text-gray-600 pl-2 border-l-2 border-gray-200">
                <div className="text-gray-500 text-[10px] uppercase tracking-wide mb-0.5">Parameters</div>
                <div className="text-gray-700">{signature.params || "None"}</div>
              </div>
              <div className="text-gray-600 pl-2 border-l-2 border-gray-200">
                <div className="text-gray-500 text-[10px] uppercase tracking-wide mb-0.5">Returns</div>
                <div className="text-blue-600">{signature.returnType}</div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-400 italic">No function signature found</div>
          )}
        </div>
      )}

      {/* Expanded: Menu Bar & Code Editor */}
      {isExpanded && (
        <>
          <EditorMenuBar
            onSave={handleSaveFile}
            onChangeFile={handleChangeFile}
            filePath={file_path}
            isSaving={isSaving}
          />
          <div
            className="border-b border-gray-200 nodrag nowheel"
            style={{ height: 300 }}
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

          {/* Footer - only shown when expanded */}
          <div className="bg-gray-50 px-3 py-2 rounded-b-lg flex items-center justify-between">
            <span className="text-xs text-gray-500">Process</span>
            <span className="text-xs text-gray-400">{lineCount} lines</span>
          </div>
        </>
      )}

      {/* Output Handle */}
      <DraggableHandle
        nodeId={id}
        handleId="output"
        type="source"
        defaultEdge="right"
        defaultPercent={50}
        handlePositions={handlePositions}
        style={{ width: '12px', height: '12px', backgroundColor: '#22c55e', border: '2px solid white' }}
      />
    </div>
  );
});

ProcessNode.displayName = "ProcessNode";

export default ProcessNode;

export function getDefaultProcessData(): ProcessNodeData {
  return {
    name: "Process",
    code: DEFAULT_CODE,
    description: "",
  };
}
