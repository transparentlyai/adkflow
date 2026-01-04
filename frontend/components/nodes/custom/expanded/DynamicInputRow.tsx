"use client";

import { useCallback } from "react";
import {
  FolderOpen,
  Link2,
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
  DirectoryAggregationMode,
  NamingPatternType,
} from "@/components/nodes/CustomNode";

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
}

const INPUT_TYPE_ICONS: Record<DynamicInputType, React.ReactNode> = {
  file: <File className="w-3 h-3" />,
  directory: <Folder className="w-3 h-3" />,
  url: <Globe className="w-3 h-3" />,
  node: <Cable className="w-3 h-3" />,
};

const INPUT_TYPE_OPTIONS: { value: DynamicInputType; label: string }[] = [
  { value: "file", label: "File" },
  { value: "directory", label: "Directory" },
  { value: "url", label: "URL" },
  { value: "node", label: "Node Input" },
];

const DIR_AGGREGATION_OPTIONS: {
  value: DirectoryAggregationMode;
  label: string;
}[] = [
  { value: "concatenate", label: "Concatenate" },
  { value: "pass", label: "Pass (separate vars)" },
];

const NAMING_PATTERN_OPTIONS: { value: NamingPatternType; label: string }[] = [
  { value: "file_name", label: "{base}_{file_name}" },
  { value: "number", label: "{base}_{number}" },
  { value: "custom", label: "Custom pattern" },
];

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

  // Get a short summary for collapsed state
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
      {/* Input handle - visible for all input types */}
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

      {/* Collapsed header - always visible, clickable to expand */}
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
          {/* Header row: label input, type selector */}
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

          <div className="flex items-center gap-1">
            <label
              className="text-[10px] flex-shrink-0 w-16"
              style={labelStyle}
            >
              Type
            </label>
            <select
              value={input.inputType}
              onChange={(e) =>
                updateField("inputType", e.target.value as DynamicInputType)
              }
              disabled={isNodeLocked}
              className="flex-1 px-1.5 py-0.5 rounded text-[11px] border bg-transparent"
              style={inputStyle}
            >
              {INPUT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Variable name row */}
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
            <div className="flex items-center gap-1">
              <label
                className="text-[10px] flex-shrink-0 w-16"
                style={labelStyle}
              >
                File
              </label>
              <input
                type="text"
                value={input.filePath || ""}
                onChange={(e) => updateField("filePath", e.target.value)}
                placeholder="path/to/file.txt"
                disabled={isNodeLocked}
                className="flex-1 min-w-0 px-1.5 py-0.5 rounded text-[11px] border"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={handleFileBrowse}
                disabled={isNodeLocked || !onRequestFilePicker}
                className="px-1.5 py-0.5 rounded border flex items-center gap-0.5 text-[10px] hover:bg-accent transition-colors disabled:opacity-50"
                style={{
                  borderColor: theme.colors.nodes.common.container.border,
                  color: theme.colors.nodes.common.text.primary,
                }}
              >
                <FolderOpen className="w-3 h-3" />
              </button>
            </div>
          )}

          {input.inputType === "directory" && (
            <>
              <div className="flex items-center gap-1">
                <label
                  className="text-[10px] flex-shrink-0 w-16"
                  style={labelStyle}
                >
                  Directory
                </label>
                <input
                  type="text"
                  value={input.directoryPath || ""}
                  onChange={(e) => updateField("directoryPath", e.target.value)}
                  placeholder="path/to/directory"
                  disabled={isNodeLocked}
                  className="flex-1 min-w-0 px-1.5 py-0.5 rounded text-[11px] border"
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={handleDirBrowse}
                  disabled={isNodeLocked || !onRequestFilePicker}
                  className="px-1.5 py-0.5 rounded border flex items-center gap-0.5 text-[10px] hover:bg-accent transition-colors disabled:opacity-50"
                  style={{
                    borderColor: theme.colors.nodes.common.container.border,
                    color: theme.colors.nodes.common.text.primary,
                  }}
                >
                  <FolderOpen className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-center gap-1">
                <label
                  className="text-[10px] flex-shrink-0 w-16"
                  style={labelStyle}
                >
                  Glob
                </label>
                <input
                  type="text"
                  value={input.globPattern || "*"}
                  onChange={(e) => updateField("globPattern", e.target.value)}
                  placeholder="**/*.md"
                  disabled={isNodeLocked}
                  className="flex-1 min-w-0 px-1.5 py-0.5 rounded text-[11px] border font-mono"
                  style={inputStyle}
                />
              </div>
              <div className="flex items-center gap-1">
                <label
                  className="text-[10px] flex-shrink-0 w-16"
                  style={labelStyle}
                >
                  Aggregation
                </label>
                <select
                  value={input.directoryAggregation || "concatenate"}
                  onChange={(e) =>
                    updateField(
                      "directoryAggregation",
                      e.target.value as DirectoryAggregationMode,
                    )
                  }
                  disabled={isNodeLocked}
                  className="flex-1 px-1.5 py-0.5 rounded text-[11px] border bg-transparent"
                  style={inputStyle}
                >
                  {DIR_AGGREGATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              {input.directoryAggregation === "concatenate" && (
                <div className="flex items-center gap-1">
                  <label
                    className="text-[10px] flex-shrink-0 w-16"
                    style={labelStyle}
                  >
                    Separator
                  </label>
                  <input
                    type="text"
                    value={input.directorySeparator || "\\n\\n"}
                    onChange={(e) =>
                      updateField("directorySeparator", e.target.value)
                    }
                    placeholder="\n\n"
                    disabled={isNodeLocked}
                    className="flex-1 min-w-0 px-1.5 py-0.5 rounded text-[11px] border font-mono"
                    style={inputStyle}
                  />
                </div>
              )}
              {input.directoryAggregation === "pass" && (
                <>
                  <div className="flex items-center gap-1">
                    <label
                      className="text-[10px] flex-shrink-0 w-16"
                      style={labelStyle}
                    >
                      Naming
                    </label>
                    <select
                      value={input.namingPattern || "file_name"}
                      onChange={(e) =>
                        updateField(
                          "namingPattern",
                          e.target.value as NamingPatternType,
                        )
                      }
                      disabled={isNodeLocked}
                      className="flex-1 px-1.5 py-0.5 rounded text-[11px] border bg-transparent"
                      style={inputStyle}
                    >
                      {NAMING_PATTERN_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {input.namingPattern === "custom" && (
                    <div className="flex items-center gap-1">
                      <label
                        className="text-[10px] flex-shrink-0 w-16"
                        style={labelStyle}
                      >
                        Pattern
                      </label>
                      <input
                        type="text"
                        value={input.customPattern || "{base}_{file_name}"}
                        onChange={(e) =>
                          updateField("customPattern", e.target.value)
                        }
                        placeholder="{base}_{file_name}"
                        disabled={isNodeLocked}
                        className="flex-1 min-w-0 px-1.5 py-0.5 rounded text-[11px] border font-mono"
                        style={inputStyle}
                      />
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {input.inputType === "url" && (
            <div className="flex items-center gap-1">
              <label
                className="text-[10px] flex-shrink-0 w-16"
                style={labelStyle}
              >
                URL
              </label>
              <input
                type="text"
                value={input.url || ""}
                onChange={(e) => updateField("url", e.target.value)}
                placeholder="https://example.com/data.json"
                disabled={isNodeLocked}
                className="flex-1 min-w-0 px-1.5 py-0.5 rounded text-[11px] border"
                style={inputStyle}
              />
            </div>
          )}

          {input.inputType === "node" && (
            <div className="flex items-center gap-1">
              <Link2
                className="w-3 h-3 flex-shrink-0"
                style={{ color: theme.colors.nodes.common.text.muted }}
              />
              <span className="text-[10px]" style={labelStyle}>
                {isConnected
                  ? `Connected: ${connectedSourceName}`
                  : "Connect a node output to the left handle"}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
