"use client";

import { memo, useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Handle, Position, type NodeProps, useReactFlow, useStore } from "@xyflow/react";
import Editor from "@monaco-editor/react";
import type { HandlePositions } from "@/lib/types";
import DraggableHandle from "@/components/DraggableHandle";
import EditorMenuBar from "@/components/EditorMenuBar";
import ResizeHandle from "@/components/ResizeHandle";
import { useProject } from "@/contexts/ProjectContext";
import NodeContextMenu from "@/components/NodeContextMenu";
import { Lock } from "lucide-react";
import ValidationIndicator from "@/components/nodes/ValidationIndicator";
import { useCanvasActions } from "@/contexts/CanvasActionsContext";
import { useTheme } from "@/contexts/ThemeContext";

const DEFAULT_WIDTH = 500;
const DEFAULT_HEIGHT = 320;

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
  expandedSize?: { width: number; height: number };
  expandedPosition?: { x: number; y: number };
  contractedPosition?: { x: number; y: number };
  isNodeLocked?: boolean;
  duplicateNameError?: string;
  validationErrors?: string[];
  validationWarnings?: string[];
}

const ToolNode = memo(({ data, id, selected }: NodeProps) => {
  const { name = "Tool", code = DEFAULT_CODE, file_path, handlePositions, expandedSize, expandedPosition, contractedPosition, isNodeLocked, duplicateNameError, validationErrors, validationWarnings } = data as ToolNodeData;
  const { setNodes } = useReactFlow();
  const { onSaveFile, onRequestFilePicker } = useProject();
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [savedCode, setSavedCode] = useState(code);

  const isDirty = file_path && code !== savedCode;

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

  const handleResize = useCallback((deltaWidth: number, deltaHeight: number) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id !== id) return node;
        const currentSize = (node.data as ToolNodeData).expandedSize ?? { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
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

        const nodeData = node.data as unknown as ToolNodeData;
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
      setSavedCode(code);
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
    }, { extensions: ['.py'], filterLabel: 'Python files' });
  }, [onRequestFilePicker, file_path, id, setNodes]);

  const lineCount = code?.split("\n").length || 0;
  const editorHeight = size.height - 70;

  // Collapsed view - compact tool node
  if (!isExpanded) {
    return (
      <div
        onDoubleClick={toggleExpand}
        onContextMenu={handleHeaderContextMenu}
        title="Double-click to expand"
        className={`rounded-lg shadow-md cursor-pointer px-2 py-1 ${
          !duplicateNameError && selected ? "ring-2 shadow-xl" : ""
        }`}
        style={{
          backgroundColor: theme.colors.nodes.tool.header,
          color: theme.colors.nodes.tool.text,
          ...(duplicateNameError ? {
            boxShadow: `0 0 0 2px #ef4444`,
          } : selected ? {
            borderColor: theme.colors.nodes.tool.ring,
          } : {}),
        }}
      >
        <div className="flex items-center gap-1.5">
          {isNodeLocked && <Lock className="w-3 h-3 flex-shrink-0 opacity-80" />}
          <ValidationIndicator
            errors={validationErrors}
            warnings={validationWarnings}
            duplicateNameError={duplicateNameError}
          />
          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand();
            }}
            className="p-0.5 rounded transition-colors flex-shrink-0"
            style={{
              backgroundColor: 'transparent',
            }}
            onMouseEnter={(e) => {
              if (theme.colors.nodes.tool.headerHover) {
                e.currentTarget.style.backgroundColor = theme.colors.nodes.tool.headerHover;
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

        {/* Output Handle */}
        <Handle
          type="source"
          position={Position.Right}
          style={{ width: '8px', height: '8px', backgroundColor: theme.colors.handles.tool, border: `2px solid ${theme.colors.handles.border}` }}
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

  // Expanded view - with code editor
  return (
    <div
      className={`rounded-lg shadow-lg relative ${
        !isDirty && !duplicateNameError && selected ? "ring-2 shadow-xl" : ""
      }`}
      style={{
        width: size.width,
        backgroundColor: theme.colors.nodes.common.container.background,
        ...(duplicateNameError ? {
          boxShadow: `0 0 0 2px #ef4444`,
        } : isDirty ? {
          boxShadow: `0 0 0 2px #f97316`,
        } : selected ? {
          borderColor: theme.colors.nodes.tool.ring,
        } : {}),
      }}
    >
      {/* Header */}
      <div
        className="px-2 py-1 rounded-t-lg flex items-center justify-between cursor-pointer"
        style={{
          backgroundColor: theme.colors.nodes.tool.header,
          color: theme.colors.nodes.tool.text,
        }}
        onDoubleClick={toggleExpand}
        onContextMenu={handleHeaderContextMenu}
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {isNodeLocked && <Lock className="w-3 h-3 flex-shrink-0 opacity-80" />}
          <ValidationIndicator
            errors={validationErrors}
            warnings={validationWarnings}
            duplicateNameError={duplicateNameError}
          />
          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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
            backgroundColor: 'transparent',
          }}
          onMouseEnter={(e) => {
            if (theme.colors.nodes.tool.headerHover) {
              e.currentTarget.style.backgroundColor = theme.colors.nodes.tool.headerHover;
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

      {/* Menu Bar */}
      <EditorMenuBar
        onSave={handleSave}
        onChangeFile={handleChangeFile}
        filePath={file_path}
        isSaving={isSaving}
        isDirty={!!isDirty}
      />

      {/* Code Editor */}
      <div
        className="nodrag nowheel nopan"
        style={{
          height: editorHeight,
          borderBottom: `1px solid ${theme.colors.nodes.common.container.border}`
        }}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Editor
          height="100%"
          defaultLanguage="python"
          value={code}
          onChange={handleCodeChange}
          theme={theme.colors.monaco}
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
      <div
        className="px-3 py-2 rounded-b-lg flex items-center justify-between"
        style={{
          backgroundColor: theme.colors.nodes.common.footer.background,
        }}
      >
        <span className="text-xs" style={{ color: theme.colors.nodes.common.footer.text }}>{name}</span>
        <span className="text-xs" style={{ color: theme.colors.nodes.common.text.muted }}>{lineCount} lines</span>
      </div>

      {/* Resize Handle */}
      <ResizeHandle onResize={handleResize} />

      {/* Output Handle */}
      <DraggableHandle
        nodeId={id}
        handleId="output"
        type="source"
        defaultEdge="right"
        defaultPercent={50}
        handlePositions={handlePositions}
        style={{ width: '10px', height: '10px', backgroundColor: theme.colors.handles.tool, border: `2px solid ${theme.colors.handles.border}` }}
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
