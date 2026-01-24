import { useMemo } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode/types";

export interface UseNodeThemeColorOptions {
  schema: CustomNodeSchema;
}

export interface UseNodeThemeColorResult {
  headerColor: string;
}

/**
 * Hook that determines the header color for a CustomNode based on theme and schema.
 *
 * Priority:
 * 1. Theme color from theme_key (if exists in theme.colors.nodes)
 * 2. schema.ui.color fallback
 * 3. Default agent header color
 */
export function useNodeThemeColor({
  schema,
}: UseNodeThemeColorOptions): UseNodeThemeColorResult {
  const { theme } = useTheme();

  const headerColor = useMemo(() => {
    if (schema.ui.theme_key) {
      const nodesRecord = theme.colors.nodes as unknown as Record<
        string,
        unknown
      >;
      const nodeColors = nodesRecord[schema.ui.theme_key] as
        | { header?: string }
        | undefined;
      if (nodeColors?.header) {
        return nodeColors.header;
      }
    }
    return schema.ui.color || theme.colors.nodes.agent.header;
  }, [schema.ui.theme_key, schema.ui.color, theme.colors.nodes]);

  return {
    headerColor,
  };
}
