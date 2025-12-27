"use client";

import { memo } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import DraggableHandle from "@/components/DraggableHandle";
import ValidationIndicator from "@/components/nodes/ValidationIndicator";
import { Lock, Zap } from "lucide-react";
import type { CustomNodeCollapsedProps } from "@/components/nodes/custom/CustomNodeCollapsed";
import {
  getThemeColors,
  getExecutionStyle,
  getDuplicateNameStyle,
  ExecutionAnimations,
} from "./collapsedLayoutUtils";

/**
 * Compact Layout - Used for AgentToolNode
 * Supports execution state styling
 */
const CompactLayout = memo(
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
    const displayName = String(config.name || name);
    const executionState = nodeData.executionState;

    // Get combined styles for selection and execution state
    const getNodeStyle = (): React.CSSProperties => {
      // Duplicate name error takes priority (static red glow)
      const duplicateStyle = getDuplicateNameStyle(nodeData.duplicateNameError);
      if (Object.keys(duplicateStyle).length > 0) {
        return duplicateStyle;
      }
      // Then execution state
      const execStyle = getExecutionStyle(executionState);
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
          className="px-3 py-1.5 rounded-full shadow-md cursor-pointer transition-all"
          style={{
            backgroundColor: bgColor,
            color: textColor,
            minWidth: 48,
            ...getNodeStyle(),
          }}
          title={displayName}
        >
          <div className="font-medium text-xs whitespace-nowrap flex items-center justify-center gap-1">
            {nodeData.isNodeLocked && (
              <Lock className="w-2.5 h-2.5 opacity-80" />
            )}
            <ValidationIndicator
              errors={nodeData.validationErrors}
              warnings={nodeData.validationWarnings}
              duplicateNameError={nodeData.duplicateNameError}
            />
            <Zap className="w-3 h-3" />
            {displayName.length > 8
              ? displayName.slice(0, 8) + "..."
              : displayName}
          </div>

          {/* Output handle */}
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
                width: 6,
                height: 6,
                backgroundColor: theme.colors.handles.output,
                border: `1px solid ${theme.colors.handles.border}`,
              }}
            />
          )}
        </div>
      </>
    );
  },
);
CompactLayout.displayName = "CompactLayout";

export default CompactLayout;
