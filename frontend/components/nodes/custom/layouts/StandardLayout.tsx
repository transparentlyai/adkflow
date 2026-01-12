"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { useTheme } from "@/contexts/ThemeContext";
import DraggableHandle from "@/components/DraggableHandle";
import CustomNodeHeader from "@/components/nodes/custom/CustomNodeHeader";
import { Circle, Zap } from "lucide-react";
import type { CustomNodeCollapsedProps } from "@/components/nodes/custom/CustomNodeCollapsed";
import {
  getThemeColors,
  getExecutionStyle,
  getDuplicateNameStyle,
  formatCollapsedText,
  ExecutionAnimations,
} from "./collapsedLayoutUtils";

/**
 * Standard Layout - Default expandable panel style
 * Supports execution state styling with pulse animations
 */
const StandardLayout = memo(
  ({
    id,
    nodeData,
    schema,
    name,
    config,
    handlePositions,
    handleTypes,
    headerColor,
    selected,
    onToggleExpand,
    isEditing,
    editedName,
    inputRef,
    onNameClick,
    onNameChange,
    onNameSave,
    onNameKeyDown,
    onContextMenu,
    onAiAssist,
  }: CustomNodeCollapsedProps) => {
    const { theme } = useTheme();
    const themeColors = getThemeColors(theme, schema.ui.theme_key);
    const bgColor = themeColors?.header || headerColor;
    const ringColor = themeColors?.ring || bgColor;
    const executionState = nodeData.executionState;

    const handleStyle = {
      width: 10,
      height: 10,
      border: `2px solid ${theme.colors.handles.border}`,
    };

    // Get summary text for body
    const summaryText = formatCollapsedText(
      schema.ui.collapsed_display?.format,
      config,
      schema.ui.collapsed_display?.summary_fields,
    );

    // Get additional handles from handle_layout
    const additionalHandles = schema.ui.handle_layout?.additional_handles || [];

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

    // Get min width from schema or use default
    const minWidth = schema.ui.min_collapsed_width || 200;

    return (
      <>
        <ExecutionAnimations />
        <div
          className="relative"
          style={{ minWidth }}
          onDoubleClick={onToggleExpand}
          title="Double-click to configure"
        >
          {/* Content container with rounded corners and overflow clipping */}
          <div
            className="rounded-lg shadow-md cursor-pointer overflow-hidden"
            style={{
              backgroundColor: theme.colors.nodes.common.container.background,
              ...getNodeStyle(),
            }}
          >
            {/* Header */}
            <CustomNodeHeader
              name={name}
              schema={schema}
              headerColor={bgColor}
              isExpanded={false}
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
              description={config.description as string | undefined}
              onContextMenu={onContextMenu}
              onAiAssist={onAiAssist}
            />

            {/* Body with summary */}
            {summaryText && (
              <div
                className="px-3 py-2 text-sm"
                style={{ color: theme.colors.nodes.common.text.secondary }}
              >
                {summaryText}
              </div>
            )}

            {/* Footer */}
            <div
              className="px-2 py-1 border-t flex items-center justify-between"
              style={{
                backgroundColor: theme.colors.nodes.common.footer.background,
                borderColor: theme.colors.nodes.common.footer.border,
                color: theme.colors.nodes.common.footer.text,
              }}
            >
              <span className="text-xs">{schema.label}</span>
              {schema.output_node && (
                <Circle
                  className="w-3 h-3 text-green-500"
                  fill="currentColor"
                />
              )}
              {schema.always_execute && (
                <Zap className="w-3 h-3 text-orange-500" />
              )}
            </div>
          </div>

          {/* Handles - outside the overflow-hidden container */}
          {/* Main input handle - use first input's handle_color if available */}
          <DraggableHandle
            nodeId={id}
            handleId="input"
            type="target"
            defaultEdge={schema.ui.handle_layout?.input_position || "left"}
            defaultPercent={50}
            handlePositions={handlePositions}
            acceptedSources={handleTypes["input"]?.acceptedSources}
            acceptedTypes={handleTypes["input"]?.acceptedTypes}
            style={{
              ...handleStyle,
              backgroundColor:
                schema.ui.inputs[0]?.handle_color || theme.colors.handles.input,
            }}
          />

          {/* Hidden handles for typed edges - supports direct connections */}
          {/* Include inputs NOT in additional_handles, OR in additional_handles with position="left" */}
          {schema.ui.inputs
            .filter((input) => {
              const additionalHandle = additionalHandles.find(
                (h) => h.id === input.id,
              );
              // Keep if not in additional_handles, or if in additional_handles with position "left"
              return !additionalHandle || additionalHandle.position === "left";
            })
            .filter((input) => input.id !== "input") // Exclude universal handle (rendered separately)
            .map((input) => (
              <Handle
                key={input.id}
                type="target"
                position={Position.Left}
                id={input.id}
                style={{
                  opacity: 0,
                  pointerEvents: "none",
                  top: "50%",
                  left: 0,
                }}
              />
            ))}

          {/* Additional handles (top/bottom/right, and left-positioned sources) */}
          {additionalHandles
            .filter((handle) => {
              // Show handles that are NOT left-positioned
              // OR are left-positioned but are sources (outputs)
              return handle.position !== "left" || handle.type === "source";
            })
            .map((handle) => {
              // Find matching input/output to get handle_color
              const matchingInput = schema.ui.inputs.find(
                (i) => i.id === handle.id,
              );
              const matchingOutput = schema.ui.outputs.find(
                (o) => o.id === handle.id,
              );
              const handleColor =
                matchingInput?.handle_color ||
                matchingOutput?.handle_color ||
                theme.colors.handles.link;

              return (
                <DraggableHandle
                  key={handle.id}
                  nodeId={id}
                  handleId={handle.id}
                  type={handle.type}
                  defaultEdge={handle.position}
                  defaultPercent={50}
                  handlePositions={handlePositions}
                  {...(handle.type === "source"
                    ? {
                        outputSource: handleTypes[handle.id]?.outputSource,
                        outputType: handleTypes[handle.id]?.outputType,
                      }
                    : {
                        acceptedSources:
                          handleTypes[handle.id]?.acceptedSources,
                        acceptedTypes: handleTypes[handle.id]?.acceptedTypes,
                      })}
                  style={{
                    ...handleStyle,
                    backgroundColor: handleColor,
                  }}
                  title={handle.label}
                />
              );
            })}

          {/* Universal output handle - single handle for all outputs in collapsed view */}
          {schema.ui.outputs.filter(
            (o) => !additionalHandles.some((h) => h.id === o.id),
          ).length > 0 && (
            <DraggableHandle
              nodeId={id}
              handleId="output"
              type="source"
              defaultEdge={schema.ui.handle_layout?.output_position || "right"}
              defaultPercent={50}
              handlePositions={handlePositions}
              outputSource={handleTypes["output"]?.outputSource}
              outputType={handleTypes["output"]?.outputType}
              style={{
                ...handleStyle,
                backgroundColor:
                  schema.ui.outputs[0]?.handle_color ||
                  theme.colors.handles.output,
              }}
            />
          )}

          {/* Hidden handles for specific output types - used for edge routing */}
          {schema.ui.outputs
            .filter((o) => !additionalHandles.some((h) => h.id === o.id))
            .filter((o) => o.id !== "output") // Exclude if there's a literal "output" id
            .map((output) => (
              <Handle
                key={output.id}
                type="source"
                position={Position.Right}
                id={output.id}
                style={{
                  opacity: 0,
                  pointerEvents: "none",
                  top: "50%",
                  right: 0,
                }}
              />
            ))}
        </div>
      </>
    );
  },
);
StandardLayout.displayName = "StandardLayout";

export default StandardLayout;
