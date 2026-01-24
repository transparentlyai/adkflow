"use client";

import { FolderOpen } from "lucide-react";
import type {
  DynamicInputConfig,
  DirectoryAggregationMode,
  NamingPatternType,
} from "@/components/nodes/CustomNode";

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

interface DirectoryInputConfigProps {
  input: DynamicInputConfig;
  onUpdateField: <K extends keyof DynamicInputConfig>(
    key: K,
    value: DynamicInputConfig[K],
  ) => void;
  onDirBrowse: () => void;
  isNodeLocked: boolean;
  canBrowse: boolean;
  includeMetadata: boolean;
  inputStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
  theme: {
    colors: {
      nodes: {
        common: {
          container: { border: string };
          text: { primary: string; muted: string };
        };
      };
    };
  };
}

export function DirectoryInputConfig({
  input,
  onUpdateField,
  onDirBrowse,
  isNodeLocked,
  canBrowse,
  includeMetadata,
  inputStyle,
  labelStyle,
  theme,
}: DirectoryInputConfigProps) {
  return (
    <>
      {/* Directory path row */}
      <div className="flex items-center gap-1">
        <label className="text-[10px] flex-shrink-0 w-16" style={labelStyle}>
          Directory
        </label>
        <input
          type="text"
          value={input.directoryPath || ""}
          onChange={(e) => onUpdateField("directoryPath", e.target.value)}
          placeholder="path/to/directory"
          disabled={isNodeLocked}
          className="flex-1 min-w-0 px-1.5 py-0.5 rounded text-[11px] border"
          style={inputStyle}
        />
        <button
          type="button"
          onClick={onDirBrowse}
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

      {/* Glob pattern row */}
      <div className="flex items-center gap-1">
        <label className="text-[10px] flex-shrink-0 w-16" style={labelStyle}>
          Glob
        </label>
        <input
          type="text"
          value={input.globPattern || "*"}
          onChange={(e) => onUpdateField("globPattern", e.target.value)}
          placeholder="**/*.md"
          disabled={isNodeLocked}
          className="flex-1 min-w-0 px-1.5 py-0.5 rounded text-[11px] border font-mono"
          style={inputStyle}
        />
      </div>

      {/* Recursive toggle */}
      <div className="flex items-center gap-1">
        <label className="text-[10px] flex-shrink-0 w-16" style={labelStyle}>
          Recursive
        </label>
        <input
          type="checkbox"
          checked={input.recursive || false}
          onChange={(e) => onUpdateField("recursive", e.target.checked)}
          disabled={isNodeLocked}
          className="w-3.5 h-3.5"
        />
        <span
          className="text-[9px]"
          style={{ color: theme.colors.nodes.common.text.muted }}
        >
          Scan subdirectories
        </span>
      </div>

      {/* Exclude patterns - shown when recursive */}
      {input.recursive && (
        <div className="flex items-center gap-1">
          <label className="text-[10px] flex-shrink-0 w-16" style={labelStyle}>
            Exclude
          </label>
          <input
            type="text"
            value={(input.excludePatterns || []).join(", ")}
            onChange={(e) =>
              onUpdateField(
                "excludePatterns",
                e.target.value
                  .split(",")
                  .map((p) => p.trim())
                  .filter(Boolean),
              )
            }
            placeholder=".git, node_modules, __pycache__"
            disabled={isNodeLocked}
            className="flex-1 min-w-0 px-1.5 py-0.5 rounded text-[11px] border font-mono"
            style={inputStyle}
          />
        </div>
      )}

      {/* Limits row */}
      <div className="flex items-center gap-1">
        <label className="text-[10px] flex-shrink-0 w-16" style={labelStyle}>
          Limits
        </label>
        <div className="flex-1 flex items-center gap-1.5">
          <input
            type="number"
            value={input.maxFiles ?? 100}
            onChange={(e) =>
              onUpdateField("maxFiles", parseInt(e.target.value) || 100)
            }
            disabled={isNodeLocked}
            className="w-14 px-1 py-0.5 rounded text-[10px] border text-center"
            style={inputStyle}
            min={1}
            max={1000}
          />
          <span
            className="text-[9px]"
            style={{ color: theme.colors.nodes.common.text.muted }}
          >
            files,
          </span>
          <input
            type="number"
            value={Math.round((input.maxFileSize ?? 1048576) / 1024)}
            onChange={(e) =>
              onUpdateField(
                "maxFileSize",
                (parseInt(e.target.value) || 1024) * 1024,
              )
            }
            disabled={isNodeLocked}
            className="w-14 px-1 py-0.5 rounded text-[10px] border text-center"
            style={inputStyle}
            min={1}
            max={10240}
          />
          <span
            className="text-[9px]"
            style={{ color: theme.colors.nodes.common.text.muted }}
          >
            KB each
          </span>
        </div>
      </div>

      {/* Aggregation mode */}
      <div className="flex items-center gap-1">
        <label className="text-[10px] flex-shrink-0 w-16" style={labelStyle}>
          Aggregation
        </label>
        <select
          value={input.directoryAggregation || "concatenate"}
          onChange={(e) =>
            onUpdateField(
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

      {/* Concatenate-specific: separator */}
      {input.directoryAggregation === "concatenate" && (
        <div className="flex items-center gap-1">
          <label className="text-[10px] flex-shrink-0 w-16" style={labelStyle}>
            Separator
          </label>
          <input
            type="text"
            value={input.directorySeparator || "\\n\\n---"}
            onChange={(e) =>
              onUpdateField("directorySeparator", e.target.value)
            }
            placeholder={
              includeMetadata ? "\\n--- {source_name} ---\\n" : "\\n\\n---"
            }
            disabled={isNodeLocked}
            className="flex-1 min-w-0 px-1.5 py-0.5 rounded text-[11px] border font-mono"
            style={inputStyle}
          />
        </div>
      )}

      {/* Pass-specific: naming pattern */}
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
                onUpdateField(
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
                onChange={(e) => onUpdateField("customPattern", e.target.value)}
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
  );
}
