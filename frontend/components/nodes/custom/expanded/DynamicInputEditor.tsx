"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, File, Folder, Globe, Cable } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { DynamicInputRow } from "./DynamicInputRow";
import type {
  DynamicInputConfig,
  DynamicInputType,
  NodeAggregationMode,
  FieldDefinition,
} from "@/components/nodes/CustomNode";
import { createDynamicInput } from "@/components/nodes/CustomNode";

const INPUT_TYPE_OPTIONS: {
  value: DynamicInputType;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: "file", label: "File", icon: <File className="w-3 h-3" /> },
  {
    value: "directory",
    label: "Directory",
    icon: <Folder className="w-3 h-3" />,
  },
  { value: "url", label: "URL", icon: <Globe className="w-3 h-3" /> },
  { value: "node", label: "Node Input", icon: <Cable className="w-3 h-3" /> },
];

interface DynamicInputEditorProps {
  inputs: DynamicInputConfig[];
  aggregationMode: NodeAggregationMode;
  separator: string;
  outputVariableName: string;
  includeMetadata: boolean;
  connectedInputs: Record<string, string[]>;
  schemaFields?: FieldDefinition[];
  onInputsChange: (inputs: DynamicInputConfig[]) => void;
  onAggregationModeChange: (mode: NodeAggregationMode) => void;
  onSeparatorChange: (separator: string) => void;
  onOutputVariableNameChange: (name: string) => void;
  onIncludeMetadataChange: (include: boolean) => void;
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
  includeMetadata,
  connectedInputs,
  schemaFields,
  onInputsChange,
  onAggregationModeChange,
  onSeparatorChange,
  onOutputVariableNameChange,
  onIncludeMetadataChange,
  isNodeLocked = false,
  headerColor,
}: DynamicInputEditorProps) {
  const { theme } = useTheme();

  // Track which input is expanded (accordion - only one at a time)
  const [expandedInputId, setExpandedInputId] = useState<string | null>(null);
  // Track add input dropdown state
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        addMenuRef.current &&
        !addMenuRef.current.contains(e.target as Node)
      ) {
        setIsAddMenuOpen(false);
      }
    };
    if (isAddMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isAddMenuOpen]);

  // Helper to get help_text from schema fields
  const getHelpText = useMemo(() => {
    const fieldMap = new Map(schemaFields?.map((f) => [f.id, f.help_text]));
    return (fieldId: string, fallback?: string) =>
      fieldMap.get(fieldId) || fallback;
  }, [schemaFields]);

  // Default separators for metadata toggle
  const DEFAULT_SEPARATOR = "\\n\\n---";
  const METADATA_SEPARATOR = "\\n--- {source_name} ---\\n";

  // Track previous metadata state to detect actual changes
  const prevIncludeMetadataRef = useRef(includeMetadata);

  // Sync separator when metadata toggle changes (runs AFTER state is updated)
  useEffect(() => {
    const prevIncludeMetadata = prevIncludeMetadataRef.current;
    prevIncludeMetadataRef.current = includeMetadata;

    // Only update separator when metadata toggle actually changed
    if (prevIncludeMetadata !== includeMetadata) {
      if (
        includeMetadata &&
        (separator === DEFAULT_SEPARATOR || separator === "")
      ) {
        onSeparatorChange(METADATA_SEPARATOR);
      } else if (!includeMetadata && separator === METADATA_SEPARATOR) {
        onSeparatorChange(DEFAULT_SEPARATOR);
      }
    }
  }, [includeMetadata, separator, onSeparatorChange]);

  // Count existing inputs by type to generate unique numbers
  const getNextNumber = useCallback(
    (type: DynamicInputType) => {
      const count = inputs.filter((i) => i.inputType === type).length;
      return count + 1;
    },
    [inputs],
  );

  const handleAddInput = useCallback(
    (type: DynamicInputType) => {
      const num = getNextNumber(type);
      const typeLabels: Record<DynamicInputType, string> = {
        file: "File",
        directory: "Directory",
        url: "URL",
        node: "Node",
      };
      const newInput = createDynamicInput({
        inputType: type,
        label: `${typeLabels[type]} ${num}`,
        variableName: `${type}_${num}`,
      });
      onInputsChange([...inputs, newInput]);
      setExpandedInputId(newInput.id);
      setIsAddMenuOpen(false);
    },
    [inputs, onInputsChange, getNextNumber],
  );

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
    <div className="space-y-2" style={{ overflow: "visible" }}>
      {/* Node-level aggregation settings */}
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
                  cursor: getHelpText("outputVariableName")
                    ? "help"
                    : undefined,
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

      {/* Dynamic inputs section header */}
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: theme.colors.nodes.common.text.muted }}
        >
          Inputs ({inputs.length})
        </span>
        <div className="relative" ref={addMenuRef}>
          <button
            type="button"
            onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
            disabled={isNodeLocked}
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] border hover:bg-accent transition-colors disabled:opacity-50"
            style={{
              borderColor: theme.colors.nodes.common.container.border,
              color: theme.colors.nodes.common.text.primary,
            }}
          >
            Add Input
            <ChevronDown className="w-3 h-3" />
          </button>
          {isAddMenuOpen && (
            <div
              className="absolute right-0 top-full mt-1 py-1 rounded border shadow-lg z-50 min-w-[120px]"
              style={{
                backgroundColor: theme.colors.nodes.common.container.background,
                borderColor: theme.colors.nodes.common.container.border,
              }}
            >
              {INPUT_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleAddInput(opt.value)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-left hover:bg-accent transition-colors"
                  style={{ color: theme.colors.nodes.common.text.primary }}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
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
        <div
          className="space-y-1"
          style={{ paddingLeft: 8, overflow: "visible" }}
        >
          {inputs.map((input, index) => (
            <DynamicInputRow
              key={input.id}
              input={input}
              onUpdate={(updated) => handleUpdateInput(index, updated)}
              onDelete={() => handleDeleteInput(index)}
              isConnected={connectedInputs[input.id]?.length > 0}
              connectedSourceName={connectedInputs[input.id]?.[0]}
              isNodeLocked={isNodeLocked}
              headerColor={headerColor}
              isExpanded={expandedInputId === input.id}
              onToggleExpand={() => handleToggleExpand(input.id)}
              includeMetadata={includeMetadata}
            />
          ))}
        </div>
      )}
    </div>
  );
}
