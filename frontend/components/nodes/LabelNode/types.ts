export interface LabelNodeData extends Record<string, unknown> {
  label: string;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: "left" | "center" | "right";
  color?: string;
  expandedSize?: { width: number; height: number };
  expandedPosition?: { x: number; y: number };
  contractedPosition?: { x: number; y: number };
  isExpanded?: boolean;
}

export const DEFAULT_FONT_SIZE = 14;
export const DEFAULT_WIDTH = 100;
export const EXPANDED_SIZE = { width: 280, height: 320 };

export const FONT_FAMILIES = [
  { value: "sans-serif", label: "Sans Serif" },
  { value: "serif", label: "Serif" },
  { value: "monospace", label: "Monospace" },
  { value: "cursive", label: "Cursive" },
];

export const FONT_WEIGHTS = [
  { value: "normal", label: "Normal" },
  { value: "bold", label: "Bold" },
  { value: "lighter", label: "Light" },
];

export const PRESET_COLORS = [
  "#374151", // gray-700
  "#1f2937", // gray-800
  "#6b7280", // gray-500
  "#dc2626", // red-600
  "#ea580c", // orange-600
  "#ca8a04", // yellow-600
  "#16a34a", // green-600
  "#0891b2", // cyan-600
  "#2563eb", // blue-600
  "#7c3aed", // violet-600
  "#c026d3", // fuchsia-600
  "#db2777", // pink-600
];

export function getDefaultLabelData(): LabelNodeData {
  return {
    label: "Label",
    fontFamily: "sans-serif",
    fontWeight: "normal",
    fontStyle: "normal",
    textAlign: "left",
    color: "#374151",
  };
}
