"use client";

import { useCallback, useMemo } from "react";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { nanoid } from "nanoid";
import { useTheme } from "@/contexts/ThemeContext";
import type { KeyValueItem } from "@/components/nodes/CustomNode/types/keyValue";

export type { KeyValueItem };

interface KeyValueListWidgetProps {
  value: KeyValueItem[];
  onChange: (value: KeyValueItem[]) => void;
  disabled?: boolean;
  placeholder?: { key?: string; value?: string };
}

/**
 * KeyValueListWidget - Renders a list of key-value pair inputs
 *
 * Used by VariableNode to store multiple variables.
 * Validates for duplicate keys within the same list.
 */
export function KeyValueListWidget({
  value = [],
  onChange,
  disabled = false,
  placeholder = { key: "key", value: "value" },
}: KeyValueListWidgetProps) {
  const { theme } = useTheme();

  // Detect duplicate keys
  const duplicateKeys = useMemo(() => {
    const keyCount = new Map<string, number>();
    for (const item of value) {
      if (item.key) {
        keyCount.set(item.key, (keyCount.get(item.key) || 0) + 1);
      }
    }
    const duplicates = new Set<string>();
    for (const [key, count] of keyCount) {
      if (count > 1) {
        duplicates.add(key);
      }
    }
    return duplicates;
  }, [value]);

  const handleAdd = useCallback(() => {
    onChange([...value, { id: nanoid(), key: "", value: "" }]);
  }, [value, onChange]);

  const handleDelete = useCallback(
    (id: string) => {
      onChange(value.filter((item) => item.id !== id));
    },
    [value, onChange],
  );

  const handleUpdate = useCallback(
    (id: string, field: "key" | "value", newValue: string) => {
      onChange(
        value.map((item) =>
          item.id === id ? { ...item, [field]: newValue } : item,
        ),
      );
    },
    [value, onChange],
  );

  const inputStyle = {
    backgroundColor: "transparent",
    borderColor: theme.colors.nodes.common.container.border,
    color: theme.colors.nodes.common.text.primary,
  };

  const errorColor = theme.colors.state?.danger || "#ef4444";
  const errorInputStyle = {
    ...inputStyle,
    borderColor: errorColor,
  };

  return (
    <div className="space-y-1.5">
      {/* Header with add button */}
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: theme.colors.nodes.common.text.muted }}
        >
          Variables ({value.length})
        </span>
        <button
          type="button"
          onClick={handleAdd}
          disabled={disabled}
          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] border hover:bg-accent transition-colors disabled:opacity-50"
          style={{
            borderColor: theme.colors.nodes.common.container.border,
            color: theme.colors.nodes.common.text.primary,
          }}
        >
          <Plus className="w-3 h-3" />
          Add
        </button>
      </div>

      {/* Variable rows */}
      {value.length === 0 ? (
        <div
          className="text-center py-3 text-[11px] border-2 border-dashed rounded"
          style={{
            borderColor: theme.colors.nodes.common.container.border,
            color: theme.colors.nodes.common.text.muted,
          }}
        >
          No variables defined. Click &quot;Add&quot; to add one.
        </div>
      ) : (
        <div className="space-y-1">
          {value.map((item) => {
            const isDuplicate = duplicateKeys.has(item.key);
            return (
              <div
                key={item.id}
                className="flex items-center gap-1 p-1.5 rounded border"
                style={{
                  borderColor: isDuplicate
                    ? errorColor
                    : theme.colors.nodes.common.container.border,
                  backgroundColor: theme.colors.nodes.common.footer.background,
                }}
              >
                {/* Key input */}
                <input
                  type="text"
                  value={item.key}
                  onChange={(e) => handleUpdate(item.id, "key", e.target.value)}
                  placeholder={placeholder.key}
                  disabled={disabled}
                  className="w-24 px-1.5 py-0.5 rounded text-[11px] border font-mono"
                  style={isDuplicate ? errorInputStyle : inputStyle}
                  title={isDuplicate ? "Duplicate key" : undefined}
                />
                <span
                  className="text-[11px]"
                  style={{ color: theme.colors.nodes.common.text.muted }}
                >
                  =
                </span>
                {/* Value input */}
                <input
                  type="text"
                  value={item.value}
                  onChange={(e) =>
                    handleUpdate(item.id, "value", e.target.value)
                  }
                  placeholder={placeholder.value}
                  disabled={disabled}
                  className="flex-1 min-w-0 px-1.5 py-0.5 rounded text-[11px] border"
                  style={inputStyle}
                />
                {/* Duplicate warning icon */}
                {isDuplicate && (
                  <span title="Duplicate key" className="flex-shrink-0">
                    <AlertCircle
                      className="w-3.5 h-3.5"
                      style={{ color: errorColor }}
                    />
                  </span>
                )}
                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  disabled={disabled}
                  className="p-0.5 rounded hover:bg-red-500/20 transition-colors disabled:opacity-50 flex-shrink-0"
                  title="Delete variable"
                >
                  <Trash2
                    className="w-3 h-3"
                    style={{ color: theme.colors.nodes.common.text.muted }}
                  />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Duplicate key warning */}
      {duplicateKeys.size > 0 && (
        <div
          className="flex items-center gap-1 text-[10px] px-1"
          style={{ color: errorColor }}
        >
          <AlertCircle className="w-3 h-3" />
          <span>Duplicate keys: {Array.from(duplicateKeys).join(", ")}</span>
        </div>
      )}
    </div>
  );
}

export default KeyValueListWidget;
