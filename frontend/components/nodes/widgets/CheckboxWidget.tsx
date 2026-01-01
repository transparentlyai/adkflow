"use client";

import type { WidgetProps } from "@/components/nodes/widgets/WidgetRenderer";

export default function CheckboxWidget({
  field,
  value,
  onChange,
  options,
}: WidgetProps) {
  const { disabled, theme } = options;

  return (
    <input
      type="checkbox"
      checked={Boolean(value)}
      onChange={(e) => onChange(e.target.checked)}
      disabled={disabled}
      className="w-4 h-4 rounded border"
      style={{
        accentColor: theme.colors.nodes.agent.header,
      }}
    />
  );
}
