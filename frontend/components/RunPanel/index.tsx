"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  X,
  Play,
  Square,
  CheckCircle,
  AlertCircle,
  Loader2,
  GripHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { RunEvent, UserInputRequest } from "@/lib/types";
import {
  createRunEventSource,
  cancelRun,
  getRunStatus,
  submitUserInput,
} from "@/lib/api";
import { formatEventContent, getEventColor } from "./helpers";
import UserInputPanel from "./UserInputPanel";
import type { DisplayEvent, RunPanelProps } from "./types";

const MIN_HEIGHT = 120;
const MAX_HEIGHT = 600;
const DEFAULT_HEIGHT = 320;

export type { DisplayEvent, RunPanelProps };

export default function RunPanel({
  runId,
  projectPath,
  onClose,
  onRunComplete,
  onAgentStateChange,
  onToolStateChange,
  onUserInputStateChange,
  onClearExecutionState,
  events,
  onEventsChange,
  lastRunStatus,
  onStatusChange,
}: RunPanelProps) {
  const status = lastRunStatus;
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [isResizing, setIsResizing] = useState(false);
  const [pendingInput, setPendingInput] = useState<UserInputRequest | null>(
    null,
  );
  const [userInputValue, setUserInputValue] = useState("");
  const [isSubmittingInput, setIsSubmittingInput] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newHeight = window.innerHeight - e.clientY;
      setHeight(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, newHeight)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  // Periodic status polling as fallback for missed events
  useEffect(() => {
    if (!runId || status !== "running") return;

    const pollInterval = setInterval(async () => {
      try {
        const statusResponse = await getRunStatus(runId);

        if (statusResponse.status === "failed") {
          const errorMsg = statusResponse.error || "Workflow execution failed";
          onEventsChange((prev) => [
            ...prev,
            {
              id: `polled-error-${Date.now()}`,
              type: "run_error",
              content: errorMsg,
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
        }
      } catch {
        // Ignore polling errors
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [
    runId,
    status,
    onEventsChange,
    onStatusChange,
    onClearExecutionState,
    onRunComplete,
  ]);

  // Immediate status check when run starts
  useEffect(() => {
    if (!runId) return;

    const immediateCheck = setTimeout(async () => {
      try {
        const statusResponse = await getRunStatus(runId);

        if (statusResponse.status === "failed") {
          const errorMsg = statusResponse.error || "Workflow execution failed";
          onEventsChange((prev) => [
            ...prev,
            {
              id: `early-error-${Date.now()}`,
              type: "run_error",
              content: errorMsg,
              timestamp: Date.now(),
            },
          ]);
          onStatusChange("failed");
          onClearExecutionState?.();
        }
      } catch {
        // Ignore
      }
    }, 500);

    return () => clearTimeout(immediateCheck);
  }, [runId, onEventsChange, onStatusChange, onClearExecutionState]);

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

      if (event.type === "agent_start" && event.agent_name) {
        onAgentStateChange?.(event.agent_name, "running");
      } else if (event.type === "agent_end" && event.agent_name) {
        onAgentStateChange?.(event.agent_name, "completed");
      } else if (event.type === "run_error" && event.agent_name) {
        onAgentStateChange?.(event.agent_name, "error");
      }

      if (event.type === "tool_call" && event.data.tool_name) {
        onToolStateChange?.(event.data.tool_name as string, "running");
      } else if (event.type === "tool_result" && event.data.tool_name) {
        onToolStateChange?.(event.data.tool_name as string, "completed");
      }

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
        setPendingInput(inputRequest);
        setUserInputValue("");
        onUserInputStateChange?.(inputRequest.node_id, true);
      } else if (
        event.type === "user_input_received" ||
        event.type === "user_input_timeout"
      ) {
        const nodeId = event.data.node_id as string;
        if (nodeId) {
          onUserInputStateChange?.(nodeId, false);
        }
        setPendingInput(null);
        setUserInputValue("");
      }

      if (event.type === "run_complete") {
        onStatusChange("completed");
        onClearExecutionState?.();
        setPendingInput(null);
      } else if (event.type === "run_error") {
        onStatusChange("failed");
        onClearExecutionState?.();
        setPendingInput(null);
      }
    };

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

    const eventTypes = [
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
    ];

    eventTypes.forEach((eventType) => {
      eventSource.addEventListener(eventType, (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data) as RunEvent;
          handleEvent(data);
        } catch (err) {
          console.error("Failed to parse event:", err);
        }
      });
    });

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
    onRunComplete,
    projectPath,
    onAgentStateChange,
    onToolStateChange,
    onUserInputStateChange,
    onClearExecutionState,
    onEventsChange,
    onStatusChange,
  ]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  const handleCancel = async () => {
    if (runId && status === "running") {
      try {
        await cancelRun(runId);
        onStatusChange("cancelled");
        setPendingInput(null);
        onEventsChange((prev) => [
          ...prev,
          {
            id: `cancel-${Date.now()}`,
            type: "info",
            content: "Run cancelled by user",
            timestamp: Date.now(),
          },
        ]);
      } catch (err) {
        console.error("Failed to cancel:", err);
      }
    }
  };

  const handleSubmitUserInput = async () => {
    if (!runId || !pendingInput || !userInputValue.trim() || isSubmittingInput)
      return;

    setIsSubmittingInput(true);
    try {
      await submitUserInput(runId, {
        request_id: pendingInput.request_id,
        user_input: userInputValue.trim(),
      });
    } catch (err) {
      console.error("Failed to submit user input:", err);
      onEventsChange((prev) => [
        ...prev,
        {
          id: `input-error-${Date.now()}`,
          type: "run_error",
          content: `Failed to submit input: ${err instanceof Error ? err.message : "Unknown error"}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsSubmittingInput(false);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "cancelled":
        return <Square className="h-4 w-4 text-yellow-500" />;
      default:
        return <Play className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 flex flex-col z-50"
      style={{ height }}
    >
      {/* Resize handle */}
      <div
        className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize flex items-center justify-center hover:bg-gray-700/50 group"
        onMouseDown={handleMouseDown}
      >
        <GripHorizontal className="h-3 w-3 text-gray-600 group-hover:text-gray-400" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-gray-700 bg-gray-800 mt-2">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-xs font-medium text-gray-200">
            Run {runId ? `(${runId})` : ""}
          </span>
          <span className="text-xs text-gray-500 capitalize">{status}</span>
        </div>
        <div className="flex items-center gap-1">
          {status === "running" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="text-red-400 hover:text-red-300 h-6 px-2 text-xs"
            >
              <Square className="h-3 w-3 mr-1" />
              Cancel
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Event log */}
      <ScrollArea className="flex-1 px-3 py-2" ref={scrollRef}>
        <div className="font-mono text-xs space-y-0.5">
          {events.map((event) => (
            <div key={event.id} className={`${getEventColor(event.type)}`}>
              {event.agentName && (
                <span className="text-purple-400">[{event.agentName}] </span>
              )}
              {event.type === "agent_output" ||
              event.type === "run_error" ||
              event.type === "warning" ? (
                <span className="whitespace-pre-wrap">{event.content}</span>
              ) : (
                <span>{event.content}</span>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* User input panel */}
      {pendingInput && (
        <UserInputPanel
          pendingInput={pendingInput}
          userInputValue={userInputValue}
          setUserInputValue={setUserInputValue}
          isSubmittingInput={isSubmittingInput}
          onSubmit={handleSubmitUserInput}
        />
      )}
    </div>
  );
}
