"use client";

import { memo, useState, useCallback, useRef, useEffect, useMemo } from "react";
import { type NodeProps, useReactFlow, useStore } from "@xyflow/react";
import Editor from "@monaco-editor/react";
import type { Prompt, HandlePositions } from "@/lib/types";
import DraggableHandle from "@/components/DraggableHandle";
import EditorMenuBar from "@/components/EditorMenuBar";
import ResizeHandle from "@/components/ResizeHandle";
import { useProject } from "@/contexts/ProjectContext";
import NodeContextMenu from "@/components/NodeContextMenu";
import { Lock } from "lucide-react";

const DEFAULT_WIDTH = 500;
const DEFAULT_HEIGHT = 320;

export interface PromptNodeData {
  prompt: Prompt;
  content?: string;
  handlePositions?: HandlePositions;
  expandedSize?: { width: number; height: number };
  expandedPosition?: { x: number; y: number };
  contractedPosition?: { x: number; y: number };
  isNodeLocked?: boolean;
}

const PromptNode = memo(({ data, id, selected }: NodeProps) => {
  const { prompt, content = "", handlePositions, expandedSize, expandedPosition, contractedPosition, isNodeLocked } = data as unknown as PromptNodeData;
  const { setNodes } = useReactFlow();
  const { onSaveFile, onRequestFilePicker } = useProject();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const currentNode = useStore((state) => state.nodes.find((n) => n.id === id));
  const parentId = currentNode?.parentId;

  const size = useMemo(() => expandedSize ?? { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT }, [expandedSize]);
  const [editedName, setEditedName] = useState(prompt.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleResize = useCallback((deltaWidth: number, deltaHeight: number) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id !== id) return node;
        const currentSize = (node.data as unknown as PromptNodeData).expandedSize ?? { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
        return {
          ...node,
          data: {
            ...node.data,
            expandedSize: {
              width: Math.max(100, currentSize.width + deltaWidth),
              height: Math.max(100, currentSize.height + deltaHeight),
            },
          },
        };
      })
    );
  }, [id, setNodes]);

  const handleNameDoubleClick = (e: React.MouseEvent) => {
    if (isNodeLocked) return;
    e.stopPropagation();
    setIsEditing(true);
    setEditedName(prompt.name);
  };

  const handleHeaderContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleToggleNodeLock = useCallback(() => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, isNodeLocked: !isNodeLocked } }
          : node
      )
    );
  }, [id, isNodeLocked, setNodes]);

  const handleDetach = useCallback(() => {
    setNodes((nodes) => {
      const thisNode = nodes.find((n) => n.id === id);
      const parentNode = nodes.find((n) => n.id === thisNode?.parentId);
      if (!thisNode || !parentNode) return nodes;

      return nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              parentId: undefined,
              position: {
                x: thisNode.position.x + parentNode.position.x,
                y: thisNode.position.y + parentNode.position.y,
              },
            }
          : node
      );
    });
  }, [id, setNodes]);

  const handleNameSave = () => {
    if (editedName.trim()) {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  prompt: { ...prompt, name: editedName.trim() },
                },
              }
            : node
        )
      );
    }
    setIsEditing(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleNameSave();
    } else if (e.key === "Escape") {
      setEditedName(prompt.name);
      setIsEditing(false);
    }
  };

  const handleContentChange = useCallback((value: string | undefined) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                content: value || "",
              },
            }
          : node
      )
    );
  }, [id, setNodes]);

  const handleSave = useCallback(async () => {
    if (!onSaveFile || !prompt.file_path) return;
    setIsSaving(true);
    try {
      await onSaveFile(prompt.file_path, content);
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  }, [onSaveFile, prompt.file_path, content]);

  const handleChangeFile = useCallback(() => {
    if (!onRequestFilePicker) return;
    onRequestFilePicker(prompt.file_path, (newPath) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  prompt: { ...prompt, file_path: newPath },
                },
              }
            : node
        )
      );
    });
  }, [onRequestFilePicker, prompt, id, setNodes]);

  const toggleExpand = useCallback(() => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id !== id) return node;

        const nodeData = node.data as unknown as PromptNodeData;
        const currentPosition = node.position;

        if (isExpanded) {
          // Going from expanded → contracted
          return {
            ...node,
            position: nodeData.contractedPosition ?? currentPosition,
            extent: node.parentId ? "parent" as const : undefined,
            data: {
              ...nodeData,
              expandedPosition: currentPosition,
            },
          };
        } else {
          // Going from contracted → expanded
          return {
            ...node,
            position: nodeData.expandedPosition ?? currentPosition,
            extent: undefined,
            data: {
              ...nodeData,
              contractedPosition: currentPosition,
            },
          };
        }
      })
    );
    setIsExpanded(!isExpanded);
  }, [id, isExpanded, setNodes]);

  const lineCount = content?.split("\n").length || 0;

  const editorHeight = size.height - 70;

  return (
    <div
      className={`bg-white rounded-lg shadow-lg relative ${
        selected ? "ring-2 ring-green-500 shadow-xl" : ""
      }`}
      style={{
        width: isExpanded ? size.width : 'auto',
        minWidth: isExpanded ? size.width : 'auto',
      }}
    >
      {/* Header */}
      <div
        className={`bg-green-600 text-white px-2 py-1 flex items-center justify-between cursor-pointer ${isExpanded ? 'rounded-t-lg' : 'rounded-lg'}`}
        style={{ minWidth: isExpanded ? undefined : 'auto' }}
        onDoubleClick={toggleExpand}
        onContextMenu={handleHeaderContextMenu}
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {isNodeLocked && <Lock className="w-3 h-3 flex-shrink-0 opacity-80" />}
          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={handleNameKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 bg-white text-gray-900 px-1.5 py-0.5 rounded text-xs font-medium outline-none min-w-0"
            />
          ) : (
            <span
              className="font-medium text-xs truncate hover:opacity-80"
              onDoubleClick={handleNameDoubleClick}
            >
              {prompt.name}
            </span>
          )}
        </div>
        <button
          onClick={toggleExpand}
          className="ml-1.5 p-0.5 hover:bg-green-700 rounded transition-colors flex-shrink-0"
          title={isExpanded ? "Collapse" : "Expand"}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isExpanded ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            )}
          </svg>
        </button>
      </div>

      {/* Expanded: Menu Bar & Editor */}
      {isExpanded && (
        <>
          <EditorMenuBar
            onSave={handleSave}
            onChangeFile={handleChangeFile}
            filePath={prompt.file_path}
            isSaving={isSaving}
          />
          <div
            className="border-b border-gray-200 nodrag nowheel nopan"
            style={{ height: editorHeight }}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Editor
              height="100%"
              defaultLanguage="markdown"
              value={content}
              onChange={handleContentChange}
              theme="vs-light"
              options={{
                minimap: { enabled: false },
                fontSize: 12,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                folding: false,
                lineDecorationsWidth: 10,
                lineNumbersMinChars: 4,
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
                readOnly: isNodeLocked,
              }}
            />
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-3 py-2 rounded-b-lg flex items-center justify-between">
            <span className="text-xs text-gray-500 truncate max-w-[200px]">{prompt.name}</span>
            <span className="text-xs text-gray-400">{lineCount} lines</span>
          </div>

          {/* Resize Handle */}
          <ResizeHandle onResize={handleResize} />
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
        style={{ width: '10px', height: '10px', backgroundColor: '#22c55e', border: '2px solid white' }}
      />

      {contextMenu && (
        <NodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isLocked={!!isNodeLocked}
          onToggleLock={handleToggleNodeLock}
          onClose={() => setContextMenu(null)}
          onDetach={parentId ? handleDetach : undefined}
        />
      )}
    </div>
  );
});

PromptNode.displayName = "PromptNode";

export default PromptNode;

/**
 * Default prompt data for new nodes
 */
export function getDefaultPromptData(): Omit<Prompt, "id"> {
  return {
    name: "New Prompt",
    file_path: "",
  };
}
