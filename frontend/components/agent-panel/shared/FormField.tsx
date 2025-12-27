import type { Theme } from "@/lib/themes/types";

interface FormFieldProps {
  label: string;
  theme: Theme;
  children: React.ReactNode;
  labelWidth?: string;
}

export function FormField({
  label,
  theme,
  children,
  labelWidth = "w-14",
}: FormFieldProps) {
  return (
    <div className="flex items-center gap-2">
      <label
        className={`text-xs font-medium ${labelWidth} flex-shrink-0`}
        style={{ color: theme.colors.nodes.common.text.secondary }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
