"use client";

import { useState, useCallback, useMemo } from "react";
import type {
  Agent,
  PlannerConfig,
  CodeExecutorConfig,
  HttpOptions,
} from "@/lib/types";
import { isTypeCompatible } from "@/lib/types";
import { useTheme } from "@/contexts/ThemeContext";
import { useConnection } from "@/contexts/ConnectionContext";
import {
  GeneralTab,
  ExecutionTab,
  FlowTab,
  SchemaTab,
  CallbacksTab,
} from "@/components/agent-panel";
import type { HandleConfig, HandleConfigs } from "@/components/agent-panel";

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
  handleConfigs?: HandleConfigs;
}

type TabId = "general" | "execution" | "flow" | "schema" | "callbacks";

const TABS: { id: TabId; label: string }[] = [
  { id: "general", label: "General" },
  { id: "execution", label: "Execution" },
  { id: "flow", label: "Flow" },
  { id: "schema", label: "Schema" },
  { id: "callbacks", label: "Callbacks" },
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

  const renderTabContent = () => {
    switch (activeTab) {
      case "general":
        return (
          <GeneralTab
            agent={agent}
            nodeId={nodeId}
            theme={theme}
            onUpdate={onUpdate}
            connectedAgentName={connectedAgentName}
            connectedPromptName={connectedPromptName}
            connectedToolNames={connectedToolNames}
            showHandles={showHandles}
            handleConfigs={handleConfigs}
            agentInputValidityStyle={agentInputValidityStyle}
            promptInputValidityStyle={promptInputValidityStyle}
            toolsInputValidityStyle={toolsInputValidityStyle}
            customModel={customModel}
            setCustomModel={setCustomModel}
          />
        );
      case "execution":
        return (
          <ExecutionTab
            agent={agent}
            nodeId={nodeId}
            theme={theme}
            onUpdate={onUpdate}
            handlePlannerUpdate={handlePlannerUpdate}
            handleCodeExecutorUpdate={handleCodeExecutorUpdate}
            handleHttpOptionsUpdate={handleHttpOptionsUpdate}
          />
        );
      case "flow":
        return (
          <FlowTab
            agent={agent}
            nodeId={nodeId}
            theme={theme}
            onUpdate={onUpdate}
          />
        );
      case "schema":
        return (
          <SchemaTab
            agent={agent}
            nodeId={nodeId}
            theme={theme}
            onUpdate={onUpdate}
          />
        );
      case "callbacks":
        return (
          <CallbacksTab
            agent={agent}
            nodeId={nodeId}
            theme={theme}
            onUpdate={onUpdate}
          />
        );
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

// Re-export HandleConfig type for backwards compatibility
export type { HandleConfig };
