"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { useTheme } from "@/contexts/ThemeContext";
import HandleTooltip from "@/components/HandleTooltip";
import type { PortDefinition } from "@/components/nodes/CustomNode";

export interface CustomNodeOutputProps {
  output: PortDefinition;
}

/**
 * Renders an output port with handle and tooltip.
 * Used in the expanded view's output section.
 */
const CustomNodeOutput = memo(({ output }: CustomNodeOutputProps) => {
  const { theme } = useTheme();

  return (
    <div className="relative flex items-center justify-end gap-2 py-0.5 pr-3">
      <span
        className="text-xs"
        style={{ color: theme.colors.nodes.common.text.secondary }}
      >
        {output.label}
      </span>
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
            backgroundColor: output.handle_color || theme.colors.handles.output,
          }}
        />
      </HandleTooltip>
    </div>
  );
});

CustomNodeOutput.displayName = "CustomNodeOutput";

export default CustomNodeOutput;
