"use client";

import { useCallback } from "react";
import {
  Trash2,
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  Globe,
  Cable,
} from "lucide-react";
import { Handle, Position } from "@xyflow/react";
import { useTheme } from "@/contexts/ThemeContext";
import { useProject } from "@/contexts/ProjectContext";
import type {
  DynamicInputConfig,
  DynamicInputType,
} from "@/components/nodes/CustomNode";
import {
  FileInputConfig,
  DirectoryInputConfig,
  UrlInputConfig,
  NodeInputConfig,
} from "./inputs";

interface DynamicInputRowProps {
  input: DynamicInputConfig;
  onUpdate: (updated: DynamicInputConfig) => void;
  onDelete: () => void;
  isConnected?: boolean;
  connectedSourceName?: string;
  isNodeLocked?: boolean;
  headerColor: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  includeMetadata?: boolean;
}

const INPUT_TYPE_ICONS: Record<DynamicInputType, React.ReactNode> = {
  file: <File className="w-3 h-3" />,
  directory: <Folder className="w-3 h-3" />,
  url: <Globe className="w-3 h-3" />,
  node: <Cable className="w-3 h-3" />,
};

export function DynamicInputRow({
  input,
  onUpdate,
  onDelete,
  isConnected = false,
  connectedSourceName,
  isNodeLocked = false,
  headerColor,
  isExpanded = false,
  onToggleExpand,
  includeMetadata = false,
}: DynamicInputRowProps) {
  const { theme } = useTheme();
  const { onRequestFilePicker } = useProject();

  const updateField = useCallback(
    <K extends keyof DynamicInputConfig>(
      key: K,
      value: DynamicInputConfig[K],
    ) => {
      onUpdate({ ...input, [key]: value });
    },
    [input, onUpdate],
  );

  const handleFileBrowse = useCallback(() => {
    if (!onRequestFilePicker || isNodeLocked) return;
    onRequestFilePicker(
      input.filePath || "",
      (path) => updateField("filePath", path),
      { extensions: ["*"], filterLabel: "Select a file" },
    );
  }, [onRequestFilePicker, input.filePath, updateField, isNodeLocked]);

  const handleDirBrowse = useCallback(() => {
    if (!onRequestFilePicker || isNodeLocked) return;
    onRequestFilePicker(
      input.directoryPath || "",
      (path) => updateField("directoryPath", path),
      {
        extensions: [],
        filterLabel: "Select a directory",
        selectDirectory: true,
      },
    );
  }, [onRequestFilePicker, input.directoryPath, updateField, isNodeLocked]);

  const inputStyle = {
    backgroundColor: "transparent",
    borderColor: theme.colors.nodes.common.container.border,
    color: theme.colors.nodes.common.text.primary,
  };

  const labelStyle = {
    color: theme.colors.nodes.common.text.secondary,
  };

  const getCollapsedSummary = () => {
    switch (input.inputType) {
      case "file":
        return input.filePath || "No file selected";
      case "directory":
        return input.directoryPath
          ? `${input.directoryPath} (${input.globPattern || "*"})`
          : "No directory selected";
      case "url":
        return input.url || "No URL specified";
      case "node":
        return isConnected ? `→ ${connectedSourceName}` : "Not connected";
    }
  };

  return (
    <div
      className="relative border rounded-md"
      style={{
        borderColor: isExpanded
          ? headerColor
          : theme.colors.nodes.common.container.border,
        backgroundColor: isExpanded
          ? theme.colors.nodes.common.footer.background
          : theme.colors.nodes.common.container.background,
        overflow: "visible",
      }}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        id={input.id}
        style={{
          position: "absolute",
          left: -5,
          top: 14,
          transform: "translateY(-50%)",
          transition: "box-shadow 0.15s ease",
          width: 10,
          height: 10,
          border: `2px solid ${theme.colors.handles.border}`,
          backgroundColor: isConnected
            ? headerColor
            : theme.colors.handles.input,
        }}
      />

      {/* Collapsed header */}
      <div
        className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer hover:bg-accent/30 transition-colors"
        onClick={onToggleExpand}
      >
        {isExpanded ? (
          <ChevronDown
            className="w-3 h-3 flex-shrink-0"
            style={{ color: theme.colors.nodes.common.text.muted }}
          />
        ) : (
          <ChevronRight
            className="w-3 h-3 flex-shrink-0"
            style={{ color: theme.colors.nodes.common.text.muted }}
          />
        )}
        <span
          className="flex-shrink-0"
          style={{ color: theme.colors.nodes.common.text.secondary }}
        >
          {INPUT_TYPE_ICONS[input.inputType]}
        </span>
        <span
          className="text-[11px] font-medium truncate flex-shrink-0 max-w-[80px]"
          style={{ color: theme.colors.nodes.common.text.primary }}
        >
          {input.label}
        </span>
        <span
          className="text-[10px] truncate flex-1 min-w-0"
          style={{ color: theme.colors.nodes.common.text.muted }}
        >
          {getCollapsedSummary()}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          disabled={isNodeLocked}
          className="p-0.5 rounded hover:bg-red-500/20 transition-colors disabled:opacity-50 flex-shrink-0"
          title="Delete input"
        >
          <Trash2
            className="w-3 h-3"
            style={{ color: theme.colors.nodes.common.text.muted }}
          />
        </button>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div
          className="px-2 pb-2 pt-1 space-y-1.5 border-t"
          style={{ borderColor: theme.colors.nodes.common.container.border }}
        >
          {/* Label input */}
          <div className="flex items-center gap-1">
            <label
              className="text-[10px] flex-shrink-0 w-16"
              style={labelStyle}
            >
              Label
            </label>
            <input
              type="text"
              value={input.label}
              onChange={(e) => updateField("label", e.target.value)}
              placeholder="Label"
              disabled={isNodeLocked}
              className="flex-1 min-w-0 px-1.5 py-0.5 rounded text-[11px] border"
              style={inputStyle}
            />
          </div>

          {/* Variable name */}
          <div className="flex items-center gap-1">
            <label
              className="text-[10px] flex-shrink-0 w-16"
              style={labelStyle}
            >
              Variable
            </label>
            <input
              type="text"
              value={input.variableName}
              onChange={(e) => updateField("variableName", e.target.value)}
              placeholder="variable_name"
              disabled={isNodeLocked}
              className="flex-1 min-w-0 px-1.5 py-0.5 rounded text-[11px] border font-mono"
              style={inputStyle}
            />
          </div>

          {/* Type-specific configuration */}
          {input.inputType === "file" && (
            <FileInputConfig
              input={input}
              onUpdateField={updateField}
              onFileBrowse={handleFileBrowse}
              isNodeLocked={isNodeLocked}
              canBrowse={!!onRequestFilePicker}
              inputStyle={inputStyle}
              labelStyle={labelStyle}
              theme={theme}
            />
          )}

          {input.inputType === "directory" && (
            <DirectoryInputConfig
              input={input}
              onUpdateField={updateField}
              onDirBrowse={handleDirBrowse}
              isNodeLocked={isNodeLocked}
              canBrowse={!!onRequestFilePicker}
              includeMetadata={includeMetadata}
              inputStyle={inputStyle}
              labelStyle={labelStyle}
              theme={theme}
            />
          )}

          {input.inputType === "url" && (
            <UrlInputConfig
              input={input}
              onUpdateField={updateField}
              isNodeLocked={isNodeLocked}
              inputStyle={inputStyle}
              labelStyle={labelStyle}
            />
          )}

          {input.inputType === "node" && (
            <NodeInputConfig
              isConnected={isConnected}
              connectedSourceName={connectedSourceName}
              labelStyle={labelStyle}
              theme={theme}
            />
          )}
        </div>
      )}
    </div>
  );
}
