"use client";

import { ExternalLink } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface TeleporterInfo {
  id: string;
  name: string;
  tabId: string;
  tabName: string;
  color: string;
}

interface TeleportNodePanelProps {
  editedName: string;
  setEditedName: (name: string) => void;
  onNameSave: () => void;
  onNameKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onClose: () => void;
  onNavigate: (tabId: string, nodeId: string) => void;
  onLinkTo: (name: string) => void;
  matchingConnections: TeleporterInfo[];
  availableConnections: TeleporterInfo[];
  color: string;
  connectionLabel: "input" | "output";
}

export default function TeleportNodePanel({
  editedName,
  setEditedName,
  onNameSave,
  onNameKeyDown,
  onClose,
  onNavigate,
  onLinkTo,
  matchingConnections,
  availableConnections,
  color,
  connectionLabel,
}: TeleportNodePanelProps) {
  const { theme } = useTheme();

  const uniqueAvailableNames = [
    ...new Set(availableConnections.map((t) => t.name)),
  ];

  return (
    <div
      className="absolute top-full left-0 mt-2 rounded-lg shadow-xl z-50 min-w-[280px]"
      style={{
        backgroundColor: theme.colors.nodes.common.container.background,
        border: `1px solid ${theme.colors.nodes.common.container.border}`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Name editor */}
      <div
        className="px-3 py-2 rounded-t-lg"
        style={{
          backgroundColor: theme.colors.nodes.common.footer.background,
          borderBottom: `1px solid ${theme.colors.nodes.common.container.border}`,
        }}
      >
        <label
          className="text-xs mb-1 block"
          style={{ color: theme.colors.nodes.common.text.muted }}
        >
          Connector Name
        </label>
        <input
          type="text"
          value={editedName}
          onChange={(e) => setEditedName(e.target.value)}
          onBlur={onNameSave}
          onKeyDown={onNameKeyDown}
          className="w-full px-2 py-1 text-sm rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          style={{
            backgroundColor: theme.colors.nodes.common.container.background,
            color: theme.colors.nodes.common.text.primary,
            border: `1px solid ${theme.colors.nodes.common.container.border}`,
          }}
          autoFocus
        />
      </div>

      {/* Linked connectors */}
      {matchingConnections.length > 0 && (
        <>
          <div
            className="px-3 py-1.5 text-xs flex items-center gap-1"
            style={{
              backgroundColor: theme.colors.nodes.common.footer.background,
              borderBottom: `1px solid ${theme.colors.nodes.common.container.border}`,
              color: theme.colors.nodes.common.text.muted,
            }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: color }}
            />
            Linked ({matchingConnections.length})
          </div>
          <div className="max-h-[120px] overflow-y-auto">
            {matchingConnections.map((t) => (
              <button
                key={t.id}
                onClick={() => onNavigate(t.tabId, t.id)}
                className="w-full px-3 py-1.5 text-left hover:bg-blue-50 flex items-center gap-2 last:border-b-0"
                style={{
                  borderBottom: `1px solid ${theme.colors.nodes.common.container.border}`,
                }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: t.color }}
                />
                <span
                  className="text-sm flex-1"
                  style={{ color: theme.colors.nodes.common.text.primary }}
                >
                  {t.name}
                </span>
                <span
                  className="text-xs"
                  style={{ color: theme.colors.nodes.common.text.muted }}
                >
                  {t.tabName}
                </span>
                <ExternalLink
                  className="w-3 h-3"
                  style={{ color: theme.colors.nodes.common.text.muted }}
                />
              </button>
            ))}
          </div>
        </>
      )}

      {/* Available connectors to link to */}
      {uniqueAvailableNames.length > 0 && (
        <>
          <div
            className="px-3 py-1.5 text-xs"
            style={{
              backgroundColor: theme.colors.nodes.common.footer.background,
              borderBottom: `1px solid ${theme.colors.nodes.common.container.border}`,
              color: theme.colors.nodes.common.text.muted,
            }}
          >
            Available to link
          </div>
          <div className="max-h-[150px] overflow-y-auto">
            {uniqueAvailableNames.map((linkName) => {
              const connector = availableConnections.find(
                (t) => t.name === linkName,
              )!;
              const count = availableConnections.filter(
                (t) => t.name === linkName,
              ).length;
              return (
                <button
                  key={linkName}
                  onClick={() => onLinkTo(linkName)}
                  className="w-full px-3 py-1.5 text-left hover:bg-green-50 flex items-center gap-2 last:border-b-0"
                  style={{
                    borderBottom: `1px solid ${theme.colors.nodes.common.container.border}`,
                  }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: connector.color }}
                  />
                  <span
                    className="text-sm flex-1"
                    style={{
                      color: theme.colors.nodes.common.text.primary,
                    }}
                  >
                    {linkName}
                  </span>
                  <span
                    className="text-xs"
                    style={{
                      color: theme.colors.nodes.common.text.muted,
                    }}
                  >
                    {count} {connectionLabel}
                    {count > 1 ? "s" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Close button */}
      <div
        className="px-3 py-2 rounded-b-lg"
        style={{
          backgroundColor: theme.colors.nodes.common.footer.background,
          borderTop: `1px solid ${theme.colors.nodes.common.container.border}`,
        }}
      >
        <button
          onClick={onClose}
          className="w-full px-2 py-1 text-xs rounded"
          style={{
            color: theme.colors.nodes.common.text.secondary,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor =
              theme.colors.nodes.common.footer.background;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
