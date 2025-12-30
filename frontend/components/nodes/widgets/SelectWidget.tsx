"use client";

import type { WidgetProps } from "@/components/nodes/widgets/WidgetRenderer";

export default function SelectWidget({
  field,
  value,
  onChange,
  options,
}: WidgetProps) {
  const { disabled, theme, compact } = options;

  return (
    <select
      value={(value as string) ?? ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={
        compact
          ? "w-full px-1.5 py-0.5 rounded text-[11px] border bg-transparent"
          : "w-full px-2 py-1.5 rounded text-xs border"
      }
      style={{
        backgroundColor: compact
          ? "transparent"
          : theme.colors.nodes.common.container.background,
        borderColor: theme.colors.nodes.common.container.border,
        color: theme.colors.nodes.common.text.primary,
      }}
    >
      <option value="">Select...</option>
      {field.options?.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
