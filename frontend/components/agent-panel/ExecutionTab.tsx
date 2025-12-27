import type { ExecutionTabProps } from "@/components/agent-panel/types";
import { SectionContainer } from "@/components/agent-panel/shared";
import { PLANNER_TYPES } from "@/components/agent-panel/constants";
import type { PlannerConfig } from "@/lib/types";

export function ExecutionTab({
  agent,
  theme,
  handlePlannerUpdate,
  handleCodeExecutorUpdate,
  handleHttpOptionsUpdate,
}: ExecutionTabProps) {
  return (
    <div className="space-y-5">
      {/* Planner Section */}
      <SectionContainer title="Planner" theme={theme}>
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
              <span style={{ color: theme.colors.nodes.common.text.secondary }}>
                Include thoughts in response
              </span>
            </label>
          </>
        )}
      </SectionContainer>

      {/* Code Executor Section */}
      <SectionContainer title="Code Executor" theme={theme}>
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
              <span style={{ color: theme.colors.nodes.common.text.secondary }}>
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
      </SectionContainer>

      {/* HTTP Options Section */}
      <SectionContainer title="HTTP Options" theme={theme}>
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
                backgroundColor: theme.colors.nodes.common.container.background,
                borderColor: theme.colors.nodes.common.container.border,
                color: theme.colors.nodes.common.text.primary,
              }}
            />
          </div>
        </div>
      </SectionContainer>
    </div>
  );
}
