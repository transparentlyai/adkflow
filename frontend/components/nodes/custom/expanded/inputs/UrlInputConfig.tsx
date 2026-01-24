"use client";

import type { DynamicInputConfig } from "@/components/nodes/CustomNode";

interface UrlInputConfigProps {
  input: DynamicInputConfig;
  onUpdateField: <K extends keyof DynamicInputConfig>(
    key: K,
    value: DynamicInputConfig[K],
  ) => void;
  isNodeLocked: boolean;
  inputStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
}

export function UrlInputConfig({
  input,
  onUpdateField,
  isNodeLocked,
  inputStyle,
  labelStyle,
}: UrlInputConfigProps) {
  return (
    <div className="flex items-center gap-1">
      <label className="text-[10px] flex-shrink-0 w-16" style={labelStyle}>
        URL
      </label>
      <input
        type="text"
        value={input.url || ""}
        onChange={(e) => onUpdateField("url", e.target.value)}
        placeholder="https://example.com/data.json"
        disabled={isNodeLocked}
        className="flex-1 min-w-0 px-1.5 py-0.5 rounded text-[11px] border"
        style={inputStyle}
      />
    </div>
  );
}
