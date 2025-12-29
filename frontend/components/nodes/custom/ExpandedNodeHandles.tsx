"use client";

import { memo } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import DraggableHandle from "@/components/DraggableHandle";
import type { HandlePositions, HandleEdge } from "@/lib/types";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode";
import type { HandleTypes } from "@/components/nodes/custom/hooks/useCustomNodeHandleTypes";

interface AdditionalHandle {
  id: string;
  type: "source" | "target";
  position: HandleEdge;
  label?: string;
}

export interface ExpandedNodeHandlesProps {
  id: string;
  schema: CustomNodeSchema;
  handlePositions?: HandlePositions;
  handleTypes: HandleTypes;
  additionalHandles: AdditionalHandle[];
}

/**
 * Renders additional handles (top/bottom) at node edges for the expanded view.
 * Input/output handles are rendered inline by CustomNodeInput/CustomNodeOutput.
 */
const ExpandedNodeHandles = memo(
  ({
    id,
    schema,
    handlePositions,
    handleTypes,
    additionalHandles,
  }: ExpandedNodeHandlesProps) => {
    const { theme } = useTheme();

    const handleStyle = {
      width: 10,
      height: 10,
      border: `2px solid ${theme.colors.handles.border}`,
    };

    return (
      <>
        {/* NOTE: Universal "input" handle is NOT rendered in expanded mode.
            It only appears in collapsed mode (StandardLayout, FullCollapsedLayout).
            Individual input handles are rendered inline by CustomNodeInput. */}

        {/* Additional handles (top/bottom only - not left/right since those are rendered inline) */}
        {additionalHandles
          .filter(
            (handle) =>
              handle.position !== "left" && handle.position !== "right",
          )
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
                      acceptedSources: handleTypes[handle.id]?.acceptedSources,
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

        {/* NOTE: Output handles are NOT rendered here in expanded mode.
            They are rendered inline by CustomNodeOutput inside the node content.
            This avoids duplication with the handles at the node edge. */}
      </>
    );
  },
);

ExpandedNodeHandles.displayName = "ExpandedNodeHandles";

export default ExpandedNodeHandles;
