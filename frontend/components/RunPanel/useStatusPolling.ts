/**
 * Custom hook for periodic status polling during workflow runs
 * Fallback mechanism for missed SSE events
 */

import { useEffect } from "react";
import type { RunStatus } from "@/lib/types";
import { getRunStatus } from "@/lib/api";
import type { DisplayEvent } from "./types";

interface UseStatusPollingOptions {
  runId: string | null;
  status: RunStatus;
  onEventsChange: React.Dispatch<React.SetStateAction<DisplayEvent[]>>;
  onStatusChange: (status: RunStatus) => void;
  onClearExecutionState?: () => void;
  onRunComplete?: (status: RunStatus, output?: string, error?: string) => void;
}

/**
 * Polls run status periodically as fallback for missed SSE events
 */
export function useStatusPolling({
  runId,
  status,
  onEventsChange,
  onStatusChange,
  onClearExecutionState,
  onRunComplete,
}: UseStatusPollingOptions) {
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
}
