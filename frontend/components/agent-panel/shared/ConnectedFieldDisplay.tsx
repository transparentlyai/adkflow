import { Handle, Position } from "@xyflow/react";
import type { Theme } from "@/lib/themes/types";
import type { HandleConfig } from "@/components/agent-panel/types";
import HandleTooltip from "@/components/HandleTooltip";

interface ConnectedFieldDisplayProps {
  label: string;
  theme: Theme;
  connectedName?: string;
  connectedNames?: string[];
  showHandle: boolean;
  handleConfig?: HandleConfig;
  validityStyle: React.CSSProperties;
  icon: React.ReactNode;
}

export function ConnectedFieldDisplay({
  label,
  theme,
  connectedName,
  connectedNames,
  showHandle,
  handleConfig,
  validityStyle,
  icon,
}: ConnectedFieldDisplayProps) {
  // Determine if connected and what to display
  const isConnected = connectedName
    ? true
    : connectedNames && connectedNames.length > 0;
  const displayText = connectedName
    ? connectedName
    : connectedNames && connectedNames.length > 0
      ? connectedNames.join(", ")
      : "None";

  return (
    <div className="space-y-1">
      <label
        className="text-xs font-medium"
        style={{ color: theme.colors.nodes.common.text.secondary }}
      >
        {label}
      </label>
      <div
        className="relative flex items-center gap-2 px-2 py-1 text-sm border rounded"
        style={{
          backgroundColor: theme.colors.nodes.common.footer.background,
          borderColor: theme.colors.nodes.common.container.border,
        }}
      >
        {showHandle && handleConfig && (
          <HandleTooltip
            label={label}
            sourceType={
              handleConfig.acceptedSources?.[0] || label.toLowerCase()
            }
            dataType={handleConfig.acceptedTypes?.[0] || "str"}
            type="input"
          >
            <Handle
              type="target"
              position={Position.Left}
              id={handleConfig.id}
              style={{
                position: "absolute",
                left: -5,
                top: "50%",
                transform: "translateY(-50%)",
                transition: "box-shadow 0.15s ease",
                ...handleConfig.style,
                ...validityStyle,
              }}
            />
          </HandleTooltip>
        )}
        <span
          className="w-3.5 h-3.5 flex-shrink-0"
          style={{ color: theme.colors.nodes.common.text.muted }}
        >
          {icon}
        </span>
        <span
          className={`text-xs ${isConnected ? (connectedNames ? "truncate" : "") : "italic"}`}
          style={{
            color: isConnected
              ? theme.colors.nodes.common.text.primary
              : theme.colors.nodes.common.text.muted,
          }}
        >
          {displayText}
        </span>
      </div>
    </div>
  );
}
