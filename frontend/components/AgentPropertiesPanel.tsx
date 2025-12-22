"use client";

import { useState, useCallback } from "react";
import type { Agent, AgentType, PlannerConfig, CodeExecutorConfig, HttpOptions } from "@/lib/types";
import { useTheme } from "@/contexts/ThemeContext";

interface AgentPropertiesPanelProps {
  agent: Agent;
  connectedPromptName?: string;
  connectedToolNames?: string[];
  onUpdate: (updates: Partial<Agent>) => void;
  disabled?: boolean;
}

type TabId = "general" | "execution" | "flow" | "schema" | "callbacks";

const TABS: { id: TabId; label: string }[] = [
  { id: "general", label: "General" },
  { id: "execution", label: "Execution" },
  { id: "flow", label: "Flow" },
  { id: "schema", label: "Schema" },
  { id: "callbacks", label: "Callbacks" },
];

const AGENT_TYPES: { value: AgentType; label: string }[] = [
  { value: "llm", label: "LLM Agent" },
  { value: "sequential", label: "Sequential" },
  { value: "parallel", label: "Parallel" },
  { value: "loop", label: "Loop" },
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
  connectedPromptName,
  connectedToolNames = [],
  onUpdate,
  disabled = false,
}: AgentPropertiesPanelProps) {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [customModel, setCustomModel] = useState("");

  const handlePlannerUpdate = useCallback(
    (updates: Partial<PlannerConfig>) => {
      onUpdate({
        planner: { ...agent.planner, type: agent.planner?.type || "none", ...updates },
      });
    },
    [agent.planner, onUpdate]
  );

  const handleCodeExecutorUpdate = useCallback(
    (updates: Partial<CodeExecutorConfig>) => {
      onUpdate({
        code_executor: { ...agent.code_executor, enabled: agent.code_executor?.enabled || false, ...updates },
      });
    },
    [agent.code_executor, onUpdate]
  );

  const handleHttpOptionsUpdate = useCallback(
    (updates: Partial<HttpOptions>) => {
      onUpdate({
        http_options: { ...agent.http_options, ...updates },
      });
    },
    [agent.http_options, onUpdate]
  );

  const renderGeneralTab = () => (
    <div className="space-y-4">
      {/* Type */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium" style={{ color: theme.colors.nodes.common.text.secondary }}>Type</label>
        <select
          value={agent.type}
          onChange={(e) => onUpdate({ type: e.target.value as AgentType })}
          className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1"
          style={{
            backgroundColor: theme.colors.nodes.common.container.background,
            borderColor: theme.colors.nodes.common.container.border,
            color: theme.colors.nodes.common.text.primary
          }}
        >
          {AGENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Model */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium" style={{ color: theme.colors.nodes.common.text.secondary }}>Model</label>
        <select
          value={MODELS.includes(agent.model || "") ? agent.model : "custom"}
          onChange={(e) => {
            if (e.target.value === "custom") {
              setCustomModel(agent.model || "");
            } else {
              onUpdate({ model: e.target.value });
            }
          }}
          className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1"
          style={{
            backgroundColor: theme.colors.nodes.common.container.background,
            borderColor: theme.colors.nodes.common.container.border,
            color: theme.colors.nodes.common.text.primary
          }}
        >
          {MODELS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
          <option value="custom">Custom...</option>
        </select>
        {!MODELS.includes(agent.model || "") && (
          <input
            type="text"
            value={customModel || agent.model || ""}
            onChange={(e) => {
              setCustomModel(e.target.value);
              onUpdate({ model: e.target.value });
            }}
            placeholder="Enter custom model name"
            className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 mt-1.5"
            style={{
              backgroundColor: theme.colors.nodes.common.container.background,
              borderColor: theme.colors.nodes.common.container.border,
              color: theme.colors.nodes.common.text.primary
            }}
          />
        )}
      </div>

      {/* Temperature */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium" style={{ color: theme.colors.nodes.common.text.secondary }}>
          Temperature: {agent.temperature?.toFixed(1) ?? "0.7"}
        </label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={agent.temperature ?? 0.7}
          onChange={(e) => onUpdate({ temperature: parseFloat(e.target.value) })}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer"
          style={{
            backgroundColor: theme.colors.ui.muted,
            accentColor: theme.colors.ui.primary
          }}
        />
        <div className="flex justify-between text-xs" style={{ color: theme.colors.nodes.common.text.muted }}>
          <span>0</span>
          <span>1</span>
          <span>2</span>
        </div>
      </div>

      {/* Connected Prompt */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium" style={{ color: theme.colors.nodes.common.text.secondary }}>Connected Prompt</label>
        <div className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md" style={{
          backgroundColor: theme.colors.nodes.common.footer.background,
          borderColor: theme.colors.nodes.common.container.border
        }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: theme.colors.nodes.common.text.muted }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className={connectedPromptName ? "" : "italic"} style={{
            color: connectedPromptName ? theme.colors.nodes.common.text.primary : theme.colors.nodes.common.text.muted
          }}>
            {connectedPromptName || "No prompt connected"}
          </span>
        </div>
      </div>

      {/* Connected Tools */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium" style={{ color: theme.colors.nodes.common.text.secondary }}>Connected Tools</label>
        <div className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md" style={{
          backgroundColor: theme.colors.nodes.common.footer.background,
          borderColor: theme.colors.nodes.common.container.border
        }}>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: theme.colors.nodes.common.text.muted }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className={connectedToolNames.length > 0 ? "truncate" : "italic"} style={{
            color: connectedToolNames.length > 0 ? theme.colors.nodes.common.text.primary : theme.colors.nodes.common.text.muted
          }}>
            {connectedToolNames.length > 0 ? connectedToolNames.join(", ") : "No tools connected"}
          </span>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium" style={{ color: theme.colors.nodes.common.text.secondary }}>
          Description
          <span className="font-normal ml-1" style={{ color: theme.colors.nodes.common.text.muted }}>(for multi-agent routing)</span>
        </label>
        <textarea
          value={agent.description || ""}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="Describe what this agent does..."
          rows={3}
          className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 resize-none"
          style={{
            backgroundColor: theme.colors.nodes.common.container.background,
            borderColor: theme.colors.nodes.common.container.border,
            color: theme.colors.nodes.common.text.primary
          }}
        />
      </div>
    </div>
  );

  const renderExecutionTab = () => (
    <div className="space-y-5">
      {/* Planner Section */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.colors.nodes.common.text.primary }}>Planner</h4>
        <div className="space-y-3 pl-2 border-l-2" style={{ borderColor: theme.colors.ui.primary }}>
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: theme.colors.nodes.common.text.secondary }}>Type</label>
            <select
              value={agent.planner?.type || "none"}
              onChange={(e) => handlePlannerUpdate({ type: e.target.value as PlannerConfig["type"] })}
              className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1"
              style={{
                backgroundColor: theme.colors.nodes.common.container.background,
                borderColor: theme.colors.nodes.common.container.border,
                color: theme.colors.nodes.common.text.primary
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
                <label className="text-xs font-medium" style={{ color: theme.colors.nodes.common.text.secondary }}>Thinking Budget</label>
                <input
                  type="number"
                  value={agent.planner?.thinking_budget ?? 2048}
                  onChange={(e) => handlePlannerUpdate({ thinking_budget: parseInt(e.target.value) || 2048 })}
                  min={0}
                  className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1"
                  style={{
                    backgroundColor: theme.colors.nodes.common.container.background,
                    borderColor: theme.colors.nodes.common.container.border,
                    color: theme.colors.nodes.common.text.primary
                  }}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={agent.planner?.include_thoughts ?? false}
                  onChange={(e) => handlePlannerUpdate({ include_thoughts: e.target.checked })}
                  className="w-4 h-4 rounded focus:ring-1"
                  style={{
                    accentColor: theme.colors.ui.primary,
                    borderColor: theme.colors.nodes.common.container.border
                  }}
                />
                <span style={{ color: theme.colors.nodes.common.text.secondary }}>Include thoughts in response</span>
              </label>
            </>
          )}
        </div>
      </div>

      {/* Code Executor Section */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.colors.nodes.common.text.primary }}>Code Executor</h4>
        <div className="space-y-3 pl-2 border-l-2" style={{ borderColor: theme.colors.ui.primary }}>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={agent.code_executor?.enabled ?? false}
              onChange={(e) => handleCodeExecutorUpdate({ enabled: e.target.checked })}
              className="w-4 h-4 rounded focus:ring-1"
              style={{
                accentColor: theme.colors.ui.primary,
                borderColor: theme.colors.nodes.common.container.border
              }}
            />
            <span style={{ color: theme.colors.nodes.common.text.secondary }}>Enable code execution</span>
          </label>

          {agent.code_executor?.enabled && (
            <>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={agent.code_executor?.stateful ?? false}
                  onChange={(e) => handleCodeExecutorUpdate({ stateful: e.target.checked })}
                  className="w-4 h-4 rounded focus:ring-1"
                  style={{
                    accentColor: theme.colors.ui.primary,
                    borderColor: theme.colors.nodes.common.container.border
                  }}
                />
                <span style={{ color: theme.colors.nodes.common.text.secondary }}>Stateful (variables persist)</span>
              </label>
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: theme.colors.nodes.common.text.secondary }}>Error Retry Attempts</label>
                <input
                  type="number"
                  value={agent.code_executor?.error_retry_attempts ?? 3}
                  onChange={(e) => handleCodeExecutorUpdate({ error_retry_attempts: parseInt(e.target.value) || 0 })}
                  min={0}
                  max={10}
                  className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1"
                  style={{
                    backgroundColor: theme.colors.nodes.common.container.background,
                    borderColor: theme.colors.nodes.common.container.border,
                    color: theme.colors.nodes.common.text.primary
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* HTTP Options Section */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.colors.nodes.common.text.primary }}>HTTP Options</h4>
        <div className="space-y-3 pl-2 border-l-2" style={{ borderColor: theme.colors.ui.primary }}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: theme.colors.nodes.common.text.secondary }}>Timeout (ms)</label>
              <input
                type="number"
                value={agent.http_options?.timeout ?? 30000}
                onChange={(e) => handleHttpOptionsUpdate({ timeout: parseInt(e.target.value) || 30000 })}
                min={0}
                step={1000}
                className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1"
                style={{
                  backgroundColor: theme.colors.nodes.common.container.background,
                  borderColor: theme.colors.nodes.common.container.border,
                  color: theme.colors.nodes.common.text.primary
                }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: theme.colors.nodes.common.text.secondary }}>Max Retries</label>
              <input
                type="number"
                value={agent.http_options?.max_retries ?? 3}
                onChange={(e) => handleHttpOptionsUpdate({ max_retries: parseInt(e.target.value) || 0 })}
                min={0}
                max={10}
                className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1"
                style={{
                  backgroundColor: theme.colors.nodes.common.container.background,
                  borderColor: theme.colors.nodes.common.container.border,
                  color: theme.colors.nodes.common.text.primary
                }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: theme.colors.nodes.common.text.secondary }}>Retry Delay (ms)</label>
              <input
                type="number"
                value={agent.http_options?.retry_delay ?? 1000}
                onChange={(e) => handleHttpOptionsUpdate({ retry_delay: parseInt(e.target.value) || 1000 })}
                min={0}
                step={100}
                className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1"
                style={{
                  backgroundColor: theme.colors.nodes.common.container.background,
                  borderColor: theme.colors.nodes.common.container.border,
                  color: theme.colors.nodes.common.text.primary
                }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: theme.colors.nodes.common.text.secondary }}>Backoff Multiplier</label>
              <input
                type="number"
                value={agent.http_options?.retry_backoff_multiplier ?? 2}
                onChange={(e) => handleHttpOptionsUpdate({ retry_backoff_multiplier: parseFloat(e.target.value) || 2 })}
                min={1}
                max={5}
                step={0.5}
                className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1"
                style={{
                  backgroundColor: theme.colors.nodes.common.container.background,
                  borderColor: theme.colors.nodes.common.container.border,
                  color: theme.colors.nodes.common.text.primary
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
        <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.colors.nodes.common.text.primary }}>Transfer Controls</h4>
        <div className="space-y-3 pl-2 border-l-2" style={{ borderColor: theme.colors.ui.primary }}>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={agent.disallow_transfer_to_parent ?? false}
              onChange={(e) => onUpdate({ disallow_transfer_to_parent: e.target.checked })}
              className="w-4 h-4 rounded focus:ring-1"
              style={{
                accentColor: theme.colors.ui.primary,
                borderColor: theme.colors.nodes.common.container.border
              }}
            />
            <span style={{ color: theme.colors.nodes.common.text.secondary }}>Disallow transfer to parent</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={agent.disallow_transfer_to_peers ?? false}
              onChange={(e) => onUpdate({ disallow_transfer_to_peers: e.target.checked })}
              className="w-4 h-4 rounded focus:ring-1"
              style={{
                accentColor: theme.colors.ui.primary,
                borderColor: theme.colors.nodes.common.container.border
              }}
            />
            <span style={{ color: theme.colors.nodes.common.text.secondary }}>Disallow transfer to peers</span>
          </label>
        </div>
      </div>

      {/* Loop Settings */}
      {agent.type === "loop" && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.colors.nodes.common.text.primary }}>Loop Settings</h4>
          <div className="space-y-3 pl-2 border-l-2" style={{ borderColor: theme.colors.ui.primary }}>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: theme.colors.nodes.common.text.secondary }}>Max Iterations</label>
              <input
                type="number"
                value={agent.max_iterations ?? 5}
                onChange={(e) => onUpdate({ max_iterations: parseInt(e.target.value) || 5 })}
                min={1}
                max={100}
                className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1"
                style={{
                  backgroundColor: theme.colors.nodes.common.container.background,
                  borderColor: theme.colors.nodes.common.container.border,
                  color: theme.colors.nodes.common.text.primary
                }}
              />
              <p className="text-xs" style={{ color: theme.colors.nodes.common.text.muted }}>
                Loop terminates after this many iterations or when escalate=True
              </p>
            </div>
          </div>
        </div>
      )}

      {agent.type !== "loop" && (
        <div className="text-sm italic" style={{ color: theme.colors.nodes.common.text.muted }}>
          Loop settings are only available for Loop agents.
        </div>
      )}
    </div>
  );

  const renderSchemaTab = () => {
    const outputKeyRequired = agent.include_contents === "none" && !agent.output_key;

    return (
    <div className="space-y-5">
      {/* Output Configuration */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.colors.nodes.common.text.primary }}>Output Configuration</h4>
        <div className="space-y-3 pl-2 border-l-2" style={{ borderColor: theme.colors.ui.primary }}>
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: theme.colors.nodes.common.text.secondary }}>
              Output Key
              {agent.include_contents === "none" && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="text"
              value={agent.output_key || ""}
              onChange={(e) => onUpdate({ output_key: e.target.value || undefined })}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="e.g., result"
              className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1"
              style={{
                backgroundColor: theme.colors.nodes.common.container.background,
                borderColor: outputKeyRequired ? "#ef4444" : theme.colors.nodes.common.container.border,
                color: theme.colors.nodes.common.text.primary
              }}
            />
            {outputKeyRequired ? (
              <p className="text-xs text-red-500">Required when Include Contents is &quot;None&quot;</p>
            ) : (
              <p className="text-xs" style={{ color: theme.colors.nodes.common.text.muted }}>Saves agent output to session state with this key</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: theme.colors.nodes.common.text.secondary }}>Include Contents</label>
            <select
              value={agent.include_contents || "default"}
              onChange={(e) => onUpdate({ include_contents: e.target.value as "default" | "none" })}
              className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1"
              style={{
                backgroundColor: theme.colors.nodes.common.container.background,
                borderColor: theme.colors.nodes.common.container.border,
                color: theme.colors.nodes.common.text.primary
              }}
            >
              <option value="default">Default</option>
              <option value="none">None</option>
            </select>
            <p className="text-xs" style={{ color: theme.colors.nodes.common.text.muted }}>Controls content inclusion in agent processing</p>
          </div>
        </div>
      </div>

      {/* Schema Validation */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.colors.nodes.common.text.primary }}>Schema Validation</h4>
        <div
          className="p-3 border rounded-md"
          style={{
            backgroundColor: theme.colors.nodes.common.footer.background,
            borderColor: theme.colors.nodes.common.container.border,
          }}
        >
          <p className="text-xs" style={{ color: theme.colors.nodes.common.text.muted }}>
            <strong>Note:</strong> Schema validation cannot be used with tools or agent transfers.
          </p>
        </div>
        <div className="space-y-3 pl-2 border-l-2" style={{ borderColor: theme.colors.ui.primary }}>
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: theme.colors.nodes.common.text.secondary }}>Input Schema</label>
            <input
              type="text"
              value={agent.input_schema || ""}
              onChange={(e) => onUpdate({ input_schema: e.target.value || undefined })}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="e.g., models.TaskInput"
              className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1"
              style={{
                backgroundColor: theme.colors.nodes.common.container.background,
                borderColor: theme.colors.nodes.common.container.border,
                color: theme.colors.nodes.common.text.primary
              }}
            />
            <p className="text-xs" style={{ color: theme.colors.nodes.common.text.muted }}>Pydantic BaseModel class path</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: theme.colors.nodes.common.text.secondary }}>Output Schema</label>
            <input
              type="text"
              value={agent.output_schema || ""}
              onChange={(e) => onUpdate({ output_schema: e.target.value || undefined })}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="e.g., models.TaskOutput"
              className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1"
              style={{
                backgroundColor: theme.colors.nodes.common.container.background,
                borderColor: theme.colors.nodes.common.container.border,
                color: theme.colors.nodes.common.text.primary
              }}
            />
            <p className="text-xs" style={{ color: theme.colors.nodes.common.text.muted }}>Pydantic BaseModel class path</p>
          </div>
        </div>
      </div>
    </div>
  );
  };

  const renderCallbacksTab = () => (
    <div className="space-y-5">
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.colors.nodes.common.text.primary }}>Model Callbacks</h4>
        <div className="space-y-3 pl-2 border-l-2" style={{ borderColor: theme.colors.ui.primary }}>
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: theme.colors.nodes.common.text.secondary }}>Before Model Callback</label>
            <input
              type="text"
              value={agent.before_model_callback || ""}
              onChange={(e) => onUpdate({ before_model_callback: e.target.value || undefined })}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="e.g., callbacks/guardrails.py"
              className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1"
              style={{
                backgroundColor: theme.colors.nodes.common.container.background,
                borderColor: theme.colors.nodes.common.container.border,
                color: theme.colors.nodes.common.text.primary
              }}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: theme.colors.nodes.common.text.secondary }}>After Model Callback</label>
            <input
              type="text"
              value={agent.after_model_callback || ""}
              onChange={(e) => onUpdate({ after_model_callback: e.target.value || undefined })}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="e.g., callbacks/logging.py"
              className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1"
              style={{
                backgroundColor: theme.colors.nodes.common.container.background,
                borderColor: theme.colors.nodes.common.container.border,
                color: theme.colors.nodes.common.text.primary
              }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.colors.nodes.common.text.primary }}>Tool Callbacks</h4>
        <div className="space-y-3 pl-2 border-l-2" style={{ borderColor: theme.colors.ui.primary }}>
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: theme.colors.nodes.common.text.secondary }}>Before Tool Callback</label>
            <input
              type="text"
              value={agent.before_tool_callback || ""}
              onChange={(e) => onUpdate({ before_tool_callback: e.target.value || undefined })}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="e.g., callbacks/validation.py"
              className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1"
              style={{
                backgroundColor: theme.colors.nodes.common.container.background,
                borderColor: theme.colors.nodes.common.container.border,
                color: theme.colors.nodes.common.text.primary
              }}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: theme.colors.nodes.common.text.secondary }}>After Tool Callback</label>
            <input
              type="text"
              value={agent.after_tool_callback || ""}
              onChange={(e) => onUpdate({ after_tool_callback: e.target.value || undefined })}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="e.g., callbacks/artifact_save.py"
              className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1"
              style={{
                backgroundColor: theme.colors.nodes.common.container.background,
                borderColor: theme.colors.nodes.common.container.border,
                color: theme.colors.nodes.common.text.primary
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
      <div className="flex border-b" style={{
        borderColor: theme.colors.nodes.common.container.border,
        backgroundColor: theme.colors.nodes.common.footer.background
      }}>
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
                    backgroundColor: theme.colors.nodes.common.container.background,
                    marginBottom: '-1px'
                  }
                : {
                    color: theme.colors.nodes.common.text.muted
                  }
            }
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.backgroundColor = theme.colors.ui.accent;
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div
        className={`flex-1 overflow-y-auto p-4 nodrag nowheel nopan ${disabled ? "opacity-60 pointer-events-none" : ""}`}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {renderTabContent()}
      </div>
    </div>
  );
}
