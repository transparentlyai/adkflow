"use client";

import { useCallback } from "react";
import { FolderOpen } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";
import type { WidgetProps } from "@/components/nodes/widgets/WidgetRenderer";

/**
 * File picker widget that displays a text input with a browse button.
 * Uses ProjectContext's onRequestFilePicker to open the file picker dialog.
 */
export default function FilePickerWidget({
  field,
  value,
  onChange,
  options,
}: WidgetProps) {
  const { onRequestFilePicker } = useProject();
  const filePath = (value as string) || "";
  const { disabled, theme } = options;

  const handleBrowse = useCallback(() => {
    if (!onRequestFilePicker || disabled) return;

    // Determine file extensions based on field configuration or defaults
    const extensions = field.options?.map((opt) => opt.value) || [".py", ".md", ".txt", ".json"];
    const filterLabel = field.help_text || "Select a file";

    onRequestFilePicker(
      filePath,
      (newPath) => {
        onChange(newPath);
      },
      { extensions, filterLabel }
    );
  }, [onRequestFilePicker, filePath, onChange, disabled, field.options, field.help_text]);

  return (
    <div className="flex items-center gap-1">
      <input
        type="text"
        value={filePath}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder || "Select a file..."}
        disabled={disabled}
        className="flex-1 px-2 py-1 text-xs rounded border min-w-0"
        style={{
          backgroundColor: theme.colors.nodes.common.container.background,
          borderColor: theme.colors.nodes.common.container.border,
          color: theme.colors.nodes.common.text.primary,
        }}
      />
      <button
        type="button"
        onClick={handleBrowse}
        disabled={disabled || !onRequestFilePicker}
        className="px-2 py-1 text-xs rounded border flex items-center gap-1 hover:bg-accent transition-colors disabled:opacity-50"
        style={{
          backgroundColor: theme.colors.nodes.common.footer.background,
          borderColor: theme.colors.nodes.common.container.border,
          color: theme.colors.nodes.common.text.primary,
        }}
        title="Browse for file"
      >
        <FolderOpen className="w-3 h-3" />
        <span>Browse</span>
      </button>
    </div>
  );
}
