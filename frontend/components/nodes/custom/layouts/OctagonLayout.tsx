"use client";

import { memo } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import DraggableHandle from "@/components/DraggableHandle";
import ValidationIndicator from "@/components/nodes/ValidationIndicator";
import { Square } from "lucide-react";
import type { CustomNodeCollapsedProps } from "@/components/nodes/custom/CustomNodeCollapsed";
import { getThemeColors } from "./collapsedLayoutUtils";

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
      if (nodeData.duplicateNameError)
        return theme.colors.state?.invalid?.ring || "#ef4444";
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

export default OctagonLayout;
