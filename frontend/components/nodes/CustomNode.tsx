"use client";

import { memo, useState, useCallback, useMemo } from "react";
import { Handle, Position, type NodeProps, useReactFlow, useStore } from "@xyflow/react";
import { useTheme } from "@/contexts/ThemeContext";
import { useConnection } from "@/contexts/ConnectionContext";
import { isTypeCompatible } from "@/lib/types";
import DraggableHandle from "@/components/DraggableHandle";
import { ChevronDown, ChevronUp, Circle } from "lucide-react";
import type { HandlePositions, NodeExecutionState } from "@/lib/types";
import ValidationIndicator from "@/components/nodes/ValidationIndicator";
import { renderWidget } from "@/components/nodes/widgets/WidgetRenderer";

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
}

export interface CustomNodeSchema {
  unit_id: string;
  label: string;
  menu_location: string;
  description: string;
  version: string;
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
  config: Record<string, unknown>;
  handlePositions?: HandlePositions;
  handleTypes?: Record<string, {
    outputSource?: string;
    outputType?: string;
    acceptedSources?: string[];
    acceptedTypes?: string[];
  }>;
  expandedSize?: { width: number; height: number };
  isExpanded?: boolean;
  isNodeLocked?: boolean;
  executionState?: NodeExecutionState;
  validationErrors?: string[];
  validationWarnings?: string[];
}

const CustomNode = memo(({ data, id, selected }: NodeProps) => {
  const nodeData = data as unknown as CustomNodeData;
  const { schema, config = {}, handlePositions, isExpanded: dataIsExpanded, isNodeLocked, executionState, validationErrors, validationWarnings } = nodeData;
  const { setNodes } = useReactFlow();
  const { theme } = useTheme();
  const { connectionState } = useConnection();
  const [isExpanded, setIsExpanded] = useState(dataIsExpanded ?? false);

  // Build handle types from schema
  const handleTypes = useMemo(() => {
    const types: Record<string, { outputSource?: string; outputType?: string; acceptedSources?: string[]; acceptedTypes?: string[] }> = {};

    // Add unified input handle type that accepts all input types
    const allAcceptedSources = new Set<string>();
    const allAcceptedTypes = new Set<string>();
    schema.ui.inputs.forEach(input => {
      (input.accepted_sources || [input.source_type]).forEach(s => allAcceptedSources.add(s));
      (input.accepted_types || [input.data_type]).forEach(t => allAcceptedTypes.add(t));
      types[input.id] = {
        acceptedSources: input.accepted_sources || [input.source_type],
        acceptedTypes: input.accepted_types || [input.data_type],
      };
    });
    types['input'] = {
      acceptedSources: Array.from(allAcceptedSources),
      acceptedTypes: Array.from(allAcceptedTypes),
    };

    schema.ui.outputs.forEach(output => {
      types[output.id] = {
        outputSource: output.source_type,
        outputType: output.data_type,
      };
    });

    return types;
  }, [schema]);

  // Track connected source names for each input
  const connectedInputs = useStore(
    useCallback((state) => {
      const connections: Record<string, string> = {};
      for (const input of schema.ui.inputs) {
        for (const edge of state.edges) {
          if (edge.target === id && (edge.targetHandle === input.id || edge.targetHandle === 'input')) {
            const sourceNode = state.nodes.find(n => n.id === edge.source);
            if (sourceNode) {
              // Try to get a meaningful name from the source node
              const sourceData = sourceNode.data as Record<string, unknown>;
              const name = (sourceData?.agent as { name?: string })?.name
                || (sourceData?.prompt as { name?: string })?.name
                || (sourceData?.schema as { label?: string })?.label
                || sourceNode.type
                || 'Connected';
              connections[input.id] = name;
              break;
            }
          }
        }
      }
      return connections;
    }, [id, schema.ui.inputs])
  );

  // Compute validity style for a target handle based on connection state
  const getHandleValidityStyle = useCallback((acceptedSources?: string[], acceptedTypes?: string[]): React.CSSProperties => {
    if (!connectionState.isDragging || !acceptedSources || !acceptedTypes) {
      return {};
    }
    if (connectionState.sourceNodeId === id) {
      return { boxShadow: '0 0 0 2px #ef4444, 0 0 8px 2px #ef4444', cursor: 'not-allowed' };
    }
    const isValid = isTypeCompatible(
      connectionState.sourceOutputSource,
      connectionState.sourceOutputType,
      acceptedSources,
      acceptedTypes
    );
    if (isValid) {
      return { boxShadow: '0 0 0 2px #22c55e, 0 0 8px 2px #22c55e', cursor: 'pointer' };
    }
    return { boxShadow: '0 0 0 2px #ef4444, 0 0 8px 2px #ef4444', cursor: 'not-allowed' };
  }, [connectionState, id]);

  const handleConfigChange = useCallback((fieldId: string, value: unknown) => {
    setNodes(nodes => nodes.map(node =>
      node.id === id
        ? { ...node, data: { ...node.data, config: { ...config, [fieldId]: value } } }
        : node
    ));
  }, [id, config, setNodes]);

  const toggleExpand = useCallback(() => {
    const newExpanded = !isExpanded;
    setNodes(nodes => nodes.map(node =>
      node.id === id
        ? { ...node, data: { ...node.data, isExpanded: newExpanded } }
        : node
    ));
    setIsExpanded(newExpanded);
  }, [id, isExpanded, setNodes]);

  // Check if field should be visible based on show_if
  const isFieldVisible = useCallback((field: FieldDefinition) => {
    if (!field.show_if) return true;
    return Object.entries(field.show_if).every(([key, value]) => config[key] === value);
  }, [config]);

  const headerColor = schema.ui.color || theme.colors.nodes.agent.header;
  const handleStyle = { width: 10, height: 10, border: `2px solid ${theme.colors.handles.border}` };
  const inputHandleStyle = useMemo(() => ({
    width: 10,
    height: 10,
    border: `2px solid ${theme.colors.handles.border}`,
    backgroundColor: theme.colors.handles.input,
  }), [theme.colors.handles.border, theme.colors.handles.input]);

  // Collapsed view - single unified handle
  if (!isExpanded && schema.ui.expandable) {
    return (
      <div
        className="rounded-lg shadow-md cursor-pointer"
        style={{
          backgroundColor: headerColor,
          minWidth: 120,
        }}
        onDoubleClick={toggleExpand}
        title="Double-click to configure"
      >
        <ValidationIndicator errors={validationErrors} warnings={validationWarnings} />

        {/* Single unified input handle */}
        <DraggableHandle
          nodeId={id}
          handleId="input"
          type="target"
          defaultEdge="left"
          defaultPercent={50}
          handlePositions={handlePositions}
          acceptedSources={handleTypes['input']?.acceptedSources}
          acceptedTypes={handleTypes['input']?.acceptedTypes}
          style={{ ...handleStyle, backgroundColor: theme.colors.handles.input }}
        />

        {/* Hidden handles for typed edges */}
        {schema.ui.inputs.map(input => (
          <Handle
            key={input.id}
            type="target"
            position={Position.Left}
            id={input.id}
            style={{ opacity: 0, pointerEvents: 'none', top: '50%', left: 0 }}
          />
        ))}

        <div className="px-3 py-2 flex items-center justify-between gap-2">
          <span className="font-medium text-xs text-white truncate">
            {schema.label}
          </span>
          <ChevronDown className="w-3 h-3 text-white opacity-60" />
        </div>

        {/* Output handles */}
        {schema.ui.outputs.map((output, i) => (
          <DraggableHandle
            key={output.id}
            nodeId={id}
            handleId={output.id}
            type="source"
            defaultEdge="right"
            defaultPercent={((i + 1) / (schema.ui.outputs.length + 1)) * 100}
            handlePositions={handlePositions}
            title={output.label}
            outputSource={handleTypes[output.id]?.outputSource}
            outputType={handleTypes[output.id]?.outputType}
          />
        ))}
      </div>
    );
  }

  // Expanded view
  const width = nodeData.expandedSize?.width || schema.ui.default_width;

  return (
    <div
      className="rounded-lg shadow-lg overflow-hidden"
      style={{
        width,
        backgroundColor: theme.colors.nodes.common.container.background,
        borderColor: theme.colors.nodes.common.container.border,
        borderWidth: 1,
        borderStyle: 'solid',
      }}
    >
      <ValidationIndicator errors={validationErrors} warnings={validationWarnings} />

      {/* Header */}
      <div
        className="px-2 py-1.5 flex items-center justify-between cursor-pointer"
        style={{ backgroundColor: headerColor }}
        onDoubleClick={toggleExpand}
      >
        <span className="font-medium text-xs text-white truncate">
          {schema.label}
        </span>
        <ChevronUp className="w-3 h-3 text-white opacity-60" />
      </div>

      {/* Form content */}
      <div className="p-2 space-y-2 nodrag nowheel">
        {/* Input ports as form fields with handles - stacked labels */}
        {schema.ui.inputs.map(input => {
          const isConnected = !!connectedInputs[input.id];
          const validityStyle = getHandleValidityStyle(
            handleTypes[input.id]?.acceptedSources,
            handleTypes[input.id]?.acceptedTypes
          );

          return (
            <div key={input.id} className="space-y-1">
              <label
                className="text-xs font-medium"
                style={{ color: theme.colors.nodes.common.text.secondary }}
              >
                {input.label}
                {input.required && <span className="text-red-400 ml-0.5">*</span>}
              </label>
              <div
                className="relative flex items-center gap-2 px-2 py-1 text-sm border rounded"
                style={{
                  backgroundColor: theme.colors.nodes.common.footer.background,
                  borderColor: theme.colors.nodes.common.container.border,
                }}
              >
                <Handle
                  type="target"
                  position={Position.Left}
                  id={input.id}
                  style={{
                    position: 'absolute',
                    left: -5,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    transition: 'box-shadow 0.15s ease',
                    ...inputHandleStyle,
                    ...validityStyle,
                  }}
                  title={input.label}
                />
                <Circle
                  className="w-3 h-3 flex-shrink-0"
                  style={{ color: theme.colors.nodes.common.text.muted }}
                />
                <span
                  className={`text-xs truncate ${isConnected ? '' : 'italic'}`}
                  style={{
                    color: isConnected
                      ? theme.colors.nodes.common.text.primary
                      : theme.colors.nodes.common.text.muted
                  }}
                >
                  {isConnected ? connectedInputs[input.id] : 'None'}
                </span>
              </div>
            </div>
          );
        })}

        {/* Config fields - inline labels */}
        {schema.ui.fields.filter(isFieldVisible).map(field => (
          <div key={field.id} className="flex items-center gap-2">
            <label
              className="text-xs font-medium w-20 flex-shrink-0"
              style={{ color: theme.colors.nodes.common.text.secondary }}
            >
              {field.label}
            </label>
            <div className="flex-1 min-w-0">
              {renderWidget(
                field,
                config[field.id] ?? field.default,
                (value) => handleConfigChange(field.id, value),
                { disabled: isNodeLocked, theme }
              )}
            </div>
          </div>
        ))}

        {schema.ui.inputs.length === 0 && schema.ui.fields.length === 0 && (
          <p
            className="text-xs text-center py-1"
            style={{ color: theme.colors.nodes.common.text.muted }}
          >
            No configuration options
          </p>
        )}

        {/* Output ports with labels - right aligned */}
        {schema.ui.outputs.length > 0 && (
          <div className="pt-1 border-t" style={{ borderColor: theme.colors.nodes.common.container.border }}>
            {schema.ui.outputs.map(output => (
              <div
                key={output.id}
                className="relative flex items-center justify-end gap-2 py-0.5 pr-3"
              >
                <span
                  className="text-xs"
                  style={{ color: theme.colors.nodes.common.text.secondary }}
                >
                  {output.label}
                </span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={output.id}
                  style={{
                    position: 'absolute',
                    right: -5,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 10,
                    height: 10,
                    border: `2px solid ${theme.colors.handles.border}`,
                    backgroundColor: theme.colors.handles.output,
                  }}
                  title={output.label}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

CustomNode.displayName = "CustomNode";

export default CustomNode;

export function getDefaultCustomNodeData(schema: CustomNodeSchema): CustomNodeData {
  // Build initial config from field defaults
  const config: Record<string, unknown> = {};
  schema.ui.fields.forEach(field => {
    if (field.default !== undefined) {
      config[field.id] = field.default;
    }
  });

  // Build handleTypes from schema
  const handleTypes: Record<string, { outputSource?: string; outputType?: string; acceptedSources?: string[]; acceptedTypes?: string[] }> = {};

  // Unified input handle
  const allAcceptedSources = new Set<string>();
  const allAcceptedTypes = new Set<string>();
  schema.ui.inputs.forEach(input => {
    (input.accepted_sources || [input.source_type]).forEach(s => allAcceptedSources.add(s));
    (input.accepted_types || [input.data_type]).forEach(t => allAcceptedTypes.add(t));
    handleTypes[input.id] = {
      acceptedSources: input.accepted_sources || [input.source_type],
      acceptedTypes: input.accepted_types || [input.data_type],
    };
  });
  handleTypes['input'] = {
    acceptedSources: Array.from(allAcceptedSources),
    acceptedTypes: Array.from(allAcceptedTypes),
  };

  schema.ui.outputs.forEach(output => {
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
