"use client";

import { memo, useCallback } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useRunWorkflow } from "@/contexts/RunWorkflowContext";
import DraggableHandle from "@/components/DraggableHandle";
import ValidationIndicator from "@/components/nodes/ValidationIndicator";
import { Lock, Play, Loader2 } from "lucide-react";
import type { CustomNodeCollapsedProps } from "@/components/nodes/custom/CustomNodeCollapsed";
import {
  getThemeColors,
  getExecutionStyle,
  getValidationStyle,
  getDuplicateNameStyle,
  ExecutionAnimations,
} from "./collapsedLayoutUtils";

/**
 * Circle Layout - Used for StartNode and LogProbeNode (when collapsed)
 * Supports:
 * - StartNode: Play icon, click to run workflow, validation error pulse
 * - LogProbeNode: "LOG" text label, input handle on bottom, expandable
 */
const CircleLayout = memo(
  ({
    id,
    nodeData,
    schema,
    headerColor,
    selected,
    handleTypes,
    handlePositions,
    onToggleExpand,
  }: CustomNodeCollapsedProps) => {
    const { theme } = useTheme();
    const themeColors = getThemeColors(theme, schema.ui.theme_key);
    const bgColor = themeColors?.header || headerColor || "#22c55e";
    const textColor = themeColors?.text || "#ffffff";
    const ringColor = themeColors?.ring || bgColor;

    // Determine if this is a Start node or a probe/expandable circle
    const isStartNode = schema.unit_id === "builtin.start";
    const isExpandable = schema.ui.expandable;

    // Get workflow run state - always call hook unconditionally but handle missing provider
    // The hook returns null values when not in a provider context
    const runWorkflowContext = useRunWorkflow();
    const runWorkflow = isStartNode
      ? runWorkflowContext?.runWorkflow
      : undefined;
    const isRunning = isStartNode
      ? (runWorkflowContext?.isRunning ?? false)
      : false;
    const hasProjectPath = isStartNode
      ? (runWorkflowContext?.hasProjectPath ?? false)
      : false;

    const hasValidationError = (nodeData.validationErrors?.length ?? 0) > 0;
    const executionState = nodeData.executionState;
    // Smaller size for probe nodes when collapsed, larger for StartNode
    const size = isStartNode ? 48 : 36;

    // Handle click to run workflow (only for StartNode)
    const handlePlayClick = useCallback(
      (e: React.MouseEvent) => {
        if (!isStartNode) return;
        e.stopPropagation();
        if (hasProjectPath && !isRunning && runWorkflow) {
          runWorkflow();
        }
      },
      [isStartNode, hasProjectPath, isRunning, runWorkflow],
    );

    // Combine selection, validation, and execution styles
    const getNodeStyle = useCallback((): React.CSSProperties => {
      // Duplicate name error takes priority (static red glow)
      const duplicateStyle = getDuplicateNameStyle(
        nodeData.duplicateNameError,
        theme.colors,
      );
      if (Object.keys(duplicateStyle).length > 0) {
        return { border: "2px solid transparent", ...duplicateStyle };
      }
      // Then execution state
      const execStyle = getExecutionStyle(executionState, theme.colors);
      if (Object.keys(execStyle).length > 0) {
        return { border: "2px solid transparent", ...execStyle };
      }
      // Then validation error
      const validStyle = getValidationStyle(hasValidationError, theme.colors);
      if (Object.keys(validStyle).length > 0) {
        return { border: "2px solid transparent", ...validStyle };
      }
      // Finally selection
      return {
        border: selected ? `2px solid ${ringColor}` : "2px solid transparent",
        boxShadow: selected ? `0 0 0 2px ${ringColor}40` : undefined,
      };
    }, [
      selected,
      ringColor,
      executionState,
      hasValidationError,
      nodeData.duplicateNameError,
      theme.colors,
    ]);

    // Get collapsed display text from schema (e.g., "LOG" for LogProbeNode)
    const displayText = schema.ui.collapsed_display?.format || schema.label;

    // Get handle position from schema
    const inputPosition = schema.ui.handle_layout?.input_position || "left";
    const outputPosition = schema.ui.handle_layout?.output_position || "right";

    // Get tooltip text
    const getTooltip = () => {
      if (isStartNode) {
        return schema.always_execute ? "Click to run workflow" : "Start";
      }
      if (isExpandable) {
        return "Double-click to expand";
      }
      return schema.label;
    };

    return (
      <>
        <ExecutionAnimations />
        <div
          onContextMenu={(e) => e.preventDefault()}
          className="relative cursor-pointer"
          style={{ width: size, height: size }}
        >
          {/* Validation indicator */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
            <ValidationIndicator
              errors={nodeData.validationErrors}
              warnings={nodeData.validationWarnings}
              duplicateNameError={nodeData.duplicateNameError}
            />
          </div>

          {/* Circular node */}
          <div
            onDoubleClick={onToggleExpand}
            onClick={isStartNode ? handlePlayClick : undefined}
            className="w-full h-full rounded-full flex items-center justify-center shadow-lg transition-colors hover:scale-105"
            style={{
              backgroundColor: bgColor,
              ...getNodeStyle(),
            }}
            title={getTooltip()}
          >
            {isStartNode ? (
              // StartNode: Play icon or loading spinner
              isRunning ? (
                <Loader2
                  className="w-6 h-6 animate-spin"
                  style={{ color: textColor }}
                />
              ) : (
                <Play
                  className="w-6 h-6 ml-0.5"
                  style={{ color: textColor }}
                  fill={textColor}
                />
              )
            ) : (
              // Other circle nodes (like LogProbeNode): Show text label
              <div className="flex items-center gap-0.5">
                {nodeData.isNodeLocked && (
                  <Lock
                    className="w-2 h-2 opacity-80"
                    style={{ color: textColor }}
                  />
                )}
                <span
                  className="font-bold text-[10px]"
                  style={{ color: textColor }}
                >
                  {displayText}
                </span>
              </div>
            )}
          </div>

          {/* Input handle (for nodes with inputs, like LogProbeNode) */}
          {schema.ui.inputs.length > 0 && (
            <DraggableHandle
              nodeId={id}
              handleId="input"
              type="target"
              defaultEdge={inputPosition}
              defaultPercent={50}
              handlePositions={handlePositions}
              acceptedSources={handleTypes["input"]?.acceptedSources}
              acceptedTypes={handleTypes["input"]?.acceptedTypes}
              style={{
                width: isStartNode ? 10 : 8,
                height: isStartNode ? 10 : 8,
                backgroundColor:
                  themeColors?.header ||
                  theme.colors.handles.probe ||
                  theme.colors.handles.input,
                border: `2px solid ${theme.colors.handles.border}`,
              }}
            />
          )}

          {/* Output handle (for nodes with outputs, like StartNode) */}
          {schema.ui.outputs.length > 0 && (
            <DraggableHandle
              nodeId={id}
              handleId={schema.ui.outputs[0].id}
              type="source"
              defaultEdge={outputPosition}
              defaultPercent={50}
              handlePositions={handlePositions}
              outputSource={handleTypes[schema.ui.outputs[0].id]?.outputSource}
              outputType={handleTypes[schema.ui.outputs[0].id]?.outputType}
              style={{
                width: 10,
                height: 10,
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
CircleLayout.displayName = "CircleLayout";

export default CircleLayout;
