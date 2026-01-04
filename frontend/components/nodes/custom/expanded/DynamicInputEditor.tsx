"use client";

import { useCallback, useState } from "react";
import { Plus } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { DynamicInputRow } from "./DynamicInputRow";
import type {
  DynamicInputConfig,
  NodeAggregationMode,
} from "@/components/nodes/CustomNode";
import { createDynamicInput } from "@/components/nodes/CustomNode";

interface DynamicInputEditorProps {
  inputs: DynamicInputConfig[];
  aggregationMode: NodeAggregationMode;
  separator: string;
  outputVariableName: string;
  connectedInputs: Record<string, string[]>;
  onInputsChange: (inputs: DynamicInputConfig[]) => void;
  onAggregationModeChange: (mode: NodeAggregationMode) => void;
  onSeparatorChange: (separator: string) => void;
  onOutputVariableNameChange: (name: string) => void;
  isNodeLocked?: boolean;
  headerColor: string;
}

const AGGREGATION_MODE_OPTIONS: {
  value: NodeAggregationMode;
  label: string;
}[] = [
  { value: "pass", label: "Pass (each input → own variable)" },
  { value: "concatenate", label: "Concatenate (all → single variable)" },
];

export function DynamicInputEditor({
  inputs,
  aggregationMode,
  separator,
  outputVariableName,
  connectedInputs,
  onInputsChange,
  onAggregationModeChange,
  onSeparatorChange,
  onOutputVariableNameChange,
  isNodeLocked = false,
  headerColor,
}: DynamicInputEditorProps) {
  const { theme } = useTheme();

  // Track which input is expanded (accordion - only one at a time)
  const [expandedInputId, setExpandedInputId] = useState<string | null>(null);

  const handleAddInput = useCallback(() => {
    const newInput = createDynamicInput({
      label: `Input ${inputs.length + 1}`,
      variableName: `input_${inputs.length + 1}`,
    });
    onInputsChange([...inputs, newInput]);
    // Auto-expand newly added input
    setExpandedInputId(newInput.id);
  }, [inputs, onInputsChange]);

  const handleToggleExpand = useCallback((inputId: string) => {
    setExpandedInputId((current) => (current === inputId ? null : inputId));
  }, []);

  const handleUpdateInput = useCallback(
    (index: number, updated: DynamicInputConfig) => {
      const newInputs = [...inputs];
      newInputs[index] = updated;
      onInputsChange(newInputs);
    },
    [inputs, onInputsChange],
  );

  const handleDeleteInput = useCallback(
    (index: number) => {
      const newInputs = inputs.filter((_, i) => i !== index);
      onInputsChange(newInputs);
    },
    [inputs, onInputsChange],
  );

  const inputStyle = {
    backgroundColor: "transparent",
    borderColor: theme.colors.nodes.common.container.border,
    color: theme.colors.nodes.common.text.primary,
  };

  const labelStyle = {
    color: theme.colors.nodes.common.text.secondary,
  };

  return (
    <div className="space-y-2">
      {/* Node-level aggregation settings */}
      <div
        className="p-2 rounded border space-y-1.5"
        style={{
          borderColor: theme.colors.nodes.common.container.border,
          backgroundColor: theme.colors.nodes.common.footer.background,
        }}
      >
        <div className="flex items-center gap-1">
          <label className="text-[10px] flex-shrink-0 w-20" style={labelStyle}>
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
                style={labelStyle}
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
                style={labelStyle}
              >
                Separator
              </label>
              <input
                type="text"
                value={separator}
                onChange={(e) => onSeparatorChange(e.target.value)}
                placeholder="\n\n"
                disabled={isNodeLocked}
                className="flex-1 min-w-0 px-1.5 py-0.5 rounded text-[11px] border font-mono"
                style={inputStyle}
              />
            </div>
          </>
        )}
      </div>

      {/* Dynamic inputs section header */}
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: theme.colors.nodes.common.text.muted }}
        >
          Inputs ({inputs.length})
        </span>
        <button
          type="button"
          onClick={handleAddInput}
          disabled={isNodeLocked}
          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] border hover:bg-accent transition-colors disabled:opacity-50"
          style={{
            borderColor: theme.colors.nodes.common.container.border,
            color: theme.colors.nodes.common.text.primary,
          }}
        >
          <Plus className="w-3 h-3" />
          Add Input
        </button>
      </div>

      {/* Dynamic inputs list */}
      {inputs.length === 0 ? (
        <div
          className="text-center py-4 text-[11px] border-2 border-dashed rounded"
          style={{
            borderColor: theme.colors.nodes.common.container.border,
            color: theme.colors.nodes.common.text.muted,
          }}
        >
          No inputs configured. Click &quot;Add Input&quot; to add one.
        </div>
      ) : (
        <div className="space-y-1">
          {inputs.map((input, index) => (
            <DynamicInputRow
              key={input.id}
              input={input}
              onUpdate={(updated) => handleUpdateInput(index, updated)}
              onDelete={() => handleDeleteInput(index)}
              isConnected={
                input.inputType === "node" &&
                connectedInputs[input.id]?.length > 0
              }
              connectedSourceName={connectedInputs[input.id]?.[0]}
              isNodeLocked={isNodeLocked}
              headerColor={headerColor}
              isExpanded={expandedInputId === input.id}
              onToggleExpand={() => handleToggleExpand(input.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
