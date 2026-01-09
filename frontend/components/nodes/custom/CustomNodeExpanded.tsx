"use client";

import { memo, useMemo } from "react";
import { Handle, Position } from "@xyflow/react";
import { useTheme } from "@/contexts/ThemeContext";
import CustomNodeHeader from "@/components/nodes/custom/CustomNodeHeader";
import ExpandedNodeHandles from "@/components/nodes/custom/ExpandedNodeHandles";
import ExpandedNodeTabBar from "@/components/nodes/custom/ExpandedNodeTabBar";
import ExpandedNodeFooter from "@/components/nodes/custom/ExpandedNodeFooter";
import ResizeHandle from "@/components/ResizeHandle";
import type { HandlePositions } from "@/lib/types";
import {
  getExecutionStyle,
  getDuplicateNameStyle,
  getThemeColors,
} from "@/components/nodes/custom/layouts/collapsedLayoutUtils";
import { extractTabsInOrder } from "@/components/nodes/custom/expandedNodeUtils";
import {
  ExpandedNodeContentArea,
  useCodeEditorInfo,
} from "@/components/nodes/custom/expanded";
import type {
  CustomNodeSchema,
  CustomNodeData,
  FieldDefinition,
} from "@/components/nodes/CustomNode";
import type { HandleTypes } from "@/components/nodes/custom/hooks/useCustomNodeHandleTypes";
import type { AiAssistOption } from "@/components/nodes/custom/AiAssistButton";

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
  isEditing: boolean;
  editedName: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onNameClick: (e: React.MouseEvent) => void;
  onNameChange: (value: string) => void;
  onNameSave: () => void;
  onNameKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  filePath?: string;
  onSave?: () => Promise<void>;
  onChangeFile?: () => void;
  isSaving?: boolean;
  isDirty?: boolean;
  executionState?: "running" | "completed" | "error";
  selected?: boolean;
  onResize?: (deltaWidth: number, deltaHeight: number) => void;
  // Context menu
  onContextMenu?: (e: React.MouseEvent) => void;
  // AI assist callback (for prompt nodes)
  onAiAssist?: (option: AiAssistOption) => void;
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
    onContextMenu,
    onAiAssist,
  }: CustomNodeExpandedProps) => {
    const { theme } = useTheme();

    const themeColors = getThemeColors(theme, schema.ui.theme_key);
    const ringColor = themeColors?.ring || headerColor;

    // Use tabs in schema definition order
    const tabs = useMemo(() => {
      if (propTabs && propTabs.length > 0) {
        const orderedTabs = extractTabsInOrder(schema);
        return orderedTabs.length > 0 ? orderedTabs : propTabs;
      }
      return null;
    }, [propTabs, schema]);

    // Code editor info for footer
    const { hasEditor, lineCount } = useCodeEditorInfo(schema, config);

    return (
      <div className="relative" style={{ width }}>
        <div
          className="rounded-lg shadow-lg"
          style={{
            backgroundColor: theme.colors.nodes.common.container.background,
            borderColor: theme.colors.nodes.common.container.border,
            borderWidth: 1,
            borderStyle: "solid",
            overflow: "visible",
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
            onContextMenu={onContextMenu}
            onAiAssist={onAiAssist}
          />

          {tabs && tabs.length > 0 && (
            <ExpandedNodeTabBar
              tabs={tabs}
              activeTab={activeTab}
              headerColor={headerColor}
              theme={theme}
              onTabChange={setActiveTab}
            />
          )}

          <ExpandedNodeContentArea
            id={id}
            nodeData={nodeData}
            schema={schema}
            config={config}
            handleTypes={handleTypes}
            connectedInputs={connectedInputs}
            headerColor={headerColor}
            tabs={tabs}
            activeTab={activeTab}
            onConfigChange={onConfigChange}
            isFieldVisible={isFieldVisible}
            filePath={filePath}
            onSave={onSave}
            onChangeFile={onChangeFile}
            isSaving={isSaving}
            isDirty={isDirty}
          />

          <ExpandedNodeFooter
            schema={schema}
            theme={theme}
            hasEditor={hasEditor}
            lineCount={lineCount}
          />

          {schema.ui.resizable && onResize && (
            <ResizeHandle onResize={onResize} />
          )}
        </div>

        <ExpandedNodeHandles
          id={id}
          schema={schema}
          handlePositions={handlePositions}
          handleTypes={handleTypes}
          additionalHandles={schema.ui.handle_layout?.additional_handles || []}
        />

        {/* Hidden handles for inactive tab inputs */}
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
