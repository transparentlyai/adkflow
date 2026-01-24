"use client";

import { memo, useState, useCallback, useMemo } from "react";
import { type NodeProps, useStore } from "@xyflow/react";
import NodeContextMenu from "@/components/NodeContextMenu";
import ConfirmDialog from "@/components/ConfirmDialog";

// Import types from dedicated types file
import type {
  PortDefinition,
  FieldDefinition,
  NodeLayout,
  CollapsedDisplay,
  CollapsedBody,
  CollapsedFooter,
  HandleLayout,
  CustomNodeSchema,
  CustomNodeData,
} from "@/components/nodes/CustomNode/types";

// Import dynamic input types directly (workaround for re-export issue)
import type {
  DynamicInputConfig,
  DynamicInputType,
  NodeAggregationMode,
  DirectoryAggregationMode,
  NamingPatternType,
} from "@/components/nodes/CustomNode/types/dynamicInputs";

import {
  DEFAULT_DYNAMIC_INPUT,
  generateDynamicInputId,
  createDynamicInput,
  NAMING_PATTERN_VARIABLES,
} from "@/components/nodes/CustomNode/types/dynamicInputs";

// Re-export types for backwards compatibility
export type {
  PortDefinition,
  FieldDefinition,
  NodeLayout,
  CollapsedDisplay,
  CollapsedBody,
  CollapsedFooter,
  HandleLayout,
  CustomNodeSchema,
  CustomNodeData,
} from "@/components/nodes/CustomNode/types";

export type { KeyValueItem } from "@/components/nodes/CustomNode/types/keyValue";

// Re-export dynamic input types
export type {
  DynamicInputConfig,
  DynamicInputType,
  NodeAggregationMode,
  DirectoryAggregationMode,
  NamingPatternType,
} from "@/components/nodes/CustomNode/types/dynamicInputs";

// Re-export utilities for dynamic inputs
export {
  DEFAULT_DYNAMIC_INPUT,
  generateDynamicInputId,
  createDynamicInput,
  NAMING_PATTERN_VARIABLES,
} from "@/components/nodes/CustomNode/types/dynamicInputs";

// Import refactored hooks and components
import {
  useCustomNodeTabs,
  useCustomNodeHandleTypes,
  useConnectedInputs,
  useCustomNodeName,
  useFileOperations,
  useNodeContextMenuActions,
  useNodeExpand,
  useNodeResize,
  useNodeThemeColor,
  useNodeStateSync,
  useAiAssist,
  CustomNodeCollapsed,
  CustomNodeExpanded,
} from "@/components/nodes/custom";
import { useModelChangeConfirmation } from "@/components/nodes/custom/hooks/useModelChangeConfirmation";
import { ModelChangeConfirmDialog } from "@/components/nodes/custom/ModelChangeConfirmDialog";
import { useConfigChange } from "@/components/nodes/custom/hooks/useConfigChange";
import { getModelSchema } from "@/lib/constants/modelSchemas";

// Re-export utility function for backwards compatibility
export { getDefaultCustomNodeData } from "./getDefaultCustomNodeData";

const CustomNode = memo(({ data, id, selected }: NodeProps) => {
  const nodeData = data as unknown as CustomNodeData;
  const {
    schema,
    config = {},
    handlePositions,
    isExpanded: dataIsExpanded,
    isNodeLocked,
  } = nodeData;

  const name = (config.name as string) || schema.label;
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Get parentId from store to check if node is inside a group
  const parentId = useStore(
    useCallback(
      (state) => state.nodes.find((n) => n.id === id)?.parentId,
      [id],
    ),
  );

  // Context menu state handler
  const handleHeaderContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  // Theme color
  const { headerColor } = useNodeThemeColor({ schema });

  // Expand/collapse
  const { isExpanded, toggleExpand } = useNodeExpand({
    nodeId: id,
    schema,
    initialExpanded: dataIsExpanded ?? false,
  });

  // Resize handler
  const { handleResize } = useNodeResize({ nodeId: id, schema });

  // Context menu actions
  const {
    handleToggleNodeLock,
    handleDetach,
    handleCopy,
    handleCut,
    handlePaste,
    handleDelete,
    canvasActions,
  } = useNodeContextMenuActions({
    nodeId: id,
    isNodeLocked: !!isNodeLocked,
  });

  // Model change confirmation (Agent nodes only)
  const {
    isDialogOpen: isModelChangeDialogOpen,
    pendingModel,
    newModelLabel,
    fieldChanges,
    requestModelChange,
    confirmModelChange,
    cancelModelChange,
    formatValue,
  } = useModelChangeConfirmation({
    nodeId: id,
    config,
    schema,
    unitId: schema.unit_id,
  });

  // Config change handler with model change interception
  const { handleConfigChange } = useConfigChange({
    nodeId: id,
    unitId: schema.unit_id,
    requestModelChange,
  });

  // AI assist for prompt nodes
  const showAiAssist = schema.ui.theme_key === "prompt";
  const { handleAiAssist } = useAiAssist({
    nodeId: id,
    nodeName: name,
    content: (config.content as string) || "",
    onConfigChange: handleConfigChange,
  });

  // Extract dynamic inputs from config (for nodes that support dynamic inputs)
  const dynamicInputs = useMemo(() => {
    if (!schema.ui.dynamic_inputs) return undefined;
    return (config.dynamicInputs as DynamicInputConfig[] | undefined) || [];
  }, [schema.ui.dynamic_inputs, config.dynamicInputs]);

  // Use refactored hooks
  const { tabs, activeTab, setActiveTab } = useCustomNodeTabs(schema);
  const handleTypes = useCustomNodeHandleTypes(schema, dynamicInputs);
  const connectedInputs = useConnectedInputs(
    id,
    schema.ui.inputs,
    dynamicInputs,
  );

  // Get current model label for dialog
  const currentModelLabel = useMemo(() => {
    const currentModel = (config.model as string) || "";
    if (!currentModel) return "";
    return getModelSchema(currentModel).label;
  }, [config.model]);

  // Sync handleTypes and activeTab to node.data
  useNodeStateSync({
    nodeId: id,
    handleTypes,
    activeTab,
    currentHandleTypes: nodeData.handleTypes,
    currentActiveTab: nodeData.activeTab,
  });

  const {
    isEditing,
    editedName,
    inputRef,
    handleNameClick,
    handleNameChange,
    handleNameSave,
    handleNameKeyDown,
  } = useCustomNodeName({
    nodeId: id,
    initialName: name,
    isNodeLocked,
  });

  // File operations for nodes with code_editor widget
  const {
    isSaving,
    isDirty,
    filePath,
    handleFileSave,
    handleChangeFile,
    fileLoadConfirm,
    handleConfirmLoad,
    handleCancelLoad,
  } = useFileOperations(id, schema, config, isExpanded, nodeData.fileSaveState);

  // Check if node has code editor field (for conditional props)
  const hasCodeEditor = useMemo(() => {
    return schema.ui.fields.some(
      (f) => f.widget === "code_editor" || f.widget === "monaco_editor",
    );
  }, [schema]);

  const isFieldVisible = useCallback(
    (field: FieldDefinition) => {
      if (!field.show_if) return true;
      return Object.entries(field.show_if).every(
        ([key, value]) => config[key] === value,
      );
    },
    [config],
  );

  const width = nodeData.expandedSize?.width || schema.ui.default_width;

  // Collapsed view (or non-expandable nodes like pills, circles, etc.)
  if (!isExpanded || !schema.ui.expandable) {
    return (
      <>
        <CustomNodeCollapsed
          id={id}
          nodeData={nodeData}
          schema={schema}
          name={name}
          config={config}
          handlePositions={handlePositions}
          handleTypes={handleTypes}
          headerColor={headerColor}
          selected={selected}
          onToggleExpand={toggleExpand}
          isEditing={isEditing}
          editedName={editedName}
          inputRef={inputRef}
          onNameClick={handleNameClick}
          onNameChange={handleNameChange}
          onNameSave={handleNameSave}
          onNameKeyDown={handleNameKeyDown}
          onContextMenu={handleHeaderContextMenu}
          onAiAssist={showAiAssist ? handleAiAssist : undefined}
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
            onDelete={handleDelete}
            hasClipboard={canvasActions?.hasClipboard}
            isCanvasLocked={canvasActions?.isLocked}
          />
        )}
      </>
    );
  }

  // Expanded view
  return (
    <>
      <CustomNodeExpanded
        id={id}
        nodeData={nodeData}
        schema={schema}
        name={name}
        config={config}
        handlePositions={handlePositions}
        handleTypes={handleTypes}
        connectedInputs={connectedInputs}
        headerColor={headerColor}
        tabs={tabs}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        width={width}
        onToggleExpand={toggleExpand}
        onConfigChange={handleConfigChange}
        isFieldVisible={isFieldVisible}
        isEditing={isEditing}
        editedName={editedName}
        inputRef={inputRef}
        onNameClick={handleNameClick}
        onNameChange={handleNameChange}
        onNameSave={handleNameSave}
        onNameKeyDown={handleNameKeyDown}
        // File operation props for nodes with code_editor
        filePath={filePath}
        onSave={hasCodeEditor ? handleFileSave : undefined}
        onChangeFile={hasCodeEditor ? handleChangeFile : undefined}
        isSaving={isSaving}
        isDirty={isDirty}
        // Execution state (filter out "idle" as it means no visual state)
        executionState={
          nodeData.executionState !== "idle"
            ? nodeData.executionState
            : undefined
        }
        selected={selected}
        // Resize handler for resizable nodes
        onResize={schema.ui.resizable ? handleResize : undefined}
        onContextMenu={handleHeaderContextMenu}
        onAiAssist={showAiAssist ? handleAiAssist : undefined}
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
          onDelete={handleDelete}
          hasClipboard={canvasActions?.hasClipboard}
          isCanvasLocked={canvasActions?.isLocked}
        />
      )}
      {fileLoadConfirm && (
        <ConfirmDialog
          isOpen={true}
          title="Replace existing content?"
          description="Loading from file will replace the existing content in the editor. This cannot be undone."
          confirmLabel="Load File"
          cancelLabel="Keep Existing"
          onConfirm={handleConfirmLoad}
          onCancel={handleCancelLoad}
        />
      )}
      {isModelChangeDialogOpen && (
        <ModelChangeConfirmDialog
          isOpen={isModelChangeDialogOpen}
          currentModelLabel={currentModelLabel}
          newModelLabel={newModelLabel}
          fieldChanges={fieldChanges}
          onConfirm={confirmModelChange}
          onCancel={cancelModelChange}
          formatValue={formatValue}
        />
      )}
    </>
  );
});

CustomNode.displayName = "CustomNode";

export default CustomNode;
