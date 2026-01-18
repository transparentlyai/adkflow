import type { EventType, RunStatus, NodeExecutionState } from "@/lib/types";

export interface DisplayEvent {
  id: string;
  type: EventType | "info";
  content: string;
  agentName?: string;
  timestamp: number;
}

export interface RunPanelProps {
  runId: string | null;
  projectPath: string;
  onClose: () => void;
  onRunComplete?: (status: RunStatus, output?: string, error?: string) => void;
  onAgentStateChange?: (agentName: string, state: NodeExecutionState) => void;
  onToolStateChange?: (toolName: string, state: NodeExecutionState) => void;
  onCallbackStateChange?: (callbackName: string, state: NodeExecutionState) => void;
  onUserInputStateChange?: (nodeId: string, isWaiting: boolean) => void;
  onClearExecutionState?: () => void;
  onMonitorUpdate?: (nodeId: string, value: string, valueType: string, timestamp: string) => void;
  events: DisplayEvent[];
  onEventsChange: React.Dispatch<React.SetStateAction<DisplayEvent[]>>;
  lastRunStatus: RunStatus;
  onStatusChange: (status: RunStatus) => void;
}
