"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Circle, Zap } from "lucide-react";
import type { Theme } from "@/lib/themes/types";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode";
import type { HandleTypes } from "@/components/nodes/custom/hooks/useCustomNodeHandleTypes";

interface ExpandedNodeFooterProps {
  schema: CustomNodeSchema;
  theme: Theme;
  hasEditor: boolean;
  lineCount: number;
  handleTypes?: HandleTypes;
}

/**
 * Footer for expanded node view with execution indicators and line count
 */
const ExpandedNodeFooter = memo(
  ({
    schema,
    theme,
    hasEditor,
    lineCount,
    handleTypes,
  }: ExpandedNodeFooterProps) => {
    const inputInFooter = schema.ui.handle_layout?.input_in_footer;
    const footerInput = inputInFooter ? schema.ui.inputs[0] : null;

    return (
      <div
        className="px-3 py-1 rounded-b-lg flex items-center justify-between border-t relative"
        style={{
          backgroundColor: theme.colors.nodes.common.footer.background,
          borderColor: theme.colors.nodes.common.footer.border,
        }}
      >
        <div className="flex items-center gap-2">
          {/* Footer input handle */}
          {footerInput && (
            <div className="flex items-center gap-1.5">
              <Handle
                type="target"
                position={Position.Left}
                id={footerInput.id}
                style={{
                  position: "relative",
                  left: 0,
                  top: 0,
                  transform: "none",
                  width: 10,
                  height: 10,
                  backgroundColor:
                    footerInput.handle_color || theme.colors.handles.callback,
                  border: `2px solid ${theme.colors.handles.border}`,
                }}
                data-accepted-sources={
                  handleTypes?.[footerInput.id]?.acceptedSources?.join(",") ||
                  footerInput.accepted_sources?.join(",")
                }
                data-accepted-types={
                  handleTypes?.[footerInput.id]?.acceptedTypes?.join(",") ||
                  footerInput.accepted_types?.join(",")
                }
              />
              <span
                className="text-xs"
                style={{ color: theme.colors.nodes.common.footer.text }}
              >
                {footerInput.label}
              </span>
            </div>
          )}
          {!footerInput && (
            <span
              className="text-xs"
              style={{ color: theme.colors.nodes.common.footer.text }}
            >
              {schema.label}
            </span>
          )}
          {/* Output node indicator */}
          {schema.output_node && (
            <span title="Output Node - triggers execution trace">
              <Circle className="w-3 h-3 text-green-500" fill="currentColor" />
            </span>
          )}
          {/* Always execute indicator */}
          {schema.always_execute && (
            <span title="Always Execute - skips cache">
              <Zap className="w-3 h-3 text-orange-500" />
            </span>
          )}
        </div>
        {/* Line count for editor nodes */}
        {hasEditor && lineCount > 0 && (
          <span
            className="text-xs"
            style={{ color: theme.colors.nodes.common.text.muted }}
          >
            {lineCount} lines
          </span>
        )}
      </div>
    );
  },
);

ExpandedNodeFooter.displayName = "ExpandedNodeFooter";

export default ExpandedNodeFooter;
