"use client";

import type { WidgetProps } from "@/components/nodes/widgets/WidgetRenderer";

export default function RadioGroupWidget({
  field,
  value,
  onChange,
  options,
}: WidgetProps) {
  const { disabled, theme } = options;
  const selectedValue = (value as string) ?? "";

  return (
    <div className="flex flex-col gap-1.5">
      {field.options?.map((opt) => (
        <label
          key={opt.value}
          className="flex items-center gap-2 cursor-pointer"
          style={{
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? "not-allowed" : "pointer",
          }}
        >
          <input
            type="radio"
            name={field.id}
            value={opt.value}
            checked={selectedValue === opt.value}
            onChange={() => onChange(opt.value)}
            disabled={disabled}
            className="w-4 h-4"
            style={{
              accentColor: theme.colors.nodes.agent.header,
            }}
          />
          <span
            className="text-xs"
            style={{ color: theme.colors.nodes.common.text.primary }}
          >
            {opt.label}
          </span>
        </label>
      ))}
    </div>
  );
}
