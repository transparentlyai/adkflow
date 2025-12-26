"use client";

import { memo, useState, useRef, useEffect, useCallback, useMemo } from "react";
import { type NodeProps, useReactFlow, useStore } from "@xyflow/react";
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

const DEFAULT_WIDTH = 600;
const DEFAULT_HEIGHT = 400;

export interface ProcessNodeData extends Record<string, unknown> {
  name: string;
  code: string;
  description?: string;
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
  const { name, code, file_path, handlePositions, expandedSize, expandedPosition, contractedPosition, isNodeLocked, duplicateNameError, validationErrors, validationWarnings } = data as unknown as ProcessNodeData;
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
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(name);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Optimized selector: only subscribe to parentId changes for this specific node
  const parentId = useStore(
    useCallback((state) => state.nodes.find((n) => n.id === id)?.parentId, [id])
  );

  const size = useMemo(() => expandedSize ?? { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT }, [expandedSize]);

  const handleResize = useCallback((deltaWidth: number, deltaHeight: number) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id !== id) return node;
        const currentSize = (node.data as ProcessNodeData).expandedSize ?? { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
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

  // Parse function signature from code
  const signature = useMemo(() => parseFunctionSignature(code || ""), [code]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    if (isNodeLocked) return;
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

  const toggleExpand = useCallback(() => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id !== id) return node;

        const nodeData = node.data as unknown as ProcessNodeData;
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
    }, { extensions: ['.py'], filterLabel: 'Python files' });
  }, [onRequestFilePicker, file_path, id, setNodes]);

  // Calculate lines of code for display
  const lineCount = code?.split("\n").length || 0;
  const editorHeight = size.height - 100;

  return (
    <div
      className="rounded-lg shadow-lg relative"
      style={{
        width: isExpanded ? size.width : 220,
        minWidth: isExpanded ? size.width : 220,
        backgroundColor: theme.colors.nodes.common.container.background,
        boxShadow: duplicateNameError
          ? `0 0 0 2px #ef4444`
          : selected
            ? `0 0 0 2px ${theme.colors.nodes.process.ring}`
            : undefined,
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
        style={{ width: '10px', height: '10px', backgroundColor: theme.colors.handles.process, border: `2px solid ${theme.colors.handles.border}` }}
      />

      {/* Header */}
      <div
        className={`px-2 py-1 flex items-center justify-between cursor-pointer ${isExpanded ? 'rounded-t-lg' : 'rounded-lg'}`}
        style={{
          backgroundColor: theme.colors.nodes.process.header,
          color: theme.colors.nodes.process.text,
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
              className="flex-1 px-1.5 py-0.5 rounded text-xs font-medium outline-none min-w-0"
              style={{
                backgroundColor: theme.colors.nodes.common.container.background,
                color: theme.colors.nodes.common.text.primary
              }}
            />
          ) : (
            <div
              className="font-medium text-xs hover:opacity-80 truncate"
              onDoubleClick={(e) => {
                e.stopPropagation();
                handleDoubleClick();
              }}
            >
              {name}
            </div>
          )}
        </div>
        <button
          onClick={toggleExpand}
          className="ml-1.5 p-0.5 rounded transition-colors flex-shrink-0"
          style={{
            backgroundColor: 'transparent',
          }}
          onMouseEnter={(e) => {
            if (theme.colors.nodes.process.headerHover) {
              e.currentTarget.style.backgroundColor = theme.colors.nodes.process.headerHover;
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
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

      {/* Collapsed: Function Signature View */}
      {!isExpanded && (
        <div
          className="px-3 py-3 rounded-b-lg"
          style={{
            backgroundColor: theme.colors.nodes.common.footer.background,
          }}
        >
          {signature ? (
            <div className="font-mono text-xs space-y-1.5">
              <div className="flex items-center gap-1">
                <span className="text-purple-600 font-semibold">def</span>
                <span className="text-emerald-700 font-semibold">{signature.name}</span>
              </div>
              <div className="pl-2 border-l-2" style={{ color: theme.colors.nodes.common.text.secondary, borderColor: theme.colors.nodes.common.container.border }}>
                <div className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: theme.colors.nodes.common.text.muted }}>Parameters</div>
                <div style={{ color: theme.colors.nodes.common.text.secondary }}>{signature.params || "None"}</div>
              </div>
              <div className="pl-2 border-l-2" style={{ color: theme.colors.nodes.common.text.secondary, borderColor: theme.colors.nodes.common.container.border }}>
                <div className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: theme.colors.nodes.common.text.muted }}>Returns</div>
                <div className="text-blue-600">{signature.returnType}</div>
              </div>
            </div>
          ) : (
            <div className="text-xs italic" style={{ color: theme.colors.nodes.common.text.muted }}>No function signature found</div>
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
              onMount={(editor, monaco) => {
                editor.addCommand(
                  monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
                  () => handleSaveFile()
                );
              }}
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

          {/* Footer - only shown when expanded */}
          <div
            className="px-3 py-2 rounded-b-lg flex items-center justify-between"
            style={{
              backgroundColor: theme.colors.nodes.common.footer.background,
            }}
          >
            <span
              className="text-xs"
              style={{ color: theme.colors.nodes.common.footer.text }}
            >
              Process
            </span>
            <span
              className="text-xs"
              style={{ color: theme.colors.nodes.common.text.muted }}
            >
              {lineCount} lines
            </span>
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
        style={{ width: '10px', height: '10px', backgroundColor: theme.colors.handles.process, border: `2px solid ${theme.colors.handles.border}` }}
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

ProcessNode.displayName = "ProcessNode";

export default ProcessNode;

export function getDefaultProcessData(): ProcessNodeData {
  return {
    name: "Process",
    code: DEFAULT_CODE,
    description: "",
  };
}
