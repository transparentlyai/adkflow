"use client";

import { FolderOpen } from "lucide-react";
import type { DynamicInputConfig } from "@/components/nodes/CustomNode";

interface FileInputConfigProps {
  input: DynamicInputConfig;
  onUpdateField: <K extends keyof DynamicInputConfig>(
    key: K,
    value: DynamicInputConfig[K],
  ) => void;
  onFileBrowse: () => void;
  isNodeLocked: boolean;
  canBrowse: boolean;
  inputStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
  theme: {
    colors: {
      nodes: {
        common: {
          container: { border: string };
          text: { primary: string };
        };
      };
    };
  };
}

export function FileInputConfig({
  input,
  onUpdateField,
  onFileBrowse,
  isNodeLocked,
  canBrowse,
  inputStyle,
  labelStyle,
  theme,
}: FileInputConfigProps) {
  return (
    <div className="flex items-center gap-1">
      <label className="text-[10px] flex-shrink-0 w-16" style={labelStyle}>
        File
      </label>
      <input
        type="text"
        value={input.filePath || ""}
        onChange={(e) => onUpdateField("filePath", e.target.value)}
        placeholder="path/to/file.txt"
        disabled={isNodeLocked}
        className="flex-1 min-w-0 px-1.5 py-0.5 rounded text-[11px] border"
        style={inputStyle}
      />
      <button
        type="button"
        onClick={onFileBrowse}
        disabled={isNodeLocked || !canBrowse}
        className="px-1.5 py-0.5 rounded border flex items-center gap-0.5 text-[10px] hover:bg-accent transition-colors disabled:opacity-50"
        style={{
          borderColor: theme.colors.nodes.common.container.border,
          color: theme.colors.nodes.common.text.primary,
        }}
      >
        <FolderOpen className="w-3 h-3" />
      </button>
    </div>
  );
}
