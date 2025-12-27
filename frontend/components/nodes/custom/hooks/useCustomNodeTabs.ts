"use client";

import { useMemo, useState } from "react";
import type { CustomNodeSchema } from "@/components/nodes/CustomNode";

/**
 * Hook to compute and manage tabs from a CustomNode schema.
 * If schema.ui.tabs is explicitly defined, use that (preserving exact order).
 * Otherwise, extracts unique tabs from inputs, fields, and outputs.
 * When auto-deriving, ensures "General" tab is always first if present.
 */
export function useCustomNodeTabs(schema: CustomNodeSchema) {
  const tabs = useMemo(() => {
    // If tabs are explicitly defined in the schema, use them as-is
    if (schema.ui.tabs && schema.ui.tabs.length > 0) {
      return schema.ui.tabs;
    }

    // Otherwise, derive tabs from inputs, fields, and outputs
    const tabSet = new Set<string>();
    schema.ui.inputs.forEach((i) => i.tab && tabSet.add(i.tab));
    schema.ui.fields.forEach((f) => f.tab && tabSet.add(f.tab));
    schema.ui.outputs.forEach((o) => o.tab && tabSet.add(o.tab));

    if (tabSet.size === 0) return null;

    const sorted = Array.from(tabSet);
    const generalIdx = sorted.indexOf("General");
    if (generalIdx > 0) {
      sorted.splice(generalIdx, 1);
      sorted.unshift("General");
    }
    return sorted;
  }, [schema]);

  const [activeTab, setActiveTab] = useState<string>(tabs?.[0] || "General");

  return { tabs, activeTab, setActiveTab };
}
