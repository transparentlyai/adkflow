"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
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
  ExecutionAnimations,
} from "./collapsedLayoutUtils";
import {
  useConnectedPromptName,
  useConnectedToolNames,
} from "./fullCollapsedLayoutHooks";
import FullCollapsedLayoutBody from "./FullCollapsedLayoutBody";

/**
 * FullCollapsedLayout - Header + body + footer
 * Used for AgentNode-style display (shows model, connections)
 * Matches the old AgentNode collapsed view exactly:
 * - Body: "Model:" label with model value, connected prompt/tool names
 * - Footer: "Agent" text on left (no type badge since all agents are LLM)
 * - Link handles on top/bottom for agent chaining
 * - Width: min 250px, max 300px
 */
const FullCollapsedLayout = memo(
  ({
    id,
    nodeData,
    schema,
    name,
    headerColor,
    config,
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
    onContextMenu,
  }: CustomNodeCollapsedProps) => {
    const { theme } = useTheme();
    const themeColors = getThemeColors(theme, schema.ui.theme_key);
    const bgColor = themeColors?.header || headerColor;
    const ringColor = themeColors?.ring || bgColor;
    const executionState = nodeData.executionState;
    const collapsedFooter = schema.ui.collapsed_footer;

    // Get additional handles from handle_layout
    const additionalHandles = schema.ui.handle_layout?.additional_handles || [];

    // Use extracted hooks for connected nodes
    const connectedPromptName = useConnectedPromptName(id);
    const connectedToolNames = useConnectedToolNames(id);

    const handleStyle = {
      width: 10,
      height: 10,
      border: `2px solid ${theme.colors.handles.border}`,
    };

    const linkHandleStyle = {
      width: 8,
      height: 8,
      border: `2px solid ${theme.colors.handles.border}`,
    };

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
          className="rounded-lg shadow-lg min-w-[250px] max-w-[300px] transition-all cursor-pointer"
          style={{
            backgroundColor: theme.colors.nodes.common.container.background,
            ...getNodeStyle(),
          }}
          onDoubleClick={onToggleExpand}
          title="Double-click to configure"
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
              backgroundColor: theme.colors.handles.input,
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

          {/* Link handles on top/bottom/right, and left-positioned sources (from additional_handles) */}
          {additionalHandles
            .filter((handle) => {
              // Show handles that are NOT left-positioned
              // OR are left-positioned but are sources (outputs)
              return handle.position !== "left" || handle.type === "source";
            })
            .map((handle) => {
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
                    ...linkHandleStyle,
                    backgroundColor: handleColor,
                  }}
                  title={handle.label}
                />
              );
            })}

          {/* Header */}
          <div
            className="px-2 py-1 rounded-t-lg flex items-center gap-1.5 cursor-pointer"
            style={{
              backgroundColor: bgColor,
              color: themeColors?.text || "#ffffff",
            }}
            onContextMenu={onContextMenu}
          >
            {nodeData.isNodeLocked && (
              <Lock className="w-3 h-3 flex-shrink-0 opacity-80" />
            )}
            {/* Node type icon */}
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
                onDoubleClick={(e) => e.stopPropagation()}
                className="flex-1 bg-white text-gray-900 px-1.5 py-0.5 rounded text-xs font-medium outline-none"
              />
            ) : (
              <span
                className="font-medium text-xs hover:opacity-80 truncate max-w-[200px] flex-1"
                onClick={onNameClick}
              >
                {name}
              </span>
            )}
            <ValidationIndicator
              errors={nodeData.validationErrors}
              warnings={nodeData.validationWarnings}
              duplicateNameError={nodeData.duplicateNameError}
            />
          </div>

          {/* Body */}
          <FullCollapsedLayoutBody
            schema={schema}
            config={config}
            theme={theme}
            connectedPromptName={connectedPromptName}
            connectedToolNames={connectedToolNames}
          />

          {/* Footer - "Agent" on left, no type badge (all agents are LLM now) */}
          <div
            className="px-2 py-1 rounded-b-lg border-t flex items-center justify-between"
            style={{
              backgroundColor: theme.colors.nodes.common.footer.background,
              borderColor: theme.colors.nodes.common.footer.border,
              color: theme.colors.nodes.common.footer.text,
            }}
          >
            <span className="text-xs">
              {collapsedFooter?.left_text || "Agent"}
            </span>
          </div>

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
FullCollapsedLayout.displayName = "FullCollapsedLayout";

export default FullCollapsedLayout;
