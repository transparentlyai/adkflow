"use client";

import { useTheme } from "@/contexts/ThemeContext";
import type { NodeAggregationMode } from "@/components/nodes/CustomNode";

const AGGREGATION_MODE_OPTIONS: {
  value: NodeAggregationMode;
  label: string;
}[] = [
  { value: "pass", label: "Pass (each input → own variable)" },
  { value: "concatenate", label: "Concatenate (all → single variable)" },
];

interface AggregationSettingsPanelProps {
  aggregationMode: NodeAggregationMode;
  separator: string;
  outputVariableName: string;
  includeMetadata: boolean;
  isNodeLocked: boolean;
  onAggregationModeChange: (mode: NodeAggregationMode) => void;
  onSeparatorChange: (separator: string) => void;
  onOutputVariableNameChange: (name: string) => void;
  onIncludeMetadataChange: (include: boolean) => void;
  getHelpText: (fieldId: string, fallback?: string) => string | undefined;
}

export function AggregationSettingsPanel({
  aggregationMode,
  separator,
  outputVariableName,
  includeMetadata,
  isNodeLocked,
  onAggregationModeChange,
  onSeparatorChange,
  onOutputVariableNameChange,
  onIncludeMetadataChange,
  getHelpText,
}: AggregationSettingsPanelProps) {
  const { theme } = useTheme();

  const inputStyle = {
    backgroundColor: "transparent",
    borderColor: theme.colors.nodes.common.container.border,
    color: theme.colors.nodes.common.text.primary,
  };

  const labelStyle = {
    color: theme.colors.nodes.common.text.secondary,
  };

  return (
    <div
      className="p-2 rounded border space-y-1.5"
      style={{
        borderColor: theme.colors.nodes.common.container.border,
        backgroundColor: theme.colors.nodes.common.footer.background,
      }}
    >
      <div className="flex items-center gap-1">
        <label
          className="text-[10px] flex-shrink-0 w-20"
          style={{
            ...labelStyle,
            cursor: getHelpText("aggregationMode") ? "help" : undefined,
          }}
          title={getHelpText("aggregationMode")}
        >
          Aggregation
        </label>
        <select
          value={aggregationMode}
          onChange={(e) =>
            onAggregationModeChange(e.target.value as NodeAggregationMode)
          }
          disabled={isNodeLocked}
          className="flex-1 px-1.5 py-0.5 rounded text-[11px] border bg-transparent"
          style={inputStyle}
        >
          {AGGREGATION_MODE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {aggregationMode === "concatenate" && (
        <>
          <div className="flex items-center gap-1">
            <label
              className="text-[10px] flex-shrink-0 w-20"
              style={{
                ...labelStyle,
                cursor: getHelpText("outputVariableName") ? "help" : undefined,
              }}
              title={getHelpText("outputVariableName")}
            >
              Output Variable
            </label>
            <input
              type="text"
              value={outputVariableName}
              onChange={(e) => onOutputVariableNameChange(e.target.value)}
              placeholder="context"
              disabled={isNodeLocked}
              className="flex-1 min-w-0 px-1.5 py-0.5 rounded text-[11px] border font-mono"
              style={inputStyle}
            />
          </div>
          <div className="flex items-center gap-1">
            <label
              className="text-[10px] flex-shrink-0 w-20"
              style={{
                ...labelStyle,
                cursor: "help",
              }}
              title={
                includeMetadata
                  ? "Available variables: {source_path} {source_name} {file_ext} {file_size} {modified_time}"
                  : getHelpText("separator")
              }
            >
              Separator
            </label>
            <input
              type="text"
              value={separator}
              onChange={(e) => onSeparatorChange(e.target.value)}
              placeholder={
                includeMetadata ? "\\n--- {source_name} ---\\n" : "\\n\\n---"
              }
              disabled={isNodeLocked}
              className="flex-1 min-w-0 px-1.5 py-0.5 rounded text-[11px] border font-mono"
              style={inputStyle}
            />
          </div>
        </>
      )}

      <div className="flex items-center gap-1">
        <label
          className="text-[10px] flex-shrink-0 w-20"
          style={{
            ...labelStyle,
            cursor: getHelpText("includeMetadata") ? "help" : undefined,
          }}
          title={getHelpText("includeMetadata")}
        >
          Metadata
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={includeMetadata}
            onChange={(e) => onIncludeMetadataChange(e.target.checked)}
            disabled={isNodeLocked}
            className="rounded w-3 h-3"
            style={{
              borderColor: theme.colors.nodes.common.container.border,
            }}
          />
          <span className="text-[10px]" style={labelStyle}>
            Include source metadata
          </span>
        </label>
      </div>
    </div>
  );
}
