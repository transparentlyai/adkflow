"use client";

import { memo, useState, useCallback, useRef, useEffect, useMemo } from "react";
import { type NodeProps, useReactFlow, useStore } from "@xyflow/react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type { HandlePositions } from "@/lib/types";
import DraggableHandle from "@/components/DraggableHandle";
import EditorMenuBar from "@/components/EditorMenuBar";
import ResizeHandle from "@/components/ResizeHandle";
import { useProject } from "@/contexts/ProjectContext";
import NodeContextMenu from "@/components/NodeContextMenu";
import { Lock, Loader2 } from "lucide-react";
import { readFileChunk } from "@/lib/api";

const DEFAULT_WIDTH = 400;
const DEFAULT_HEIGHT = 280;

const CHUNK_SIZE = 500; // Lines per chunk

interface LogProbeNodeData {
  name?: string;
  file_path?: string;
  handlePositions?: HandlePositions;
  expandedSize?: { width: number; height: number };
  expandedPosition?: { x: number; y: number };
  contractedPosition?: { x: number; y: number };
  isNodeLocked?: boolean;
}

const LogProbeNode = memo(({ data, id, selected }: NodeProps) => {
  const {
    name = "Log",
    file_path,
    handlePositions,
    expandedSize,
    expandedPosition,
    contractedPosition,
    isNodeLocked,
  } = (data || {}) as LogProbeNodeData;

  const { setNodes } = useReactFlow();
  const { projectPath, onRequestFilePicker } = useProject();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [content, setContent] = useState("");

  // Pagination state
  const [totalLines, setTotalLines] = useState(0);
  const [loadedOffset, setLoadedOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);

  const currentNode = useStore((state) => state.nodes.find((n) => n.id === id));
  const parentId = currentNode?.parentId;

  const size = useMemo(() => expandedSize ?? { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT }, [expandedSize]);
  const [editedName, setEditedName] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Initial load - fetch first chunk (newest lines, reversed)
  useEffect(() => {
    const loadInitialContent = async () => {
      if (file_path && projectPath) {
        setIsInitialLoading(true);
        try {
          const response = await readFileChunk(projectPath, file_path, 0, CHUNK_SIZE, true);
          setContent(response.content);
          setTotalLines(response.total_lines);
          setLoadedOffset(CHUNK_SIZE);
          setHasMore(response.has_more);
        } catch (error) {
          console.error("Failed to load file content:", error);
          setContent("");
          setTotalLines(0);
          setHasMore(false);
        } finally {
          setIsInitialLoading(false);
        }
      } else {
        setContent("");
        setTotalLines(0);
        setLoadedOffset(0);
        setHasMore(false);
      }
    };
    loadInitialContent();
  }, [file_path, projectPath]);

  // Load more content (older lines)
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || !file_path || !projectPath) return;

    setIsLoadingMore(true);
    try {
      const response = await readFileChunk(projectPath, file_path, loadedOffset, CHUNK_SIZE, true);
      if (response.content) {
        // Append older lines at the bottom (since we're reversed, older = bottom)
        setContent((prev) => prev + "\n" + response.content);
        setLoadedOffset((prev) => prev + CHUNK_SIZE);
        setHasMore(response.has_more);
      }
    } catch (error) {
      console.error("Failed to load more content:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, file_path, projectPath, loadedOffset]);

  const handleEditorMount: OnMount = useCallback((editor) => {
    editor.onDidScrollChange(() => {
      const model = editor.getModel();
      if (!model) return;

      const visibleRanges = editor.getVisibleRanges();
      if (visibleRanges.length === 0) return;

      const lastVisibleLine = visibleRanges[visibleRanges.length - 1].endLineNumber;
      const totalModelLines = model.getLineCount();

      // If scrolled near the bottom (within 5 lines), load more
      if (lastVisibleLine >= totalModelLines - 5) {
        loadMore();
      }
    });
  }, [loadMore]);

  const handleResize = useCallback((deltaWidth: number, deltaHeight: number) => {
    const newSize = {
      width: Math.max(100, size.width + deltaWidth),
      height: Math.max(100, size.height + deltaHeight),
    };
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, expandedSize: newSize } }
          : node
      )
    );
  }, [id, size, setNodes]);

  const toggleExpand = useCallback(() => {
    const currentPosition = currentNode?.position;
    if (!currentPosition) {
      setIsExpanded(!isExpanded);
      return;
    }

    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id !== id) return node;

        const nodeData = node.data as unknown as LogProbeNodeData;

        if (isExpanded) {
          // Going from expanded → contracted
          return {
            ...node,
            position: nodeData.contractedPosition ?? currentPosition,
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
            data: {
              ...nodeData,
              contractedPosition: currentPosition,
            },
          };
        }
      })
    );
    setIsExpanded(!isExpanded);
  }, [id, isExpanded, currentNode, setNodes]);

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
    });
  }, [onRequestFilePicker, file_path, id, setNodes]);

  const displayedLines = content?.split("\n").length || 0;
  const editorHeight = size.height - 70;

  if (!isExpanded) {
    return (
      <div
        onDoubleClick={toggleExpand}
        onContextMenu={handleHeaderContextMenu}
        title="Double-click to expand"
        className={`bg-gray-700 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-md cursor-pointer hover:bg-gray-600 transition-all ${
          selected ? "ring-2 ring-gray-400 shadow-xl" : ""
        }`}
      >
        <div className="flex items-center gap-0.5">
          {isNodeLocked && <Lock className="w-2.5 h-2.5 opacity-80" />}
          <span className="font-bold text-xs">LOG</span>
        </div>

        <DraggableHandle
          nodeId={id}
          handleId="input"
          type="target"
          defaultEdge="left"
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
          <span className="bg-gray-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">LOG</span>
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
        className="border-b border-gray-200 nodrag nowheel nopan relative"
        style={{ height: editorHeight }}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {isInitialLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <Editor
            height="100%"
            defaultLanguage="markdown"
            value={content}
            theme="vs-light"
            onMount={handleEditorMount}
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
                horizontal: "auto",
                verticalScrollbarSize: 8,
                horizontalScrollbarSize: 8,
              },
              wordWrap: "off",
              automaticLayout: true,
              padding: { top: 8, bottom: 8 },
            }}
          />
        )}
        {isLoadingMore && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Loading...
          </div>
        )}
      </div>

      <div className="bg-gray-50 px-3 py-2 rounded-b-lg flex items-center justify-between">
        <span className="text-xs text-gray-500 truncate">{file_path || "No file selected"}</span>
        <span className="text-xs text-gray-400">
          {totalLines > 0 ? (
            <>
              {displayedLines} / {totalLines} lines
              {hasMore && " (scroll for more)"}
            </>
          ) : (
            `${displayedLines} lines`
          )}
        </span>
      </div>

      <ResizeHandle onResize={handleResize} />

      <DraggableHandle
        nodeId={id}
        handleId="input"
        type="target"
        defaultEdge="left"
        defaultPercent={50}
        handlePositions={handlePositions}
        style={{ width: '12px', height: '12px', backgroundColor: '#6b7280', border: '2px solid white' }}
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

LogProbeNode.displayName = "LogProbeNode";

export default LogProbeNode;

export function getDefaultLogProbeData() {
  return {
    name: "Log",
  };
}
