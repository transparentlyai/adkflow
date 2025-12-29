"use client";

import { memo } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import DraggableHandle from "@/components/DraggableHandle";
import ValidationIndicator from "@/components/nodes/ValidationIndicator";
import NodeIcon from "@/components/nodes/custom/NodeIcon";
import { Lock } from "lucide-react";
import type { CustomNodeCollapsedProps } from "@/components/nodes/custom/CustomNodeCollapsed";
import {
  getThemeColors,
  getExecutionStyle,
  getDuplicateNameStyle,
  formatCollapsedText,
  ExecutionAnimations,
} from "./collapsedLayoutUtils";

/**
 * Pill Layout - Used for VariableNode
 * Supports execution state styling
 */
const PillLayout = memo(
  ({
    id,
    nodeData,
    schema,
    name,
    config,
    headerColor,
    selected,
    handleTypes,
    handlePositions,
    onToggleExpand,
  }: CustomNodeCollapsedProps) => {
    const { theme } = useTheme();
    const themeColors = getThemeColors(theme, schema.ui.theme_key);
    const bgColor = themeColors?.header || headerColor;
    const textColor = themeColors?.text || "#ffffff";
    const ringColor = themeColors?.ring || bgColor;

    const executionState = nodeData.executionState;

    // Format display name
    // Special case for VariableNode: show {name} with literal braces
    const isVariableNode = schema.unit_id === "builtin.variable";
    const showWithBraces =
      schema.ui.collapsed_display?.show_with_braces || isVariableNode;

    let displayText: string;
    if (showWithBraces) {
      // VariableNode: wrap name in literal braces {name}
      displayText = `{${config.name || name}}`;
    } else if (schema.ui.collapsed_display?.format) {
      displayText =
        formatCollapsedText(
          schema.ui.collapsed_display.format,
          config,
          undefined,
        ) || String(config.name || name);
    } else {
      displayText = String(config.name || name);
    }

    // Get combined styles for selection and execution state
    const getNodeStyle = (): React.CSSProperties => {
      // Duplicate name error takes priority (static red glow)
      const duplicateStyle = getDuplicateNameStyle(
        nodeData.duplicateNameError,
        theme.colors,
      );
      if (Object.keys(duplicateStyle).length > 0) {
        return duplicateStyle;
      }
      // Then execution state
      const execStyle = getExecutionStyle(executionState, theme.colors);
      if (Object.keys(execStyle).length > 0) {
        return execStyle;
      }
      return selected ? { boxShadow: `0 0 0 2px ${ringColor}` } : {};
    };

    return (
      <>
        <ExecutionAnimations />
        <div
          onDoubleClick={onToggleExpand}
          className="px-3 py-1 rounded-full shadow-md cursor-pointer transition-all"
          style={{
            backgroundColor: bgColor,
            color: textColor,
            minWidth: schema.ui.min_collapsed_width,
            ...getNodeStyle(),
          }}
          title={String(config.value || "")}
        >
          <div className="font-medium text-xs whitespace-nowrap flex items-center gap-1 w-full">
            {nodeData.isNodeLocked && <Lock className="w-3 h-3 opacity-80" />}
            <NodeIcon icon={schema.ui.icon} className="w-3 h-3" />
            <span className="flex-1">{displayText}</span>
            <ValidationIndicator
              errors={nodeData.validationErrors}
              warnings={nodeData.validationWarnings}
              duplicateNameError={nodeData.duplicateNameError}
            />
          </div>

          {/* Output handle for pill nodes */}
          {schema.ui.outputs.length > 0 && (
            <DraggableHandle
              nodeId={id}
              handleId={schema.ui.outputs[0].id}
              type="source"
              defaultEdge="right"
              defaultPercent={50}
              handlePositions={handlePositions}
              outputSource={handleTypes[schema.ui.outputs[0].id]?.outputSource}
              outputType={handleTypes[schema.ui.outputs[0].id]?.outputType}
              style={{
                width: 8,
                height: 8,
                backgroundColor: theme.colors.handles.output,
                border: `2px solid ${theme.colors.handles.border}`,
              }}
            />
          )}
        </div>
      </>
    );
  },
);
PillLayout.displayName = "PillLayout";

export default PillLayout;
