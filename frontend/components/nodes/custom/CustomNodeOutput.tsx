"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { useTheme } from "@/contexts/ThemeContext";
import HandleTooltip from "@/components/HandleTooltip";
import type { PortDefinition } from "@/components/nodes/CustomNode";

export interface CustomNodeOutputProps {
  output: PortDefinition;
  /** Handle position override - default is "right" */
  handlePosition?: "left" | "right";
}

/**
 * Renders an output port with handle and tooltip.
 * Used in the expanded view's output section.
 */
const CustomNodeOutput = memo(
  ({ output, handlePosition = "right" }: CustomNodeOutputProps) => {
    const { theme } = useTheme();
    const isLeftHandle = handlePosition === "left";

    return (
      <div
        className={`relative flex items-center gap-2 py-0.5 ${isLeftHandle ? "justify-start pl-3" : "justify-end pr-3"}`}
      >
        {/* For left-positioned handles, show handle before label */}
        {isLeftHandle && (
          <HandleTooltip
            label={output.label}
            sourceType={output.source_type}
            dataType={output.data_type}
            type="output"
          >
            <Handle
              type="source"
              position={Position.Left}
              id={output.id}
              style={{
                position: "absolute",
                left: -5,
                top: "50%",
                transform: "translateY(-50%)",
                width: 10,
                height: 10,
                border: `2px solid ${theme.colors.handles.border}`,
                backgroundColor:
                  output.handle_color || theme.colors.handles.output,
              }}
            />
          </HandleTooltip>
        )}
        <span
          className="text-xs"
          style={{ color: theme.colors.nodes.common.text.secondary }}
        >
          {output.label}
        </span>
        {/* For right-positioned handles, show handle after label */}
        {!isLeftHandle && (
          <HandleTooltip
            label={output.label}
            sourceType={output.source_type}
            dataType={output.data_type}
            type="output"
          >
            <Handle
              type="source"
              position={Position.Right}
              id={output.id}
              style={{
                position: "absolute",
                right: -5,
                top: "50%",
                transform: "translateY(-50%)",
                width: 10,
                height: 10,
                border: `2px solid ${theme.colors.handles.border}`,
                backgroundColor:
                  output.handle_color || theme.colors.handles.output,
              }}
            />
          </HandleTooltip>
        )}
      </div>
    );
  },
);

CustomNodeOutput.displayName = "CustomNodeOutput";

export default CustomNodeOutput;
