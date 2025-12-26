/**
 * Type definitions for ADKFlow workflow elements
 * These interfaces match the backend Pydantic models
 */

import type { Node, Edge } from "@xyflow/react";

export interface Prompt {
  id: string;
  name: string;
  file_path: string;  // Relative path to .prompt.md file
}

export interface Subagent {
  id: string;
  prompt_ref: string;
  tools?: string[];
}

/**
 * Agent type - determines execution behavior
 */
export type AgentType = "llm" | "sequential" | "parallel" | "loop";

/**
 * Planner configuration for LLM agents
 */
export interface PlannerConfig {
  type: "none" | "builtin" | "react";
  thinking_budget?: number;
  include_thoughts?: boolean;
}

/**
 * Code executor configuration
 */
export interface CodeExecutorConfig {
  enabled: boolean;
  stateful?: boolean;
  error_retry_attempts?: number;
}

/**
 * HTTP/Retry configuration for API calls
 */
export interface HttpOptions {
  timeout?: number;
  max_retries?: number;
  retry_delay?: number;
  retry_backoff_multiplier?: number;
}

/**
 * Full ADK Agent configuration
 */
export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  model?: string;
  description?: string;

  // Model config
  temperature?: number;

  // Planner
  planner?: PlannerConfig;

  // Loop-specific
  max_iterations?: number;

  // Transfer controls
  disallow_transfer_to_parent?: boolean;
  disallow_transfer_to_peers?: boolean;

  // Schema validation
  input_schema?: string;
  output_schema?: string;
  output_key?: string;
  include_contents?: "default" | "none";

  // Callbacks (file paths to Python functions)
  before_model_callback?: string;
  after_model_callback?: string;
  before_tool_callback?: string;
  after_tool_callback?: string;

  // Code executor
  code_executor?: CodeExecutorConfig;

  // HTTP/Retry config
  http_options?: HttpOptions;

  // Existing
  tools?: string[];
  subagents?: Subagent[];
}

export type WorkflowAgent = Agent;

export interface WorkflowConnection {
  from_path: string;
  to_path: string;
}

export interface Workflow {
  name: string;
  version?: string;
  description?: string;
  variables?: Record<string, any>;
  prompts: Prompt[];
  agents: Agent[];
  connections: WorkflowConnection[];
  metadata?: Record<string, any>;
}

/**
 * Node types for the Drawflow canvas
 */
export type NodeType = "group" | "agent" | "prompt" | "context" | "inputProbe" | "outputProbe" | "logProbe" | "tool" | "agentTool" | "variable" | "teleportOut" | "teleportIn" | "userInput" | "start" | "end";

/**
 * Teleporter (flow connector) types for cross-flow connections
 */
export type TeleporterDirection = "output" | "input";

export interface TeleporterEntry {
  id: string;
  name: string;
  direction: TeleporterDirection;
  tabId: string;
  tabName: string;
  color: string;
}

export interface TeleporterRegistry {
  teleporters: TeleporterEntry[];
  colorMap: Record<string, string>;  // name -> color for consistent coloring
}

export interface TeleporterListResponse {
  teleporters: TeleporterEntry[];
  colorMap: Record<string, string>;
}

/**
 * Handle position for draggable handles
 */
export type HandleEdge = 'top' | 'right' | 'bottom' | 'left';

export interface HandlePosition {
  edge: HandleEdge;
  percent: number; // 0-100, position along the edge
}

export type HandlePositions = Record<string, HandlePosition>;

/**
 * Extended node data for Drawflow integration
 */
export interface NodeData {
  type: NodeType;
  id: string;
  name: string;
  model?: string;
  system_prompt?: string;
  tools?: string[];
  text?: string; // For prompt nodes
  description?: string;
  agents?: Agent[];
}

/**
 * API response types
 */
export interface ValidationResponse {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}


export interface ImportResponse {
  workflow: Workflow;
  success: boolean;
  message?: string;
}

export interface ToolsResponse {
  tools: string[];
  categories?: Record<string, string[]>;
}

export interface ReactFlowJSON {
  nodes: Node[];
  edges: Edge[];
  viewport: { x: number; y: number; zoom: number };
}

export interface ProjectLoadResponse {
  exists: boolean;
  flow: ReactFlowJSON | null;
  path: string;
}

export interface ProjectSaveRequest {
  path: string;
  flow: ReactFlowJSON;
}

export interface ProjectSaveResponse {
  success: boolean;
  path: string;
  message: string;
}

export interface PromptCreateResponse {
  success: boolean;
  file_path: string;
  absolute_path: string;
  message: string;
}

export interface PromptReadResponse {
  success: boolean;
  content: string;
  file_path: string;
}

export interface PromptSaveRequest {
  project_path: string;
  file_path: string;
  content: string;
}

export interface PromptSaveResponse {
  success: boolean;
  file_path: string;
  message: string;
}

export interface FileChunkResponse {
  success: boolean;
  content: string;
  file_path: string;
  total_lines: number;
  offset: number;
  has_more: boolean;
}

export interface DirectoryEntry {
  name: string;
  path: string;
  is_directory: boolean;
}

export interface DirectoryListResponse {
  current_path: string;
  parent_path: string | null;
  entries: DirectoryEntry[];
}

export interface DirectoryCreateResponse {
  success: boolean;
  created_path: string;
  message: string;
}

// Tab/Page types for multi-tab support
export interface TabMetadata {
  id: string;
  name: string;
  order: number;
}

export interface TabState extends TabMetadata {
  hasUnsavedChanges: boolean;
  isLoading: boolean;
}

export interface TabListResponse {
  tabs: TabMetadata[];
  name: string;
}

export interface TabCreateResponse {
  tab: TabMetadata;
}

export interface TabLoadResponse {
  flow: ReactFlowJSON;
}

export interface TabSaveResponse {
  success: boolean;
  message: string;
}

// Execution types for workflow running

export type RunStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

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
  | "user_input_timeout";

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
