/**
 * Execution and run type definitions
 * Includes run status, events, and user input types
 */

// Execution types for workflow running

export type RunStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type EventType =
  | "run_start"
  | "run_complete"
  | "agent_start"
  | "agent_end"
  | "agent_output"
  | "tool_call"
  | "tool_result"
  | "thinking"
  | "run_error"
  | "warning"
  | "user_input_required"
  | "user_input_received"
  | "user_input_timeout"
  | "callback_start"
  | "callback_end"
  | "callback_error"
  | "monitor_update";

export interface RunEvent {
  type: EventType;
  timestamp: number;
  run_id: string;
  agent_name?: string;
  data: Record<string, unknown>;
}

export interface RunRequest {
  project_path: string;
  tab_id?: string;
  input_data?: Record<string, unknown>;
  timeout_seconds?: number;
  validate_workflow?: boolean;
}

export interface RunResponse {
  run_id: string;
  status: string;
  message: string;
}

export interface RunStatusResponse {
  run_id: string;
  status: RunStatus;
  output?: string;
  error?: string;
  duration_ms: number;
  event_count: number;
}

export interface ValidateRequest {
  project_path: string;
}

export interface ValidateResponse {
  valid: boolean;
  errors: string[];
  warnings: string[];
  error_node_ids: string[];
  warning_node_ids: string[];
  // Node ID -> list of error/warning messages for tooltip display
  node_errors: Record<string, string[]>;
  node_warnings: Record<string, string[]>;
  agent_count: number;
  tab_count: number;
  teleporter_count: number;
}

export interface TopologyResponse {
  mermaid: string;
  ascii: string;
  agent_count: number;
}

// Node execution state for real-time highlighting during workflow runs
export type NodeExecutionState = "idle" | "running" | "completed" | "error";

// User Input types for interactive workflow pausing
export type TimeoutBehavior = "pass_through" | "predefined_text" | "error";

// Tool error handling behavior
export type ToolErrorBehavior = "fail_fast" | "pass_to_model";

export interface UserInputRequest {
  request_id: string;
  node_id: string;
  node_name: string;
  variable_name: string;
  is_trigger: boolean;
  previous_output: string | null;
  source_node_name: string | null;
  timeout_seconds: number;
}

export interface UserInputSubmission {
  request_id: string;
  user_input: string;
}

export interface UserInputResponse {
  success: boolean;
  message: string;
}
