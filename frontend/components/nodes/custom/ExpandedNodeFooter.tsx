"use client";

import { memo } from "react";
import { Circle, Zap } from "lucide-react";
import type { Theme } from "@/lib/themes/types";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode";

interface ExpandedNodeFooterProps {
  schema: CustomNodeSchema;
  theme: Theme;
  hasEditor: boolean;
  lineCount: number;
}

/**
 * Footer for expanded node view with execution indicators and line count
 */
const ExpandedNodeFooter = memo(
  ({ schema, theme, hasEditor, lineCount }: ExpandedNodeFooterProps) => {
    return (
      <div
        className="px-3 py-2 rounded-b-lg flex items-center justify-between border-t"
        style={{
          backgroundColor: theme.colors.nodes.common.footer.background,
          borderColor: theme.colors.nodes.common.footer.border,
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-xs"
            style={{ color: theme.colors.nodes.common.footer.text }}
          >
            {schema.label}
          </span>
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
