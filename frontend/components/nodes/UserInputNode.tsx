"use client";

import { memo, useState, useCallback, useRef, useEffect, useMemo } from "react";
import { type NodeProps, useReactFlow, useStore } from "@xyflow/react";
import type { HandlePositions, HandleDataType } from "@/lib/types";
import DraggableHandle from "@/components/DraggableHandle";
import ResizeHandle from "@/components/ResizeHandle";
import NodeContextMenu from "@/components/NodeContextMenu";
import { Lock, Send, Copy } from "lucide-react";
import { useCanvasActions } from "@/contexts/CanvasActionsContext";
import { useTheme } from "@/contexts/ThemeContext";

const DEFAULT_WIDTH = 280;
const DEFAULT_HEIGHT = 200;

type TimeoutBehavior = "pass_through" | "predefined_text" | "error";

interface UserInputNodeData {
  name?: string;
  handlePositions?: HandlePositions;
  expandedSize?: { width: number; height: number };
  expandedPosition?: { x: number; y: number };
  contractedPosition?: { x: number; y: number };
  isExpanded?: boolean;
  isNodeLocked?: boolean;

  // Configuration
  timeout?: number; // seconds, 0 = no timeout
  timeoutBehavior?: TimeoutBehavior;
  predefinedText?: string;

  // Runtime state (populated during execution)
  isWaitingForInput?: boolean;
}

/**
 * Derive variable name from node name.
 * Example: "Review Step" -> "review_step_input"
 */
function deriveVariableName(name: string): string {
  let sanitized = name.toLowerCase().replace(/[\s-]+/g, "_");
  sanitized = sanitized.replace(/[^a-z0-9_]/g, "");
  if (sanitized && !/^[a-z_]/.test(sanitized)) {
    sanitized = "_" + sanitized;
  }
  return (sanitized || "user") + "_input";
}

// Custom comparison for memo - always re-render when isWaitingForInput changes
const userInputNodePropsAreEqual = (prevProps: NodeProps, nextProps: NodeProps): boolean => {
  const prevData = prevProps.data as unknown as UserInputNodeData;
  const nextData = nextProps.data as unknown as UserInputNodeData;

  if (prevData.isWaitingForInput !== nextData.isWaitingForInput) {
    return false;
  }

  if (prevProps.selected !== nextProps.selected) return false;
  if (prevProps.id !== nextProps.id) return false;
  if (prevData.isNodeLocked !== nextData.isNodeLocked) return false;
  if (prevData.name !== nextData.name) return false;
  if (prevData.timeout !== nextData.timeout) return false;
  if (prevData.timeoutBehavior !== nextData.timeoutBehavior) return false;
  if (prevData.predefinedText !== nextData.predefinedText) return false;

  return true;
};

const UserInputNode = memo(({ data, id, selected }: NodeProps) => {
  const {
    name = "User Input",
    handlePositions,
    expandedSize,
    expandedPosition,
    contractedPosition,
    isExpanded: dataIsExpanded,
    isNodeLocked,
    timeout = 300,
    timeoutBehavior = "error",
    predefinedText = "",
    isWaitingForInput,
  } = (data || {}) as UserInputNodeData;

  const { setNodes } = useReactFlow();
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
  const [isEditingName, setIsEditingName] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const parentId = useStore(
    useCallback((state) => state.nodes.find((n) => n.id === id)?.parentId, [id])
  );

  const size = useMemo(() => expandedSize ?? { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT }, [expandedSize]);
  const [editedName, setEditedName] = useState(name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const handleResize = useCallback((deltaWidth: number, deltaHeight: number) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id !== id) return node;
        const currentSize = (node.data as UserInputNodeData).expandedSize ?? { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
        return {
          ...node,
          data: {
            ...node.data,
            expandedSize: {
              width: Math.max(200, currentSize.width + deltaWidth),
              height: Math.max(150, currentSize.height + deltaHeight),
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

        const nodeData = node.data as unknown as UserInputNodeData;
        const currentPosition = node.position;

        if (isExpanded) {
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
    setIsEditingName(true);
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
            ? { ...node, data: { ...node.data, name: editedName.trim() } }
            : node
        )
      );
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleNameSave();
    } else if (e.key === "Escape") {
      setEditedName(name);
      setIsEditingName(false);
    }
  };

  const variableName = deriveVariableName(name);
  const handleTypes = ((data as UserInputNodeData & { handleTypes?: Record<string, { outputType?: HandleDataType; acceptedTypes?: HandleDataType[] }> }).handleTypes || {}) as Record<string, { outputType?: HandleDataType; acceptedTypes?: HandleDataType[] }>;

  const handleCopyVariable = useCallback(() => {
    navigator.clipboard.writeText(`{${variableName}}`);
  }, [variableName]);

  const handleTimeoutChange = useCallback((newTimeout: number) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, timeout: newTimeout } }
          : node
      )
    );
  }, [id, setNodes]);

  const handleTimeoutBehaviorChange = useCallback((newBehavior: TimeoutBehavior) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, timeoutBehavior: newBehavior } }
          : node
      )
    );
  }, [id, setNodes]);

  const handlePredefinedTextChange = useCallback((newText: string) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, predefinedText: newText } }
          : node
      )
    );
  }, [id, setNodes]);

  // Contracted view
  if (!isExpanded) {
    return (
      <div
        onContextMenu={handleHeaderContextMenu}
        className="rounded-lg shadow-md flex items-center gap-1.5 px-2 py-1.5"
        style={{
          backgroundColor: theme.colors.nodes.userInput.header,
          color: theme.colors.nodes.userInput.text,
          minWidth: 140,
          ...(selected ? {
            boxShadow: `0 0 0 2px ${theme.colors.nodes.userInput.ring}, 0 10px 15px -3px rgba(0, 0, 0, 0.1)`,
          } : {}),
          ...(isWaitingForInput ? {
            animation: 'pulse 2s infinite',
            boxShadow: `0 0 0 2px ${theme.colors.nodes.userInput.ring}, 0 0 20px rgba(74, 222, 128, 0.5)`,
          } : {}),
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
          style={{
            width: '8px',
            height: '8px',
            backgroundColor: theme.colors.handles.input,
            border: `2px solid ${theme.colors.handles.border}`,
          }}
        />

        {isNodeLocked && <Lock className="w-3 h-3 flex-shrink-0 opacity-80" />}
        <Send className="w-3.5 h-3.5 flex-shrink-0" />

        <span className="text-xs font-medium truncate flex-1">{name}</span>

        <button
          onClick={toggleExpand}
          className="p-0.5 rounded transition-colors flex-shrink-0"
          style={{ backgroundColor: 'transparent' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.nodes.userInput.headerHover || theme.colors.nodes.userInput.header;
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

        {/* Output Handle */}
        <DraggableHandle
          nodeId={id}
          handleId="output"
          type="source"
          defaultEdge="right"
          defaultPercent={50}
          handlePositions={handlePositions}
          outputType={handleTypes['output']?.outputType}
          style={{
            width: '8px',
            height: '8px',
            backgroundColor: theme.colors.handles.output,
            border: `2px solid ${theme.colors.handles.border}`,
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

  // Expanded view - Configuration only
  return (
    <div
      className="rounded-lg relative"
      style={{
        width: size.width,
        backgroundColor: theme.colors.nodes.common.container.background,
        boxShadow: selected
          ? `0 0 0 2px ${theme.colors.nodes.userInput.ring}, 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)`
          : theme.colors.nodes.common.container.shadow,
        ...(isWaitingForInput ? {
          animation: 'pulse 2s infinite',
          boxShadow: `0 0 0 2px ${theme.colors.nodes.userInput.ring}, 0 0 20px rgba(74, 222, 128, 0.5)`,
        } : {}),
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
        style={{
          width: '10px',
          height: '10px',
          backgroundColor: theme.colors.handles.input,
          border: `2px solid ${theme.colors.handles.border}`,
        }}
      />

      {/* Header */}
      <div
        className="px-2 py-1.5 rounded-t-lg flex items-center justify-between cursor-pointer"
        style={{
          backgroundColor: theme.colors.nodes.userInput.header,
          color: theme.colors.nodes.userInput.text,
        }}
        onDoubleClick={toggleExpand}
        onContextMenu={handleHeaderContextMenu}
        onMouseEnter={(e) => {
          if (theme.colors.nodes.userInput.headerHover) {
            e.currentTarget.style.backgroundColor = theme.colors.nodes.userInput.headerHover;
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = theme.colors.nodes.userInput.header;
        }}
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {isNodeLocked && <Lock className="w-3 h-3 flex-shrink-0 opacity-80" />}
          <Send className="w-3.5 h-3.5 flex-shrink-0" />
          {isEditingName ? (
            <input
              ref={nameInputRef}
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
            e.currentTarget.style.backgroundColor = theme.colors.nodes.userInput.headerHover || theme.colors.nodes.userInput.header;
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

      {/* Content */}
      <div
        className="p-3 flex flex-col gap-3 nodrag nowheel nopan"
        style={{ minHeight: size.height - 60 }}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Variable Name Display */}
        <div
          className="flex items-center justify-between px-2 py-1.5 rounded text-xs"
          style={{
            backgroundColor: theme.colors.form.background,
            border: `1px solid ${theme.colors.form.border}`,
          }}
        >
          <span style={{ color: theme.colors.nodes.common.text.secondary }}>
            Variable: <code style={{ color: theme.colors.nodes.common.text.primary, fontWeight: 500 }}>{`{${variableName}}`}</code>
          </span>
          <button
            onClick={handleCopyVariable}
            className="p-1 rounded transition-colors"
            style={{ backgroundColor: 'transparent' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.form.border;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title="Copy variable"
          >
            <Copy className="w-3 h-3" style={{ color: theme.colors.nodes.common.text.secondary }} />
          </button>
        </div>

        {/* Timeout Setting */}
        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{ color: theme.colors.nodes.common.text.secondary }}
          >
            Timeout (seconds)
          </label>
          <input
            type="number"
            value={timeout}
            onChange={(e) => handleTimeoutChange(parseInt(e.target.value) || 0)}
            min={0}
            className="w-full px-2 py-1.5 text-sm rounded-md outline-none"
            style={{
              backgroundColor: theme.colors.form.background,
              color: theme.colors.form.text,
              border: `1px solid ${theme.colors.form.border}`,
            }}
            disabled={isNodeLocked}
          />
          <span
            className="text-xs mt-0.5 block"
            style={{ color: theme.colors.nodes.common.text.secondary }}
          >
            0 = no timeout
          </span>
        </div>

        {/* Timeout Behavior */}
        <div>
          <label
            className="block text-xs font-medium mb-1.5"
            style={{ color: theme.colors.nodes.common.text.secondary }}
          >
            On Timeout
          </label>
          <div className="flex flex-col gap-1.5">
            {[
              { value: "error" as const, label: "Throw error" },
              { value: "pass_through" as const, label: "Pass through (use previous input)" },
              { value: "predefined_text" as const, label: "Use predefined text" },
            ].map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 text-xs cursor-pointer"
                style={{ color: theme.colors.nodes.common.text.primary }}
              >
                <input
                  type="radio"
                  name={`timeout-behavior-${id}`}
                  value={option.value}
                  checked={timeoutBehavior === option.value}
                  onChange={() => handleTimeoutBehaviorChange(option.value)}
                  disabled={isNodeLocked}
                  className="cursor-pointer"
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        {/* Predefined Text (shown if predefined_text behavior selected) */}
        {timeoutBehavior === "predefined_text" && (
          <div>
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: theme.colors.nodes.common.text.secondary }}
            >
              Predefined Text
            </label>
            <textarea
              value={predefinedText}
              onChange={(e) => handlePredefinedTextChange(e.target.value)}
              placeholder="Default response on timeout..."
              disabled={isNodeLocked}
              className="w-full px-2 py-1.5 text-sm rounded-md outline-none resize-none"
              style={{
                backgroundColor: theme.colors.form.background,
                color: theme.colors.form.text,
                border: `1px solid ${theme.colors.form.border}`,
                opacity: isNodeLocked ? 0.6 : 1,
              }}
              rows={2}
            />
          </div>
        )}
      </div>

      <ResizeHandle onResize={handleResize} />

      {/* Output Handle */}
      <DraggableHandle
        nodeId={id}
        handleId="output"
        type="source"
        defaultEdge="right"
        defaultPercent={50}
        handlePositions={handlePositions}
        outputType={handleTypes['output']?.outputType}
        style={{
          width: '10px',
          height: '10px',
          backgroundColor: theme.colors.handles.output,
          border: `2px solid ${theme.colors.handles.border}`,
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
}, userInputNodePropsAreEqual);

UserInputNode.displayName = "UserInputNode";

export default UserInputNode;

export function getDefaultUserInputData() {
  return {
    name: "User Input",
    timeout: 300,
    timeoutBehavior: "error" as TimeoutBehavior,
    predefinedText: "",
    handleTypes: {
      'output': { outputSource: 'user_input', outputType: 'str' as HandleDataType },
    },
  };
}
