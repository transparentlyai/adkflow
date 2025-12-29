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
 * Renders handles at node edges for the expanded view.
 * Includes main input/output handles and additional handles (top/bottom).
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

        {/* Additional handles (top/bottom) */}
        {additionalHandles
          .filter((handle) => handle.position !== "left")
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

        {/* Output handles */}
        {schema.ui.outputs
          .filter((o) => !additionalHandles.some((h) => h.id === o.id))
          .map((output, i, arr) => (
            <DraggableHandle
              key={output.id}
              nodeId={id}
              handleId={output.id}
              type="source"
              defaultEdge={schema.ui.handle_layout?.output_position || "right"}
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
      </>
    );
  },
);

ExpandedNodeHandles.displayName = "ExpandedNodeHandles";

export default ExpandedNodeHandles;
