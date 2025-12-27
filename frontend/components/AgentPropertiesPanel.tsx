"use client";

import { useState, useCallback, useMemo } from "react";
import { Handle, Position } from "@xyflow/react";
import type {
  Agent,
  PlannerConfig,
  CodeExecutorConfig,
  HttpOptions,
} from "@/lib/types";
import { isTypeCompatible } from "@/lib/types";
import { useTheme } from "@/contexts/ThemeContext";
import { useConnection } from "@/contexts/ConnectionContext";
import HandleTooltip from "@/components/HandleTooltip";

interface HandleConfig {
  id: string;
  acceptedSources?: string[];
  acceptedTypes?: string[];
  style?: React.CSSProperties;
}

interface AgentPropertiesPanelProps {
  agent: Agent;
  nodeId: string;
  connectedAgentName?: string;
  connectedPromptName?: string;
  connectedToolNames?: string[];
  onUpdate: (updates: Partial<Agent>) => void;
  disabled?: boolean;
  // Handle configuration for expanded mode
  showHandles?: boolean;
  handleConfigs?: {
    agentInput?: HandleConfig;
    promptInput?: HandleConfig;
    toolsInput?: HandleConfig;
  };
}

type TabId = "general" | "execution" | "flow" | "schema" | "callbacks";

const TABS: { id: TabId; label: string }[] = [
  { id: "general", label: "General" },
  { id: "execution", label: "Execution" },
  { id: "flow", label: "Flow" },
  { id: "schema", label: "Schema" },
  { id: "callbacks", label: "Callbacks" },
];

const MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.0-flash-exp",
  "gemini-2.0-flash",
];

const PLANNER_TYPES: { value: PlannerConfig["type"]; label: string }[] = [
  { value: "none", label: "None" },
  { value: "builtin", label: "Built-in (Thinking)" },
  { value: "react", label: "ReAct" },
];

export default function AgentPropertiesPanel({
  agent,
  nodeId,
  connectedAgentName,
  connectedPromptName,
  connectedToolNames = [],
  onUpdate,
  disabled = false,
  showHandles = false,
  handleConfigs,
}: AgentPropertiesPanelProps) {
  const { theme } = useTheme();
  const { connectionState } = useConnection();
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [customModel, setCustomModel] = useState("");

  // Compute validity style for a target handle based on connection state
  const getHandleValidityStyle = useCallback(
    (
      acceptedSources?: string[],
      acceptedTypes?: string[],
    ): React.CSSProperties => {
      if (!connectionState.isDragging || !acceptedSources || !acceptedTypes) {
        return {};
      }
      // Prevent self-connection
      if (connectionState.sourceNodeId === nodeId) {
        return {
          boxShadow: "0 0 0 2px #ef4444, 0 0 8px 2px #ef4444",
          cursor: "not-allowed",
        };
      }
      // Check type compatibility using source:type format
      const isValid = isTypeCompatible(
        connectionState.sourceOutputSource,
        connectionState.sourceOutputType,
        acceptedSources,
        acceptedTypes,
      );
      if (isValid) {
        return {
          boxShadow: "0 0 0 2px #22c55e, 0 0 8px 2px #22c55e",
          cursor: "pointer",
        };
      } else {
        return {
          boxShadow: "0 0 0 2px #ef4444, 0 0 8px 2px #ef4444",
          cursor: "not-allowed",
        };
      }
    },
    [connectionState, nodeId],
  );

  // Memoized validity styles for each handle
  const agentInputValidityStyle = useMemo(
    () =>
      getHandleValidityStyle(
        handleConfigs?.agentInput?.acceptedSources,
        handleConfigs?.agentInput?.acceptedTypes,
      ),
    [
      getHandleValidityStyle,
      handleConfigs?.agentInput?.acceptedSources,
      handleConfigs?.agentInput?.acceptedTypes,
    ],
  );
  const promptInputValidityStyle = useMemo(
    () =>
      getHandleValidityStyle(
        handleConfigs?.promptInput?.acceptedSources,
        handleConfigs?.promptInput?.acceptedTypes,
      ),
    [
      getHandleValidityStyle,
      handleConfigs?.promptInput?.acceptedSources,
      handleConfigs?.promptInput?.acceptedTypes,
    ],
  );
  const toolsInputValidityStyle = useMemo(
    () =>
      getHandleValidityStyle(
        handleConfigs?.toolsInput?.acceptedSources,
        handleConfigs?.toolsInput?.acceptedTypes,
      ),
    [
      getHandleValidityStyle,
      handleConfigs?.toolsInput?.acceptedSources,
      handleConfigs?.toolsInput?.acceptedTypes,
    ],
  );

  const handlePlannerUpdate = useCallback(
    (updates: Partial<PlannerConfig>) => {
      onUpdate({
        planner: {
          ...agent.planner,
          type: agent.planner?.type || "none",
          ...updates,
        },
      });
    },
    [agent.planner, onUpdate],
  );

  const handleCodeExecutorUpdate = useCallback(
    (updates: Partial<CodeExecutorConfig>) => {
      onUpdate({
        code_executor: {
          ...agent.code_executor,
          enabled: agent.code_executor?.enabled || false,
          ...updates,
        },
      });
    },
    [agent.code_executor, onUpdate],
  );

  const handleHttpOptionsUpdate = useCallback(
    (updates: Partial<HttpOptions>) => {
      onUpdate({
        http_options: { ...agent.http_options, ...updates },
      });
    },
    [agent.http_options, onUpdate],
  );

  const renderGeneralTab = () => (
    <div className="space-y-2">
      {/* Source (Connected Agent) - stacked because it has a handle */}
      <div className="space-y-1">
        <label
          className="text-xs font-medium"
          style={{ color: theme.colors.nodes.common.text.secondary }}
        >
          Source
        </label>
        <div
          className="relative flex items-center gap-2 px-2 py-1 text-sm border rounded"
          style={{
            backgroundColor: theme.colors.nodes.common.footer.background,
            borderColor: theme.colors.nodes.common.container.border,
          }}
        >
          {showHandles && handleConfigs?.agentInput && (
            <HandleTooltip
              label="Agent"
              sourceType={
                handleConfigs.agentInput.acceptedSources?.[0] || "agent"
              }
              dataType={handleConfigs.agentInput.acceptedTypes?.[0] || "dict"}
              type="input"
            >
              <Handle
                type="target"
                position={Position.Left}
                id={handleConfigs.agentInput.id}
                style={{
                  position: "absolute",
                  left: -5,
                  top: "50%",
                  transform: "translateY(-50%)",
                  transition: "box-shadow 0.15s ease",
                  ...handleConfigs.agentInput.style,
                  ...agentInputValidityStyle,
                }}
              />
            </HandleTooltip>
          )}
          <svg
            className="w-3.5 h-3.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ color: theme.colors.nodes.common.text.muted }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <span
            className={`text-xs ${connectedAgentName ? "" : "italic"}`}
            style={{
              color: connectedAgentName
                ? theme.colors.nodes.common.text.primary
                : theme.colors.nodes.common.text.muted,
            }}
          >
            {connectedAgentName || "None"}
          </span>
        </div>
      </div>

      {/* Model */}
      <div className="flex items-center gap-2">
        <label
          className="text-xs font-medium w-14 flex-shrink-0"
          style={{ color: theme.colors.nodes.common.text.secondary }}
        >
          Model
        </label>
        <select
          value={MODELS.includes(agent.model || "") ? agent.model : "custom"}
          onChange={(e) => {
            if (e.target.value === "custom") {
              setCustomModel(agent.model || "");
            } else {
              onUpdate({ model: e.target.value });
            }
          }}
          className="flex-1 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1"
          style={{
            backgroundColor: theme.colors.nodes.common.container.background,
            borderColor: theme.colors.nodes.common.container.border,
            color: theme.colors.nodes.common.text.primary,
          }}
        >
          {MODELS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
          <option value="custom">Custom...</option>
        </select>
      </div>
      {!MODELS.includes(agent.model || "") && (
        <div className="flex items-center gap-2">
          <div className="w-14 flex-shrink-0" />
          <input
            type="text"
            value={customModel || agent.model || ""}
            onChange={(e) => {
              setCustomModel(e.target.value);
              onUpdate({ model: e.target.value });
            }}
            placeholder="Custom model name"
            className="flex-1 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1"
            style={{
              backgroundColor: theme.colors.nodes.common.container.background,
              borderColor: theme.colors.nodes.common.container.border,
              color: theme.colors.nodes.common.text.primary,
            }}
          />
        </div>
      )}

      {/* Temperature */}
      <div className="flex items-center gap-2">
        <label
          className="text-xs font-medium w-14 flex-shrink-0"
          style={{ color: theme.colors.nodes.common.text.secondary }}
        >
          Temp
        </label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={agent.temperature ?? 0.7}
          onChange={(e) =>
            onUpdate({ temperature: parseFloat(e.target.value) })
          }
          className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer"
          style={{
            backgroundColor: theme.colors.ui.muted,
            accentColor: theme.colors.ui.primary,
          }}
        />
        <span
          className="text-xs w-6 text-right"
          style={{ color: theme.colors.nodes.common.text.muted }}
        >
          {agent.temperature?.toFixed(1) ?? "0.7"}
        </span>
      </div>

      {/* Prompt - stacked because it has a handle */}
      <div className="space-y-1">
        <label
          className="text-xs font-medium"
          style={{ color: theme.colors.nodes.common.text.secondary }}
        >
          Prompt
        </label>
        <div
          className="relative flex items-center gap-2 px-2 py-1 text-sm border rounded"
          style={{
            backgroundColor: theme.colors.nodes.common.footer.background,
            borderColor: theme.colors.nodes.common.container.border,
          }}
        >
          {showHandles && handleConfigs?.promptInput && (
            <HandleTooltip
              label="Prompt"
              sourceType={
                handleConfigs.promptInput.acceptedSources?.[0] || "prompt"
              }
              dataType={handleConfigs.promptInput.acceptedTypes?.[0] || "str"}
              type="input"
            >
              <Handle
                type="target"
                position={Position.Left}
                id={handleConfigs.promptInput.id}
                style={{
                  position: "absolute",
                  left: -5,
                  top: "50%",
                  transform: "translateY(-50%)",
                  transition: "box-shadow 0.15s ease",
                  ...handleConfigs.promptInput.style,
                  ...promptInputValidityStyle,
                }}
              />
            </HandleTooltip>
          )}
          <svg
            className="w-3.5 h-3.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ color: theme.colors.nodes.common.text.muted }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <span
            className={`text-xs ${connectedPromptName ? "" : "italic"}`}
            style={{
              color: connectedPromptName
                ? theme.colors.nodes.common.text.primary
                : theme.colors.nodes.common.text.muted,
            }}
          >
            {connectedPromptName || "None"}
          </span>
        </div>
      </div>

      {/* Tools - stacked because it has a handle */}
      <div className="space-y-1">
        <label
          className="text-xs font-medium"
          style={{ color: theme.colors.nodes.common.text.secondary }}
        >
          Tools
        </label>
        <div
          className="relative flex items-center gap-2 px-2 py-1 text-sm border rounded"
          style={{
            backgroundColor: theme.colors.nodes.common.footer.background,
            borderColor: theme.colors.nodes.common.container.border,
          }}
        >
          {showHandles && handleConfigs?.toolsInput && (
            <HandleTooltip
              label="Tools"
              sourceType={
                handleConfigs.toolsInput.acceptedSources?.[0] || "tool"
              }
              dataType={
                handleConfigs.toolsInput.acceptedTypes?.[0] || "callable"
              }
              type="input"
            >
              <Handle
                type="target"
                position={Position.Left}
                id={handleConfigs.toolsInput.id}
                style={{
                  position: "absolute",
                  left: -5,
                  top: "50%",
                  transform: "translateY(-50%)",
                  transition: "box-shadow 0.15s ease",
                  ...handleConfigs.toolsInput.style,
                  ...toolsInputValidityStyle,
                }}
              />
            </HandleTooltip>
          )}
          <svg
            className="w-3.5 h-3.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ color: theme.colors.nodes.common.text.muted }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span
            className={`text-xs ${connectedToolNames.length > 0 ? "truncate" : "italic"}`}
            style={{
              color:
                connectedToolNames.length > 0
                  ? theme.colors.nodes.common.text.primary
                  : theme.colors.nodes.common.text.muted,
            }}
          >
            {connectedToolNames.length > 0
              ? connectedToolNames.join(", ")
              : "None"}
          </span>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1">
        <label
          className="text-xs font-medium"
          style={{ color: theme.colors.nodes.common.text.secondary }}
        >
          Description
          <span
            className="font-normal ml-1"
            style={{ color: theme.colors.nodes.common.text.muted }}
          >
            (for routing)
          </span>
        </label>
        <textarea
          value={agent.description || ""}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="Describe what this agent does..."
          rows={2}
          className="w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 resize-none"
          style={{
            backgroundColor: theme.colors.nodes.common.container.background,
            borderColor: theme.colors.nodes.common.container.border,
            color: theme.colors.nodes.common.text.primary,
          }}
        />
      </div>
    </div>
  );

  const renderExecutionTab = () => (
    <div className="space-y-5">
      {/* Planner Section */}
      <div className="space-y-3">
        <h4
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: theme.colors.nodes.common.text.primary }}
        >
          Planner
        </h4>
        <div
          className="space-y-3 pl-2 border-l-2"
          style={{ borderColor: theme.colors.ui.primary }}
        >
          <div className="space-y-1.5">
            <label
              className="text-xs font-medium"
              style={{ color: theme.colors.nodes.common.text.secondary }}
            >
              Type
            </label>
            <select
              value={agent.planner?.type || "none"}
              onChange={(e) =>
                handlePlannerUpdate({
                  type: e.target.value as PlannerConfig["type"],
                })
              }
              className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1"
              style={{
                backgroundColor: theme.colors.nodes.common.container.background,
                borderColor: theme.colors.nodes.common.container.border,
                color: theme.colors.nodes.common.text.primary,
              }}
            >
              {PLANNER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {agent.planner?.type === "builtin" && (
            <>
              <div className="space-y-1.5">
                <label
                  className="text-xs font-medium"
                  style={{ color: theme.colors.nodes.common.text.secondary }}
                >
                  Thinking Budget
                </label>
                <input
                  type="number"
                  value={agent.planner?.thinking_budget ?? 2048}
                  onChange={(e) =>
                    handlePlannerUpdate({
                      thinking_budget: parseInt(e.target.value) || 2048,
                    })
                  }
                  min={0}
                  className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1"
                  style={{
                    backgroundColor:
                      theme.colors.nodes.common.container.background,
                    borderColor: theme.colors.nodes.common.container.border,
                    color: theme.colors.nodes.common.text.primary,
                  }}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={agent.planner?.include_thoughts ?? false}
                  onChange={(e) =>
                    handlePlannerUpdate({ include_thoughts: e.target.checked })
                  }
                  className="w-4 h-4 rounded focus:ring-1"
                  style={{
                    accentColor: theme.colors.ui.primary,
                    borderColor: theme.colors.nodes.common.container.border,
                  }}
                />
                <span
                  style={{ color: theme.colors.nodes.common.text.secondary }}
                >
                  Include thoughts in response
                </span>
              </label>
            </>
          )}
        </div>
      </div>

      {/* Code Executor Section */}
      <div className="space-y-3">
        <h4
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: theme.colors.nodes.common.text.primary }}
        >
          Code Executor
        </h4>
        <div
          className="space-y-3 pl-2 border-l-2"
          style={{ borderColor: theme.colors.ui.primary }}
        >
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={agent.code_executor?.enabled ?? false}
              onChange={(e) =>
                handleCodeExecutorUpdate({ enabled: e.target.checked })
              }
              className="w-4 h-4 rounded focus:ring-1"
              style={{
                accentColor: theme.colors.ui.primary,
                borderColor: theme.colors.nodes.common.container.border,
              }}
            />
            <span style={{ color: theme.colors.nodes.common.text.secondary }}>
              Enable code execution
            </span>
          </label>

          {agent.code_executor?.enabled && (
            <>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={agent.code_executor?.stateful ?? false}
                  onChange={(e) =>
                    handleCodeExecutorUpdate({ stateful: e.target.checked })
                  }
                  className="w-4 h-4 rounded focus:ring-1"
                  style={{
                    accentColor: theme.colors.ui.primary,
                    borderColor: theme.colors.nodes.common.container.border,
                  }}
                />
                <span
                  style={{ color: theme.colors.nodes.common.text.secondary }}
                >
                  Stateful (variables persist)
                </span>
              </label>
              <div className="space-y-1.5">
                <label
                  className="text-xs font-medium"
                  style={{ color: theme.colors.nodes.common.text.secondary }}
                >
                  Error Retry Attempts
                </label>
                <input
                  type="number"
                  value={agent.code_executor?.error_retry_attempts ?? 3}
                  onChange={(e) =>
                    handleCodeExecutorUpdate({
                      error_retry_attempts: parseInt(e.target.value) || 0,
                    })
                  }
                  min={0}
                  max={10}
                  className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1"
                  style={{
                    backgroundColor:
                      theme.colors.nodes.common.container.background,
                    borderColor: theme.colors.nodes.common.container.border,
                    color: theme.colors.nodes.common.text.primary,
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* HTTP Options Section */}
      <div className="space-y-3">
        <h4
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: theme.colors.nodes.common.text.primary }}
        >
          HTTP Options
        </h4>
        <div
          className="space-y-3 pl-2 border-l-2"
          style={{ borderColor: theme.colors.ui.primary }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label
                className="text-xs font-medium"
                style={{ color: theme.colors.nodes.common.text.secondary }}
              >
                Timeout (ms)
              </label>
              <input
                type="number"
                value={agent.http_options?.timeout ?? 30000}
                onChange={(e) =>
                  handleHttpOptionsUpdate({
                    timeout: parseInt(e.target.value) || 30000,
                  })
                }
                min={0}
                step={1000}
                className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1"
                style={{
                  backgroundColor:
                    theme.colors.nodes.common.container.background,
                  borderColor: theme.colors.nodes.common.container.border,
                  color: theme.colors.nodes.common.text.primary,
                }}
              />
            </div>
            <div className="space-y-1.5">
              <label
                className="text-xs font-medium"
                style={{ color: theme.colors.nodes.common.text.secondary }}
              >
                Max Retries
              </label>
              <input
                type="number"
                value={agent.http_options?.max_retries ?? 3}
                onChange={(e) =>
                  handleHttpOptionsUpdate({
                    max_retries: parseInt(e.target.value) || 0,
                  })
                }
                min={0}
                max={10}
                className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1"
                style={{
                  backgroundColor:
                    theme.colors.nodes.common.container.background,
                  borderColor: theme.colors.nodes.common.container.border,
                  color: theme.colors.nodes.common.text.primary,
                }}
              />
            </div>
            <div className="space-y-1.5">
              <label
                className="text-xs font-medium"
                style={{ color: theme.colors.nodes.common.text.secondary }}
              >
                Retry Delay (ms)
              </label>
              <input
                type="number"
                value={agent.http_options?.retry_delay ?? 1000}
                onChange={(e) =>
                  handleHttpOptionsUpdate({
                    retry_delay: parseInt(e.target.value) || 1000,
                  })
                }
                min={0}
                step={100}
                className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1"
                style={{
                  backgroundColor:
                    theme.colors.nodes.common.container.background,
                  borderColor: theme.colors.nodes.common.container.border,
                  color: theme.colors.nodes.common.text.primary,
                }}
              />
            </div>
            <div className="space-y-1.5">
              <label
                className="text-xs font-medium"
                style={{ color: theme.colors.nodes.common.text.secondary }}
              >
                Backoff Multiplier
              </label>
              <input
                type="number"
                value={agent.http_options?.retry_backoff_multiplier ?? 2}
                onChange={(e) =>
                  handleHttpOptionsUpdate({
                    retry_backoff_multiplier: parseFloat(e.target.value) || 2,
                  })
                }
                min={1}
                max={5}
                step={0.5}
                className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1"
                style={{
                  backgroundColor:
                    theme.colors.nodes.common.container.background,
                  borderColor: theme.colors.nodes.common.container.border,
                  color: theme.colors.nodes.common.text.primary,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFlowTab = () => (
    <div className="space-y-5">
      {/* Transfer Controls */}
      <div className="space-y-3">
        <h4
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: theme.colors.nodes.common.text.primary }}
        >
          Transfer Controls
        </h4>
        <div
          className="space-y-3 pl-2 border-l-2"
          style={{ borderColor: theme.colors.ui.primary }}
        >
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={agent.disallow_transfer_to_parent ?? false}
              onChange={(e) =>
                onUpdate({ disallow_transfer_to_parent: e.target.checked })
              }
              className="w-4 h-4 rounded focus:ring-1"
              style={{
                accentColor: theme.colors.ui.primary,
                borderColor: theme.colors.nodes.common.container.border,
              }}
            />
            <span style={{ color: theme.colors.nodes.common.text.secondary }}>
              Disallow transfer to parent
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={agent.disallow_transfer_to_peers ?? false}
              onChange={(e) =>
                onUpdate({ disallow_transfer_to_peers: e.target.checked })
              }
              className="w-4 h-4 rounded focus:ring-1"
              style={{
                accentColor: theme.colors.ui.primary,
                borderColor: theme.colors.nodes.common.container.border,
              }}
            />
            <span style={{ color: theme.colors.nodes.common.text.secondary }}>
              Disallow transfer to peers
            </span>
          </label>
        </div>
      </div>

      {/* Loop Settings */}
      {agent.type === "loop" && (
        <div className="space-y-3">
          <h4
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: theme.colors.nodes.common.text.primary }}
          >
            Loop Settings
          </h4>
          <div
            className="space-y-3 pl-2 border-l-2"
            style={{ borderColor: theme.colors.ui.primary }}
          >
            <div className="space-y-1.5">
              <label
                className="text-xs font-medium"
                style={{ color: theme.colors.nodes.common.text.secondary }}
              >
                Max Iterations
              </label>
              <input
                type="number"
                value={agent.max_iterations ?? 5}
                onChange={(e) =>
                  onUpdate({ max_iterations: parseInt(e.target.value) || 5 })
                }
                min={1}
                max={100}
                className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1"
                style={{
                  backgroundColor:
                    theme.colors.nodes.common.container.background,
                  borderColor: theme.colors.nodes.common.container.border,
                  color: theme.colors.nodes.common.text.primary,
                }}
              />
              <p
                className="text-xs"
                style={{ color: theme.colors.nodes.common.text.muted }}
              >
                Loop terminates after this many iterations or when escalate=True
              </p>
            </div>
          </div>
        </div>
      )}

      {agent.type !== "loop" && (
        <div
          className="text-sm italic"
          style={{ color: theme.colors.nodes.common.text.muted }}
        >
          Loop settings are only available for Loop agents.
        </div>
      )}
    </div>
  );

  const renderSchemaTab = () => {
    const outputKeyRequired =
      agent.include_contents === "none" && !agent.output_key;

    return (
      <div className="space-y-5">
        {/* Output Configuration */}
        <div className="space-y-3">
          <h4
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: theme.colors.nodes.common.text.primary }}
          >
            Output Configuration
          </h4>
          <div
            className="space-y-3 pl-2 border-l-2"
            style={{ borderColor: theme.colors.ui.primary }}
          >
            <div className="space-y-1.5">
              <label
                className="text-xs font-medium"
                style={{ color: theme.colors.nodes.common.text.secondary }}
              >
                Output Key
                {agent.include_contents === "none" && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </label>
              <input
                type="text"
                value={agent.output_key || ""}
                onChange={(e) =>
                  onUpdate({ output_key: e.target.value || undefined })
                }
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="e.g., result"
                className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1"
                style={{
                  backgroundColor:
                    theme.colors.nodes.common.container.background,
                  borderColor: outputKeyRequired
                    ? "#ef4444"
                    : theme.colors.nodes.common.container.border,
                  color: theme.colors.nodes.common.text.primary,
                }}
              />
              {outputKeyRequired ? (
                <p className="text-xs text-red-500">
                  Required when Include Contents is &quot;None&quot;
                </p>
              ) : (
                <p
                  className="text-xs"
                  style={{ color: theme.colors.nodes.common.text.muted }}
                >
                  Saves agent output to session state with this key
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                className="text-xs font-medium"
                style={{ color: theme.colors.nodes.common.text.secondary }}
              >
                Include Contents
              </label>
              <select
                value={agent.include_contents || "default"}
                onChange={(e) =>
                  onUpdate({
                    include_contents: e.target.value as "default" | "none",
                  })
                }
                className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1"
                style={{
                  backgroundColor:
                    theme.colors.nodes.common.container.background,
                  borderColor: theme.colors.nodes.common.container.border,
                  color: theme.colors.nodes.common.text.primary,
                }}
              >
                <option value="default">Default</option>
                <option value="none">None</option>
              </select>
              <p
                className="text-xs"
                style={{ color: theme.colors.nodes.common.text.muted }}
              >
                Controls content inclusion in agent processing
              </p>
            </div>
          </div>
        </div>

        {/* Schema Validation */}
        <div className="space-y-3">
          <h4
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: theme.colors.nodes.common.text.primary }}
          >
            Schema Validation
          </h4>
          <div
            className="p-3 border rounded-md"
            style={{
              backgroundColor: theme.colors.nodes.common.footer.background,
              borderColor: theme.colors.nodes.common.container.border,
            }}
          >
            <p
              className="text-xs"
              style={{ color: theme.colors.nodes.common.text.muted }}
            >
              <strong>Note:</strong> Schema validation cannot be used with tools
              or agent transfers.
            </p>
          </div>
          <div
            className="space-y-3 pl-2 border-l-2"
            style={{ borderColor: theme.colors.ui.primary }}
          >
            <div className="space-y-1.5">
              <label
                className="text-xs font-medium"
                style={{ color: theme.colors.nodes.common.text.secondary }}
              >
                Input Schema
              </label>
              <input
                type="text"
                value={agent.input_schema || ""}
                onChange={(e) =>
                  onUpdate({ input_schema: e.target.value || undefined })
                }
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="e.g., models.TaskInput"
                className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1"
                style={{
                  backgroundColor:
                    theme.colors.nodes.common.container.background,
                  borderColor: theme.colors.nodes.common.container.border,
                  color: theme.colors.nodes.common.text.primary,
                }}
              />
              <p
                className="text-xs"
                style={{ color: theme.colors.nodes.common.text.muted }}
              >
                Pydantic BaseModel class path
              </p>
            </div>

            <div className="space-y-1.5">
              <label
                className="text-xs font-medium"
                style={{ color: theme.colors.nodes.common.text.secondary }}
              >
                Output Schema
              </label>
              <input
                type="text"
                value={agent.output_schema || ""}
                onChange={(e) =>
                  onUpdate({ output_schema: e.target.value || undefined })
                }
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="e.g., models.TaskOutput"
                className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1"
                style={{
                  backgroundColor:
                    theme.colors.nodes.common.container.background,
                  borderColor: theme.colors.nodes.common.container.border,
                  color: theme.colors.nodes.common.text.primary,
                }}
              />
              <p
                className="text-xs"
                style={{ color: theme.colors.nodes.common.text.muted }}
              >
                Pydantic BaseModel class path
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCallbacksTab = () => (
    <div className="space-y-5">
      <div className="space-y-3">
        <h4
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: theme.colors.nodes.common.text.primary }}
        >
          Model Callbacks
        </h4>
        <div
          className="space-y-3 pl-2 border-l-2"
          style={{ borderColor: theme.colors.ui.primary }}
        >
          <div className="space-y-1.5">
            <label
              className="text-xs font-medium"
              style={{ color: theme.colors.nodes.common.text.secondary }}
            >
              Before Model Callback
            </label>
            <input
              type="text"
              value={agent.before_model_callback || ""}
              onChange={(e) =>
                onUpdate({ before_model_callback: e.target.value || undefined })
              }
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="e.g., callbacks/guardrails.py"
              className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1"
              style={{
                backgroundColor: theme.colors.nodes.common.container.background,
                borderColor: theme.colors.nodes.common.container.border,
                color: theme.colors.nodes.common.text.primary,
              }}
            />
          </div>
          <div className="space-y-1.5">
            <label
              className="text-xs font-medium"
              style={{ color: theme.colors.nodes.common.text.secondary }}
            >
              After Model Callback
            </label>
            <input
              type="text"
              value={agent.after_model_callback || ""}
              onChange={(e) =>
                onUpdate({ after_model_callback: e.target.value || undefined })
              }
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="e.g., callbacks/logging.py"
              className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1"
              style={{
                backgroundColor: theme.colors.nodes.common.container.background,
                borderColor: theme.colors.nodes.common.container.border,
                color: theme.colors.nodes.common.text.primary,
              }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h4
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: theme.colors.nodes.common.text.primary }}
        >
          Tool Callbacks
        </h4>
        <div
          className="space-y-3 pl-2 border-l-2"
          style={{ borderColor: theme.colors.ui.primary }}
        >
          <div className="space-y-1.5">
            <label
              className="text-xs font-medium"
              style={{ color: theme.colors.nodes.common.text.secondary }}
            >
              Before Tool Callback
            </label>
            <input
              type="text"
              value={agent.before_tool_callback || ""}
              onChange={(e) =>
                onUpdate({ before_tool_callback: e.target.value || undefined })
              }
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="e.g., callbacks/validation.py"
              className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1"
              style={{
                backgroundColor: theme.colors.nodes.common.container.background,
                borderColor: theme.colors.nodes.common.container.border,
                color: theme.colors.nodes.common.text.primary,
              }}
            />
          </div>
          <div className="space-y-1.5">
            <label
              className="text-xs font-medium"
              style={{ color: theme.colors.nodes.common.text.secondary }}
            >
              After Tool Callback
            </label>
            <input
              type="text"
              value={agent.after_tool_callback || ""}
              onChange={(e) =>
                onUpdate({ after_tool_callback: e.target.value || undefined })
              }
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="e.g., callbacks/artifact_save.py"
              className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1"
              style={{
                backgroundColor: theme.colors.nodes.common.container.background,
                borderColor: theme.colors.nodes.common.container.border,
                color: theme.colors.nodes.common.text.primary,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "general":
        return renderGeneralTab();
      case "execution":
        return renderExecutionTab();
      case "flow":
        return renderFlowTab();
      case "schema":
        return renderSchemaTab();
      case "callbacks":
        return renderCallbacksTab();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab Bar */}
      <div
        className="flex border-b"
        style={{
          borderColor: theme.colors.nodes.common.container.border,
          backgroundColor: theme.colors.nodes.common.footer.background,
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-3 py-2 text-xs font-medium transition-colors"
            style={
              activeTab === tab.id
                ? {
                    color: theme.colors.ui.primary,
                    borderBottom: `2px solid ${theme.colors.ui.primary}`,
                    backgroundColor:
                      theme.colors.nodes.common.container.background,
                    marginBottom: "-1px",
                  }
                : {
                    color: theme.colors.nodes.common.text.muted,
                  }
            }
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.backgroundColor = theme.colors.ui.accent;
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.backgroundColor = "transparent";
              }
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div
        className={`p-3 nodrag nowheel nopan ${disabled ? "opacity-60 pointer-events-none" : ""}`}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {renderTabContent()}
      </div>
    </div>
  );
}
