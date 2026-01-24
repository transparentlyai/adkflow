/**
 * FieldRenderer - Renders a configuration field with its widget
 */

import React from "react";
import { Info } from "lucide-react";
import type { Theme } from "@/lib/themes/types";
import MonacoEditorWidget from "@/components/nodes/widgets/MonacoEditorWidget";
import { renderWidget } from "@/components/nodes/widgets/WidgetRenderer";
import type { FieldDefinition } from "@/components/nodes/CustomNode";

interface FieldRendererProps {
  field: FieldDefinition;
  config: Record<string, unknown>;
  connectedInputs: Record<string, string[]>;
  theme: Theme;
  labelWidth?: number;
  isNodeLocked?: boolean;
  expandedHeight?: number;
  filePath?: string;
  onSave?: () => Promise<void>;
  onChangeFile?: () => void;
  isSaving?: boolean;
  isDirty?: boolean;
  onConfigChange: (fieldId: string, value: unknown) => void;
}

export function FieldRenderer({
  field,
  config,
  connectedInputs,
  theme,
  labelWidth,
  isNodeLocked = false,
  expandedHeight,
  filePath,
  onSave,
  onChangeFile,
  isSaving = false,
  isDirty = false,
  onConfigChange,
}: FieldRendererProps) {
  // Check if this field has a corresponding connected input (e.g., callback handles)
  const connectedSources = connectedInputs[field.id];
  const isOverridden = connectedSources && connectedSources.length > 0;

  if (field.widget === "code_editor" || field.widget === "monaco_editor") {
    const editorHeight = expandedHeight ? expandedHeight - 150 : 200;

    return (
      <div key={field.id} className="space-y-1">
        <MonacoEditorWidget
          value={
            (config[field.id] as string) ?? (field.default as string) ?? ""
          }
          onChange={(value) => onConfigChange(field.id, value)}
          language={field.language || "python"}
          readOnly={isNodeLocked}
          height={Math.max(150, editorHeight)}
          showMenuBar={!!onSave && !!filePath}
          filePath={filePath}
          onSave={onSave}
          onChangeFile={onChangeFile}
          isDirty={isDirty}
          isSaving={isSaving}
          hideGutter={field.hide_gutter}
        />
      </div>
    );
  }

  // KeyValueList widget renders full-width without label row (has its own header)
  if (field.widget === "keyValueList" || field.widget === "key_value_list") {
    return (
      <div key={field.id}>
        {renderWidget(
          field,
          config[field.id] ?? field.default,
          (value) => onConfigChange(field.id, value),
          { disabled: isNodeLocked, theme, compact: true },
        )}
      </div>
    );
  }

  // If field is overridden by a connected node, show indicator
  if (isOverridden) {
    return (
      <div key={field.id} className="flex items-center gap-1">
        <label
          className="text-[10px] font-medium flex-shrink-0"
          style={{
            color: theme.colors.nodes.common.text.muted,
            minWidth: labelWidth ? `${labelWidth}ch` : undefined,
          }}
        >
          {field.label}
        </label>
        <div
          className="flex-1 min-w-0 flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[11px]"
          style={{
            backgroundColor: `${theme.colors.nodes.common.container.border}40`,
            color: theme.colors.nodes.common.text.muted,
          }}
          title={`Overridden by connected node: ${connectedSources.join(", ")}`}
        >
          <Info className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">
            Connected: {connectedSources.join(", ")}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div key={field.id} className="flex items-center gap-1">
      <label
        className="text-[10px] font-medium flex-shrink-0"
        style={{
          color: theme.colors.nodes.common.text.secondary,
          minWidth: labelWidth ? `${labelWidth}ch` : undefined,
          cursor: field.help_text ? "help" : undefined,
        }}
        title={field.help_text}
      >
        {field.label}
        {field.required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="flex-1 min-w-0">
        {renderWidget(
          field,
          config[field.id] ?? field.default,
          (value) => onConfigChange(field.id, value),
          { disabled: isNodeLocked, theme, compact: true },
        )}
      </div>
    </div>
  );
}
