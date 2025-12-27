"use client";

import { memo } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useTeleporter } from "@/contexts/TeleporterContext";
import DraggableHandle from "@/components/DraggableHandle";
import ValidationIndicator from "@/components/nodes/ValidationIndicator";
import { Lock, ChevronDown, ChevronUp } from "lucide-react";
import type { CustomNodeCollapsedProps } from "@/components/nodes/custom/CustomNodeCollapsed";
import { getThemeColors } from "./collapsedLayoutUtils";

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

export default TagLayout;
