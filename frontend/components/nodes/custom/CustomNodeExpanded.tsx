"use client";

import { memo, useCallback } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import ValidationIndicator from "@/components/nodes/ValidationIndicator";
import CustomNodeHeader from "@/components/nodes/custom/CustomNodeHeader";
import CustomNodeInput from "@/components/nodes/custom/CustomNodeInput";
import CustomNodeOutput from "@/components/nodes/custom/CustomNodeOutput";
import { renderWidget } from "@/components/nodes/widgets/WidgetRenderer";
import type {
  CustomNodeSchema,
  CustomNodeData,
  PortDefinition,
  FieldDefinition,
} from "@/components/nodes/CustomNode";
import type { HandleTypes } from "@/components/nodes/custom/hooks/useCustomNodeHandleTypes";

export interface CustomNodeExpandedProps {
  id: string;
  nodeData: CustomNodeData;
  schema: CustomNodeSchema;
  name: string;
  config: Record<string, unknown>;
  handleTypes: HandleTypes;
  connectedInputs: Record<string, string>;
  headerColor: string;
  tabs: string[] | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  width: number;
  onToggleExpand: () => void;
  onConfigChange: (fieldId: string, value: unknown) => void;
  isFieldVisible: (field: FieldDefinition) => boolean;
  // Name editing props
  isEditing: boolean;
  editedName: string;
  inputRef: React.RefObject<HTMLInputElement>;
  onNameClick: (e: React.MouseEvent) => void;
  onNameChange: (value: string) => void;
  onNameSave: () => void;
  onNameKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * Group elements by their section property.
 */
function groupBySection<T extends { section?: string }>(
  items: T[],
): Map<string | null, T[]> {
  const groups = new Map<string | null, T[]>();
  items.forEach((item) => {
    const key = item.section || null;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  });
  return groups;
}

/**
 * Expanded view of a CustomNode.
 * Shows all inputs, fields, outputs with tabs and sections.
 */
const CustomNodeExpanded = memo(
  ({
    id,
    nodeData,
    schema,
    name,
    config,
    handleTypes,
    connectedInputs,
    headerColor,
    tabs,
    activeTab,
    setActiveTab,
    width,
    onToggleExpand,
    onConfigChange,
    isFieldVisible,
    isEditing,
    editedName,
    inputRef,
    onNameClick,
    onNameChange,
    onNameSave,
    onNameKeyDown,
  }: CustomNodeExpandedProps) => {
    const { theme } = useTheme();

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
              (value) => onConfigChange(field.id, value),
              { disabled: nodeData.isNodeLocked, theme },
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
    ) => (
      <div
        key={sectionName || "default"}
        className={isFirst ? "" : "mt-3 pt-3 border-t"}
        style={
          isFirst
            ? undefined
            : { borderColor: theme.colors.nodes.common.container.border }
        }
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
        <div className="space-y-2">{content}</div>
      </div>
    );

    // Render input port
    const renderInput = (input: PortDefinition) => (
      <CustomNodeInput
        key={input.id}
        input={input}
        config={config}
        isConnected={!!connectedInputs[input.id]}
        connectedSourceName={connectedInputs[input.id]}
        handleTypeInfo={handleTypes[input.id]}
        nodeId={id}
        isNodeLocked={nodeData.isNodeLocked}
        onConfigChange={onConfigChange}
      />
    );

    // Render tab content
    const renderTabContent = () => {
      const elements = tabs
        ? getElementsForTab(activeTab)
        : getElementsForTab(null);
      const inputSections = groupBySection(elements.inputs);
      const fieldSections = groupBySection(elements.fields);

      // Track section index across both inputs and fields
      let sectionIndex = 0;

      return (
        <>
          {/* Inputs grouped by section */}
          {Array.from(inputSections.entries()).map(([section, inputs]) =>
            renderSection(
              section,
              inputs.map(renderInput),
              sectionIndex++ === 0,
            ),
          )}

          {/* Fields grouped by section */}
          {Array.from(fieldSections.entries()).map(([section, fields]) =>
            renderSection(
              section,
              fields.map(renderField),
              sectionIndex++ === 0,
            ),
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

    return (
      <div
        className="rounded-lg shadow-lg overflow-hidden"
        style={{
          width,
          backgroundColor: theme.colors.nodes.common.container.background,
          borderColor: theme.colors.nodes.common.container.border,
          borderWidth: 1,
          borderStyle: "solid",
        }}
      >
        <ValidationIndicator
          errors={nodeData.validationErrors}
          warnings={nodeData.validationWarnings}
        />

        {/* Header */}
        <CustomNodeHeader
          name={name}
          schema={schema}
          headerColor={headerColor}
          isExpanded={true}
          onToggleExpand={onToggleExpand}
          isEditing={isEditing}
          editedName={editedName}
          inputRef={inputRef}
          onNameClick={onNameClick}
          onNameChange={onNameChange}
          onNameSave={onNameSave}
          onNameKeyDown={onNameKeyDown}
        />

        {/* Tab bar */}
        {tabs && (
          <div
            className="flex border-b"
            style={{ borderColor: theme.colors.nodes.common.container.border }}
          >
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-2 py-1 text-xs font-medium transition-colors"
                style={{
                  color:
                    activeTab === tab
                      ? theme.colors.ui.primary
                      : theme.colors.nodes.common.text.secondary,
                  borderBottom:
                    activeTab === tab
                      ? `2px solid ${theme.colors.ui.primary}`
                      : "2px solid transparent",
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
            <div
              className="pt-1 border-t"
              style={{
                borderColor: theme.colors.nodes.common.container.border,
              }}
            >
              {schema.ui.outputs.map((output) => (
                <CustomNodeOutput key={output.id} output={output} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  },
);

CustomNodeExpanded.displayName = "CustomNodeExpanded";

export default CustomNodeExpanded;
