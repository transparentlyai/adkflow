"use client";

import type { WidgetProps } from "@/components/nodes/widgets/WidgetRenderer";

export default function TextAreaWidget({
  field,
  value,
  onChange,
  options,
}: WidgetProps) {
  const { disabled, theme, compact } = options;
  const defaultRows = compact ? 2 : 3;
  const rows = field.rows ?? defaultRows;

  return (
    <textarea
      value={(value as string) ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      disabled={disabled}
      rows={rows}
      className={
        compact
          ? "w-full px-1.5 py-1 rounded text-[11px] border resize-none"
          : "w-full px-2 py-1.5 rounded text-xs border resize-none"
      }
      style={{
        backgroundColor: compact
          ? "transparent"
          : theme.colors.nodes.common.container.background,
        borderColor: theme.colors.nodes.common.container.border,
        color: theme.colors.nodes.common.text.primary,
      }}
    />
  );
}
