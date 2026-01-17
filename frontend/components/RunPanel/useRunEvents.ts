/**
 * Custom hook for SSE event handling during workflow runs
 * Manages the EventSource connection and processes run events
 */

import { useEffect, useRef } from "react";
import type {
  RunEvent,
  UserInputRequest,
  RunStatus,
  NodeExecutionState,
} from "@/lib/types";
import { createRunEventSource, getRunStatus } from "@/lib/api";
import { formatEventContent } from "./helpers";
import type { DisplayEvent } from "./types";

interface UseRunEventsOptions {
  runId: string | null;
  projectPath: string;
  onEventsChange: React.Dispatch<React.SetStateAction<DisplayEvent[]>>;
  onStatusChange: (status: RunStatus) => void;
  onRunComplete?: (status: RunStatus, output?: string, error?: string) => void;
  onAgentStateChange?: (agentName: string, state: NodeExecutionState) => void;
  onToolStateChange?: (toolName: string, state: NodeExecutionState) => void;
  onCallbackStateChange?: (callbackName: string, state: NodeExecutionState) => void;
  onUserInputStateChange?: (nodeId: string, isWaiting: boolean) => void;
  onClearExecutionState?: () => void;
  onUserInputRequired?: (request: UserInputRequest) => void;
  onUserInputComplete?: () => void;
}

const EVENT_TYPES = [
  "run_start",
  "run_complete",
  "agent_start",
  "agent_end",
  "agent_output",
  "tool_call",
  "tool_result",
  "thinking",
  "run_error",
  "user_input_required",
  "user_input_received",
  "user_input_timeout",
  "callback_start",
  "callback_end",
  "callback_error",
] as const;

export function useRunEvents({
  runId,
  projectPath,
  onEventsChange,
  onStatusChange,
  onRunComplete,
  onAgentStateChange,
  onToolStateChange,
  onCallbackStateChange,
  onUserInputStateChange,
  onClearExecutionState,
  onUserInputRequired,
  onUserInputComplete,
}: UseRunEventsOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!runId) return;

    let eventCounter = 0;

    const handleEvent = (event: RunEvent) => {
      eventCounter++;
      const content = formatEventContent(event, projectPath);
      const displayEvent: DisplayEvent = {
        id: `${event.type}-${event.timestamp}-${eventCounter}-${Math.random().toString(36).slice(2, 7)}`,
        type: event.type,
        content,
        agentName: event.agent_name,
        timestamp: event.timestamp,
      };

      onEventsChange((prev) => [...prev, displayEvent]);

      // Agent state changes
      if (event.type === "agent_start" && event.agent_name) {
        onAgentStateChange?.(event.agent_name, "running");
      } else if (event.type === "agent_end" && event.agent_name) {
        onAgentStateChange?.(event.agent_name, "completed");
      } else if (event.type === "run_error" && event.agent_name) {
        onAgentStateChange?.(event.agent_name, "error");
      }

      // Tool state changes
      if (event.type === "tool_call" && event.data.tool_name) {
        onToolStateChange?.(event.data.tool_name as string, "running");
      } else if (event.type === "tool_result" && event.data.tool_name) {
        onToolStateChange?.(event.data.tool_name as string, "completed");
      }

      // Callback state changes
      if (event.type === "callback_start" && event.data.callback_name) {
        onCallbackStateChange?.(event.data.callback_name as string, "running");
      } else if (event.type === "callback_end" && event.data.callback_name) {
        onCallbackStateChange?.(event.data.callback_name as string, "completed");
      } else if (event.type === "callback_error" && event.data.callback_name) {
        onCallbackStateChange?.(event.data.callback_name as string, "error");
      }

      // User input handling
      if (event.type === "user_input_required") {
        const inputRequest: UserInputRequest = {
          request_id: event.data.request_id as string,
          node_id: event.data.node_id as string,
          node_name: event.data.node_name as string,
          variable_name: event.data.variable_name as string,
          is_trigger: event.data.is_trigger as boolean,
          previous_output: event.data.previous_output as string | null,
          source_node_name: null,
          timeout_seconds: event.data.timeout_seconds as number,
        };
        onUserInputRequired?.(inputRequest);
        onUserInputStateChange?.(inputRequest.node_id, true);
      } else if (
        event.type === "user_input_received" ||
        event.type === "user_input_timeout"
      ) {
        const nodeId = event.data.node_id as string;
        if (nodeId) {
          onUserInputStateChange?.(nodeId, false);
        }
        onUserInputComplete?.();
      }

      // Run completion
      if (event.type === "run_complete") {
        onStatusChange("completed");
        onClearExecutionState?.();
        onUserInputComplete?.();
      } else if (event.type === "run_error") {
        onStatusChange("failed");
        onClearExecutionState?.();
        onUserInputComplete?.();
      }
    };

    // Initialize run
    onStatusChange("running");
    onEventsChange([
      {
        id: "start",
        type: "info",
        content: `Starting workflow run: ${runId}`,
        timestamp: Date.now(),
      },
    ]);

    const eventSource = createRunEventSource(runId);
    eventSourceRef.current = eventSource;

    // Register event listeners
    EVENT_TYPES.forEach((eventType) => {
      eventSource.addEventListener(eventType, (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data) as RunEvent;
          handleEvent(data);
        } catch (err) {
          console.error("Failed to parse event:", err);
        }
      });
    });

    // Handle completion
    eventSource.addEventListener("complete", () => {
      eventSource.close();
      getRunStatus(runId).then((statusResponse) => {
        onStatusChange(statusResponse.status);
        onRunComplete?.(
          statusResponse.status,
          statusResponse.output,
          statusResponse.error,
        );
      });
    });

    // Handle errors
    eventSource.onerror = async () => {
      eventSource.close();

      try {
        const statusResponse = await getRunStatus(runId);

        if (statusResponse.status === "failed" && statusResponse.error) {
          onEventsChange((prev) => [
            ...prev,
            {
              id: `error-${Date.now()}`,
              type: "run_error",
              content: statusResponse.error ?? "Unknown error",
              timestamp: Date.now(),
            },
          ]);
          onStatusChange("failed");
          onClearExecutionState?.();
        } else if (statusResponse.status === "completed") {
          onStatusChange("completed");
          onClearExecutionState?.();
          onRunComplete?.(
            statusResponse.status,
            statusResponse.output,
            statusResponse.error,
          );
        } else {
          onEventsChange((prev) => [
            ...prev,
            {
              id: `error-${Date.now()}`,
              type: "run_error",
              content:
                "Connection to server lost. Check the backend console for errors.",
              timestamp: Date.now(),
            },
          ]);
          onStatusChange("failed");
          onClearExecutionState?.();
        }
      } catch {
        onEventsChange((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            type: "run_error",
            content: "Connection to server lost",
            timestamp: Date.now(),
          },
        ]);
        onStatusChange("failed");
        onClearExecutionState?.();
      }
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [
    runId,
    projectPath,
    onEventsChange,
    onStatusChange,
    onRunComplete,
    onAgentStateChange,
    onToolStateChange,
    onCallbackStateChange,
    onUserInputStateChange,
    onClearExecutionState,
    onUserInputRequired,
    onUserInputComplete,
  ]);

  return eventSourceRef;
}
