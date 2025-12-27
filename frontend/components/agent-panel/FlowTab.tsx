import type { FlowTabProps } from "@/components/agent-panel/types";
import { SectionContainer } from "@/components/agent-panel/shared";

export function FlowTab({ agent, theme, onUpdate }: FlowTabProps) {
  return (
    <div className="space-y-5">
      {/* Transfer Controls */}
      <SectionContainer title="Transfer Controls" theme={theme}>
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
      </SectionContainer>

      {/* Loop Settings */}
      {agent.type === "loop" && (
        <SectionContainer title="Loop Settings" theme={theme}>
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
                backgroundColor: theme.colors.nodes.common.container.background,
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
        </SectionContainer>
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
}
