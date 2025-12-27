"use client";

import { memo, useState, useCallback } from "react";
import { type NodeProps, useReactFlow } from "@xyflow/react";
import { useTheme } from "@/contexts/ThemeContext";
import type { HandlePositions, NodeExecutionState } from "@/lib/types";

// Import refactored hooks and components
import {
  useCustomNodeTabs,
  useCustomNodeHandleTypes,
  useConnectedInputs,
  useCustomNodeName,
  CustomNodeCollapsed,
  CustomNodeExpanded,
} from "@/components/nodes/custom";

// Types for custom node schema (matches backend)
export interface PortDefinition {
  id: string;
  label: string;
  source_type: string;
  data_type: string;
  accepted_sources?: string[];
  accepted_types?: string[];
  required: boolean;
  multiple: boolean;
  tab?: string;
  section?: string;
  handle_color?: string;
  // When true: only accepts connections (no manual input)
  // When false: shows editable field, disabled when connected
  connection_only?: boolean;
  // Widget configuration for manual input (when connection_only=false)
  widget?: string;
  default?: unknown;
  placeholder?: string;
  options?: { value: string; label: string }[];
}

export interface FieldDefinition {
  id: string;
  label: string;
  widget: string;
  default?: unknown;
  options?: { value: string; label: string }[];
  min_value?: number;
  max_value?: number;
  step?: number;
  placeholder?: string;
  help_text?: string;
  show_if?: Record<string, unknown>;
  tab?: string;
  section?: string;
}

export interface CustomNodeSchema {
  unit_id: string;
  label: string;
  menu_location: string;
  description: string;
  version: string;
  // Execution control properties
  output_node?: boolean; // True = sink node (triggers execution trace)
  always_execute?: boolean; // True = skip cache, always run
  ui: {
    inputs: PortDefinition[];
    outputs: PortDefinition[];
    fields: FieldDefinition[];
    color: string;
    icon?: string;
    expandable: boolean;
    default_width: number;
    default_height: number;
  };
}

export interface CustomNodeData {
  schema: CustomNodeSchema;
  name?: string;
  config: Record<string, unknown>;
  handlePositions?: HandlePositions;
  handleTypes?: Record<
    string,
    {
      outputSource?: string;
      outputType?: string;
      acceptedSources?: string[];
      acceptedTypes?: string[];
    }
  >;
  expandedSize?: { width: number; height: number };
  isExpanded?: boolean;
  isNodeLocked?: boolean;
  executionState?: NodeExecutionState;
  validationErrors?: string[];
  validationWarnings?: string[];
}

const CustomNode = memo(({ data, id }: NodeProps) => {
  const nodeData = data as unknown as CustomNodeData;
  const {
    schema,
    name: dataName,
    config = {},
    handlePositions,
    isExpanded: dataIsExpanded,
    isNodeLocked,
  } = nodeData;
  const name = dataName || schema.label;
  const { setNodes } = useReactFlow();
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(dataIsExpanded ?? false);

  // Use refactored hooks
  const { tabs, activeTab, setActiveTab } = useCustomNodeTabs(schema);
  const handleTypes = useCustomNodeHandleTypes(schema);
  const connectedInputs = useConnectedInputs(id, schema.ui.inputs);
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
      nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, isExpanded: newExpanded } }
          : node,
      ),
    );
    setIsExpanded(newExpanded);
  }, [id, isExpanded, setNodes]);

  const isFieldVisible = useCallback(
    (field: FieldDefinition) => {
      if (!field.show_if) return true;
      return Object.entries(field.show_if).every(
        ([key, value]) => config[key] === value,
      );
    },
    [config],
  );

  const headerColor = schema.ui.color || theme.colors.nodes.agent.header;
  const width = nodeData.expandedSize?.width || schema.ui.default_width;

  // Collapsed view
  if (!isExpanded && schema.ui.expandable) {
    return (
      <CustomNodeCollapsed
        id={id}
        nodeData={nodeData}
        schema={schema}
        name={name}
        handlePositions={handlePositions}
        handleTypes={handleTypes}
        headerColor={headerColor}
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
    />
  );
});

CustomNode.displayName = "CustomNode";

export default CustomNode;

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
