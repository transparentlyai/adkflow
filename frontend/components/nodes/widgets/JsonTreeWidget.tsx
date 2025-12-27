"use client";

import { useState, useCallback } from "react";
import type { WidgetProps } from "@/components/nodes/widgets/WidgetRenderer";
import type { Theme } from "@/lib/themes/types";
import { ChevronRight, ChevronDown } from "lucide-react";

interface JsonNodeProps {
  keyName: string;
  value: unknown;
  depth: number;
  theme: Theme;
}

function JsonNode({ keyName, value, depth, theme }: JsonNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);

  const isObject = value !== null && typeof value === "object";
  const isArray = Array.isArray(value);

  const toggleExpand = useCallback(
    () => setIsExpanded(!isExpanded),
    [isExpanded]
  );

  const indent = depth * 12;

  if (!isObject) {
    // Primitive value
    let displayValue: string;
    let valueColor: string;

    if (typeof value === "string") {
      displayValue = `"${value}"`;
      valueColor = "#22c55e"; // green
    } else if (typeof value === "number") {
      displayValue = String(value);
      valueColor = "#3b82f6"; // blue
    } else if (typeof value === "boolean") {
      displayValue = String(value);
      valueColor = "#f59e0b"; // amber
    } else if (value === null) {
      displayValue = "null";
      valueColor = "#6b7280"; // gray
    } else {
      displayValue = String(value);
      valueColor = theme.colors.nodes.common.text.primary;
    }

    return (
      <div
        className="flex items-center gap-1 text-xs"
        style={{ paddingLeft: indent }}
      >
        <span style={{ color: theme.colors.nodes.common.text.secondary }}>
          {keyName}:
        </span>
        <span style={{ color: valueColor }}>{displayValue}</span>
      </div>
    );
  }

  // Object or Array
  const entries = isArray
    ? (value as unknown[]).map((v, i) => [String(i), v] as [string, unknown])
    : Object.entries(value as Record<string, unknown>);

  const preview = isArray
    ? `Array(${entries.length})`
    : `Object{${entries.length}}`;

  return (
    <div>
      <div
        className="flex items-center gap-1 text-xs cursor-pointer hover:opacity-80"
        style={{ paddingLeft: indent }}
        onClick={toggleExpand}
      >
        {isExpanded ? (
          <ChevronDown
            className="w-3 h-3"
            style={{ color: theme.colors.nodes.common.text.muted }}
          />
        ) : (
          <ChevronRight
            className="w-3 h-3"
            style={{ color: theme.colors.nodes.common.text.muted }}
          />
        )}
        <span style={{ color: theme.colors.nodes.common.text.secondary }}>
          {keyName}:
        </span>
        {!isExpanded && (
          <span style={{ color: theme.colors.nodes.common.text.muted }}>
            {preview}
          </span>
        )}
      </div>
      {isExpanded &&
        entries.map(([k, v]) => (
          <JsonNode key={k} keyName={k} value={v} depth={depth + 1} theme={theme} />
        ))}
    </div>
  );
}

export default function JsonTreeWidget({
  field,
  value,
  onChange,
  options,
}: WidgetProps) {
  const jsonValue = value ?? {};

  // Try to parse if string
  let parsedValue: unknown;
  if (typeof jsonValue === "string") {
    try {
      parsedValue = JSON.parse(jsonValue);
    } catch {
      parsedValue = jsonValue;
    }
  } else {
    parsedValue = jsonValue;
  }

  const isObject = parsedValue !== null && typeof parsedValue === "object";

  return (
    <div
      className="rounded border p-2 max-h-48 overflow-auto text-xs font-mono"
      style={{
        backgroundColor: options.theme.colors.nodes.common.container.background,
        borderColor: options.theme.colors.nodes.common.container.border,
      }}
    >
      {isObject ? (
        Object.entries(parsedValue as Record<string, unknown>).map(([k, v]) => (
          <JsonNode
            key={k}
            keyName={k}
            value={v}
            depth={0}
            theme={options.theme}
          />
        ))
      ) : (
        <span style={{ color: options.theme.colors.nodes.common.text.primary }}>
          {String(parsedValue)}
        </span>
      )}
    </div>
  );
}
