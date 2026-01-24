"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useProject } from "@/contexts/ProjectContext";
import { DynamicInputRow } from "./DynamicInputRow";
import { ContextPreviewPanel } from "./preview";
import { AggregationSettingsPanel } from "./AggregationSettingsPanel";
import { InputListHeader } from "./InputListHeader";
import type {
  DynamicInputConfig,
  DynamicInputType,
  NodeAggregationMode,
  FieldDefinition,
} from "@/components/nodes/CustomNode";
import { createDynamicInput } from "@/components/nodes/CustomNode";

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
  const { projectPath } = useProject();

  // Track which input is expanded (accordion - only one at a time)
  const [expandedInputId, setExpandedInputId] = useState<string | null>(null);
  // Track preview panel state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

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

  return (
    <div className="space-y-2" style={{ overflow: "visible" }}>
      {/* Node-level aggregation settings */}
      <AggregationSettingsPanel
        aggregationMode={aggregationMode}
        separator={separator}
        outputVariableName={outputVariableName}
        includeMetadata={includeMetadata}
        isNodeLocked={isNodeLocked}
        onAggregationModeChange={onAggregationModeChange}
        onSeparatorChange={onSeparatorChange}
        onOutputVariableNameChange={onOutputVariableNameChange}
        onIncludeMetadataChange={onIncludeMetadataChange}
        getHelpText={getHelpText}
      />

      {/* Dynamic inputs section header */}
      <InputListHeader
        inputCount={inputs.length}
        isNodeLocked={isNodeLocked}
        canPreview={!isNodeLocked && inputs.length > 0 && !!projectPath}
        onPreviewClick={() => setIsPreviewOpen(true)}
        onAddInput={handleAddInput}
      />

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

      {/* Preview Panel */}
      {projectPath && (
        <ContextPreviewPanel
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          inputs={inputs}
          aggregationMode={aggregationMode}
          separator={separator}
          outputVariableName={outputVariableName}
          includeMetadata={includeMetadata}
          projectPath={projectPath}
          connectedInputs={connectedInputs}
        />
      )}
    </div>
  );
}
