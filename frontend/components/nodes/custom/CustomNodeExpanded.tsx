"use client";

import { memo, useCallback, useMemo } from "react";
import { Handle, Position } from "@xyflow/react";
import { useTheme } from "@/contexts/ThemeContext";
import { Circle, Zap } from "lucide-react";
import CustomNodeHeader from "@/components/nodes/custom/CustomNodeHeader";
import CustomNodeInput from "@/components/nodes/custom/CustomNodeInput";
import CustomNodeOutput from "@/components/nodes/custom/CustomNodeOutput";
import ExpandedNodeHandles from "@/components/nodes/custom/ExpandedNodeHandles";
import MonacoEditorWidget from "@/components/nodes/widgets/MonacoEditorWidget";
import ResizeHandle from "@/components/ResizeHandle";
import { renderWidget } from "@/components/nodes/widgets/WidgetRenderer";
import type { HandlePositions } from "@/lib/types";
import {
  getExecutionStyle,
  getDuplicateNameStyle,
  getThemeColors,
} from "@/components/nodes/custom/layouts/collapsedLayoutUtils";
import {
  groupBySection,
  hasCodeEditorWidget,
  getCodeEditorField,
  extractTabsInOrder,
} from "@/components/nodes/custom/expandedNodeUtils";
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
  handlePositions?: HandlePositions;
  handleTypes: HandleTypes;
  connectedInputs: Record<string, string[]>;
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
  // Optional: editor-related props for nodes with code_editor widgets
  filePath?: string;
  onSave?: () => Promise<void>;
  onChangeFile?: () => void;
  isSaving?: boolean;
  isDirty?: boolean;
  // Optional: execution state
  executionState?: "running" | "completed" | "error";
  // Optional: selection state
  selected?: boolean;
  // Optional: resize handler for resizable nodes
  onResize?: (deltaWidth: number, deltaHeight: number) => void;
}

/**
 * Expanded view of a CustomNode.
 * Shows all inputs, fields, outputs with tabs and sections.
 * Supports resize, execution state styling, editor menu bar, and footer indicators.
 */
const CustomNodeExpanded = memo(
  ({
    id,
    nodeData,
    schema,
    name,
    config,
    handlePositions,
    handleTypes,
    connectedInputs,
    headerColor,
    tabs: propTabs,
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
    filePath,
    onSave,
    onChangeFile,
    isSaving = false,
    isDirty = false,
    executionState,
    selected = false,
    onResize,
  }: CustomNodeExpandedProps) => {
    const { theme } = useTheme();

    // Get theme colors for this node type (same as collapsed views)
    const themeColors = getThemeColors(theme, schema.ui.theme_key);
    const ringColor = themeColors?.ring || headerColor;

    // Use tabs in schema definition order
    const tabs = useMemo(() => {
      if (propTabs && propTabs.length > 0) {
        // Re-extract tabs to ensure they are in schema order
        const orderedTabs = extractTabsInOrder(schema);
        // Filter to only include tabs that were passed in props (in case of filtering)
        return orderedTabs.length > 0 ? orderedTabs : propTabs;
      }
      return null;
    }, [propTabs, schema]);

    // Check if this node has a code editor widget
    const hasEditor = useMemo(() => hasCodeEditorWidget(schema), [schema]);
    const codeEditorField = useMemo(() => getCodeEditorField(schema), [schema]);

    // Calculate line count for code editor
    const lineCount = useMemo(() => {
      if (codeEditorField) {
        const code = (config[codeEditorField.id] as string) || "";
        return code.split("\n").length;
      }
      return 0;
    }, [codeEditorField, config]);

    // Get additional handles from handle_layout (used to filter outputs rendered inside vs at edge)
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
      // Special handling for code_editor widget - full width with Monaco
      if (field.widget === "code_editor" || field.widget === "monaco_editor") {
        const editorHeight = nodeData.expandedSize?.height
          ? nodeData.expandedSize.height - 150 // Leave room for header, tabs, footer
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

      // Standard field with label on the left - compact styling
      return (
        <div key={field.id} className="flex items-center gap-1">
          <label
            className="text-[10px] font-medium flex-shrink-0"
            style={{
              color: theme.colors.nodes.common.text.secondary,
              minWidth: labelWidth ? `${labelWidth}ch` : undefined,
            }}
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
    // compact: true for inputs (no spacing), false for fields (with spacing)
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

    // Render input port with optional label width for alignment
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

    // Calculate max label width for a group of inputs
    const getMaxInputLabelWidth = (inputs: PortDefinition[]) =>
      Math.max(...inputs.map((i) => i.label.length));

    // Calculate max label width for a group of fields
    const getMaxFieldLabelWidth = (fields: FieldDefinition[]) =>
      Math.max(...fields.map((f) => f.label.length));

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
          {/* Inputs grouped by section - compact spacing */}
          {Array.from(inputSections.entries()).map(([section, inputs]) => {
            const maxLabelWidth = getMaxInputLabelWidth(inputs);
            return renderSection(
              section,
              inputs.map((input) => renderInput(input, maxLabelWidth)),
              sectionIndex++ === 0,
              true, // compact
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
      <div className="relative" style={{ width }}>
        <div
          className="rounded-lg shadow-lg"
          style={{
            backgroundColor: theme.colors.nodes.common.container.background,
            borderColor: theme.colors.nodes.common.container.border,
            borderWidth: 1,
            borderStyle: "solid",
            // Priority: duplicateNameError > isDirty > executionState > selected
            ...(nodeData.duplicateNameError
              ? getDuplicateNameStyle(nodeData.duplicateNameError, theme.colors)
              : isDirty
                ? {
                    boxShadow: `0 0 0 2px ${theme.colors.state?.dirty?.ring || "#f97316"}`,
                  }
                : executionState
                  ? getExecutionStyle(executionState, theme.colors)
                  : selected
                    ? { boxShadow: `0 0 0 2px ${ringColor}` }
                    : {}),
          }}
        >
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
            validationErrors={nodeData.validationErrors}
            validationWarnings={nodeData.validationWarnings}
            duplicateNameError={nodeData.duplicateNameError}
          />

          {/* Tab bar */}
          {tabs && tabs.length > 0 && (
            <div
              className="flex border-b"
              style={{
                borderColor: theme.colors.nodes.common.container.border,
              }}
            >
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-2 py-1 text-[10px] font-medium ${activeTab === tab ? "border-b-2" : ""}`}
                  style={{
                    borderColor:
                      activeTab === tab ? headerColor : "transparent",
                    color:
                      activeTab === tab
                        ? theme.colors.nodes.common.text.primary
                        : theme.colors.nodes.common.text.secondary,
                    backgroundColor: "transparent",
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}

          {/* Form content */}
          <div className="p-2 nodrag nowheel">
            {renderTabContent()}

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

          {/* Footer with execution indicators */}
          <div
            className="px-3 py-2 rounded-b-lg flex items-center justify-between border-t"
            style={{
              backgroundColor: theme.colors.nodes.common.footer.background,
              borderColor: theme.colors.nodes.common.footer.border,
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="text-xs"
                style={{ color: theme.colors.nodes.common.footer.text }}
              >
                {schema.label}
              </span>
              {/* Output node indicator */}
              {schema.output_node && (
                <span title="Output Node - triggers execution trace">
                  <Circle
                    className="w-3 h-3 text-green-500"
                    fill="currentColor"
                  />
                </span>
              )}
              {/* Always execute indicator */}
              {schema.always_execute && (
                <span title="Always Execute - skips cache">
                  <Zap className="w-3 h-3 text-orange-500" />
                </span>
              )}
            </div>
            {/* Line count for editor nodes */}
            {hasEditor && lineCount > 0 && (
              <span
                className="text-xs"
                style={{ color: theme.colors.nodes.common.text.muted }}
              >
                {lineCount} lines
              </span>
            )}
          </div>

          {/* Resize handle for resizable nodes */}
          {schema.ui.resizable && onResize && (
            <ResizeHandle onResize={onResize} />
          )}
        </div>

        {/* Handles - positioned at node edges, outside the content container */}
        <ExpandedNodeHandles
          id={id}
          schema={schema}
          handlePositions={handlePositions}
          handleTypes={handleTypes}
          additionalHandles={additionalHandles}
        />

        {/* Hidden handles for inactive tab inputs - enables edge connectivity */}
        {tabs &&
          schema.ui.inputs
            .filter((input) => input.tab && input.tab !== activeTab)
            .map((input) => (
              <Handle
                key={`hidden-${input.id}`}
                type="target"
                position={Position.Left}
                id={input.id}
                style={{
                  position: "absolute",
                  left: -5,
                  top: "50%",
                  width: 0,
                  height: 0,
                  opacity: 0,
                  pointerEvents: "none",
                }}
              />
            ))}
      </div>
    );
  },
);

CustomNodeExpanded.displayName = "CustomNodeExpanded";

export default CustomNodeExpanded;
