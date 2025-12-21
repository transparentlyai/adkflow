"use client";

import { memo, useState, useCallback, useRef, useEffect, useMemo } from "react";
import { type NodeProps, useReactFlow, useStore } from "@xyflow/react";
import Editor from "@monaco-editor/react";
import type { HandlePositions } from "@/lib/types";
import DraggableHandle from "@/components/DraggableHandle";
import EditorMenuBar from "@/components/EditorMenuBar";
import ResizeHandle from "@/components/ResizeHandle";
import { useProject } from "@/contexts/ProjectContext";
import NodeContextMenu from "@/components/NodeContextMenu";
import { Lock } from "lucide-react";
import { readPrompt } from "@/lib/api";
import { useCanvasActions } from "@/contexts/CanvasActionsContext";

const DEFAULT_WIDTH = 400;
const DEFAULT_HEIGHT = 280;

interface OutputProbeNodeData {
  name?: string;
  file_path?: string;
  handlePositions?: HandlePositions;
  expandedSize?: { width: number; height: number };
  expandedPosition?: { x: number; y: number };
  contractedPosition?: { x: number; y: number };
  isNodeLocked?: boolean;
}

const OutputProbeNode = memo(({ data, id, selected }: NodeProps) => {
  const {
    name = "Output",
    file_path,
    handlePositions,
    expandedSize,
    expandedPosition,
    contractedPosition,
    isNodeLocked,
  } = (data || {}) as OutputProbeNodeData;

  const { setNodes } = useReactFlow();
  const { projectPath, onRequestFilePicker } = useProject();
  const canvasActions = useCanvasActions();

  const handleCopy = useCallback(() => {
    setNodes((nodes) => nodes.map((n) => ({ ...n, selected: n.id === id })));
    setTimeout(() => canvasActions?.copySelectedNodes(), 0);
  }, [id, setNodes, canvasActions]);

  const handleCut = useCallback(() => {
    setNodes((nodes) => nodes.map((n) => ({ ...n, selected: n.id === id })));
    setTimeout(() => canvasActions?.cutSelectedNodes(), 0);
  }, [id, setNodes, canvasActions]);

  const handlePaste = useCallback(() => {
    canvasActions?.pasteNodes();
  }, [canvasActions]);

  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [content, setContent] = useState("");

  // Optimized selector: only subscribe to parentId changes for this specific node
  const parentId = useStore(
    useCallback((state) => state.nodes.find((n) => n.id === id)?.parentId, [id])
  );

  const size = useMemo(() => expandedSize ?? { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT }, [expandedSize]);
  const [editedName, setEditedName] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    const loadContent = async () => {
      if (file_path && projectPath) {
        try {
          const response = await readPrompt(projectPath, file_path);
          setContent(response.content);
        } catch (error) {
          console.error("Failed to load file content:", error);
          setContent("");
        }
      } else {
        setContent("");
      }
    };
    loadContent();
  }, [file_path, projectPath]);

  const handleResize = useCallback((deltaWidth: number, deltaHeight: number) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id !== id) return node;
        const currentSize = (node.data as OutputProbeNodeData).expandedSize ?? { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
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

  const toggleExpand = useCallback(() => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id !== id) return node;

        const nodeData = node.data as unknown as OutputProbeNodeData;
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

  const handleNameDoubleClick = (e: React.MouseEvent) => {
    if (isNodeLocked) return;
    e.stopPropagation();
    setIsEditing(true);
    setEditedName(name);
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
                  name: editedName.trim(),
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
      setEditedName(name);
      setIsEditing(false);
    }
  };

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
    }, { extensions: ['.log', '.txt', '.json'], filterLabel: 'Probe files' });
  }, [onRequestFilePicker, file_path, id, setNodes]);

  const lineCount = content?.split("\n").length || 0;
  const editorHeight = size.height - 70;

  if (!isExpanded) {
    return (
      <div
        onDoubleClick={toggleExpand}
        onContextMenu={handleHeaderContextMenu}
        title="Double-click to expand"
        className={`bg-gray-700 text-white rounded-full w-9 h-9 flex items-center justify-center shadow-md cursor-pointer hover:bg-gray-600 transition-all ${
          selected ? "ring-2 ring-gray-400 shadow-xl" : ""
        }`}
      >
        <div className="flex items-center gap-0.5">
          {isNodeLocked && <Lock className="w-2 h-2 opacity-80" />}
          <span className="font-bold text-[10px]">OUT</span>
        </div>

        <DraggableHandle
          nodeId={id}
          handleId="input"
          type="target"
          defaultEdge="bottom"
          defaultPercent={50}
          handlePositions={handlePositions}
          style={{ width: '8px', height: '8px', backgroundColor: '#6b7280', border: '2px solid white' }}
        />

        {contextMenu && (
          <NodeContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            isLocked={!!isNodeLocked}
            onToggleLock={handleToggleNodeLock}
            onClose={() => setContextMenu(null)}
            onDetach={parentId ? handleDetach : undefined}
            onCopy={handleCopy}
            onCut={handleCut}
            onPaste={handlePaste}
            hasClipboard={canvasActions?.hasClipboard}
            isCanvasLocked={canvasActions?.isLocked}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-lg shadow-lg relative ${
        selected ? "ring-2 ring-gray-500 shadow-xl" : ""
      }`}
      style={{ width: size.width }}
    >
      <div
        className="bg-gray-700 text-white px-2 py-1 rounded-t-lg flex items-center justify-between cursor-pointer"
        onDoubleClick={toggleExpand}
        onContextMenu={handleHeaderContextMenu}
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {isNodeLocked && <Lock className="w-3 h-3 flex-shrink-0 opacity-80" />}
          <span className="bg-gray-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">OUT</span>
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
              {name}
            </span>
          )}
        </div>
        <button
          onClick={toggleExpand}
          className="ml-1.5 p-0.5 hover:bg-gray-600 rounded transition-colors flex-shrink-0"
          title="Collapse"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
      </div>

      <EditorMenuBar
        onChangeFile={handleChangeFile}
        filePath={file_path}
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
          theme="vs-light"
          options={{
            readOnly: true,
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
          }}
        />
      </div>

      <div className="bg-gray-50 px-3 py-2 rounded-b-lg flex items-center justify-between">
        <span className="text-xs text-gray-500 truncate">{file_path || "No file selected"}</span>
        <span className="text-xs text-gray-400">{lineCount} lines</span>
      </div>

      <ResizeHandle onResize={handleResize} />

      <DraggableHandle
        nodeId={id}
        handleId="input"
        type="target"
        defaultEdge="bottom"
        defaultPercent={50}
        handlePositions={handlePositions}
        style={{ width: '10px', height: '10px', backgroundColor: '#6b7280', border: '2px solid white' }}
      />

      {contextMenu && (
        <NodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isLocked={!!isNodeLocked}
          onToggleLock={handleToggleNodeLock}
          onClose={() => setContextMenu(null)}
          onDetach={parentId ? handleDetach : undefined}
          onCopy={handleCopy}
          onCut={handleCut}
          onPaste={handlePaste}
          hasClipboard={canvasActions?.hasClipboard}
          isCanvasLocked={canvasActions?.isLocked}
        />
      )}
    </div>
  );
});

OutputProbeNode.displayName = "OutputProbeNode";

export default OutputProbeNode;

export function getDefaultOutputProbeData() {
  return {
    name: "Output",
  };
}
