"use client";

import { Handle, Position } from "@xyflow/react";
import { Lock } from "lucide-react";
import ValidationIndicator from "@/components/nodes/ValidationIndicator";
import HandleTooltip from "@/components/HandleTooltip";
import NodeContextMenu from "@/components/NodeContextMenu";
import { useTheme } from "@/contexts/ThemeContext";
import type { NodeExecutionState, HandleDataType } from "@/lib/types";

interface ToolNodeCollapsedProps {
  id: string;
  name: string;
  selected: boolean;
  isNodeLocked?: boolean;
  duplicateNameError?: string;
  validationErrors?: string[];
  validationWarnings?: string[];
  executionState?: NodeExecutionState;
  resolvedHandleTypes: Record<
    string,
    {
      outputSource?: string;
      outputType?: HandleDataType;
      acceptedTypes?: HandleDataType[];
    }
  >;

  // From hook
  isEditing: boolean;
  editedName: string;
  inputRef: React.RefObject<HTMLInputElement>;
  contextMenu: { x: number; y: number } | null;
  parentId: string | undefined;
  canvasActions: {
    copySelectedNodes: () => void;
    cutSelectedNodes: () => void;
    pasteNodes: () => void;
    hasClipboard: boolean;
    isLocked: boolean;
  } | null;

  // Handlers
  toggleExpand: () => void;
  handleNameClick: (e: React.MouseEvent) => void;
  handleHeaderContextMenu: (e: React.MouseEvent) => void;
  handleToggleNodeLock: () => void;
  handleDetach: () => void;
  handleNameSave: () => void;
  handleNameKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  setEditedName: (name: string) => void;
  setContextMenu: (menu: { x: number; y: number } | null) => void;
  getExecutionStyle: () => React.CSSProperties;
  handleCopy: () => void;
  handleCut: () => void;
  handlePaste: () => void;
}

export default function ToolNodeCollapsed({
  name,
  selected,
  isNodeLocked,
  duplicateNameError,
  validationErrors,
  validationWarnings,
  executionState,
  resolvedHandleTypes,
  isEditing,
  editedName,
  inputRef,
  contextMenu,
  parentId,
  canvasActions,
  toggleExpand,
  handleNameClick,
  handleHeaderContextMenu,
  handleToggleNodeLock,
  handleDetach,
  handleNameSave,
  handleNameKeyDown,
  setEditedName,
  setContextMenu,
  getExecutionStyle,
  handleCopy,
  handleCut,
  handlePaste,
}: ToolNodeCollapsedProps) {
  const { theme } = useTheme();

  return (
    <>
      <style>{`
        @keyframes tool-execution-pulse {
          0%, 100% { box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.8), 0 0 20px 4px rgba(59, 130, 246, 0.4); }
          50% { box-shadow: 0 0 0 3px rgba(59, 130, 246, 1), 0 0 30px 8px rgba(59, 130, 246, 0.6); }
        }
      `}</style>
      <div
        onDoubleClick={toggleExpand}
        onContextMenu={handleHeaderContextMenu}
        title="Double-click to expand"
        className={`rounded-lg shadow-md cursor-pointer px-2 py-1 ${
          !duplicateNameError && !executionState && selected
            ? "ring-2 shadow-xl"
            : ""
        }`}
        style={{
          backgroundColor: theme.colors.nodes.tool.header,
          color: theme.colors.nodes.tool.text,
          ...(duplicateNameError
            ? {
                boxShadow: `0 0 0 2px #ef4444`,
              }
            : executionState
              ? getExecutionStyle()
              : selected
                ? {
                    borderColor: theme.colors.nodes.tool.ring,
                  }
                : {}),
        }}
      >
        <div className="flex items-center gap-1.5">
          {isNodeLocked && (
            <Lock className="w-3 h-3 flex-shrink-0 opacity-80" />
          )}
          <ValidationIndicator
            errors={validationErrors}
            warnings={validationWarnings}
            duplicateNameError={duplicateNameError}
          />
          <svg
            className="w-3 h-3 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
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
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand();
            }}
            className="p-0.5 rounded transition-colors flex-shrink-0"
            style={{
              backgroundColor: "transparent",
            }}
            onMouseEnter={(e) => {
              if (theme.colors.nodes.tool.headerHover) {
                e.currentTarget.style.backgroundColor =
                  theme.colors.nodes.tool.headerHover;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
            title="Expand"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
              />
            </svg>
          </button>
        </div>

        {/* Output Handle */}
        <HandleTooltip
          label="Output"
          sourceType={resolvedHandleTypes["output"]?.outputSource || "tool"}
          dataType={resolvedHandleTypes["output"]?.outputType || "callable"}
          type="output"
        >
          <Handle
            type="source"
            position={Position.Right}
            id="output"
            style={{
              width: "8px",
              height: "8px",
              backgroundColor: theme.colors.handles.tool,
              border: `2px solid ${theme.colors.handles.border}`,
            }}
          />
        </HandleTooltip>

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
    </>
  );
}
