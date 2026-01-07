"use client";

import { memo, useState, useCallback, useMemo, useEffect } from "react";
import { type NodeProps, useReactFlow, useStore } from "@xyflow/react";
import { useTheme } from "@/contexts/ThemeContext";
import { useCanvasActions } from "@/contexts/CanvasActionsContext";
import NodeContextMenu from "@/components/NodeContextMenu";

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
  useModelFieldSync,
  CustomNodeCollapsed,
  CustomNodeExpanded,
} from "@/components/nodes/custom";

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
  const { setNodes } = useReactFlow();
  const { theme } = useTheme();
  const canvasActions = useCanvasActions();
  const [isExpanded, setIsExpanded] = useState(dataIsExpanded ?? false);
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

  // Context menu handlers
  const handleHeaderContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleToggleNodeLock = useCallback(() => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, isNodeLocked: !isNodeLocked } }
          : node,
      ),
    );
  }, [id, isNodeLocked, setNodes]);

  const handleDetach = useCallback(() => {
    setNodes((nodes) => {
      const currentNode = nodes.find((n) => n.id === id);
      const parentNode = nodes.find((n) => n.id === currentNode?.parentId);
      if (!currentNode || !parentNode) return nodes;

      return nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              parentId: undefined,
              position: {
                x: currentNode.position.x + parentNode.position.x,
                y: currentNode.position.y + parentNode.position.y,
              },
            }
          : node,
      );
    });
  }, [id, setNodes]);

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

  const handleDelete = useCallback(() => {
    setNodes((nodes) => nodes.filter((n) => n.id !== id));
  }, [id, setNodes]);

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

  // Sync fields when model changes (Agent nodes only)
  useModelFieldSync(id, config, schema, schema.unit_id);

  // Sync handleTypes to node.data for the connection registry
  // This ensures stale saved handleTypes are updated when schema changes
  useEffect(() => {
    const currentHandleTypes = nodeData.handleTypes;
    const handleTypesChanged =
      JSON.stringify(currentHandleTypes) !== JSON.stringify(handleTypes);
    if (handleTypesChanged) {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? { ...node, data: { ...node.data, handleTypes } }
            : node,
        ),
      );
    }
  }, [id, handleTypes, nodeData.handleTypes, setNodes]);

  // Sync activeTab to node.data for edge opacity calculation
  // This allows the useEdgeTabOpacity hook to know which tab is active
  useEffect(() => {
    if (nodeData.activeTab !== activeTab) {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? { ...node, data: { ...node.data, activeTab } }
            : node,
        ),
      );
    }
  }, [id, activeTab, nodeData.activeTab, setNodes]);
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
  const { isSaving, isDirty, handleFileSave, handleChangeFile } =
    useFileOperations(id, schema, config, isExpanded);

  // Get file path from config (for passing to expanded view)
  const filePath = useMemo(() => {
    return (config.file_path as string) || "";
  }, [config.file_path]);

  // Check if node has code editor field (for conditional props)
  const hasCodeEditor = useMemo(() => {
    return schema.ui.fields.some(
      (f) => f.widget === "code_editor" || f.widget === "monaco_editor",
    );
  }, [schema]);

  const handleConfigChange = useCallback(
    (fieldId: string, value: unknown) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? {
                ...node,
                data: { ...node.data, config: { ...config, [fieldId]: value } },
              }
            : node,
        ),
      );
    },
    [id, config, setNodes],
  );

  const toggleExpand = useCallback(() => {
    const newExpanded = !isExpanded;

    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id !== id) return node;

        const nodeData = node.data as unknown as CustomNodeData;
        const currentPosition = node.position;

        if (newExpanded) {
          // Expanding: save current as contractedPosition, restore expandedPosition
          return {
            ...node,
            position: nodeData.expandedPosition ?? currentPosition,
            data: {
              ...node.data,
              contractedPosition: currentPosition,
              isExpanded: true,
            },
          };
        } else {
          // Collapsing: save current as expandedPosition, restore contractedPosition
          return {
            ...node,
            position: nodeData.contractedPosition ?? currentPosition,
            data: {
              ...node.data,
              expandedPosition: currentPosition,
              isExpanded: false,
            },
          };
        }
      }),
    );

    setIsExpanded(newExpanded);
  }, [id, isExpanded, setNodes]);

  // Resize handler for resizable nodes
  const handleResize = useCallback(
    (deltaWidth: number, deltaHeight: number) => {
      const minWidth = schema.ui.min_width ?? 200;
      const minHeight = schema.ui.min_height ?? 150;

      setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id !== id) return node;
          const currentSize = (node.data as unknown as CustomNodeData)
            .expandedSize ?? {
            width: schema.ui.default_width,
            height: schema.ui.default_height,
          };
          return {
            ...node,
            data: {
              ...node.data,
              expandedSize: {
                width: Math.max(minWidth, currentSize.width + deltaWidth),
                height: Math.max(minHeight, currentSize.height + deltaHeight),
              },
            },
          };
        }),
      );
    },
    [
      id,
      schema.ui.default_width,
      schema.ui.default_height,
      schema.ui.min_width,
      schema.ui.min_height,
      setNodes,
    ],
  );

  const isFieldVisible = useCallback(
    (field: FieldDefinition) => {
      if (!field.show_if) return true;
      return Object.entries(field.show_if).every(
        ([key, value]) => config[key] === value,
      );
    },
    [config],
  );

  // Get header color from theme using theme_key, fallback to schema.ui.color
  const getThemeHeaderColor = () => {
    if (schema.ui.theme_key) {
      const nodesRecord = theme.colors.nodes as unknown as Record<
        string,
        unknown
      >;
      const nodeColors = nodesRecord[schema.ui.theme_key] as
        | { header?: string }
        | undefined;
      if (nodeColors?.header) {
        return nodeColors.header;
      }
    }
    return schema.ui.color || theme.colors.nodes.agent.header;
  };
  const headerColor = getThemeHeaderColor();
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
});

CustomNode.displayName = "CustomNode";

export default CustomNode;
