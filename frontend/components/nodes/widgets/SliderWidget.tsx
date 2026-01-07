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

  // Check if field allows null (default is null in field definition)
  const allowsNull = field.default === null;
  const isEnabled = value !== null && value !== undefined;
  const sliderValue = (value as number) ?? min;

  const handleCheckboxChange = (checked: boolean) => {
    if (checked) {
      // Enable: set to middle of range or min
      const midpoint = min + (max - min) / 2;
      const snappedValue = Math.round(midpoint / step) * step;
      onChange(snappedValue);
    } else {
      // Disable: set to null (use default)
      onChange(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {allowsNull && (
        <input
          type="checkbox"
          checked={isEnabled}
          onChange={(e) => handleCheckboxChange(e.target.checked)}
          disabled={disabled}
          className="w-3 h-3 rounded cursor-pointer"
          style={{
            accentColor: theme.colors.nodes.agent.header,
          }}
          title={
            isEnabled
              ? "Uncheck to use model default"
              : "Check to set custom value"
          }
        />
      )}
      <input
        type="range"
        value={sliderValue}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        min={min}
        max={max}
        step={step}
        disabled={disabled || (allowsNull && !isEnabled)}
        className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer disabled:opacity-40"
        style={{
          accentColor: theme.colors.nodes.agent.header,
        }}
      />
      <span
        className="text-xs w-12 text-right"
        style={{ color: theme.colors.nodes.common.text.secondary }}
      >
        {allowsNull && !isEnabled ? "Default" : sliderValue}
      </span>
    </div>
  );
}
