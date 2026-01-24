/**
 * ExpandedNodeContentArea - Renders the tab content area with inputs, fields, and outputs
 */

import React, { useCallback, useMemo, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import CustomNodeInput from "@/components/nodes/custom/CustomNodeInput";
import CustomNodeOutput from "@/components/nodes/custom/CustomNodeOutput";
import {
  groupBySection,
  hasCodeEditorWidget,
  getCodeEditorField,
} from "@/components/nodes/custom/expandedNodeUtils";
import { DynamicInputEditor } from "@/components/nodes/custom/expanded/DynamicInputEditor";
import { FieldRenderer } from "@/components/nodes/custom/expanded/FieldRenderer";
import { CollapsibleSection } from "@/components/nodes/custom/expanded/CollapsibleSection";
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
        const isFirst = sectionIndex++ === 0;
        return (
          <CollapsibleSection
            key={section || "default-inputs"}
            sectionName={section}
            isFirst={isFirst}
            compact={true}
            isCollapsed={section ? collapsedSections.has(section) : false}
            onToggle={toggleSection}
            theme={theme}
            headerColor={headerColor}
          >
            {inputs.map((input) =>
              renderInput(input, globalMaxInputLabelWidth),
            )}
          </CollapsibleSection>
        );
      })}

      {/* Fields grouped by section - use global label width for grid alignment */}
      {Array.from(fieldSections.entries()).map(([section, fields]) => {
        const isFirst = sectionIndex++ === 0;
        return (
          <CollapsibleSection
            key={section || "default-fields"}
            sectionName={section}
            isFirst={isFirst}
            compact={false}
            isCollapsed={section ? collapsedSections.has(section) : false}
            onToggle={toggleSection}
            theme={theme}
            headerColor={headerColor}
          >
            {fields.map((field) => (
              <FieldRenderer
                key={field.id}
                field={field}
                config={config}
                connectedInputs={connectedInputs}
                theme={theme}
                labelWidth={globalMaxFieldLabelWidth}
                isNodeLocked={nodeData.isNodeLocked}
                expandedHeight={nodeData.expandedSize?.height}
                filePath={filePath}
                onSave={onSave}
                onChangeFile={onChangeFile}
                isSaving={isSaving}
                isDirty={isDirty}
                onConfigChange={onConfigChange}
              />
            ))}
          </CollapsibleSection>
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
