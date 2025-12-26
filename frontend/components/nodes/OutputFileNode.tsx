"use client";

import { memo, useState, useCallback, useRef, useEffect, useMemo } from "react";
import { type NodeProps, useReactFlow, useStore } from "@xyflow/react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type { HandlePositions, HandleDataType } from "@/lib/types";
import DraggableHandle from "@/components/DraggableHandle";
import EditorMenuBar from "@/components/EditorMenuBar";
import ResizeHandle from "@/components/ResizeHandle";
import { useProject } from "@/contexts/ProjectContext";
import NodeContextMenu from "@/components/NodeContextMenu";
import { Lock, Loader2, FileInput, RefreshCw } from "lucide-react";
import { readFileChunk } from "@/lib/api";
import { useCanvasActions } from "@/contexts/CanvasActionsContext";
import { useTheme } from "@/contexts/ThemeContext";

const DEFAULT_WIDTH = 400;
const DEFAULT_HEIGHT = 280;

const CHUNK_SIZE = 500; // Lines per chunk

// Map file extensions to Monaco language IDs
function getMonacoLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    json: 'json',
    yaml: 'yaml', yml: 'yaml',
    py: 'python',
    js: 'javascript', jsx: 'javascript',
    ts: 'typescript', tsx: 'typescript',
    md: 'markdown',
    txt: 'plaintext',
    xml: 'xml',
    html: 'html', htm: 'html',
    css: 'css',
    sql: 'sql',
    sh: 'shell', bash: 'shell',
    go: 'go',
    rs: 'rust',
    java: 'java',
    c: 'c', h: 'c',
    cpp: 'cpp', hpp: 'cpp', cc: 'cpp',
    rb: 'ruby',
    php: 'php',
    swift: 'swift',
    kt: 'kotlin',
    scala: 'scala',
    r: 'r',
    csv: 'plaintext',
    log: 'plaintext',
  };
  return langMap[ext || ''] || 'plaintext';
}

interface OutputFileNodeData {
  name?: string;
  file_path?: string;
  handlePositions?: HandlePositions;
  expandedSize?: { width: number; height: number };
  expandedPosition?: { x: number; y: number };
  contractedPosition?: { x: number; y: number };
  isExpanded?: boolean;
  isNodeLocked?: boolean;
}

const OutputFileNode = memo(({ data, id, selected }: NodeProps) => {
  const {
    name = "Output",
    file_path = "outputs/output.txt",
    handlePositions,
    expandedSize,
    expandedPosition,
    contractedPosition,
    isExpanded: dataIsExpanded,
    isNodeLocked,
  } = (data || {}) as OutputFileNodeData;

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
  const [contentSnippet, setContentSnippet] = useState("");

  // Pagination state
  const [totalLines, setTotalLines] = useState(0);
  const [loadedOffset, setLoadedOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  // Load file content
  const loadContent = useCallback(async (isRefresh = false) => {
    if (!file_path || !projectPath) {
      setContent("");
      setContentSnippet("");
      setTotalLines(0);
      setHasMore(false);
      return;
    }

    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsInitialLoading(true);
    }

    try {
      const response = await readFileChunk(projectPath, file_path, 0, CHUNK_SIZE, false);
      setContent(response.content);
      setContentSnippet(response.content.slice(0, 100));
      setTotalLines(response.total_lines);
      setLoadedOffset(CHUNK_SIZE);
      setHasMore(response.has_more);
    } catch (error) {
      // File not found is expected for output files in new projects - don't log as error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes("File not found") && !errorMessage.includes("not found")) {
        console.error("Failed to load file content:", error);
      }
      setContent("");
      setContentSnippet("");
      setTotalLines(0);
      setHasMore(false);
    } finally {
      setIsInitialLoading(false);
      setIsRefreshing(false);
    }
  }, [file_path, projectPath]);

  // Initial load
  useEffect(() => {
    loadContent();
  }, [loadContent]);

  // Load more content
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || !file_path || !projectPath) return;

    setIsLoadingMore(true);
    try {
      const response = await readFileChunk(projectPath, file_path, loadedOffset, CHUNK_SIZE, false);
      if (response.content) {
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
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id !== id) return node;
        const currentSize = (node.data as OutputFileNodeData).expandedSize ?? { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
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

        const nodeData = node.data as unknown as OutputFileNodeData;
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
    }, { allowCreate: true });
  }, [onRequestFilePicker, file_path, id, setNodes]);

  const handleRefresh = useCallback(() => {
    loadContent(true);
  }, [loadContent]);

  const displayedLines = content?.split("\n").length || 0;
  const editorHeight = size.height - 70;
  const language = getMonacoLanguage(file_path || "");
  const handleTypes = ((data as OutputFileNodeData & { handleTypes?: Record<string, { outputType?: HandleDataType; acceptedTypes?: HandleDataType[] }> }).handleTypes || {}) as Record<string, { outputType?: HandleDataType; acceptedTypes?: HandleDataType[] }>;

  // Collapsed state - header bar style matching Prompt/Context nodes
  if (!isExpanded) {
    return (
      <div
        className="rounded-lg shadow-lg relative"
        style={{
          width: 'auto',
          backgroundColor: theme.colors.nodes.common.container.background,
          ...(selected && { boxShadow: `0 0 0 2px ${theme.colors.nodes.outputFile.ring}` }),
        }}
        title={`${file_path}\n\n${contentSnippet}${contentSnippet.length >= 100 ? "..." : ""}`}
      >
        {/* Header */}
        <div
          className="px-2 py-1 rounded-lg flex items-center justify-between cursor-pointer"
          style={{
            backgroundColor: theme.colors.nodes.outputFile.header,
            color: theme.colors.nodes.outputFile.text,
          }}
          onDoubleClick={toggleExpand}
          onContextMenu={handleHeaderContextMenu}
        >
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {isNodeLocked && <Lock className="w-3 h-3 flex-shrink-0 opacity-80" />}
            <FileInput className="w-3 h-3 flex-shrink-0" />
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
                  color: theme.colors.nodes.common.text.primary,
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
            style={{ backgroundColor: 'transparent' }}
            onMouseEnter={(e) => {
              if (theme.colors.nodes.outputFile.headerHover) {
                e.currentTarget.style.backgroundColor = theme.colors.nodes.outputFile.headerHover;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title="Expand"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>

        <DraggableHandle
          nodeId={id}
          handleId="input"
          type="target"
          defaultEdge="left"
          defaultPercent={50}
          handlePositions={handlePositions}
          acceptedTypes={handleTypes['input']?.acceptedTypes}
          style={{ width: '10px', height: '10px', backgroundColor: theme.colors.handles.probe, border: '2px solid white' }}
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

  // Expanded state
  return (
    <div
      className={`rounded-lg shadow-lg relative ${
        selected ? "ring-2 shadow-xl" : ""
      }`}
      style={{
        width: size.width,
        backgroundColor: theme.colors.nodes.common.container.background,
        ...(selected && { borderColor: theme.colors.nodes.outputFile.ring })
      }}
    >
      <div
        className="px-2 py-1 rounded-t-lg flex items-center justify-between cursor-pointer"
        style={{
          backgroundColor: theme.colors.nodes.outputFile.header,
          color: theme.colors.nodes.outputFile.text
        }}
        onDoubleClick={toggleExpand}
        onContextMenu={handleHeaderContextMenu}
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {isNodeLocked && <Lock className="w-3 h-3 flex-shrink-0 opacity-80" />}
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: theme.colors.nodes.common.container.background,
              color: theme.colors.nodes.outputFile.header
            }}
          >
            OUTPUT
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
        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-0.5 rounded transition-colors flex-shrink-0 disabled:opacity-50"
            style={{ backgroundColor: 'transparent' }}
            onMouseEnter={(e) => {
              if (!isRefreshing && theme.colors.nodes.outputFile.headerHover) {
                e.currentTarget.style.backgroundColor = theme.colors.nodes.outputFile.headerHover;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title="Refresh content"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={toggleExpand}
            className="p-0.5 rounded transition-colors flex-shrink-0"
            style={{ backgroundColor: 'transparent' }}
            onMouseEnter={(e) => {
              if (theme.colors.nodes.outputFile.headerHover) {
                e.currentTarget.style.backgroundColor = theme.colors.nodes.outputFile.headerHover;
              }
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
            language={language}
            value={content}
            theme={theme.colors.monaco}
            onMount={handleEditorMount}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 12,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              folding: true,
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
              backgroundColor: theme.colors.nodes.common.text.secondary
            }}
          >
            <Loader2 className="w-3 h-3 animate-spin" />
            Loading...
          </div>
        )}
      </div>

      <div
        className="px-3 py-2 rounded-b-lg flex items-center justify-between"
        style={{ backgroundColor: theme.colors.nodes.common.footer.background }}
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
        defaultEdge="left"
        defaultPercent={50}
        handlePositions={handlePositions}
        acceptedTypes={handleTypes['input']?.acceptedTypes}
        style={{ width: '10px', height: '10px', backgroundColor: theme.colors.handles.probe, border: '2px solid white' }}
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

OutputFileNode.displayName = "OutputFileNode";

export default OutputFileNode;

export function getDefaultOutputFileData() {
  return {
    name: "Output",
    file_path: "outputs/output.txt",
    handleTypes: {
      'input': { acceptedTypes: ['str', 'custom:AgentOutput', 'any'] as HandleDataType[] },
    },
  };
}
