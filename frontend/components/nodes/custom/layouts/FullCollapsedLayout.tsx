"use client";

import { memo, useCallback, useRef } from "react";
import { Handle, Position, useStore } from "@xyflow/react";
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
  arraysEqual,
  ExecutionAnimations,
} from "./collapsedLayoutUtils";

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
  }: CustomNodeCollapsedProps) => {
    const { theme } = useTheme();
    const themeColors = getThemeColors(theme, schema.ui.theme_key);
    const bgColor = themeColors?.header || headerColor;
    const ringColor = themeColors?.ring || bgColor;
    const executionState = nodeData.executionState;
    const collapsedFooter = schema.ui.collapsed_footer;

    // Get additional handles from handle_layout
    const additionalHandles = schema.ui.handle_layout?.additional_handles || [];

    // Ref for stable array comparison for connected tool names
    const connectedToolNamesRef = useRef<string[]>([]);

    // Optimized selector: compute connected prompt name directly
    // Only re-renders when the actual prompt name changes
    const connectedPromptName = useStore(
      useCallback(
        (state) => {
          for (const edge of state.edges) {
            if (
              edge.target === id &&
              (edge.targetHandle === "prompt-input" ||
                edge.targetHandle === "input")
            ) {
              const sourceNode = state.nodes.find((n) => n.id === edge.source);
              if (sourceNode && sourceNode.id.startsWith("prompt_")) {
                const promptData = sourceNode.data as {
                  prompt?: { name?: string };
                };
                return promptData?.prompt?.name || "Prompt";
              }
            }
          }
          return undefined;
        },
        [id],
      ),
    );

    // Optimized selector: compute connected tool names directly
    const connectedToolNames = useStore(
      useCallback(
        (state) => {
          const toolNames: string[] = [];
          for (const edge of state.edges) {
            if (
              edge.target === id &&
              (edge.targetHandle === "tools-input" ||
                edge.targetHandle === "input")
            ) {
              const sourceNode = state.nodes.find((n) => n.id === edge.source);
              if (sourceNode) {
                if (sourceNode.id.startsWith("tool_")) {
                  const toolData = sourceNode.data as { name?: string };
                  toolNames.push(toolData?.name || "Tool");
                } else if (sourceNode.id.startsWith("agentTool_")) {
                  const agentToolData = sourceNode.data as { name?: string };
                  toolNames.push(agentToolData?.name || "AgentTool");
                }
              }
            }
          }
          // Only return new array if content changed (shallow comparison)
          if (arraysEqual(connectedToolNamesRef.current, toolNames)) {
            return connectedToolNamesRef.current;
          }
          connectedToolNamesRef.current = toolNames;
          return toolNames;
        },
        [id],
      ),
    );

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

          {/* Hidden handles for typed edges */}
          {schema.ui.inputs.map((input) => (
            <Handle
              key={input.id}
              type="target"
              position={Position.Left}
              id={input.id}
              style={{ opacity: 0, pointerEvents: "none", top: "50%", left: 0 }}
            />
          ))}

          {/* Link handles on top/bottom (from additional_handles) */}
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
          >
            {nodeData.isNodeLocked && (
              <Lock className="w-3 h-3 flex-shrink-0 opacity-80" />
            )}
            <ValidationIndicator
              errors={nodeData.validationErrors}
              warnings={nodeData.validationWarnings}
              duplicateNameError={nodeData.duplicateNameError}
            />
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
                className="font-medium text-xs hover:opacity-80 truncate max-w-[200px]"
                onClick={onNameClick}
              >
                {name}
              </span>
            )}
          </div>

          {/* Body */}
          <div className="p-3 text-sm space-y-1.5">
            {/* Model field - hardcoded "Model:" label like old AgentNode */}
            <div className="flex items-center gap-2">
              <span
                className="text-xs"
                style={{ color: theme.colors.nodes.common.text.secondary }}
              >
                Model:
              </span>
              <span
                className="text-xs font-medium"
                style={{ color: theme.colors.nodes.common.text.primary }}
              >
                {String(config.model || "Not set")}
              </span>
            </div>

            {/* Connected prompt - uses port icon or falls back to document icon */}
            {connectedPromptName && (
              <div className="flex items-center gap-2">
                <NodeIcon
                  icon={
                    schema.ui.inputs.find((i) => i.id === "prompt-input")
                      ?.icon || "document"
                  }
                  className="w-3.5 h-3.5"
                  style={{
                    color: theme.colors.nodes.prompt?.header || "#8b5cf6",
                  }}
                />
                <span
                  className="text-xs truncate"
                  style={{ color: theme.colors.nodes.common.text.secondary }}
                >
                  {connectedPromptName}
                </span>
              </div>
            )}

            {/* Connected tools - uses port icon or falls back to gear icon */}
            {connectedToolNames.length > 0 && (
              <div className="flex items-center gap-2">
                <NodeIcon
                  icon={
                    schema.ui.inputs.find((i) => i.id === "tools-input")
                      ?.icon || "gear"
                  }
                  className="w-3.5 h-3.5"
                  style={{
                    color: theme.colors.nodes.tool?.header || "#f97316",
                  }}
                />
                <span
                  className="text-xs truncate"
                  style={{ color: theme.colors.nodes.common.text.secondary }}
                >
                  {connectedToolNames.join(", ")}
                </span>
              </div>
            )}
          </div>

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

          {/* Output handles */}
          {schema.ui.outputs
            .filter((o) => !additionalHandles.some((h) => h.id === o.id))
            .map((output, i, arr) => (
              <DraggableHandle
                key={output.id}
                nodeId={id}
                handleId={output.id}
                type="source"
                defaultEdge={
                  schema.ui.handle_layout?.output_position || "right"
                }
                defaultPercent={((i + 1) / (arr.length + 1)) * 100}
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
FullCollapsedLayout.displayName = "FullCollapsedLayout";

export default FullCollapsedLayout;
