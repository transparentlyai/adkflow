"use client";

import { X } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import ResizeHandle from "@/components/ResizeHandle";
import type { LabelNodeData } from "./types";
import { FONT_FAMILIES, FONT_WEIGHTS, PRESET_COLORS } from "./types";

interface LabelNodeExpandedProps {
  data: LabelNodeData;
  size: { width: number; height: number };
  onClose: () => void;
  onUpdate: (updates: Partial<LabelNodeData>) => void;
  onResize: (deltaWidth: number, deltaHeight: number) => void;
  onResizeEnd: () => void;
}

export default function LabelNodeExpanded({
  data,
  size,
  onClose,
  onUpdate,
  onResize,
  onResizeEnd,
}: LabelNodeExpandedProps) {
  const { theme } = useTheme();
  const {
    fontFamily = "sans-serif",
    fontWeight = "normal",
    fontStyle = "normal",
    textAlign = "left",
    color = "#374151",
  } = data;

  return (
    <div
      className="rounded-lg shadow-lg border"
      style={{
        width: size.width,
        height: size.height,
        backgroundColor: theme.colors.nodes.common.container.background,
        borderColor: theme.colors.nodes.common.container.border,
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-1.5 rounded-t-lg flex items-center justify-between"
        style={{
          backgroundColor: theme.colors.nodes.label.header,
          color: theme.colors.nodes.label.text,
        }}
      >
        <span className="text-sm font-medium truncate">Label Settings</span>
        <button
          onClick={onClose}
          className="p-0.5 rounded transition-colors hover:opacity-80"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Settings */}
      <div
        className="p-3 space-y-3 overflow-y-auto nodrag"
        style={{ height: size.height - 44 }}
      >
        {/* Font Family */}
        <div className="space-y-1">
          <label
            className="text-xs font-medium"
            style={{ color: theme.colors.nodes.common.text.primary }}
          >
            Font Family
          </label>
          <select
            value={fontFamily}
            onChange={(e) => onUpdate({ fontFamily: e.target.value })}
            className="w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1"
            style={{
              borderColor: theme.colors.ui.border,
              backgroundColor: theme.colors.ui.background,
              color: theme.colors.ui.foreground,
            }}
          >
            {FONT_FAMILIES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* Font Weight & Style */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label
              className="text-xs font-medium"
              style={{ color: theme.colors.nodes.common.text.primary }}
            >
              Weight
            </label>
            <select
              value={fontWeight}
              onChange={(e) => onUpdate({ fontWeight: e.target.value })}
              className="w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1"
              style={{
                borderColor: theme.colors.ui.border,
                backgroundColor: theme.colors.ui.background,
                color: theme.colors.ui.foreground,
              }}
            >
              {FONT_WEIGHTS.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label
              className="text-xs font-medium"
              style={{ color: theme.colors.nodes.common.text.primary }}
            >
              Style
            </label>
            <select
              value={fontStyle}
              onChange={(e) => onUpdate({ fontStyle: e.target.value })}
              className="w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1"
              style={{
                borderColor: theme.colors.ui.border,
                backgroundColor: theme.colors.ui.background,
                color: theme.colors.ui.foreground,
              }}
            >
              <option value="normal">Normal</option>
              <option value="italic">Italic</option>
            </select>
          </div>
        </div>

        {/* Alignment */}
        <div className="space-y-1">
          <label
            className="text-xs font-medium"
            style={{ color: theme.colors.nodes.common.text.primary }}
          >
            Alignment
          </label>
          <div className="flex gap-1">
            {(["left", "center", "right"] as const).map((align) => (
              <button
                key={align}
                onClick={() => onUpdate({ textAlign: align })}
                className="flex-1 px-2 py-1.5 text-sm border rounded-md transition-colors"
                style={{
                  backgroundColor:
                    textAlign === align
                      ? theme.colors.nodes.label.header
                      : theme.colors.ui.background,
                  color:
                    textAlign === align
                      ? theme.colors.nodes.label.text
                      : theme.colors.ui.foreground,
                  borderColor:
                    textAlign === align
                      ? theme.colors.nodes.label.header
                      : theme.colors.ui.border,
                }}
              >
                {align.charAt(0).toUpperCase() + align.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Color */}
        <div className="space-y-1">
          <label
            className="text-xs font-medium"
            style={{ color: theme.colors.nodes.common.text.primary }}
          >
            Color
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => onUpdate({ color: c })}
                className="w-6 h-6 rounded border-2 transition-all hover:scale-105"
                style={{
                  backgroundColor: c,
                  borderColor:
                    color === c ? theme.colors.ui.foreground : "transparent",
                  transform: color === c ? "scale(1.1)" : "scale(1)",
                }}
                title={c}
              />
            ))}
          </div>
          <input
            type="color"
            value={color}
            onChange={(e) => onUpdate({ color: e.target.value })}
            className="w-full h-8 mt-1 cursor-pointer rounded border"
            style={{ borderColor: theme.colors.ui.border }}
          />
        </div>
      </div>

      <ResizeHandle onResize={onResize} onResizeEnd={onResizeEnd} />
    </div>
  );
}
