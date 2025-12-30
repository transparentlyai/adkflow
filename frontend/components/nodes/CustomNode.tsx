"use client";

import { memo, useState, useCallback, useMemo, useEffect } from "react";
import { type NodeProps, useReactFlow } from "@xyflow/react";
import { useTheme } from "@/contexts/ThemeContext";

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

// Import refactored hooks and components
import {
  useCustomNodeTabs,
  useCustomNodeHandleTypes,
  useConnectedInputs,
  useCustomNodeName,
  useFileOperations,
  CustomNodeCollapsed,
  CustomNodeExpanded,
} from "@/components/nodes/custom";

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
  const [isExpanded, setIsExpanded] = useState(dataIsExpanded ?? false);

  // Use refactored hooks
  const { tabs, activeTab, setActiveTab } = useCustomNodeTabs(schema);
  const handleTypes = useCustomNodeHandleTypes(schema);
  const connectedInputs = useConnectedInputs(id, schema.ui.inputs);

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
      />
    );
  }

  // Expanded view
  return (
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
        nodeData.executionState !== "idle" ? nodeData.executionState : undefined
      }
      selected={selected}
      // Resize handler for resizable nodes
      onResize={schema.ui.resizable ? handleResize : undefined}
    />
  );
});

CustomNode.displayName = "CustomNode";

export default CustomNode;

/**
 * Creates default node data from a schema definition.
 *
 * This factory function initializes a CustomNodeData object with:
 * - Default values for all fields and inputs from the schema
 * - Handle type information for connection validation
 * - Initial expanded state (false)
 *
 * Use this when programmatically creating nodes from schemas.
 *
 * @param schema - The node schema to create data from
 * @returns Initialized CustomNodeData ready for use with ReactFlow
 *
 * @example
 * ```typescript
 * import { getDefaultCustomNodeData } from "@/components/nodes/CustomNode";
 * import mySchema from "@/lib/builtinNodeSchemas/myNodeSchema";
 *
 * // Create a new node
 * const newNode = {
 *   id: "node-1",
 *   type: "CustomNode",
 *   position: { x: 100, y: 100 },
 *   data: getDefaultCustomNodeData(mySchema),
 * };
 * ```
 */
export function getDefaultCustomNodeData(
  schema: CustomNodeSchema,
): CustomNodeData {
  const config: Record<string, unknown> = {};
  // Initialize field defaults
  schema.ui.fields.forEach((field) => {
    if (field.default !== undefined) {
      config[field.id] = field.default;
    }
  });
  // Initialize input defaults (for inputs with connection_only=false)
  schema.ui.inputs.forEach((input) => {
    if (input.connection_only === false && input.default !== undefined) {
      config[input.id] = input.default;
    }
  });

  const handleTypes: Record<
    string,
    {
      outputSource?: string;
      outputType?: string;
      acceptedSources?: string[];
      acceptedTypes?: string[];
    }
  > = {};

  const allAcceptedSources = new Set<string>();
  const allAcceptedTypes = new Set<string>();
  schema.ui.inputs.forEach((input) => {
    (input.accepted_sources || [input.source_type]).forEach((s) =>
      allAcceptedSources.add(s),
    );
    (input.accepted_types || [input.data_type]).forEach((t) =>
      allAcceptedTypes.add(t),
    );
    handleTypes[input.id] = {
      acceptedSources: input.accepted_sources || [input.source_type],
      acceptedTypes: input.accepted_types || [input.data_type],
    };
  });
  handleTypes["input"] = {
    acceptedSources: Array.from(allAcceptedSources),
    acceptedTypes: Array.from(allAcceptedTypes),
  };

  schema.ui.outputs.forEach((output) => {
    handleTypes[output.id] = {
      outputSource: output.source_type,
      outputType: output.data_type,
    };
  });

  return {
    schema,
    config,
    handleTypes,
    isExpanded: false,
  };
}
