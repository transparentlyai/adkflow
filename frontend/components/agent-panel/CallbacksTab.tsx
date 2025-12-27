import type { CallbacksTabProps } from "@/components/agent-panel/types";
import { SectionContainer } from "@/components/agent-panel/shared";

export function CallbacksTab({ agent, theme, onUpdate }: CallbacksTabProps) {
  return (
    <div className="space-y-5">
      <SectionContainer title="Model Callbacks" theme={theme}>
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
      </SectionContainer>

      <SectionContainer title="Tool Callbacks" theme={theme}>
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
      </SectionContainer>
    </div>
  );
}
