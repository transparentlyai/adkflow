"use client";

import type { WidgetProps } from "@/components/nodes/widgets/WidgetRenderer";
import { Info } from "lucide-react";

/**
 * InfoDisplayWidget - A read-only informational display.
 *
 * Use this for fields that show contextual information rather than
 * editable values. Displays the help_text as the main content with
 * an info icon.
 *
 * @example
 * // In a field definition:
 * {
 *   id: "location_info",
 *   label: "Location",
 *   widget: "info_display",
 *   help_text: "Set in Project Settings → Location",
 * }
 */
export default function InfoDisplayWidget({
  field,
  options: widgetOptions,
}: WidgetProps) {
  const { theme, compact } = widgetOptions;

  return (
    <div
      className={`flex items-start gap-2 ${compact ? "text-[10px]" : "text-xs"}`}
      style={{ color: theme.colors.nodes.common.text.secondary }}
    >
      <Info
        className={`${compact ? "w-3 h-3" : "w-3.5 h-3.5"} flex-shrink-0 mt-0.5`}
        style={{ color: theme.colors.nodes.common.text.secondary }}
      />
      <span className="leading-relaxed">
        {field.help_text || "No information available"}
      </span>
    </div>
  );
}
