"use client";

import { useTheme } from "@/contexts/ThemeContext";
import type { DynamicInputConfig } from "@/components/nodes/CustomNode/types/dynamicInputs";
import { PREVIEW_DISPLAY_HINTS } from "@/components/nodes/CustomNode/types/dynamicInputs";

/**
 * Format a value for display based on its type.
 */
function formatValue(value: unknown, displayAs?: string): string {
  if (value === undefined || value === null) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    if (value.length === 0) return "None";
    return value.join(", ");
  }
  if (typeof value === "number") {
    if (displayAs === "number" && value > 1024) {
      // Format as size if it looks like bytes
      if (value >= 1024 * 1024) {
        return `${(value / (1024 * 1024)).toFixed(1)} MB`;
      }
      return `${(value / 1024).toFixed(1)} KB`;
    }
    return value.toString();
  }
  return String(value);
}

interface GenericPropertyDisplayProps {
  /** The input configuration to display */
  input: DynamicInputConfig;
}

/**
 * GenericPropertyDisplay renders all properties of a DynamicInputConfig.
 *
 * This is a schema-driven component that automatically displays all properties
 * of an input configuration. It uses PREVIEW_DISPLAY_HINTS to customize labels
 * and formatting, and automatically handles new properties without code changes.
 *
 * Properties marked as hidden in PREVIEW_DISPLAY_HINTS are not displayed.
 * Unknown properties are displayed with their key as the label.
 */
export function GenericPropertyDisplay({ input }: GenericPropertyDisplayProps) {
  const { theme } = useTheme();

  // Get all keys from the input, filtering out hidden ones and undefined values
  const displayableKeys = Object.keys(input).filter((key) => {
    const hint = PREVIEW_DISPLAY_HINTS[key];
    if (hint?.hidden) return false;
    const value = input[key as keyof DynamicInputConfig];
    return value !== undefined && value !== null && value !== "";
  });

  if (displayableKeys.length === 0) {
    return (
      <div
        className="text-sm"
        style={{ color: theme.colors.nodes.common.text.muted }}
      >
        No properties to display
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{
        borderColor: theme.colors.nodes.common.container.border,
        backgroundColor: theme.colors.nodes.common.container.background,
      }}
    >
      <table className="w-full text-xs">
        <tbody>
          {displayableKeys.map((key) => {
            const hint = PREVIEW_DISPLAY_HINTS[key];
            const label = hint?.label || key.replace(/([A-Z])/g, " $1").trim();
            const value = input[key as keyof DynamicInputConfig];
            const formattedValue = formatValue(value, hint?.displayAs);

            return (
              <tr
                key={key}
                className="border-b last:border-b-0"
                style={{
                  borderColor: theme.colors.nodes.common.container.border,
                }}
              >
                <td
                  className="px-3 py-1.5 font-medium whitespace-nowrap"
                  style={{
                    color: theme.colors.nodes.common.text.secondary,
                    backgroundColor:
                      theme.colors.nodes.common.footer.background,
                    width: "30%",
                  }}
                >
                  {label}
                </td>
                <td
                  className={`px-3 py-1.5 ${
                    hint?.displayAs === "code" || hint?.displayAs === "path"
                      ? "font-mono"
                      : ""
                  }`}
                  style={{ color: theme.colors.nodes.common.text.primary }}
                >
                  {formattedValue}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
