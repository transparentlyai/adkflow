/**
 * ExpandedNodeContentArea - Renders the tab content area with inputs, fields, and outputs
 */

import React, { useCallback, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Info } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import CustomNodeInput from "@/components/nodes/custom/CustomNodeInput";
import CustomNodeOutput from "@/components/nodes/custom/CustomNodeOutput";
import MonacoEditorWidget from "@/components/nodes/widgets/MonacoEditorWidget";
import { renderWidget } from "@/components/nodes/widgets/WidgetRenderer";
import {
  groupBySection,
  hasCodeEditorWidget,
  getCodeEditorField,
} from "@/components/nodes/custom/expandedNodeUtils";
import { DynamicInputEditor } from "@/components/nodes/custom/expanded/DynamicInputEditor";
import type {
  CustomNodeSchema,
  CustomNodeData,
  PortDefinition,
  FieldDefinition,
  DynamicInputConfig,
  NodeAggregationMode,
} from "@/components/nodes/CustomNode";
import type { HandleTypes } from "@/components/nodes/custom/hooks/useCustomNodeHandleTypes";

interface ExpandedNodeContentAreaProps {
  id: string;
  nodeData: CustomNodeData;
  schema: CustomNodeSchema;
  config: Record<string, unknown>;
  handleTypes: HandleTypes;
  connectedInputs: Record<string, string[]>;
  headerColor: string;
  tabs: string[] | null;
  activeTab: string;
  onConfigChange: (fieldId: string, value: unknown) => void;
  isFieldVisible: (field: FieldDefinition) => boolean;
  filePath?: string;
  onSave?: () => Promise<void>;
  onChangeFile?: () => void;
  isSaving?: boolean;
  isDirty?: boolean;
}

export function ExpandedNodeContentArea({
  id,
  nodeData,
  schema,
  config,
  handleTypes,
  connectedInputs,
  headerColor,
  tabs,
  activeTab,
  onConfigChange,
  isFieldVisible,
  filePath,
  onSave,
  onChangeFile,
  isSaving = false,
  isDirty = false,
}: ExpandedNodeContentAreaProps) {
  const { theme } = useTheme();

  // Track collapsed sections (Safety collapsed by default)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set(["Safety"]),
  );

  const toggleSection = useCallback((sectionName: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionName)) {
        next.delete(sectionName);
      } else {
        next.add(sectionName);
      }
      return next;
    });
  }, []);

  // Get additional handles (used to filter outputs rendered inside vs at edge)
  const additionalHandles = useMemo(
    () => schema.ui.handle_layout?.additional_handles || [],
    [schema.ui.handle_layout?.additional_handles],
  );

  // Fields handled by DynamicInputEditor (excluded from normal rendering)
  const dynamicInputEditorFields = useMemo(
    () =>
      schema.ui.dynamic_inputs
        ? new Set([
            "aggregationMode",
            "outputVariableName",
            "separator",
            "includeMetadata",
          ])
        : new Set<string>(),
    [schema.ui.dynamic_inputs],
  );

  // Get elements for a specific tab
  const getElementsForTab = useCallback(
    (tab: string | null) => {
      const tabFilter = <T extends { tab?: string }>(el: T) =>
        tab === null ? !el.tab : el.tab === tab;

      // Filter out the first input if it's meant to be in the footer
      const inputInFooter = schema.ui.handle_layout?.input_in_footer;
      const footerInputId = inputInFooter ? schema.ui.inputs[0]?.id : null;

      return {
        inputs: schema.ui.inputs
          .filter(tabFilter)
          .filter((input) => input.id !== footerInputId),
        fields: schema.ui.fields
          .filter(isFieldVisible)
          .filter(tabFilter)
          .filter((f) => !dynamicInputEditorFields.has(f.id)),
        outputs: schema.ui.outputs.filter(tabFilter),
      };
    },
    [schema, isFieldVisible, dynamicInputEditorFields],
  );

  // Render config field with optional label width for alignment
  const renderField = (field: FieldDefinition, labelWidth?: number) => {
    // Check if this field has a corresponding connected input (e.g., callback handles)
    const connectedSources = connectedInputs[field.id];
    const isOverridden = connectedSources && connectedSources.length > 0;

    if (field.widget === "code_editor" || field.widget === "monaco_editor") {
      const editorHeight = nodeData.expandedSize?.height
        ? nodeData.expandedSize.height - 150
        : 200;

      return (
        <div key={field.id} className="space-y-1">
          <MonacoEditorWidget
            value={
              (config[field.id] as string) ?? (field.default as string) ?? ""
            }
            onChange={(value) => onConfigChange(field.id, value)}
            language={field.language || "python"}
            readOnly={nodeData.isNodeLocked}
            height={Math.max(150, editorHeight)}
            showMenuBar={!!onSave && !!filePath}
            filePath={filePath}
            onSave={onSave}
            onChangeFile={onChangeFile}
            isDirty={isDirty}
            isSaving={isSaving}
            hideGutter={field.hide_gutter}
          />
        </div>
      );
    }

    // If field is overridden by a connected node, show indicator
    if (isOverridden) {
      return (
        <div key={field.id} className="flex items-center gap-1">
          <label
            className="text-[10px] font-medium flex-shrink-0"
            style={{
              color: theme.colors.nodes.common.text.muted,
              minWidth: labelWidth ? `${labelWidth}ch` : undefined,
            }}
          >
            {field.label}
          </label>
          <div
            className="flex-1 min-w-0 flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[11px]"
            style={{
              backgroundColor: `${theme.colors.nodes.common.container.border}40`,
              color: theme.colors.nodes.common.text.muted,
            }}
            title={`Overridden by connected node: ${connectedSources.join(", ")}`}
          >
            <Info className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">
              Connected: {connectedSources.join(", ")}
            </span>
          </div>
        </div>
      );
    }

    return (
      <div key={field.id} className="flex items-center gap-1">
        <label
          className="text-[10px] font-medium flex-shrink-0"
          style={{
            color: theme.colors.nodes.common.text.secondary,
            minWidth: labelWidth ? `${labelWidth}ch` : undefined,
            cursor: field.help_text ? "help" : undefined,
          }}
          title={field.help_text}
        >
          {field.label}
          {field.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <div className="flex-1 min-w-0">
          {renderWidget(
            field,
            config[field.id] ?? field.default,
            (value) => onConfigChange(field.id, value),
            { disabled: nodeData.isNodeLocked, theme, compact: true },
          )}
        </div>
      </div>
    );
  };

  // Render section with header and separator (collapsible when named)
  const renderSection = (
    sectionName: string | null,
    content: React.ReactNode,
    isFirst: boolean = false,
    compact: boolean = false,
  ) => {
    const isCollapsed = sectionName
      ? collapsedSections.has(sectionName)
      : false;
    const isCollapsible = !!sectionName;

    return (
      <div
        key={sectionName || "default"}
        className={isFirst ? "" : "mt-2 pt-2 border-t"}
        style={
          isFirst
            ? undefined
            : { borderColor: theme.colors.nodes.common.container.border }
        }
      >
        {sectionName && (
          <button
            type="button"
            onClick={() => toggleSection(sectionName)}
            className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide mb-1 pl-1 border-l-2 w-full text-left hover:opacity-80 transition-opacity"
            style={{
              color: theme.colors.nodes.common.text.muted,
              borderColor: headerColor,
            }}
          >
            {isCollapsible &&
              (isCollapsed ? (
                <ChevronRight className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              ))}
            {sectionName}
          </button>
        )}
        {!isCollapsed && (
          <div className={compact ? "" : "space-y-1"}>{content}</div>
        )}
      </div>
    );
  };

  // Get handle position for an input/output from additional_handles
  const getHandlePosition = useCallback(
    (portId: string): "left" | "right" | undefined => {
      const handle = additionalHandles.find((h) => h.id === portId);
      if (
        handle &&
        (handle.position === "left" || handle.position === "right")
      ) {
        return handle.position;
      }
      return undefined;
    },
    [additionalHandles],
  );

  // Render input port
  const renderInput = (input: PortDefinition, labelWidth?: number) => {
    const handlePos = getHandlePosition(input.id);
    return (
      <CustomNodeInput
        key={input.id}
        input={input}
        config={config}
        isConnected={connectedInputs[input.id]?.length > 0}
        connectedSourceNames={connectedInputs[input.id]}
        handleTypeInfo={handleTypes[input.id]}
        nodeId={id}
        isNodeLocked={nodeData.isNodeLocked}
        labelWidth={labelWidth}
        onConfigChange={onConfigChange}
        handlePosition={handlePos === "right" ? "right" : "left"}
      />
    );
  };

  // Render tab content
  const elements = tabs
    ? getElementsForTab(activeTab)
    : getElementsForTab(null);
  const inputSections = groupBySection(elements.inputs);
  const fieldSections = groupBySection(elements.fields);

  // Calculate global max label widths across ALL inputs/fields in the tab for grid alignment
  const globalMaxInputLabelWidth =
    elements.inputs.length > 0
      ? Math.max(...elements.inputs.map((i) => i.label.length))
      : 0;
  const globalMaxFieldLabelWidth =
    elements.fields.length > 0
      ? Math.max(...elements.fields.map((f) => f.label.length))
      : 0;

  let sectionIndex = 0;

  return (
    <div className="p-2 nodrag nowheel" style={{ overflow: "visible" }}>
      {/* Inputs grouped by section - use global label width for grid alignment */}
      {Array.from(inputSections.entries()).map(([section, inputs]) => {
        return renderSection(
          section,
          inputs.map((input) => renderInput(input, globalMaxInputLabelWidth)),
          sectionIndex++ === 0,
          true,
        );
      })}

      {/* Fields grouped by section - use global label width for grid alignment */}
      {Array.from(fieldSections.entries()).map(([section, fields]) => {
        return renderSection(
          section,
          fields.map((field) => renderField(field, globalMaxFieldLabelWidth)),
          sectionIndex++ === 0,
        );
      })}

      {/* Dynamic inputs editor (for nodes that support dynamic inputs) */}
      {schema.ui.dynamic_inputs && (
        <div
          className={sectionIndex > 0 ? "mt-2 pt-2 border-t" : ""}
          style={{
            overflow: "visible",
            ...(sectionIndex > 0
              ? { borderColor: theme.colors.nodes.common.container.border }
              : {}),
          }}
        >
          <DynamicInputEditor
            inputs={
              (config.dynamicInputs as DynamicInputConfig[] | undefined) || []
            }
            aggregationMode={
              (config.aggregationMode as NodeAggregationMode | undefined) ||
              "pass"
            }
            separator={(config.separator as string | undefined) || "\n\n"}
            outputVariableName={
              (config.outputVariableName as string | undefined) || "context"
            }
            includeMetadata={
              (config.includeMetadata as boolean | undefined) || false
            }
            connectedInputs={connectedInputs}
            schemaFields={schema.ui.fields}
            onInputsChange={(inputs) => onConfigChange("dynamicInputs", inputs)}
            onAggregationModeChange={(mode) =>
              onConfigChange("aggregationMode", mode)
            }
            onSeparatorChange={(sep) => onConfigChange("separator", sep)}
            onOutputVariableNameChange={(name) =>
              onConfigChange("outputVariableName", name)
            }
            onIncludeMetadataChange={(include) =>
              onConfigChange("includeMetadata", include)
            }
            isNodeLocked={nodeData.isNodeLocked}
            headerColor={headerColor}
          />
        </div>
      )}

      {elements.inputs.length === 0 &&
        elements.fields.length === 0 &&
        !schema.ui.dynamic_inputs && (
          <p
            className="text-xs text-center py-1"
            style={{ color: theme.colors.nodes.common.text.muted }}
          >
            No configuration options
          </p>
        )}

      {/* Output ports - always visible
          - Exclude outputs rendered as edge handles (top/bottom positions in additional_handles)
          - Include outputs with left position (like Plug) - they render inline with handle on left */}
      {schema.ui.outputs.filter((o) => {
        const handle = additionalHandles.find((h) => h.id === o.id);
        // Include if not in additional_handles, OR if it's a left-positioned output
        return !handle || handle.position === "left";
      }).length > 0 && (
        <div
          className="mt-2 pt-2 border-t"
          style={{
            borderColor: theme.colors.nodes.common.container.border,
          }}
        >
          {schema.ui.outputs
            .filter((o) => {
              const handle = additionalHandles.find((h) => h.id === o.id);
              return !handle || handle.position === "left";
            })
            .map((output) => {
              const handlePos = getHandlePosition(output.id);
              return (
                <CustomNodeOutput
                  key={output.id}
                  output={output}
                  handlePosition={handlePos === "left" ? "left" : "right"}
                />
              );
            })}
        </div>
      )}
    </div>
  );
}

// Helper hooks for parent component
export function useCodeEditorInfo(
  schema: CustomNodeSchema,
  config: Record<string, unknown>,
) {
  const hasEditor = useMemo(() => hasCodeEditorWidget(schema), [schema]);
  const codeEditorField = useMemo(() => getCodeEditorField(schema), [schema]);

  const lineCount = useMemo(() => {
    if (codeEditorField) {
      const code = (config[codeEditorField.id] as string) || "";
      return code.split("\n").length;
    }
    return 0;
  }, [codeEditorField, config]);

  return { hasEditor, lineCount };
}
