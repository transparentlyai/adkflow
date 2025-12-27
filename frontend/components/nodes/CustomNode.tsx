"use client";

import { memo, useState, useCallback, useMemo, useRef, useEffect } from "react";
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

const CustomNode = memo(({ data, id }: NodeProps) => {
  const nodeData = data as unknown as CustomNodeData;
  const { schema, name: dataName, config = {}, handlePositions, isExpanded: dataIsExpanded, isNodeLocked, validationErrors, validationWarnings } = nodeData;
  const name = dataName || schema.label;
  const { setNodes } = useReactFlow();
  const { theme } = useTheme();
  const { connectionState } = useConnection();
  const [isExpanded, setIsExpanded] = useState(dataIsExpanded ?? false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleNameClick = (e: React.MouseEvent) => {
    if (isNodeLocked) return;
    e.stopPropagation();
    setIsEditing(true);
    setEditedName(name);
  };

  const handleNameSave = () => {
    if (editedName.trim()) {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  name: editedName.trim(),
                },
              }
            : node
        )
      );
    }
    setIsEditing(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleNameSave();
    } else if (e.key === "Escape") {
      setEditedName(name);
      setIsEditing(false);
    }
  };

  // Compute tabs from schema
  const tabs = useMemo(() => {
    const tabSet = new Set<string>();
    schema.ui.inputs.forEach(i => i.tab && tabSet.add(i.tab));
    schema.ui.fields.forEach(f => f.tab && tabSet.add(f.tab));
    schema.ui.outputs.forEach(o => o.tab && tabSet.add(o.tab));

    if (tabSet.size === 0) return null;

    const sorted = Array.from(tabSet);
    const generalIdx = sorted.indexOf("General");
    if (generalIdx > 0) {
      sorted.splice(generalIdx, 1);
      sorted.unshift("General");
    }
    return sorted;
  }, [schema]);

  const [activeTab, setActiveTab] = useState<string>(tabs?.[0] || "General");

  // Build handle types from schema
  const handleTypes = useMemo(() => {
    const types: Record<string, { outputSource?: string; outputType?: string; acceptedSources?: string[]; acceptedTypes?: string[] }> = {};

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

  const isFieldVisible = useCallback((field: FieldDefinition) => {
    if (!field.show_if) return true;
    return Object.entries(field.show_if).every(([key, value]) => config[key] === value);
  }, [config]);

  // Group elements by section
  const groupBySection = <T extends { section?: string }>(items: T[]): Map<string | null, T[]> => {
    const groups = new Map<string | null, T[]>();
    items.forEach(item => {
      const key = item.section || null;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    });
    return groups;
  };

  // Get elements for a specific tab
  const getElementsForTab = useCallback((tab: string | null) => {
    const tabFilter = <T extends { tab?: string }>(el: T) =>
      tab === null ? !el.tab : el.tab === tab;

    return {
      inputs: schema.ui.inputs.filter(tabFilter),
      fields: schema.ui.fields.filter(isFieldVisible).filter(tabFilter),
      outputs: schema.ui.outputs.filter(tabFilter),
    };
  }, [schema, isFieldVisible]);

  const headerColor = schema.ui.color || theme.colors.nodes.agent.header;
  const handleStyle = { width: 10, height: 10, border: `2px solid ${theme.colors.handles.border}` };

  // Render input port with handle
  const renderInput = (input: PortDefinition) => {
    const isConnected = !!connectedInputs[input.id];
    const validityStyle = getHandleValidityStyle(
      handleTypes[input.id]?.acceptedSources,
      handleTypes[input.id]?.acceptedTypes
    );
    const handleColor = input.handle_color || theme.colors.handles.input;
    const connectionOnly = input.connection_only !== false; // Default to true

    // Connection-only input (no manual editing)
    if (connectionOnly) {
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
                width: 10,
                height: 10,
                border: `2px solid ${theme.colors.handles.border}`,
                backgroundColor: handleColor,
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
    }

    // Input with inline editor (connection_only=false)
    // Create a pseudo-field for the widget renderer
    const inputAsField: FieldDefinition = {
      id: input.id,
      label: input.label,
      widget: input.widget || 'text_input',
      default: input.default,
      placeholder: input.placeholder,
      options: input.options,
    };

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
          className="relative flex items-center gap-2"
          style={{ paddingLeft: 4 }}
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
              width: 10,
              height: 10,
              border: `2px solid ${theme.colors.handles.border}`,
              backgroundColor: handleColor,
              ...validityStyle,
            }}
            title={input.label}
          />
          {isConnected ? (
            // When connected, show source name (read-only)
            <div
              className="flex-1 flex items-center gap-2 px-2 py-1 text-sm border rounded"
              style={{
                backgroundColor: theme.colors.nodes.common.footer.background,
                borderColor: theme.colors.nodes.common.container.border,
                opacity: 0.7,
              }}
            >
              <Circle
                className="w-3 h-3 flex-shrink-0"
                style={{ color: theme.colors.ui.primary }}
              />
              <span
                className="text-xs truncate"
                style={{ color: theme.colors.nodes.common.text.primary }}
              >
                {connectedInputs[input.id]}
              </span>
            </div>
          ) : (
            // When not connected, show editable widget
            <div className="flex-1 min-w-0">
              {renderWidget(
                inputAsField,
                config[input.id] ?? input.default,
                (value) => handleConfigChange(input.id, value),
                { disabled: isNodeLocked, theme }
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render config field
  const renderField = (field: FieldDefinition) => {
    return (
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
    );
  };

  // Render section with header and separator
  const renderSection = (sectionName: string | null, content: React.ReactNode, isFirst: boolean = false) => (
    <div
      key={sectionName || 'default'}
      className={isFirst ? '' : 'mt-3 pt-3 border-t'}
      style={isFirst ? undefined : { borderColor: theme.colors.nodes.common.container.border }}
    >
      {sectionName && (
        <div
          className="text-xs font-semibold uppercase tracking-wide mb-1.5 pl-1 border-l-2"
          style={{
            color: theme.colors.nodes.common.text.muted,
            borderColor: theme.colors.ui.primary,
          }}
        >
          {sectionName}
        </div>
      )}
      <div className="space-y-2">
        {content}
      </div>
    </div>
  );

  // Render tab content
  const renderTabContent = () => {
    const elements = tabs ? getElementsForTab(activeTab) : getElementsForTab(null);
    const inputSections = groupBySection(elements.inputs);
    const fieldSections = groupBySection(elements.fields);

    // Track section index across both inputs and fields
    let sectionIndex = 0;

    return (
      <>
        {/* Inputs grouped by section */}
        {Array.from(inputSections.entries()).map(([section, inputs]) =>
          renderSection(section, inputs.map(renderInput), sectionIndex++ === 0)
        )}

        {/* Fields grouped by section */}
        {Array.from(fieldSections.entries()).map(([section, fields]) =>
          renderSection(section, fields.map(renderField), sectionIndex++ === 0)
        )}

        {elements.inputs.length === 0 && elements.fields.length === 0 && (
          <p
            className="text-xs text-center py-1"
            style={{ color: theme.colors.nodes.common.text.muted }}
          >
            No configuration options
          </p>
        )}
      </>
    );
  };

  // Collapsed view
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
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={handleNameKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 px-1 py-0.5 rounded text-xs font-medium outline-none min-w-0"
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
              }}
            />
          ) : (
            <span
              className="font-medium text-xs text-white truncate cursor-text"
              onClick={handleNameClick}
              title="Click to rename"
            >
              {name}
            </span>
          )}
          <ChevronDown className="w-3 h-3 text-white opacity-60" />
        </div>

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
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={handleNameKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 px-1 py-0.5 rounded text-xs font-medium outline-none min-w-0"
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
            }}
          />
        ) : (
          <span
            className="font-medium text-xs text-white truncate cursor-text"
            onClick={handleNameClick}
            title="Click to rename"
          >
            {name}
          </span>
        )}
        <ChevronUp className="w-3 h-3 text-white opacity-60" />
      </div>

      {/* Tab bar */}
      {tabs && (
        <div
          className="flex border-b"
          style={{ borderColor: theme.colors.nodes.common.container.border }}
        >
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-2 py-1 text-xs font-medium transition-colors"
              style={{
                color: activeTab === tab
                  ? theme.colors.ui.primary
                  : theme.colors.nodes.common.text.secondary,
                borderBottom: activeTab === tab
                  ? `2px solid ${theme.colors.ui.primary}`
                  : '2px solid transparent',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {/* Form content */}
      <div className="p-2 space-y-2 nodrag nowheel">
        {renderTabContent()}

        {/* Output ports - always visible */}
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
                    backgroundColor: output.handle_color || theme.colors.handles.output,
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
  const config: Record<string, unknown> = {};
  // Initialize field defaults
  schema.ui.fields.forEach(field => {
    if (field.default !== undefined) {
      config[field.id] = field.default;
    }
  });
  // Initialize input defaults (for inputs with connection_only=false)
  schema.ui.inputs.forEach(input => {
    if (input.connection_only === false && input.default !== undefined) {
      config[input.id] = input.default;
    }
  });

  const handleTypes: Record<string, { outputSource?: string; outputType?: string; acceptedSources?: string[]; acceptedTypes?: string[] }> = {};

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
