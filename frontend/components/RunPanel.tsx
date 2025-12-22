"use client";

import { useEffect, useRef, useState } from "react";
import { X, Play, Square, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { RunEvent, RunStatus, EventType } from "@/lib/types";
import { createRunEventSource, cancelRun, getRunStatus } from "@/lib/api";

interface RunPanelProps {
  runId: string | null;
  projectPath: string;
  onClose: () => void;
  onRunComplete?: (status: RunStatus, output?: string, error?: string) => void;
}

interface DisplayEvent {
  id: string;
  type: EventType | "info";
  content: string;
  agentName?: string;
  timestamp: number;
}

export default function RunPanel({
  runId,
  projectPath,
  onClose,
  onRunComplete,
}: RunPanelProps) {
  const [events, setEvents] = useState<DisplayEvent[]>([]);
  const [status, setStatus] = useState<RunStatus>("pending");
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

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
        case "tool_call":
          return `Calling tool: ${event.data.tool_name}`;
        case "tool_result":
          return `Tool result: ${event.data.tool_name}`;
        case "thinking":
          return "Thinking...";
        case "error":
          return `Error: ${event.data.error || "Unknown error"}`;
        default:
          return JSON.stringify(event.data);
      }
    };

    const handleEvent = (event: RunEvent) => {
      const displayEvent: DisplayEvent = {
        id: `${event.type}-${event.timestamp}`,
        type: event.type,
        content: formatEventContent(event),
        agentName: event.agent_name,
        timestamp: event.timestamp,
      };

      setEvents((prev) => [...prev, displayEvent]);

      if (event.type === "run_complete") {
        setStatus("completed");
        const outputData = event.data.output as string | undefined;
        if (outputData) {
          setOutput(outputData);
        }
      } else if (event.type === "error") {
        setStatus("failed");
        const errorData = event.data.error as string | undefined;
        if (errorData) {
          setError(errorData);
        }
      }
    };

    setStatus("running");
    setEvents([
      {
        id: "start",
        type: "info",
        content: `Starting workflow run: ${runId}`,
        timestamp: Date.now(),
      },
    ]);

    const eventSource = createRunEventSource(runId);
    eventSourceRef.current = eventSource;

    // Handle specific event types
    const eventTypes = [
      "run_start",
      "run_complete",
      "agent_start",
      "agent_end",
      "agent_output",
      "tool_call",
      "tool_result",
      "thinking",
      "error",
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

    // Handle completion event
    eventSource.addEventListener("complete", () => {
      eventSource.close();
      // Fetch final status
      getRunStatus(runId).then((statusResponse) => {
        setStatus(statusResponse.status);
        if (statusResponse.output) {
          setOutput(statusResponse.output);
        }
        if (statusResponse.error) {
          setError(statusResponse.error);
        }
        onRunComplete?.(statusResponse.status, statusResponse.output, statusResponse.error);
      });
    });

    eventSource.onerror = () => {
      // Connection closed or error
      eventSource.close();
      setEvents((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          type: "error",
          content: "Connection to server lost",
          timestamp: Date.now(),
        },
      ]);
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [runId, onRunComplete, projectPath]);

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
        setStatus("cancelled");
        setEvents((prev) => [
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
      case "error":
        return "text-red-400";
      case "run_start":
      case "run_complete":
        return "text-cyan-400";
      case "info":
        return "text-gray-400";
      default:
        return "text-gray-300";
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-80 bg-gray-900 border-t border-gray-700 flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-sm font-medium text-gray-200">
            Workflow Run {runId ? `(${runId})` : ""}
          </span>
          <span className="text-xs text-gray-500 capitalize">{status}</span>
        </div>
        <div className="flex items-center gap-2">
          {status === "running" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="text-red-400 hover:text-red-300"
            >
              <Square className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Event log */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="font-mono text-sm space-y-1">
          {events.map((event) => (
            <div key={event.id} className={`${getEventColor(event.type)}`}>
              {event.agentName && (
                <span className="text-purple-400">[{event.agentName}] </span>
              )}
              {event.type === "agent_output" ? (
                <span className="whitespace-pre-wrap">{event.content}</span>
              ) : (
                <span>{event.content}</span>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Output/Error footer */}
      {(output || error) && (
        <div className="border-t border-gray-700 p-4 bg-gray-800 max-h-32 overflow-auto">
          {output && (
            <div className="text-green-400 font-mono text-sm">
              <span className="font-bold">Output: </span>
              <span className="whitespace-pre-wrap">{output}</span>
            </div>
          )}
          {error && (
            <div className="text-red-400 font-mono text-sm">
              <span className="font-bold">Error: </span>
              <span className="whitespace-pre-wrap">{error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
