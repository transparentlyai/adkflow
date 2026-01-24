"use client";

import { Link2 } from "lucide-react";

interface NodeInputConfigProps {
  isConnected: boolean;
  connectedSourceName?: string;
  labelStyle: React.CSSProperties;
  theme: {
    colors: {
      nodes: {
        common: {
          text: { muted: string };
        };
      };
    };
  };
}

export function NodeInputConfig({
  isConnected,
  connectedSourceName,
  labelStyle,
  theme,
}: NodeInputConfigProps) {
  return (
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
  );
}
