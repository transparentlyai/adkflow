import type { RunEvent, EventType, RunStatus } from "@/lib/types";

export function formatEventContent(
  event: RunEvent,
  projectPath: string,
): string {
  switch (event.type) {
    case "run_start":
      return `Run started: ${event.data.project_path || projectPath}`;
    case "run_complete":
      return "Run completed successfully";
    case "agent_start":
      return `Agent started: ${event.agent_name}`;
    case "agent_end":
      return `Agent finished: ${event.agent_name}`;
    case "agent_output":
      return (event.data.output as string) || "";
    case "tool_call": {
      const args = event.data.args as string | undefined;
      if (args) {
        return `Calling ${event.data.tool_name}(${args})`;
      }
      return `Calling tool: ${event.data.tool_name}`;
    }
    case "tool_result": {
      const result = event.data.result as string | undefined;
      if (result) {
        return `Tool ${event.data.tool_name}: ${result}`;
      }
      return `Tool result: ${event.data.tool_name}`;
    }
    case "thinking":
      return "Thinking...";
    case "run_error":
      return `Error: ${event.data.error || "Unknown error"}`;
    case "user_input_required":
      return `⏳ Waiting for input: ${event.data.node_name}`;
    case "user_input_received":
      return `✓ Input received: ${event.data.node_name}`;
    case "user_input_timeout":
      return `⏱ Input timeout: ${event.data.node_name}`;
    default:
      return JSON.stringify(event.data);
  }
}

export function getEventColor(type: EventType | "info"): string {
  switch (type) {
    case "agent_start":
      return "text-blue-400";
    case "agent_end":
      return "text-green-400";
    case "agent_output":
      return "text-gray-300";
    case "tool_call":
      return "text-yellow-400";
    case "tool_result":
      return "text-yellow-300";
    case "thinking":
      return "text-gray-500";
    case "run_error":
      return "text-red-400";
    case "warning":
      return "text-yellow-400";
    case "run_start":
    case "run_complete":
      return "text-cyan-400";
    case "user_input_required":
      return "text-amber-400";
    case "user_input_received":
      return "text-green-400";
    case "user_input_timeout":
      return "text-orange-400";
    case "info":
      return "text-gray-400";
    default:
      return "text-gray-300";
  }
}

export function getStatusIcon(status: RunStatus): {
  icon: string;
  color: string;
} {
  switch (status) {
    case "running":
      return { icon: "loader", color: "text-blue-500" };
    case "completed":
      return { icon: "check", color: "text-green-500" };
    case "failed":
      return { icon: "alert", color: "text-red-500" };
    case "cancelled":
      return { icon: "square", color: "text-yellow-500" };
    default:
      return { icon: "play", color: "text-gray-500" };
  }
}
