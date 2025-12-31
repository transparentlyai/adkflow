"use client";

import type { WidgetProps } from "@/components/nodes/widgets/WidgetRenderer";

export default function SliderWidget({
  field,
  value,
  onChange,
  options,
}: WidgetProps) {
  const { disabled, theme } = options;
  const min = field.min_value ?? 0;
  const max = field.max_value ?? 100;
  const step = field.step ?? 1;
  const sliderValue = (value as number) ?? min;

  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        value={sliderValue}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer"
        style={{
          accentColor: theme.colors.nodes.agent.header,
        }}
      />
      <span
        className="text-xs w-12 text-right"
        style={{ color: theme.colors.nodes.common.text.secondary }}
      >
        {sliderValue}
      </span>
    </div>
  );
}
