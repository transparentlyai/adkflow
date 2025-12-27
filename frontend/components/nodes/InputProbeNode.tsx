"use client";

import { memo, useState, useCallback, useRef, useEffect, useMemo } from "react";
import { type NodeProps, useReactFlow, useStore } from "@xyflow/react";
import Editor from "@monaco-editor/react";
import type { HandlePositions, HandleDataType } from "@/lib/types";
import DraggableHandle from "@/components/DraggableHandle";
import EditorMenuBar from "@/components/EditorMenuBar";
import ResizeHandle from "@/components/ResizeHandle";
import { useProject } from "@/contexts/ProjectContext";
import NodeContextMenu from "@/components/NodeContextMenu";
import { Lock } from "lucide-react";
import { readPrompt } from "@/lib/api";
import { useCanvasActions } from "@/contexts/CanvasActionsContext";
import { useTheme } from "@/contexts/ThemeContext";

const DEFAULT_WIDTH = 400;
const DEFAULT_HEIGHT = 280;

interface InputProbeNodeData {
  name?: string;
  file_path?: string;
  handlePositions?: HandlePositions;
  expandedSize?: { width: number; height: number };
  expandedPosition?: { x: number; y: number };
  contractedPosition?: { x: number; y: number };
  isExpanded?: boolean;
  isNodeLocked?: boolean;
}

const InputProbeNode = memo(({ data, id, selected }: NodeProps) => {
  const {
    name = "Input",
    file_path,
    handlePositions,
    expandedSize,
    expandedPosition,
    contractedPosition,
    isExpanded: dataIsExpanded,
    isNodeLocked,
    handleTypes: rawHandleTypes,
  } = (data || {}) as InputProbeNodeData & { handleTypes?: Record<string, { outputType?: HandleDataType; acceptedTypes?: HandleDataType[] }> };

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
        const currentSize = (node.data as InputProbeNodeData).expandedSize ?? { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
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

        const nodeData = node.data as unknown as InputProbeNodeData;
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

  const handleNameClick = (e: React.MouseEvent) => {
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
        className="rounded-full w-9 h-9 flex items-center justify-center shadow-md cursor-pointer transition-all"
        style={{
          backgroundColor: theme.colors.nodes.probe.header,
          color: theme.colors.nodes.probe.text,
          ...(selected ? {
            boxShadow: `0 0 0 2px ${theme.colors.nodes.probe.ring}, 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)`,
          } : {}),
        }}
        onMouseEnter={(e) => {
          if (!selected && theme.colors.nodes.probe.headerHover) {
            e.currentTarget.style.backgroundColor = theme.colors.nodes.probe.headerHover;
          }
        }}
        onMouseLeave={(e) => {
          if (!selected) {
            e.currentTarget.style.backgroundColor = theme.colors.nodes.probe.header;
          }
        }}
      >
        <div className="flex items-center gap-0.5">
          {isNodeLocked && <Lock className="w-2 h-2 opacity-80" />}
          <span className="font-bold text-[10px]">IN</span>
        </div>

        <DraggableHandle
          nodeId={id}
          handleId="output"
          type="source"
          defaultEdge="bottom"
          defaultPercent={50}
          handlePositions={handlePositions}
          outputType={handleTypes['output']?.outputType}
          style={{ width: '8px', height: '8px', backgroundColor: theme.colors.handles.probe, border: `2px solid ${theme.colors.handles.border}` }}
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
      className="rounded-lg relative"
      style={{
        width: size.width,
        backgroundColor: theme.colors.nodes.common.container.background,
        boxShadow: selected
          ? `0 0 0 2px ${theme.colors.nodes.probe.ring}, 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)`
          : theme.colors.nodes.common.container.shadow,
      }}
    >
      <div
        className="px-2 py-1 rounded-t-lg flex items-center justify-between cursor-pointer"
        style={{
          backgroundColor: theme.colors.nodes.probe.header,
          color: theme.colors.nodes.probe.text,
        }}
        onDoubleClick={toggleExpand}
        onContextMenu={handleHeaderContextMenu}
        onMouseEnter={(e) => {
          if (theme.colors.nodes.probe.headerHover) {
            e.currentTarget.style.backgroundColor = theme.colors.nodes.probe.headerHover;
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = theme.colors.nodes.probe.header;
        }}
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {isNodeLocked && <Lock className="w-3 h-3 flex-shrink-0 opacity-80" />}
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: theme.colors.nodes.probe.headerHover || theme.colors.nodes.probe.header,
              color: theme.colors.nodes.probe.text,
            }}
          >IN</span>
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
              className="font-medium text-xs truncate hover:opacity-80 cursor-pointer"
              onClick={handleNameClick}
            >
              {name}
            </span>
          )}
        </div>
        <button
          onClick={toggleExpand}
          className="ml-1.5 p-0.5 rounded transition-colors flex-shrink-0"
          style={{
            backgroundColor: 'transparent',
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
        className="border-b border-gray-200 nodrag nowheel nopan"
        style={{ height: editorHeight }}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Editor
          height="100%"
          defaultLanguage="markdown"
          value={content}
          theme={theme.colors.monaco}
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

      <div
        className="px-3 py-2 rounded-b-lg flex items-center justify-between"
        style={{
          backgroundColor: theme.colors.nodes.common.footer.background,
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
          {lineCount} lines
        </span>
      </div>

      <ResizeHandle onResize={handleResize} />

      <DraggableHandle
        nodeId={id}
        handleId="output"
        type="source"
        defaultEdge="bottom"
        defaultPercent={50}
        handlePositions={handlePositions}
        outputType={handleTypes['output']?.outputType}
        style={{ width: '10px', height: '10px', backgroundColor: theme.colors.handles.probe, border: `2px solid ${theme.colors.handles.border}` }}
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

InputProbeNode.displayName = "InputProbeNode";

export default InputProbeNode;

export function getDefaultInputProbeData() {
  return {
    name: "Input",
    handleTypes: {
      'output': { outputSource: 'input_probe', outputType: 'str' as HandleDataType },
    },
  };
}
