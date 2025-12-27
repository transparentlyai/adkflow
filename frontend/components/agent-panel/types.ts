import type {
  Agent,
  PlannerConfig,
  CodeExecutorConfig,
  HttpOptions,
} from "@/lib/types";
import type { Theme } from "@/lib/themes/types";

export interface HandleConfig {
  id: string;
  acceptedSources?: string[];
  acceptedTypes?: string[];
  style?: React.CSSProperties;
}

export interface HandleConfigs {
  agentInput?: HandleConfig;
  promptInput?: HandleConfig;
  toolsInput?: HandleConfig;
}

/**
 * Base props shared by all tab components
 */
export interface TabProps {
  agent: Agent;
  nodeId: string;
  theme: Theme;
  onUpdate: (updates: Partial<Agent>) => void;
}

/**
 * Props for the General tab which displays source, model, prompt, tools, and description
 */
export interface GeneralTabProps extends TabProps {
  connectedAgentName?: string;
  connectedPromptName?: string;
  connectedToolNames: string[];
  showHandles: boolean;
  handleConfigs?: HandleConfigs;
  agentInputValidityStyle: React.CSSProperties;
  promptInputValidityStyle: React.CSSProperties;
  toolsInputValidityStyle: React.CSSProperties;
  customModel: string;
  setCustomModel: (value: string) => void;
}

/**
 * Props for the Execution tab which handles planner, code executor, and HTTP options
 */
export interface ExecutionTabProps extends TabProps {
  handlePlannerUpdate: (updates: Partial<PlannerConfig>) => void;
  handleCodeExecutorUpdate: (updates: Partial<CodeExecutorConfig>) => void;
  handleHttpOptionsUpdate: (updates: Partial<HttpOptions>) => void;
}

/**
 * Props for the Flow tab - uses base TabProps
 */
export type FlowTabProps = TabProps;

/**
 * Props for the Schema tab - uses base TabProps
 */
export type SchemaTabProps = TabProps;

/**
 * Props for the Callbacks tab - uses base TabProps
 */
export type CallbacksTabProps = TabProps;
