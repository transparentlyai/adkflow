"use client";

import { memo } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useTeleporter } from "@/contexts/TeleporterContext";
import DraggableHandle from "@/components/DraggableHandle";
import ValidationIndicator from "@/components/nodes/ValidationIndicator";
import type { CustomNodeCollapsedProps } from "@/components/nodes/custom/CustomNodeCollapsed";
import { getThemeColors, getDuplicateNameStyle } from "./collapsedLayoutUtils";

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

export default DiamondLayout;
