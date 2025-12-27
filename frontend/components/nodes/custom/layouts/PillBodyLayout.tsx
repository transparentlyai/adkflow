"use client";

import { memo, useMemo } from "react";
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
  parseFunctionSignature,
  ExecutionAnimations,
} from "./collapsedLayoutUtils";

/**
 * PillBodyLayout - Header + body content, no footer
 * Used for ProcessNode-style display (shows function signature)
 * Supports execution state styling
 */
const PillBodyLayout = memo(
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
    isEditing,
    editedName,
    inputRef,
    onNameClick,
    onNameChange,
    onNameSave,
    onNameKeyDown,
  }: CustomNodeCollapsedProps) => {
    const { theme } = useTheme();
    const themeColors = getThemeColors(theme, schema.ui.theme_key);
    const bgColor = themeColors?.header || headerColor;
    const ringColor = themeColors?.ring || bgColor;
    const executionState = nodeData.executionState;
    const collapsedBody = schema.ui.collapsed_body;
    const collapsedWidth = schema.ui.collapsed_width || 220;

    // Parse function signature if requested
    const signature = useMemo(() => {
      if (collapsedBody?.show_function_signature) {
        const codeField = collapsedBody.code_field || "code";
        const code = String(config[codeField] || "");
        return parseFunctionSignature(code);
      }
      return null;
    }, [collapsedBody, config]);

    const handleStyle = {
      width: 10,
      height: 10,
      border: `2px solid ${theme.colors.handles.border}`,
    };

    // Get additional handles from handle_layout
    const additionalHandles = schema.ui.handle_layout?.additional_handles || [];

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
          className="rounded-lg shadow-lg relative"
          style={{
            width: collapsedWidth,
            minWidth: collapsedWidth,
            backgroundColor: theme.colors.nodes.common.container.background,
            ...getNodeStyle(),
          }}
        >
          {/* Main input handle */}
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

          {/* Header */}
          <div
            className="px-2 py-1 rounded-t-lg flex items-center gap-1.5 cursor-pointer"
            style={{
              backgroundColor: bgColor,
              color: themeColors?.text || "#ffffff",
            }}
            onDoubleClick={onToggleExpand}
          >
            {nodeData.isNodeLocked && (
              <Lock className="w-3 h-3 flex-shrink-0 opacity-80" />
            )}
            <ValidationIndicator
              errors={nodeData.validationErrors}
              warnings={nodeData.validationWarnings}
              duplicateNameError={nodeData.duplicateNameError}
            />
            {/* Node type icon - uses schema icon instead of hardcoded SVG */}
            <NodeIcon icon={schema.ui.icon} className="w-3 h-3" />
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={editedName}
                onChange={(e) => onNameChange(e.target.value)}
                onBlur={onNameSave}
                onKeyDown={onNameKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 px-1.5 py-0.5 rounded text-xs font-medium outline-none min-w-0"
                style={{
                  backgroundColor:
                    theme.colors.nodes.common.container.background,
                  color: theme.colors.nodes.common.text.primary,
                }}
              />
            ) : (
              <div
                className="font-medium text-xs hover:opacity-80 truncate"
                onClick={onNameClick}
              >
                {name}
              </div>
            )}
            <button
              onClick={onToggleExpand}
              className="ml-auto p-0.5 rounded transition-colors flex-shrink-0"
              style={{ backgroundColor: "transparent" }}
              title="Expand"
            >
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
            </button>
          </div>

          {/* Body - Function Signature View */}
          <div
            className="px-3 py-3 rounded-b-lg"
            style={{
              backgroundColor: theme.colors.nodes.common.footer.background,
            }}
            onDoubleClick={onToggleExpand}
          >
            {signature ? (
              <div className="font-mono text-xs space-y-1.5">
                <div className="flex items-center gap-1">
                  <span className="text-purple-600 font-semibold">def</span>
                  <span className="text-emerald-700 font-semibold">
                    {signature.name}
                  </span>
                </div>
                <div
                  className="pl-2 border-l-2"
                  style={{
                    color: theme.colors.nodes.common.text.secondary,
                    borderColor: theme.colors.nodes.common.container.border,
                  }}
                >
                  <div
                    className="text-[10px] uppercase tracking-wide mb-0.5"
                    style={{ color: theme.colors.nodes.common.text.muted }}
                  >
                    Parameters
                  </div>
                  <div
                    style={{ color: theme.colors.nodes.common.text.secondary }}
                  >
                    {signature.params || "None"}
                  </div>
                </div>
                <div
                  className="pl-2 border-l-2"
                  style={{
                    color: theme.colors.nodes.common.text.secondary,
                    borderColor: theme.colors.nodes.common.container.border,
                  }}
                >
                  <div
                    className="text-[10px] uppercase tracking-wide mb-0.5"
                    style={{ color: theme.colors.nodes.common.text.muted }}
                  >
                    Returns
                  </div>
                  <div className="text-blue-600">{signature.returnType}</div>
                </div>
              </div>
            ) : (
              <div
                className="text-xs italic"
                style={{ color: theme.colors.nodes.common.text.muted }}
              >
                {collapsedBody?.show_function_signature
                  ? "No function signature found"
                  : ""}
              </div>
            )}
          </div>

          {/* Additional handles (top/bottom) */}
          {additionalHandles.map((handle) => {
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
                      acceptedSources: handleTypes[handle.id]?.acceptedSources,
                      acceptedTypes: handleTypes[handle.id]?.acceptedTypes,
                    })}
                style={{
                  ...handleStyle,
                  width: 8,
                  height: 8,
                  backgroundColor: handleColor,
                }}
                title={handle.label}
              />
            );
          })}

          {/* Output handle */}
          {schema.ui.outputs
            .filter((o) => !additionalHandles.some((h) => h.id === o.id))
            .map((output) => (
              <DraggableHandle
                key={output.id}
                nodeId={id}
                handleId={output.id}
                type="source"
                defaultEdge={
                  schema.ui.handle_layout?.output_position || "right"
                }
                defaultPercent={50}
                handlePositions={handlePositions}
                outputSource={handleTypes[output.id]?.outputSource}
                outputType={handleTypes[output.id]?.outputType}
                style={{
                  ...handleStyle,
                  backgroundColor:
                    output.handle_color || theme.colors.handles.output,
                }}
              />
            ))}
        </div>
      </>
    );
  },
);
PillBodyLayout.displayName = "PillBodyLayout";

export default PillBodyLayout;
