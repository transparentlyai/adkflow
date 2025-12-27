"use client";

import { memo, useState, useCallback, useMemo } from "react";
import { type NodeProps, useReactFlow } from "@xyflow/react";
import type { HandleDataType } from "@/lib/types";
import {
  useToolNodeState,
  ToolNodeCollapsed,
  ToolNodeExpanded,
  type ToolNodeData,
} from "./tool";

const DEFAULT_WIDTH = 500;
const DEFAULT_HEIGHT = 320;

const DEFAULT_CODE = `from google.adk.tools import ToolContext


def my_tool(
    query: str,
    limit: int = 10,
    tool_context: ToolContext = None,
) -> dict:
    """
    Brief description of what this tool does.

    Use this tool when the user wants to [describe use case].
    Do NOT use for [describe when not to use].

    Args:
        query: Description of what this parameter is for.
        limit: Maximum number of results. Defaults to 10.

    Returns:
        dict with 'status' key and result data.
    """
    # Your implementation here
    result = {"query": query, "limit": limit}

    return {"status": "success", "data": result}
`;

// Custom comparison for memo - always re-render when executionState changes
const toolNodePropsAreEqual = (
  prevProps: NodeProps,
  nextProps: NodeProps,
): boolean => {
  const prevData = prevProps.data as ToolNodeData;
  const nextData = nextProps.data as ToolNodeData;

  // Always re-render if executionState changes
  if (prevData.executionState !== nextData.executionState) {
    return false;
  }

  // Always re-render if validation state changes
  if (prevData.duplicateNameError !== nextData.duplicateNameError) {
    return false;
  }

  // Default shallow comparison for other props
  return (
    prevProps.id === nextProps.id &&
    prevProps.selected === nextProps.selected &&
    prevData.name === nextData.name &&
    prevData.code === nextData.code &&
    prevData.file_path === nextData.file_path &&
    prevData.error_behavior === nextData.error_behavior &&
    prevData.isNodeLocked === nextData.isNodeLocked &&
    prevData.isExpanded === nextData.isExpanded &&
    prevData.expandedSize?.width === nextData.expandedSize?.width &&
    prevData.expandedSize?.height === nextData.expandedSize?.height
  );
};

const ToolNode = memo(({ data, id, selected }: NodeProps) => {
  const {
    name = "Tool",
    code = DEFAULT_CODE,
    file_path,
    error_behavior,
    executionState,
    handlePositions,
    handleTypes,
    expandedSize,
    isExpanded: dataIsExpanded,
    isNodeLocked,
    duplicateNameError,
    validationErrors,
    validationWarnings,
  } = data as ToolNodeData;

  const resolvedHandleTypes = (handleTypes || {}) as Record<
    string,
    {
      outputSource?: string;
      outputType?: HandleDataType;
      acceptedTypes?: HandleDataType[];
    }
  >;

  const { setNodes } = useReactFlow();

  // Local state
  const [isExpanded, setIsExpanded] = useState(dataIsExpanded ?? false);
  const [activeTab, setActiveTab] = useState<"code" | "config">("code");

  // Computed values
  const size = useMemo(
    () => expandedSize ?? { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT },
    [expandedSize],
  );
  const lineCount = code?.split("\n").length || 0;
  const editorHeight = size.height - 70;

  // Shared state/handlers from hook
  const toolState = useToolNodeState({
    id,
    name,
    code,
    file_path,
    isNodeLocked,
    isExpanded,
    setIsExpanded,
    executionState,
  });

  // Resize handler (needs access to setNodes and size)
  const handleResize = useCallback(
    (deltaWidth: number, deltaHeight: number) => {
      setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id !== id) return node;
          const currentSize = (node.data as ToolNodeData).expandedSize ?? {
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
          };
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
        }),
      );
    },
    [id, setNodes],
  );

  // Render collapsed view
  if (!isExpanded) {
    return (
      <ToolNodeCollapsed
        id={id}
        name={name}
        selected={selected}
        isNodeLocked={isNodeLocked}
        duplicateNameError={duplicateNameError}
        validationErrors={validationErrors}
        validationWarnings={validationWarnings}
        executionState={executionState}
        resolvedHandleTypes={resolvedHandleTypes}
        isEditing={toolState.isEditing}
        editedName={toolState.editedName}
        inputRef={toolState.inputRef}
        contextMenu={toolState.contextMenu}
        parentId={toolState.parentId}
        canvasActions={toolState.canvasActions}
        toggleExpand={toolState.toggleExpand}
        handleNameClick={toolState.handleNameClick}
        handleHeaderContextMenu={toolState.handleHeaderContextMenu}
        handleToggleNodeLock={toolState.handleToggleNodeLock}
        handleDetach={toolState.handleDetach}
        handleNameSave={toolState.handleNameSave}
        handleNameKeyDown={toolState.handleNameKeyDown}
        setEditedName={toolState.setEditedName}
        setContextMenu={toolState.setContextMenu}
        getExecutionStyle={toolState.getExecutionStyle}
        handleCopy={toolState.handleCopy}
        handleCut={toolState.handleCut}
        handlePaste={toolState.handlePaste}
      />
    );
  }

  // Render expanded view
  return (
    <ToolNodeExpanded
      id={id}
      name={name}
      code={code}
      file_path={file_path}
      error_behavior={error_behavior}
      selected={selected}
      isNodeLocked={isNodeLocked}
      duplicateNameError={duplicateNameError}
      validationErrors={validationErrors}
      validationWarnings={validationWarnings}
      executionState={executionState}
      handlePositions={handlePositions}
      resolvedHandleTypes={resolvedHandleTypes}
      size={size}
      isDirty={toolState.isDirty}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      lineCount={lineCount}
      editorHeight={editorHeight}
      isEditing={toolState.isEditing}
      editedName={toolState.editedName}
      inputRef={toolState.inputRef}
      contextMenu={toolState.contextMenu}
      parentId={toolState.parentId}
      canvasActions={toolState.canvasActions}
      isSaving={toolState.isSaving}
      toggleExpand={toolState.toggleExpand}
      handleNameClick={toolState.handleNameClick}
      handleHeaderContextMenu={toolState.handleHeaderContextMenu}
      handleToggleNodeLock={toolState.handleToggleNodeLock}
      handleDetach={toolState.handleDetach}
      handleNameSave={toolState.handleNameSave}
      handleNameKeyDown={toolState.handleNameKeyDown}
      setEditedName={toolState.setEditedName}
      setContextMenu={toolState.setContextMenu}
      getExecutionStyle={toolState.getExecutionStyle}
      handleCopy={toolState.handleCopy}
      handleCut={toolState.handleCut}
      handlePaste={toolState.handlePaste}
      handleCodeChange={toolState.handleCodeChange}
      handleSave={toolState.handleSave}
      handleChangeFile={toolState.handleChangeFile}
      handleConfigChange={toolState.handleConfigChange}
      handleResize={handleResize}
    />
  );
}, toolNodePropsAreEqual);

ToolNode.displayName = "ToolNode";

export default ToolNode;

/**
 * Default tool data for new nodes
 */
export function getDefaultToolData() {
  return {
    name: "my_tool",
    code: DEFAULT_CODE,
    handleTypes: {
      output: {
        outputSource: "tool",
        outputType: "callable" as HandleDataType,
      },
    },
  };
}
