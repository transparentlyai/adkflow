"use client";

import { memo, useState, useCallback, useRef, useEffect, useMemo } from "react";
import { type NodeProps, useReactFlow, useStore } from "@xyflow/react";
import Editor, { type OnMount, type BeforeMount } from "@monaco-editor/react";
import { registerLogLanguage, LOG_LANGUAGE_ID, LOG_THEME_ID } from "@/lib/monaco";
import type { HandlePositions, HandleDataType } from "@/lib/types";
import DraggableHandle from "@/components/DraggableHandle";
import EditorMenuBar from "@/components/EditorMenuBar";
import ResizeHandle from "@/components/ResizeHandle";
import { useProject } from "@/contexts/ProjectContext";
import NodeContextMenu from "@/components/NodeContextMenu";
import { Lock, Loader2 } from "lucide-react";
import { readFileChunk } from "@/lib/api";
import { useCanvasActions } from "@/contexts/CanvasActionsContext";
import { useTheme } from "@/contexts/ThemeContext";

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
  isExpanded?: boolean;
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
    isExpanded: dataIsExpanded,
    isNodeLocked,
    handleTypes: rawHandleTypes,
  } = (data || {}) as LogProbeNodeData & { handleTypes?: Record<string, { outputType?: HandleDataType; acceptedTypes?: HandleDataType[] }> };

  const handleTypes = (rawHandleTypes || {}) as Record<string, { outputType?: HandleDataType; acceptedTypes?: HandleDataType[] }>;

  const { setNodes } = useReactFlow();
  const { projectPath, onRequestFilePicker } = useProject();
  const canvasActions = useCanvasActions();
  const { theme } = useTheme();

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

  const [isExpanded, setIsExpanded] = useState(dataIsExpanded ?? false);
  const [isEditing, setIsEditing] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [content, setContent] = useState("");

  // Pagination state
  const [totalLines, setTotalLines] = useState(0);
  const [loadedOffset, setLoadedOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);

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

  const handleEditorBeforeMount: BeforeMount = useCallback((monaco) => {
    registerLogLanguage(monaco);
  }, []);

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
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id !== id) return node;
        const currentSize = (node.data as LogProbeNodeData).expandedSize ?? { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
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

        const nodeData = node.data as unknown as LogProbeNodeData;
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
              isExpanded: false,
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
              isExpanded: true,
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
    }, { extensions: ['.log', '.txt'], filterLabel: 'Log files' });
  }, [onRequestFilePicker, file_path, id, setNodes]);

  const displayedLines = content?.split("\n").length || 0;
  const editorHeight = size.height - 70;

  if (!isExpanded) {
    return (
      <div
        onDoubleClick={toggleExpand}
        onContextMenu={handleHeaderContextMenu}
        title="Double-click to expand"
        className={`rounded-full w-9 h-9 flex items-center justify-center shadow-md cursor-pointer transition-all ${
          selected ? "shadow-xl" : ""
        }`}
        style={{
          backgroundColor: theme.colors.nodes.probe.header,
          color: theme.colors.nodes.probe.text,
          ...(selected ? {
            boxShadow: `0 0 0 2px ${theme.colors.nodes.probe.ring}`
          } : {})
        }}
      >
        <div className="flex items-center gap-0.5">
          {isNodeLocked && <Lock className="w-2 h-2 opacity-80" />}
          <span className="font-bold text-[10px]">LOG</span>
        </div>

        <DraggableHandle
          nodeId={id}
          handleId="input"
          type="target"
          defaultEdge="bottom"
          defaultPercent={50}
          handlePositions={handlePositions}
          acceptedTypes={handleTypes['input']?.acceptedTypes}
          style={{
            width: '8px',
            height: '8px',
            backgroundColor: theme.colors.handles.probe,
            border: `2px solid ${theme.colors.handles.border}`
          }}
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
      className={`rounded-lg shadow-lg relative ${
        selected ? "shadow-xl" : ""
      }`}
      style={{
        width: size.width,
        backgroundColor: theme.colors.nodes.common.container.background,
        ...(selected ? {
          boxShadow: `0 0 0 2px ${theme.colors.nodes.probe.ring}`
        } : {})
      }}
    >
      <div
        className="px-2 py-1 rounded-t-lg flex items-center justify-between cursor-pointer"
        style={{
          backgroundColor: theme.colors.nodes.probe.header,
          color: theme.colors.nodes.probe.text
        }}
        onDoubleClick={toggleExpand}
        onContextMenu={handleHeaderContextMenu}
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {isNodeLocked && <Lock className="w-3 h-3 flex-shrink-0 opacity-80" />}
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: theme.colors.nodes.probe.headerHover || theme.colors.nodes.probe.header,
              color: theme.colors.nodes.probe.text
            }}
          >
            LOG
          </span>
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={handleNameKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 px-1.5 py-0.5 rounded text-xs font-medium outline-none min-w-0"
              style={{
                backgroundColor: theme.colors.nodes.common.container.background,
                color: theme.colors.nodes.common.text.primary
              }}
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
          className="ml-1.5 p-0.5 rounded transition-colors flex-shrink-0"
          style={{
            backgroundColor: 'transparent'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.nodes.probe.headerHover || theme.colors.nodes.probe.header;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
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
        className="nodrag nowheel nopan relative"
        style={{
          height: editorHeight,
          borderBottom: `1px solid ${theme.colors.nodes.common.container.border}`
        }}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {isInitialLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: theme.colors.nodes.common.text.muted }} />
          </div>
        ) : (
          <Editor
            height="100%"
            defaultLanguage={LOG_LANGUAGE_ID}
            value={content}
            theme={theme.colors.monaco}
            beforeMount={handleEditorBeforeMount}
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
          <div
            className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white text-xs px-2 py-1 rounded flex items-center gap-1"
            style={{
              backgroundColor: theme.colors.nodes.common.text.primary
            }}
          >
            <Loader2 className="w-3 h-3 animate-spin" />
            Loading...
          </div>
        )}
      </div>

      <div
        className="px-3 py-2 rounded-b-lg flex items-center justify-between"
        style={{
          backgroundColor: theme.colors.nodes.common.footer.background
        }}
      >
        <span
          className="text-xs truncate"
          style={{ color: theme.colors.nodes.common.footer.text }}
        >
          {file_path || "No file selected"}
        </span>
        <span
          className="text-xs"
          style={{ color: theme.colors.nodes.common.text.muted }}
        >
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
        defaultEdge="bottom"
        defaultPercent={50}
        handlePositions={handlePositions}
        acceptedTypes={handleTypes['input']?.acceptedTypes}
        style={{
          width: '10px',
          height: '10px',
          backgroundColor: theme.colors.handles.probe,
          border: `2px solid ${theme.colors.handles.border}`
        }}
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

LogProbeNode.displayName = "LogProbeNode";

export default LogProbeNode;

export function getDefaultLogProbeData() {
  return {
    name: "Log",
    handleTypes: {
      'input': { acceptedSources: ['*'], acceptedTypes: ['str', 'dict', 'any'] as HandleDataType[] },
    },
  };
}
