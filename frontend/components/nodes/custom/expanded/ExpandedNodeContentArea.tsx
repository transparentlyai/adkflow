/**
 * ExpandedNodeContentArea - Renders the tab content area with inputs, fields, and outputs
 */

import React, { useCallback, useMemo } from "react";
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

  // Get additional handles (used to filter outputs rendered inside vs at edge)
  const additionalHandles = useMemo(
    () => schema.ui.handle_layout?.additional_handles || [],
    [schema.ui.handle_layout?.additional_handles],
  );

  // Get elements for a specific tab
  const getElementsForTab = useCallback(
    (tab: string | null) => {
      const tabFilter = <T extends { tab?: string }>(el: T) =>
        tab === null ? !el.tab : el.tab === tab;

      return {
        inputs: schema.ui.inputs.filter(tabFilter),
        fields: schema.ui.fields.filter(isFieldVisible).filter(tabFilter),
        outputs: schema.ui.outputs.filter(tabFilter),
      };
    },
    [schema, isFieldVisible],
  );

  // Render config field with optional label width for alignment
  const renderField = (field: FieldDefinition, labelWidth?: number) => {
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
            showMenuBar={!!onSave}
            filePath={filePath}
            onSave={onSave}
            onChangeFile={onChangeFile}
            isDirty={isDirty}
            isSaving={isSaving}
          />
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

  // Render section with header and separator
  const renderSection = (
    sectionName: string | null,
    content: React.ReactNode,
    isFirst: boolean = false,
    compact: boolean = false,
  ) => (
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
        <div
          className="text-[10px] font-semibold uppercase tracking-wide mb-1 pl-1 border-l-2"
          style={{
            color: theme.colors.nodes.common.text.muted,
            borderColor: headerColor,
          }}
        >
          {sectionName}
        </div>
      )}
      <div className={compact ? "" : "space-y-1"}>{content}</div>
    </div>
  );

  // Render input port
  const renderInput = (input: PortDefinition, labelWidth?: number) => (
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
    />
  );

  const getMaxInputLabelWidth = (inputs: PortDefinition[]) =>
    Math.max(...inputs.map((i) => i.label.length));

  const getMaxFieldLabelWidth = (fields: FieldDefinition[]) =>
    Math.max(...fields.map((f) => f.label.length));

  // Render tab content
  const elements = tabs
    ? getElementsForTab(activeTab)
    : getElementsForTab(null);
  const inputSections = groupBySection(elements.inputs);
  const fieldSections = groupBySection(elements.fields);

  let sectionIndex = 0;

  return (
    <div className="p-2 nodrag nowheel">
      {/* Inputs grouped by section - compact spacing */}
      {Array.from(inputSections.entries()).map(([section, inputs]) => {
        const maxLabelWidth = getMaxInputLabelWidth(inputs);
        return renderSection(
          section,
          inputs.map((input) => renderInput(input, maxLabelWidth)),
          sectionIndex++ === 0,
          true,
        );
      })}

      {/* Fields grouped by section */}
      {Array.from(fieldSections.entries()).map(([section, fields]) => {
        const maxLabelWidth = getMaxFieldLabelWidth(fields);
        return renderSection(
          section,
          fields.map((field) => renderField(field, maxLabelWidth)),
          sectionIndex++ === 0,
        );
      })}

      {/* Dynamic inputs editor (for nodes that support dynamic inputs) */}
      {schema.ui.dynamic_inputs && (
        <div
          className={sectionIndex > 0 ? "mt-2 pt-2 border-t" : ""}
          style={
            sectionIndex > 0
              ? { borderColor: theme.colors.nodes.common.container.border }
              : undefined
          }
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
            connectedInputs={connectedInputs}
            onInputsChange={(inputs) => onConfigChange("dynamicInputs", inputs)}
            onAggregationModeChange={(mode) =>
              onConfigChange("aggregationMode", mode)
            }
            onSeparatorChange={(sep) => onConfigChange("separator", sep)}
            onOutputVariableNameChange={(name) =>
              onConfigChange("outputVariableName", name)
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

      {/* Output ports - always visible (except those rendered as edge handles) */}
      {schema.ui.outputs.filter(
        (o) => !additionalHandles.some((h) => h.id === o.id),
      ).length > 0 && (
        <div
          className="mt-2 pt-2 border-t"
          style={{
            borderColor: theme.colors.nodes.common.container.border,
          }}
        >
          {schema.ui.outputs
            .filter((o) => !additionalHandles.some((h) => h.id === o.id))
            .map((output) => (
              <CustomNodeOutput key={output.id} output={output} />
            ))}
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
