"use client";

import { memo, useState, useCallback, useRef, useEffect, useMemo } from "react";
import { type NodeProps, useReactFlow, useStore } from "@xyflow/react";
import type { HandlePositions } from "@/lib/types";
import DraggableHandle from "@/components/DraggableHandle";
import ResizeHandle from "@/components/ResizeHandle";
import NodeContextMenu from "@/components/NodeContextMenu";
import { Lock, Send } from "lucide-react";
import { useCanvasActions } from "@/contexts/CanvasActionsContext";
import { useTheme } from "@/contexts/ThemeContext";

const DEFAULT_WIDTH = 350;
const DEFAULT_HEIGHT = 200;

interface UserInputNodeData {
  name?: string;
  value?: string;
  handlePositions?: HandlePositions;
  expandedSize?: { width: number; height: number };
  expandedPosition?: { x: number; y: number };
  contractedPosition?: { x: number; y: number };
  isNodeLocked?: boolean;
}

const UserInputNode = memo(({ data, id, selected }: NodeProps) => {
  const {
    name = "User Input",
    value = "",
    handlePositions,
    expandedSize,
    expandedPosition,
    contractedPosition,
    isNodeLocked,
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

  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [inputValue, setInputValue] = useState("");

  const parentId = useStore(
    useCallback((state) => state.nodes.find((n) => n.id === id)?.parentId, [id])
  );

  const size = useMemo(() => expandedSize ?? { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT }, [expandedSize]);
  const [editedName, setEditedName] = useState(name);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
              height: Math.max(120, currentSize.height + deltaHeight),
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
            },
          };
        }
      })
    );
    setIsExpanded(!isExpanded);
  }, [id, isExpanded, setNodes]);

  const handleSubmit = useCallback(() => {
    if (isNodeLocked) return;
    const trimmedValue = inputValue.trim();
    if (!trimmedValue) return;

    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, value: trimmedValue } }
          : node
      )
    );
    setInputValue("");
  }, [id, inputValue, isNodeLocked, setNodes]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

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

  const textareaHeight = size.height - 90;

  if (!isExpanded) {
    return (
      <div
        onContextMenu={handleHeaderContextMenu}
        className="rounded-lg shadow-md flex items-center gap-1.5 px-2 py-1.5"
        style={{
          backgroundColor: theme.colors.nodes.userInput.header,
          color: theme.colors.nodes.userInput.text,
          minWidth: 180,
          ...(selected ? {
            boxShadow: `0 0 0 2px ${theme.colors.nodes.userInput.ring}, 0 10px 15px -3px rgba(0, 0, 0, 0.1)`,
          } : {}),
        }}
      >
        {isNodeLocked && <Lock className="w-3 h-3 flex-shrink-0 opacity-80" />}

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleInputKeyDown}
          onClick={(e) => e.stopPropagation()}
          placeholder="Type message..."
          disabled={isNodeLocked}
          className="flex-1 px-2 py-1 rounded text-xs outline-none min-w-0 nodrag"
          style={{
            backgroundColor: theme.colors.nodes.common.container.background,
            color: theme.colors.nodes.common.text.primary,
            opacity: isNodeLocked ? 0.6 : 1,
          }}
        />

        <button
          onClick={handleSubmit}
          disabled={isNodeLocked || !inputValue.trim()}
          className="p-1 rounded transition-colors flex-shrink-0"
          style={{
            backgroundColor: 'transparent',
            opacity: isNodeLocked || !inputValue.trim() ? 0.4 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isNodeLocked && inputValue.trim()) {
              e.currentTarget.style.backgroundColor = theme.colors.nodes.userInput.headerHover || theme.colors.nodes.userInput.header;
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="Send (Enter)"
        >
          <Send className="w-3.5 h-3.5" />
        </button>

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

        <DraggableHandle
          nodeId={id}
          handleId="output"
          type="source"
          defaultEdge="right"
          defaultPercent={50}
          handlePositions={handlePositions}
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

  return (
    <div
      className="rounded-lg relative"
      style={{
        width: size.width,
        backgroundColor: theme.colors.nodes.common.container.background,
        boxShadow: selected
          ? `0 0 0 2px ${theme.colors.nodes.userInput.ring}, 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)`
          : theme.colors.nodes.common.container.shadow,
      }}
    >
      <div
        className="px-2 py-1 rounded-t-lg flex items-center justify-between cursor-pointer"
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
          <Send className="w-3 h-3 flex-shrink-0" />
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

      <div
        className="p-2 nodrag nowheel nopan"
        style={{ height: textareaHeight }}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleTextareaKeyDown}
          onClick={(e) => e.stopPropagation()}
          placeholder="Type your message here..."
          disabled={isNodeLocked}
          className="w-full h-full px-3 py-2 text-sm rounded-md outline-none resize-none"
          style={{
            backgroundColor: theme.colors.form.background,
            color: theme.colors.form.text,
            border: `1px solid ${theme.colors.form.border}`,
            opacity: isNodeLocked ? 0.6 : 1,
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
          className="text-xs"
          style={{ color: theme.colors.nodes.common.footer.text }}
        >
          {value ? `Last: "${value.slice(0, 30)}${value.length > 30 ? '...' : ''}"` : 'No value sent'}
        </span>
        <button
          onClick={handleSubmit}
          disabled={isNodeLocked || !inputValue.trim()}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors"
          style={{
            backgroundColor: isNodeLocked || !inputValue.trim()
              ? theme.colors.form.disabled.background
              : theme.colors.nodes.userInput.header,
            color: isNodeLocked || !inputValue.trim()
              ? theme.colors.form.disabled.text
              : theme.colors.nodes.userInput.text,
            cursor: isNodeLocked || !inputValue.trim() ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={(e) => {
            if (!isNodeLocked && inputValue.trim() && theme.colors.nodes.userInput.headerHover) {
              e.currentTarget.style.backgroundColor = theme.colors.nodes.userInput.headerHover;
            }
          }}
          onMouseLeave={(e) => {
            if (!isNodeLocked && inputValue.trim()) {
              e.currentTarget.style.backgroundColor = theme.colors.nodes.userInput.header;
            }
          }}
          title="Send (Ctrl+Enter)"
        >
          <Send className="w-3 h-3" />
          Send
        </button>
      </div>

      <ResizeHandle onResize={handleResize} />

      <DraggableHandle
        nodeId={id}
        handleId="output"
        type="source"
        defaultEdge="right"
        defaultPercent={50}
        handlePositions={handlePositions}
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
});

UserInputNode.displayName = "UserInputNode";

export default UserInputNode;

export function getDefaultUserInputData() {
  return {
    name: "User Input",
    value: "",
  };
}
