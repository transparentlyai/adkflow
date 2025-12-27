"use client";

import type { WidgetProps } from "@/components/nodes/widgets/WidgetRenderer";

export default function NumberInputWidget({ field, value, onChange, options }: WidgetProps) {
  const { disabled, theme } = options;

  return (
    <input
      type="number"
      value={(value as number) ?? field.default ?? 0}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      min={field.min_value}
      max={field.max_value}
      step={field.step ?? 1}
      disabled={disabled}
      className="w-full px-2 py-1.5 rounded text-xs border"
      style={{
        backgroundColor: theme.colors.nodes.common.container.background,
        borderColor: theme.colors.nodes.common.container.border,
        color: theme.colors.nodes.common.text.primary,
      }}
    />
  );
}
