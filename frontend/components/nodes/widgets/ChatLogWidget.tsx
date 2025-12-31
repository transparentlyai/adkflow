"use client";

import type { WidgetProps } from "@/components/nodes/widgets/WidgetRenderer";

interface Message {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp?: number;
}

export default function ChatLogWidget({
  field,
  value,
  onChange,
  options,
}: WidgetProps) {
  // Value should be an array of messages
  const messages: Message[] = Array.isArray(value) ? value : [];

  const getRoleColor = (role: string) => {
    switch (role) {
      case "user":
        return "#3b82f6"; // blue
      case "assistant":
        return "#22c55e"; // green
      case "system":
        return "#6b7280"; // gray
      case "tool":
        return "#f59e0b"; // amber
      default:
        return options.theme.colors.nodes.common.text.primary;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "user":
        return "User";
      case "assistant":
        return "Assistant";
      case "system":
        return "System";
      case "tool":
        return "Tool";
      default:
        return role;
    }
  };

  return (
    <div
      className="rounded border max-h-64 overflow-auto"
      style={{
        backgroundColor: options.theme.colors.nodes.common.container.background,
        borderColor: options.theme.colors.nodes.common.container.border,
      }}
    >
      {messages.length === 0 ? (
        <div
          className="p-3 text-xs text-center"
          style={{ color: options.theme.colors.nodes.common.text.muted }}
        >
          No messages
        </div>
      ) : (
        <div
          className="divide-y"
          style={{
            borderColor: options.theme.colors.nodes.common.container.border,
          }}
        >
          {messages.map((msg, i) => (
            <div key={i} className="p-2">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-xs font-medium"
                  style={{ color: getRoleColor(msg.role) }}
                >
                  {getRoleLabel(msg.role)}
                </span>
                {msg.timestamp && (
                  <span
                    className="text-xs"
                    style={{
                      color: options.theme.colors.nodes.common.text.muted,
                    }}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                )}
              </div>
              <div
                className="text-xs whitespace-pre-wrap"
                style={{
                  color: options.theme.colors.nodes.common.text.primary,
                }}
              >
                {msg.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
