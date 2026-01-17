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
  FileText,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { UserInputRequest } from "@/lib/types";
import { cancelRun, submitUserInput } from "@/lib/api";
import { getEventColor } from "./helpers";
import UserInputPanel from "./UserInputPanel";
import DebugPanel from "./DebugPanel";
import { useRunEvents } from "./useRunEvents";
import { useStatusPolling } from "./useStatusPolling";
import { useLoggingConfig } from "@/hooks/useLoggingConfig";
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
  onCallbackStateChange,
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
  const { isDevMode } = useLoggingConfig();

  // Open debug page in new tab
  const openDebugPage = useCallback(
    (tab: "logs" | "traces") => {
      const url = projectPath
        ? `/debug?project=${encodeURIComponent(projectPath)}&tab=${tab}`
        : `/debug?tab=${tab}`;
      window.open(url, "_blank");
    },
    [projectPath],
  );

  // Resize handling
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

  // User input callbacks
  const handleUserInputRequired = useCallback((request: UserInputRequest) => {
    setPendingInput(request);
    setUserInputValue("");
  }, []);

  const handleUserInputComplete = useCallback(() => {
    setPendingInput(null);
    setUserInputValue("");
  }, []);

  // SSE event handling
  useRunEvents({
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
    onUserInputRequired: handleUserInputRequired,
    onUserInputComplete: handleUserInputComplete,
  });

  // Status polling fallback
  useStatusPolling({
    runId,
    status,
    onEventsChange,
    onStatusChange,
    onClearExecutionState,
    onRunComplete,
  });

  // Auto-scroll to bottom
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
          {isDevMode && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openDebugPage("logs")}
                className="text-gray-400 hover:text-gray-200 h-6 w-6 p-0"
                title="Open Log Explorer"
              >
                <FileText className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openDebugPage("traces")}
                className="text-gray-400 hover:text-gray-200 h-6 w-6 p-0"
                title="Open Trace Explorer"
              >
                <Activity className="h-3 w-3" />
              </Button>
            </>
          )}
          <DebugPanel projectPath={projectPath} />
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
