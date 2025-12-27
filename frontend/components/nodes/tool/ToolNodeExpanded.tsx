"use client";

import Editor from "@monaco-editor/react";
import { Lock } from "lucide-react";
import DraggableHandle from "@/components/DraggableHandle";
import EditorMenuBar from "@/components/EditorMenuBar";
import ResizeHandle from "@/components/ResizeHandle";
import NodeContextMenu from "@/components/NodeContextMenu";
import ValidationIndicator from "@/components/nodes/ValidationIndicator";
import { useTheme } from "@/contexts/ThemeContext";
import type {
  HandlePositions,
  ToolErrorBehavior,
  NodeExecutionState,
  HandleDataType,
} from "@/lib/types";
import type { ToolNodeData } from "./useToolNodeState";

interface ToolNodeExpandedProps {
  id: string;
  name: string;
  code: string;
  file_path?: string;
  error_behavior?: ToolErrorBehavior;
  selected: boolean;
  isNodeLocked?: boolean;
  duplicateNameError?: string;
  validationErrors?: string[];
  validationWarnings?: string[];
  executionState?: NodeExecutionState;
  handlePositions?: HandlePositions;
  resolvedHandleTypes: Record<
    string,
    {
      outputSource?: string;
      outputType?: HandleDataType;
      acceptedTypes?: HandleDataType[];
    }
  >;
  size: { width: number; height: number };
  isDirty: boolean;

  // Tab state
  activeTab: "code" | "config";
  setActiveTab: (tab: "code" | "config") => void;

  // Computed values
  lineCount: number;
  editorHeight: number;

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
  isSaving: boolean;

  // Handlers
  toggleExpand: () => void;
  handleNameDoubleClick: (e: React.MouseEvent) => void;
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
  handleCodeChange: (value: string | undefined) => void;
  handleSave: () => Promise<void>;
  handleChangeFile: () => void;
  handleConfigChange: (updates: Partial<ToolNodeData>) => void;
  handleResize: (deltaWidth: number, deltaHeight: number) => void;
}

export default function ToolNodeExpanded({
  id,
  name,
  code,
  file_path,
  error_behavior,
  selected,
  isNodeLocked,
  duplicateNameError,
  validationErrors,
  validationWarnings,
  executionState,
  handlePositions,
  resolvedHandleTypes,
  size,
  isDirty,
  activeTab,
  setActiveTab,
  lineCount,
  editorHeight,
  isEditing,
  editedName,
  inputRef,
  contextMenu,
  parentId,
  canvasActions,
  isSaving,
  toggleExpand,
  handleNameDoubleClick,
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
  handleCodeChange,
  handleSave,
  handleChangeFile,
  handleConfigChange,
  handleResize,
}: ToolNodeExpandedProps) {
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
        className={`rounded-lg shadow-lg relative ${
          !isDirty && !duplicateNameError && !executionState && selected
            ? "ring-2 shadow-xl"
            : ""
        }`}
        style={{
          width: size.width,
          backgroundColor: theme.colors.nodes.common.container.background,
          ...(duplicateNameError
            ? {
                boxShadow: `0 0 0 2px #ef4444`,
              }
            : executionState
              ? getExecutionStyle()
              : isDirty
                ? {
                    boxShadow: `0 0 0 2px #f97316`,
                  }
                : selected
                  ? {
                      borderColor: theme.colors.nodes.tool.ring,
                    }
                  : {}),
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
                  backgroundColor:
                    theme.colors.nodes.common.container.background,
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
            title="Collapse"
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
                d="M20 12H4"
              />
            </svg>
          </button>
        </div>

        {/* Tab Bar */}
        <div
          className="flex border-b"
          style={{ borderColor: theme.colors.nodes.common.container.border }}
        >
          <button
            className={`px-3 py-1.5 text-xs font-medium ${activeTab === "code" ? "border-b-2" : ""}`}
            style={{
              borderColor:
                activeTab === "code"
                  ? theme.colors.nodes.tool.header
                  : "transparent",
              color:
                activeTab === "code"
                  ? theme.colors.nodes.common.text.primary
                  : theme.colors.nodes.common.text.secondary,
              backgroundColor: "transparent",
            }}
            onClick={() => setActiveTab("code")}
          >
            Code
          </button>
          <button
            className={`px-3 py-1.5 text-xs font-medium ${activeTab === "config" ? "border-b-2" : ""}`}
            style={{
              borderColor:
                activeTab === "config"
                  ? theme.colors.nodes.tool.header
                  : "transparent",
              color:
                activeTab === "config"
                  ? theme.colors.nodes.common.text.primary
                  : theme.colors.nodes.common.text.secondary,
              backgroundColor: "transparent",
            }}
            onClick={() => setActiveTab("config")}
          >
            Config
          </button>
        </div>

        {activeTab === "code" ? (
          <>
            {/* Menu Bar */}
            <EditorMenuBar
              onSave={handleSave}
              onChangeFile={handleChangeFile}
              filePath={file_path}
              isSaving={isSaving}
              isDirty={isDirty}
            />

            {/* Code Editor */}
            <div
              className="nodrag nowheel nopan"
              style={{
                height: editorHeight,
                borderBottom: `1px solid ${theme.colors.nodes.common.container.border}`,
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
                    () => handleSave(),
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
          </>
        ) : (
          /* Config Panel */
          <div
            className="p-3 overflow-y-auto nodrag nowheel"
            style={{
              height: editorHeight + 28,
              borderBottom: `1px solid ${theme.colors.nodes.common.container.border}`,
            }}
          >
            {/* Error Handling Section */}
            <div className="mb-4">
              <label
                className="block text-xs font-medium mb-2 uppercase tracking-wide"
                style={{ color: theme.colors.nodes.common.text.secondary }}
              >
                Error Handling
              </label>
              <select
                value={error_behavior || "fail_fast"}
                onChange={(e) =>
                  handleConfigChange({
                    error_behavior: e.target.value as ToolErrorBehavior,
                  })
                }
                className="w-full px-2 py-1.5 rounded text-xs border"
                style={{
                  backgroundColor:
                    theme.colors.nodes.common.container.background,
                  borderColor: theme.colors.nodes.common.container.border,
                  color: theme.colors.nodes.common.text.primary,
                }}
                disabled={isNodeLocked}
              >
                <option value="fail_fast">
                  Fail fast (terminate workflow)
                </option>
                <option value="pass_to_model">
                  Pass error to model (let LLM handle)
                </option>
              </select>
              <p
                className="mt-1.5 text-xs"
                style={{ color: theme.colors.nodes.common.text.secondary }}
              >
                {error_behavior === "pass_to_model"
                  ? "Tool errors will be returned to the LLM as {'error': message} for it to decide how to proceed."
                  : "Tool errors will raise an exception and terminate the workflow immediately."}
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
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
            {name}
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

        {/* Output Handle */}
        <DraggableHandle
          nodeId={id}
          handleId="output"
          type="source"
          defaultEdge="right"
          defaultPercent={50}
          handlePositions={handlePositions}
          outputType={resolvedHandleTypes["output"]?.outputType}
          style={{
            width: "10px",
            height: "10px",
            backgroundColor: theme.colors.handles.tool,
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
    </>
  );
}
