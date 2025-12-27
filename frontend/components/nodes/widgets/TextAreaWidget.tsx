"use client";

import type { WidgetProps } from "@/components/nodes/widgets/WidgetRenderer";

export default function TextAreaWidget({ field, value, onChange, options }: WidgetProps) {
  const { disabled, theme } = options;

  return (
    <textarea
      value={(value as string) ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      disabled={disabled}
      rows={3}
      className="w-full px-2 py-1.5 rounded text-xs border resize-none"
      style={{
        backgroundColor: theme.colors.nodes.common.container.background,
        borderColor: theme.colors.nodes.common.container.border,
        color: theme.colors.nodes.common.text.primary,
      }}
    />
  );
}
