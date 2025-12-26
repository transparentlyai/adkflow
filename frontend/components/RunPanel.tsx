"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Play, Square, CheckCircle, AlertCircle, Loader2, GripHorizontal, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { RunEvent, RunStatus, EventType, NodeExecutionState, UserInputRequest } from "@/lib/types";
import { createRunEventSource, cancelRun, getRunStatus, submitUserInput } from "@/lib/api";
import { isMacOS } from "@/lib/utils";

const MIN_HEIGHT = 120;
const MAX_HEIGHT = 600;
const DEFAULT_HEIGHT = 320;

export interface DisplayEvent {
  id: string;
  type: EventType | "info";
  content: string;
  agentName?: string;
  timestamp: number;
}

interface RunPanelProps {
  runId: string | null;
  projectPath: string;
  onClose: () => void;
  onRunComplete?: (status: RunStatus, output?: string, error?: string) => void;
  onAgentStateChange?: (agentName: string, state: NodeExecutionState) => void;
  onToolStateChange?: (toolName: string, state: NodeExecutionState) => void;
  onUserInputStateChange?: (nodeId: string, isWaiting: boolean) => void;
  onClearExecutionState?: () => void;
  events: DisplayEvent[];
  onEventsChange: React.Dispatch<React.SetStateAction<DisplayEvent[]>>;
  lastRunStatus: RunStatus;
  onStatusChange: (status: RunStatus) => void;
}

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
  const [pendingInput, setPendingInput] = useState<UserInputRequest | null>(null);
  const [userInputValue, setUserInputValue] = useState("");
  const [isSubmittingInput, setIsSubmittingInput] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

        // Handle failed status (with or without error message)
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
          // Run completed but we missed it
          onStatusChange("completed");
          onClearExecutionState?.();
          onRunComplete?.(statusResponse.status, statusResponse.output, statusResponse.error);
        }
      } catch {
        // Ignore polling errors - SSE will handle disconnection
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [runId, status, onEventsChange, onStatusChange, onClearExecutionState, onRunComplete]);

  // Immediate status check when run starts (catches early failures)
  useEffect(() => {
    if (!runId) return;

    // Small delay to let the backend process, then check status
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
        // Ignore - polling will catch any issues
      }
    }, 500); // Check after 500ms - enough time for early failures

    return () => clearTimeout(immediateCheck);
  }, [runId, onEventsChange, onStatusChange, onClearExecutionState]);

  useEffect(() => {
    if (!runId) return;

    const formatEventContent = (event: RunEvent): string => {
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
    };

    let eventCounter = 0;

    const handleEvent = (event: RunEvent) => {
      eventCounter++;
      const content = formatEventContent(event);
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

      // Handle tool state changes
      if (event.type === "tool_call" && event.data.tool_name) {
        onToolStateChange?.(event.data.tool_name as string, "running");
      } else if (event.type === "tool_result" && event.data.tool_name) {
        onToolStateChange?.(event.data.tool_name as string, "completed");
      }

      // Handle user input required event
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
        // Highlight the UserInput node as waiting
        onUserInputStateChange?.(inputRequest.node_id, true);
        // Focus the input after a short delay
        setTimeout(() => inputRef.current?.focus(), 100);
      } else if (event.type === "user_input_received" || event.type === "user_input_timeout") {
        // Clear the waiting state from the UserInput node
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
        onClearExecutionState?.(); // Clear agent highlights on error too
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
        onRunComplete?.(statusResponse.status, statusResponse.output, statusResponse.error);
      });
    });

    eventSource.onerror = async () => {
      eventSource.close();

      // Poll for final status to see if there was an error we missed
      try {
        const statusResponse = await getRunStatus(runId);

        if (statusResponse.status === "failed" && statusResponse.error) {
          // Got an error from the backend - show it to the user
          onEventsChange((prev) => [
            ...prev,
            {
              id: `error-${Date.now()}`,
              type: "run_error",
              content: statusResponse.error,
              timestamp: Date.now(),
            },
          ]);
          onStatusChange("failed");
          onClearExecutionState?.();
        } else if (statusResponse.status === "completed") {
          // Run completed successfully - we just missed the event
          onStatusChange("completed");
          onClearExecutionState?.();
          onRunComplete?.(statusResponse.status, statusResponse.output, statusResponse.error);
        } else {
          // Still running or unknown state - show connection lost
          onEventsChange((prev) => [
            ...prev,
            {
              id: `error-${Date.now()}`,
              type: "run_error",
              content: "Connection to server lost. Check the backend console for errors.",
              timestamp: Date.now(),
            },
          ]);
          onStatusChange("failed");
          onClearExecutionState?.();
        }
      } catch {
        // Couldn't reach server at all
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
  }, [runId, onRunComplete, projectPath, onAgentStateChange, onToolStateChange, onUserInputStateChange, onClearExecutionState, onEventsChange, onStatusChange]);

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
    if (!runId || !pendingInput || !userInputValue.trim() || isSubmittingInput) return;

    setIsSubmittingInput(true);
    try {
      await submitUserInput(runId, {
        request_id: pendingInput.request_id,
        user_input: userInputValue.trim(),
      });
      // The pendingInput will be cleared when we receive the user_input_received event
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

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmitUserInput();
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

  const getEventColor = (type: EventType | "info"): string => {
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
              {event.type === "agent_output" || event.type === "run_error" || event.type === "warning" ? (
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
        <div className="border-t border-amber-600/50 bg-gray-800 p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-medium text-amber-400">
              {pendingInput.node_name}
            </span>
            <span className="text-xs text-gray-500">
              Variable: {`{${pendingInput.variable_name}}`}
            </span>
          </div>

          {pendingInput.previous_output && (
            <div className="mb-2 p-2 rounded bg-gray-700/50 text-xs text-gray-300 max-h-20 overflow-auto">
              <div className="text-gray-500 mb-1">Previous output:</div>
              <pre className="whitespace-pre-wrap font-mono">
                {pendingInput.previous_output.length > 500
                  ? pendingInput.previous_output.slice(0, 500) + "..."
                  : pendingInput.previous_output}
              </pre>
            </div>
          )}

          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={userInputValue}
              onChange={(e) => setUserInputValue(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Enter your response..."
              className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-500 resize-none"
              rows={2}
              disabled={isSubmittingInput}
            />
            <Button
              onClick={handleSubmitUserInput}
              disabled={!userInputValue.trim() || isSubmittingInput}
              className="bg-amber-600 hover:bg-amber-500 text-white px-4 self-end"
            >
              {isSubmittingInput ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Press {isMacOS() ? "⌘" : "Ctrl+"}Enter to submit
          </div>
        </div>
      )}
    </div>
  );
}
