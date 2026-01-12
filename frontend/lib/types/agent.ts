/**
 * Agent and workflow type definitions
 * These interfaces match the backend Pydantic models
 */

export interface Prompt {
  id: string;
  name: string;
  file_path: string; // Relative path to .prompt.md file
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
  include_contents?: boolean; // true = include history, false = no history
  strip_contents?: boolean;
  finish_reason_fail_fast?: boolean; // Fail if finish_reason is not STOP

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
  variables?: Record<string, unknown>;
  prompts: Prompt[];
  agents: Agent[];
  connections: WorkflowConnection[];
  metadata?: Record<string, unknown>;
}
