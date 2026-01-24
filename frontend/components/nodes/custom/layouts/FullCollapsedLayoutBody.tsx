"use client";

import { memo } from "react";
import type { useTheme } from "@/contexts/ThemeContext";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode/types";
import NodeIcon from "@/components/nodes/custom/NodeIcon";

interface FullCollapsedLayoutBodyProps {
  schema: CustomNodeSchema;
  config: Record<string, unknown>;
  theme: ReturnType<typeof useTheme>["theme"];
  connectedPromptName: string | undefined;
  connectedToolNames: string[];
}

/**
 * Body section for FullCollapsedLayout
 * Displays model info and connected prompts/tools
 */
const FullCollapsedLayoutBody = memo(
  ({
    schema,
    config,
    theme,
    connectedPromptName,
    connectedToolNames,
  }: FullCollapsedLayoutBodyProps) => {
    return (
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
                schema.ui.inputs.find(
                  (i: { id: string }) => i.id === "prompt-input",
                )?.icon || "document"
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
                schema.ui.inputs.find(
                  (i: { id: string }) => i.id === "tools-input",
                )?.icon || "gear"
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
    );
  },
);
FullCollapsedLayoutBody.displayName = "FullCollapsedLayoutBody";

export default FullCollapsedLayoutBody;
