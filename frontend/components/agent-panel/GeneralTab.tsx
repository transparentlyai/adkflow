import type { GeneralTabProps } from "@/components/agent-panel/types";
import { ConnectedFieldDisplay } from "@/components/agent-panel/shared";
import { MODELS } from "@/components/agent-panel/constants";

// Icons for connected field displays
const SourceIcon = () => (
  <svg
    className="w-3.5 h-3.5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
);

const PromptIcon = () => (
  <svg
    className="w-3.5 h-3.5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

const ToolsIcon = () => (
  <svg
    className="w-3.5 h-3.5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
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
);

export function GeneralTab({
  agent,
  theme,
  onUpdate,
  connectedAgentName,
  connectedPromptName,
  connectedToolNames,
  showHandles,
  handleConfigs,
  agentInputValidityStyle,
  promptInputValidityStyle,
  toolsInputValidityStyle,
  customModel,
  setCustomModel,
}: GeneralTabProps) {
  return (
    <div className="space-y-2">
      {/* Source (Connected Agent) */}
      <ConnectedFieldDisplay
        label="Source"
        theme={theme}
        connectedName={connectedAgentName}
        showHandle={showHandles}
        handleConfig={handleConfigs?.agentInput}
        validityStyle={agentInputValidityStyle}
        icon={<SourceIcon />}
      />

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

      {/* Prompt */}
      <ConnectedFieldDisplay
        label="Prompt"
        theme={theme}
        connectedName={connectedPromptName}
        showHandle={showHandles}
        handleConfig={handleConfigs?.promptInput}
        validityStyle={promptInputValidityStyle}
        icon={<PromptIcon />}
      />

      {/* Tools */}
      <ConnectedFieldDisplay
        label="Tools"
        theme={theme}
        connectedNames={connectedToolNames}
        showHandle={showHandles}
        handleConfig={handleConfigs?.toolsInput}
        validityStyle={toolsInputValidityStyle}
        icon={<ToolsIcon />}
      />

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
}
