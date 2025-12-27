"use client";

import { memo, useCallback, useMemo, useRef } from "react";
import { Handle, Position, useStore } from "@xyflow/react";
import { useTheme } from "@/contexts/ThemeContext";
import { useRunWorkflow } from "@/contexts/RunWorkflowContext";
import { useTeleporter } from "@/contexts/TeleporterContext";
import DraggableHandle from "@/components/DraggableHandle";
import ValidationIndicator from "@/components/nodes/ValidationIndicator";
import CustomNodeHeader from "@/components/nodes/custom/CustomNodeHeader";
import NodeIcon from "@/components/nodes/custom/NodeIcon";
import type {
  CustomNodeSchema,
  CustomNodeData,
  NodeLayout,
} from "@/components/nodes/CustomNode";
import type { HandlePositions, NodeExecutionState } from "@/lib/types";
import type { HandleTypes } from "@/components/nodes/custom/hooks/useCustomNodeHandleTypes";
import {
  Lock,
  Play,
  Square,
  Zap,
  Circle,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export interface CustomNodeCollapsedProps {
  id: string;
  nodeData: CustomNodeData;
  schema: CustomNodeSchema;
  name: string;
  config: Record<string, unknown>;
  handlePositions?: HandlePositions;
  handleTypes: HandleTypes;
  headerColor: string;
  selected?: boolean;
  onToggleExpand: () => void;
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
 * Get theme colors for a node type
 */
function getThemeColors(
  theme: ReturnType<typeof useTheme>["theme"],
  themeKey?: string,
) {
  if (!themeKey) return null;
  const nodesRecord = theme.colors.nodes as unknown as Record<string, unknown>;
  const nodeColors = nodesRecord[themeKey];
  if (nodeColors && typeof nodeColors === "object") {
    return nodeColors as {
      header?: string;
      headerHover?: string;
      text?: string;
      ring?: string;
    };
  }
  return null;
}

/**
 * Get execution state styling for a node
 */
function getExecutionStyle(
  executionState?: NodeExecutionState,
): React.CSSProperties {
  switch (executionState) {
    case "running":
      return {
        boxShadow: `0 0 0 2px rgba(59, 130, 246, 0.8), 0 0 20px 4px rgba(59, 130, 246, 0.4)`,
        animation: "custom-node-execution-pulse 1.5s ease-in-out infinite",
      };
    case "completed":
      return {
        boxShadow: `0 0 0 2px rgba(34, 197, 94, 0.8), 0 0 10px 2px rgba(34, 197, 94, 0.3)`,
        transition: "box-shadow 0.3s ease-out",
      };
    case "error":
      return {
        boxShadow: `0 0 0 2px rgba(239, 68, 68, 0.8), 0 0 20px 4px rgba(239, 68, 68, 0.4)`,
        animation: "validation-error-pulse 1s ease-in-out infinite",
      };
    default:
      return {};
  }
}

/**
 * Get validation error glow style
 */
function getValidationStyle(hasValidationError?: boolean): React.CSSProperties {
  if (hasValidationError) {
    return {
      boxShadow: `0 0 0 2px rgba(239, 68, 68, 0.8), 0 0 20px 4px rgba(239, 68, 68, 0.4)`,
      animation: "validation-error-pulse 1s ease-in-out infinite",
    };
  }
  return {};
}

/**
 * Get duplicate name error style (static red glow, no animation)
 */
function getDuplicateNameStyle(
  duplicateNameError?: string,
): React.CSSProperties {
  if (duplicateNameError) {
    return {
      boxShadow: `0 0 0 2px #ef4444`,
    };
  }
  return {};
}

/**
 * CSS keyframes for execution and validation animations
 */
const ExecutionAnimations = () => (
  <style>{`
    @keyframes custom-node-execution-pulse {
      0%, 100% { box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.8), 0 0 20px 4px rgba(59, 130, 246, 0.4); }
      50% { box-shadow: 0 0 0 3px rgba(59, 130, 246, 1), 0 0 30px 8px rgba(59, 130, 246, 0.6); }
    }
    @keyframes validation-error-pulse {
      0%, 100% { box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.8), 0 0 20px 4px rgba(239, 68, 68, 0.4); }
      50% { box-shadow: 0 0 0 3px rgba(239, 68, 68, 1), 0 0 30px 8px rgba(239, 68, 68, 0.6); }
    }
  `}</style>
);

/**
 * Format collapsed display text using config values
 */
function formatCollapsedText(
  format: string | undefined,
  config: Record<string, unknown>,
  summaryFields: string[] | undefined,
): string | null {
  if (format) {
    return format.replace(/\{(\w+)\}/g, (_, key) => String(config[key] || ""));
  }
  if (summaryFields && summaryFields.length > 0) {
    return summaryFields
      .map((f) => String(config[f] || ""))
      .filter(Boolean)
      .join(" • ");
  }
  return null;
}

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
          className="px-3 py-1 rounded-full shadow-md cursor-pointer transition-all"
          style={{
            backgroundColor: bgColor,
            color: textColor,
            minWidth: schema.ui.min_collapsed_width,
            ...getNodeStyle(),
          }}
          title={String(config.value || "")}
        >
          <div className="font-medium text-xs whitespace-nowrap flex items-center gap-1">
            {nodeData.isNodeLocked && <Lock className="w-3 h-3 opacity-80" />}
            <ValidationIndicator
              errors={nodeData.validationErrors}
              warnings={nodeData.validationWarnings}
              duplicateNameError={nodeData.duplicateNameError}
            />
            <NodeIcon icon={schema.ui.icon} className="w-3 h-3" />
            {displayText}
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
    config,
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
      const duplicateStyle = getDuplicateNameStyle(nodeData.duplicateNameError);
      if (Object.keys(duplicateStyle).length > 0) {
        return { border: "2px solid transparent", ...duplicateStyle };
      }
      // Then execution state
      const execStyle = getExecutionStyle(executionState);
      if (Object.keys(execStyle).length > 0) {
        return { border: "2px solid transparent", ...execStyle };
      }
      // Then validation error
      const validStyle = getValidationStyle(hasValidationError);
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

/**
 * Octagon Layout - Used for EndNode
 * Uses SVG polygon for proper octagon shape with selection ring
 */
const OctagonLayout = memo(
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
    const bgColor = themeColors?.header || headerColor || "#ef4444";
    const textColor = themeColors?.text || "#ffffff";
    const ringColor = themeColors?.ring || bgColor;

    const size = 48;
    const cut = size * 0.29; // Corner cut amount - matches EndNode

    // Octagon path points - matches EndNode exactly
    const octagonPoints = `${cut},0 ${size - cut},0 ${size},${cut} ${size},${size - cut} ${size - cut},${size} ${cut},${size} 0,${size - cut} 0,${cut}`;

    // Get stroke color for duplicate name or selection
    const getStrokeColor = () => {
      if (nodeData.duplicateNameError) return "#ef4444";
      if (selected) return ringColor;
      return "transparent";
    };

    return (
      <div
        onContextMenu={(e) => e.preventDefault()}
        className="relative"
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

        {/* Input handle on left */}
        {schema.ui.inputs.length > 0 && (
          <DraggableHandle
            nodeId={id}
            handleId="input"
            type="target"
            defaultEdge="left"
            defaultPercent={50}
            handlePositions={handlePositions}
            acceptedSources={handleTypes["input"]?.acceptedSources}
            acceptedTypes={handleTypes["input"]?.acceptedTypes}
            style={{
              width: 10,
              height: 10,
              backgroundColor: theme.colors.handles.input,
              border: `2px solid ${theme.colors.handles.border}`,
            }}
          />
        )}

        {/* Octagon shape using SVG */}
        <svg
          onDoubleClick={onToggleExpand}
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="drop-shadow-lg cursor-pointer"
          style={{ transition: "transform 0.2s" }}
          onMouseEnter={(e) => {
            (e.currentTarget as SVGSVGElement).style.transform = "scale(1.05)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as SVGSVGElement).style.transform = "scale(1)";
          }}
        >
          <polygon
            points={octagonPoints}
            fill={bgColor}
            stroke={getStrokeColor()}
            strokeWidth="2"
          />
        </svg>

        {/* Icon overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          title="End - Workflow termination point"
        >
          <Square className="w-5 h-5" style={{ color: textColor }} />
        </div>
      </div>
    );
  },
);
OctagonLayout.displayName = "OctagonLayout";

/**
 * Diamond Layout - Used for TeleportIn/Out nodes
 * Uses TeleporterContext for dynamic colors based on name and shows connection count
 */
const DiamondLayout = memo(
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

    // Get teleporter context for dynamic colors - may not be available
    let getColorForName: ((name: string) => string) | undefined;
    let getMatchingCount: ((name: string) => number) | undefined;
    try {
      const teleporterContext = useTeleporter();
      getColorForName = teleporterContext.getColorForName;
      // Get matching teleporters count based on direction
      const isInputType =
        schema.unit_id.includes("teleportIn") || schema.unit_id.includes("In");
      if (isInputType) {
        getMatchingCount = (n: string) =>
          teleporterContext.getOutputTeleportersByName(n).length;
      } else {
        getMatchingCount = (n: string) =>
          teleporterContext.getInputTeleportersByName(n).length;
      }
    } catch {
      // Not in TeleporterContext, use defaults
    }

    const connectorName = String(config.name || name);
    const isInput =
      schema.unit_id.includes("teleportIn") || schema.unit_id.includes("In");

    // Get color from teleporter context or fall back to theme/headerColor
    const themeColors = getThemeColors(theme, schema.ui.theme_key);
    const bgColor = getColorForName
      ? getColorForName(connectorName)
      : themeColors?.header || headerColor || "#8b5cf6";
    const ringColor = themeColors?.ring || bgColor;

    // Get matching connection count
    const matchingCount = getMatchingCount
      ? getMatchingCount(connectorName)
      : 0;

    const size = 40;

    // Get node styling (duplicate name error takes priority)
    const getNodeStyle = (): React.CSSProperties => {
      // Duplicate name error takes priority (static red glow)
      const duplicateStyle = getDuplicateNameStyle(nodeData.duplicateNameError);
      if (Object.keys(duplicateStyle).length > 0) {
        return duplicateStyle;
      }
      return selected ? { boxShadow: `0 0 0 2px ${ringColor}` } : {};
    };

    return (
      <div className="relative" style={{ width: size, height: size + 20 }}>
        {/* Validation indicator */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
          <ValidationIndicator
            errors={nodeData.validationErrors}
            warnings={nodeData.validationWarnings}
            duplicateNameError={nodeData.duplicateNameError}
          />
        </div>

        {/* Diamond shape */}
        <div
          onDoubleClick={onToggleExpand}
          className="shadow-lg cursor-pointer flex items-center justify-center transition-all hover:scale-105"
          style={{
            width: size,
            height: size,
            backgroundColor: bgColor,
            transform: "rotate(45deg)",
            borderRadius: 4,
            ...getNodeStyle(),
          }}
          title={`${isInput ? "Input" : "Output"} Connector: ${connectorName}`}
        >
          <span
            className="text-white text-xs font-bold"
            style={{ transform: "rotate(-45deg)" }}
          >
            {connectorName.charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Connection count badge */}
        {matchingCount > 0 && (
          <div
            className="absolute -top-1 -right-1 bg-white rounded-full px-1 text-[10px] font-medium border shadow-sm"
            style={{ borderColor: bgColor, color: bgColor }}
          >
            {matchingCount}
          </div>
        )}

        {/* Label below */}
        <div
          className="absolute left-1/2 transform -translate-x-1/2 whitespace-nowrap"
          style={{ bottom: -4 }}
        >
          <span
            className="text-xs truncate max-w-[50px] block text-center"
            style={{ color: theme.colors.nodes.common.text.secondary }}
          >
            {connectorName}
          </span>
        </div>

        {/* Handle based on direction */}
        {isInput ? (
          <DraggableHandle
            nodeId={id}
            handleId={schema.ui.outputs[0]?.id || "output"}
            type="source"
            defaultEdge="right"
            defaultPercent={50}
            handlePositions={handlePositions}
            outputSource={handleTypes[schema.ui.outputs[0]?.id]?.outputSource}
            outputType={handleTypes[schema.ui.outputs[0]?.id]?.outputType}
            style={{
              width: 8,
              height: 8,
              backgroundColor: bgColor,
              border: `2px solid white`,
            }}
          />
        ) : (
          <DraggableHandle
            nodeId={id}
            handleId="input"
            type="target"
            defaultEdge="left"
            defaultPercent={50}
            handlePositions={handlePositions}
            acceptedSources={handleTypes["input"]?.acceptedSources}
            acceptedTypes={handleTypes["input"]?.acceptedTypes}
            style={{
              width: 8,
              height: 8,
              backgroundColor: bgColor,
              border: `2px solid white`,
            }}
          />
        )}
      </div>
    );
  },
);
DiamondLayout.displayName = "DiamondLayout";

/**
 * Tag Layout - Used for TeleportIn/Out nodes
 * Matches the old TeleportNodeShape exactly with SVG tag/arrow shapes
 * Uses TeleporterContext for dynamic colors and connection counts
 */
const TAG_WIDTH = 90;
const TAG_HEIGHT = 24;
const TAG_ARROW_WIDTH = 10;

const TagLayout = memo(
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

    // Determine direction based on unit_id
    const isInput =
      schema.unit_id.includes("teleportIn") || schema.unit_id.includes("In");

    // Get teleporter context for dynamic colors - may not be available
    let getColorForName: ((name: string) => string) | undefined;
    let getMatchingCount: ((name: string) => number) | undefined;
    try {
      const teleporterContext = useTeleporter();
      getColorForName = teleporterContext.getColorForName;
      // Get matching teleporters count based on direction
      if (isInput) {
        getMatchingCount = (n: string) =>
          teleporterContext.getOutputTeleportersByName(n).length;
      } else {
        getMatchingCount = (n: string) =>
          teleporterContext.getInputTeleportersByName(n).length;
      }
    } catch {
      // Not in TeleporterContext, use defaults
    }

    const connectorName = String(config.name || name);
    const isExpanded = nodeData.isExpanded ?? false;

    // Get color from teleporter context or fall back to theme/headerColor
    const themeColors = getThemeColors(theme, schema.ui.theme_key);
    const bgColor = getColorForName
      ? getColorForName(connectorName)
      : themeColors?.header || headerColor || "#8b5cf6";

    // Get matching connection count
    const matchingCount = getMatchingCount
      ? getMatchingCount(connectorName)
      : 0;

    // SVG path for tag shape - matches TeleportNodeShape exactly
    const shapePath = isInput
      ? // Arrow pointing LEFT (TeleportIn - has output handle on right)
        `M${TAG_ARROW_WIDTH},0 H${TAG_WIDTH - 4} Q${TAG_WIDTH},0 ${TAG_WIDTH},4 V${TAG_HEIGHT - 4} Q${TAG_WIDTH},${TAG_HEIGHT} ${TAG_WIDTH - 4},${TAG_HEIGHT} H${TAG_ARROW_WIDTH} L0,${TAG_HEIGHT / 2} Z`
      : // Arrow pointing RIGHT (TeleportOut - has input handle on left)
        `M0,4 Q0,0 4,0 H${TAG_WIDTH - TAG_ARROW_WIDTH} L${TAG_WIDTH},${TAG_HEIGHT / 2} L${TAG_WIDTH - TAG_ARROW_WIDTH},${TAG_HEIGHT} H4 Q0,${TAG_HEIGHT} 0,${TAG_HEIGHT - 4} Z`;

    // Handle position and type
    const handlePosition = isInput ? "right" : "left";
    const handleType = isInput ? "source" : "target";
    const handleId = isInput ? "output" : "input";

    // Badge position
    const badgePosition = isInput
      ? "absolute -top-1.5 -right-1"
      : "absolute -top-1.5 -left-1";

    // Content padding
    const contentPadding = isInput
      ? { paddingLeft: 12, paddingRight: 4 }
      : { paddingLeft: 4, paddingRight: 12 };

    // Expand indicator position
    const expandIndicatorPosition = isInput
      ? "absolute bottom-0 left-2"
      : "absolute bottom-0 right-1";

    // Get stroke color for duplicate name or selection
    const getStrokeColor = () => {
      if (nodeData.duplicateNameError) return "#ef4444";
      if (selected) return "#3b82f6";
      return "transparent";
    };

    return (
      <div
        onDoubleClick={onToggleExpand}
        className="relative"
        style={{ width: TAG_WIDTH, height: TAG_HEIGHT }}
        title={`${isInput ? "Input" : "Output"} Connector: ${connectorName}`}
      >
        {/* Validation indicator */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
          <ValidationIndicator
            errors={nodeData.validationErrors}
            warnings={nodeData.validationWarnings}
            duplicateNameError={nodeData.duplicateNameError}
          />
        </div>
        {/* Handle */}
        {isInput ? (
          <DraggableHandle
            nodeId={id}
            handleId={handleId}
            type={handleType}
            defaultEdge={handlePosition}
            defaultPercent={50}
            handlePositions={handlePositions}
            outputSource={handleTypes[schema.ui.outputs[0]?.id]?.outputSource}
            outputType={handleTypes[schema.ui.outputs[0]?.id]?.outputType}
            style={{
              width: 8,
              height: 8,
              backgroundColor: bgColor,
              border: "2px solid white",
            }}
          />
        ) : (
          <DraggableHandle
            nodeId={id}
            handleId={handleId}
            type={handleType}
            defaultEdge={handlePosition}
            defaultPercent={50}
            handlePositions={handlePositions}
            acceptedSources={handleTypes["input"]?.acceptedSources}
            acceptedTypes={handleTypes["input"]?.acceptedTypes}
            style={{
              width: 8,
              height: 8,
              backgroundColor: bgColor,
              border: "2px solid white",
            }}
          />
        )}

        {/* Tag shape SVG */}
        <svg
          width={TAG_WIDTH}
          height={TAG_HEIGHT}
          viewBox={`0 0 ${TAG_WIDTH} ${TAG_HEIGHT}`}
          className="drop-shadow-md"
        >
          <path
            d={shapePath}
            fill={bgColor}
            stroke={getStrokeColor()}
            strokeWidth="2"
          />
        </svg>

        {/* Content overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={contentPadding}
        >
          <div className="flex items-center gap-1 text-white text-sm font-medium">
            {nodeData.isNodeLocked && <Lock className="w-3 h-3 opacity-80" />}
            <span className="truncate max-w-[55px]">{connectorName}</span>
          </div>
        </div>

        {/* Connection count badge */}
        {matchingCount > 0 && (
          <div
            className={`${badgePosition} bg-white rounded-full px-1 text-[10px] font-medium border shadow-sm`}
            style={{ borderColor: bgColor, color: bgColor }}
          >
            {matchingCount}
          </div>
        )}

        {/* Expand indicator */}
        <div className={`${expandIndicatorPosition} text-white opacity-60`}>
          {isExpanded ? (
            <ChevronUp className="w-2.5 h-2.5" />
          ) : (
            <ChevronDown className="w-2.5 h-2.5" />
          )}
        </div>
      </div>
    );
  },
);
TagLayout.displayName = "TagLayout";

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
              ? displayName.slice(0, 8) + "…"
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

/**
 * Parse function signature from Python code
 */
function parseFunctionSignature(
  code: string,
): { name: string; params: string; returnType: string } | null {
  // Match: def function_name(params) -> return_type:
  const match = code.match(/def\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*([^:]+))?:/);
  if (!match) return null;

  return {
    name: match[1],
    params: match[2].trim(),
    returnType: match[3]?.trim() || "None",
  };
}

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

/**
 * Shallow comparison for arrays of strings
 */
function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

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
            <ValidationIndicator
              errors={nodeData.validationErrors}
              warnings={nodeData.validationWarnings}
              duplicateNameError={nodeData.duplicateNameError}
            />

            {/* Header */}
            <div style={{ backgroundColor: bgColor }}>
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
              />
            </div>

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

          {/* Hidden handles for each input to support direct connections */}
          {schema.ui.inputs.map((input) => (
            <Handle
              key={input.id}
              type="target"
              position={Position.Left}
              id={input.id}
              style={{ opacity: 0, pointerEvents: "none", top: "50%", left: 0 }}
            />
          ))}

          {/* Additional handles (top/bottom) */}
          {additionalHandles.map((handle) => {
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

          {/* Output handles - use each output's handle_color */}
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
                title={output.label}
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
StandardLayout.displayName = "StandardLayout";

/**
 * Collapsed view of a CustomNode.
 * Routes to the appropriate layout component based on schema.ui.layout.
 */
const CustomNodeCollapsed = memo((props: CustomNodeCollapsedProps) => {
  const layout = props.schema.ui.layout || "standard";

  switch (layout) {
    case "pill":
      return <PillLayout {...props} />;
    case "pill_body":
      return <PillBodyLayout {...props} />;
    case "full":
      return <FullCollapsedLayout {...props} />;
    case "circle":
      return <CircleLayout {...props} />;
    case "octagon":
      return <OctagonLayout {...props} />;
    case "diamond":
      return <DiamondLayout {...props} />;
    case "tag":
      return <TagLayout {...props} />;
    case "compact":
      return <CompactLayout {...props} />;
    case "standard":
    case "panel":
    default:
      return <StandardLayout {...props} />;
  }
});

CustomNodeCollapsed.displayName = "CustomNodeCollapsed";

export default CustomNodeCollapsed;
