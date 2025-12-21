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
export type NodeType = "group" | "agent" | "prompt" | "context" | "inputProbe" | "outputProbe" | "logProbe" | "tool" | "agentTool" | "variable" | "teleportOut" | "teleportIn" | "userInput";

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
 * Drawflow node structure
 */
export interface DrawflowNode {
  id: number;
  name: string;
  data: NodeData;
  class: string;
  html: string;
  typenode: boolean;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  pos_x: number;
  pos_y: number;
}

/**
 * API response types
 */
export interface ValidationResponse {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

export interface ExportResponse {
  yaml: string;
  filename?: string;
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

export interface PromptReadRequest {
  project_path: string;
  file_path: string;
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

export interface FileChunkRequest {
  project_path: string;
  file_path: string;
  offset?: number;
  limit?: number;
  reverse?: boolean;
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

export interface DirectoryCreateRequest {
  path: string;
  name: string;
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
