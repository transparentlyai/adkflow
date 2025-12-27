import type { SchemaTabProps } from "@/components/agent-panel/types";
import { SectionContainer } from "@/components/agent-panel/shared";

export function SchemaTab({ agent, theme, onUpdate }: SchemaTabProps) {
  const outputKeyRequired =
    agent.include_contents === "none" && !agent.output_key;

  return (
    <div className="space-y-5">
      {/* Output Configuration */}
      <SectionContainer title="Output Configuration" theme={theme}>
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
              backgroundColor: theme.colors.nodes.common.container.background,
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
              backgroundColor: theme.colors.nodes.common.container.background,
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
      </SectionContainer>

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
                backgroundColor: theme.colors.nodes.common.container.background,
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
                backgroundColor: theme.colors.nodes.common.container.background,
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
}
