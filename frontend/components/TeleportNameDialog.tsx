"use client";

import type { Theme } from "@/lib/themes/types";

interface TeleportNameDialogProps {
  type: "teleportOut" | "teleportIn";
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  theme: Theme;
}

export default function TeleportNameDialog({
  type,
  value,
  onChange,
  onSubmit,
  onCancel,
  theme,
}: TeleportNameDialogProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && value.trim()) {
      onSubmit();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ pointerEvents: "auto" }}
    >
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onCancel}
      />
      <div
        className="relative rounded-lg shadow-xl p-6"
        style={{
          width: "400px",
          maxWidth: "90vw",
          backgroundColor: theme.colors.nodes.common.container.background,
          border: `1px solid ${theme.colors.nodes.common.container.border}`,
        }}
      >
        <h3
          className="text-lg font-semibold mb-4"
          style={{ color: theme.colors.nodes.common.text.primary }}
        >
          {type === "teleportOut"
            ? "New Output Connector"
            : "New Input Connector"}
        </h3>
        <p
          className="text-sm mb-4"
          style={{ color: theme.colors.nodes.common.text.secondary }}
        >
          Enter a name for this connector. Connectors with matching names will
          be linked.
        </p>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 mb-4"
          style={{
            backgroundColor: theme.colors.nodes.common.footer.background,
            border: `1px solid ${theme.colors.nodes.common.container.border}`,
            color: theme.colors.nodes.common.text.primary,
          }}
          placeholder="Connector name"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg transition-colors"
            style={{
              border: `1px solid ${theme.colors.nodes.common.container.border}`,
              color: theme.colors.nodes.common.text.secondary,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={!value.trim()}
            className="px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: theme.colors.nodes.agent.header,
              color: theme.colors.nodes.agent.text,
            }}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
