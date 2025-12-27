"use client";

import { memo, useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Handle, Position, type NodeProps, useReactFlow, useStore } from "@xyflow/react";
import type { Agent, AgentType, HandlePositions, NodeExecutionState } from "@/lib/types";
import DraggableHandle from "@/components/DraggableHandle";
import AgentPropertiesPanel from "@/components/AgentPropertiesPanel";
import NodeContextMenu from "@/components/NodeContextMenu";
import { useCanvasActions } from "@/contexts/CanvasActionsContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Lock } from "lucide-react";
import ValidationIndicator from "@/components/nodes/ValidationIndicator";

// Shallow comparison for arrays of strings
function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export interface AgentNodeData {
  agent: Agent;
  handlePositions?: HandlePositions;
  handleTypes?: Record<string, { outputSource?: string; outputType?: string; acceptedSources?: string[]; acceptedTypes?: string[] }>;
  expandedPosition?: { x: number; y: number };
  contractedPosition?: { x: number; y: number };
  isExpanded?: boolean;
  isNodeLocked?: boolean;
  executionState?: NodeExecutionState;
  hasValidationError?: boolean;
  hasValidationWarning?: boolean;
  duplicateNameError?: string;
  validationErrors?: string[];
  validationWarnings?: string[];
}

const TYPE_BADGE_LABELS: Record<AgentType, string> = {
  llm: "LLM",
  sequential: "Sequential",
  parallel: "Parallel",
  loop: "Loop",
};

// Custom comparison for memo - always re-render when executionState or validation error changes
const agentNodePropsAreEqual = (prevProps: NodeProps, nextProps: NodeProps): boolean => {
  const prevData = prevProps.data as unknown as AgentNodeData;
  const nextData = nextProps.data as unknown as AgentNodeData;

  // Always re-render if executionState changes
  if (prevData.executionState !== nextData.executionState) {
    return false;
  }

  // Always re-render if validation error/warning state changes
  if (prevData.hasValidationError !== nextData.hasValidationError) {
    return false;
  }
  if (prevData.hasValidationWarning !== nextData.hasValidationWarning) {
    return false;
  }
  if (prevData.duplicateNameError !== nextData.duplicateNameError) {
    return false;
  }
  if (prevData.validationErrors !== nextData.validationErrors) {
    return false;
  }
  if (prevData.validationWarnings !== nextData.validationWarnings) {
    return false;
  }

  // Check other important props
  if (prevProps.selected !== nextProps.selected) return false;
  if (prevProps.id !== nextProps.id) return false;
  if (prevData.isNodeLocked !== nextData.isNodeLocked) return false;

  // Compare agent object by reference - if any property changed, re-render
  if (prevData.agent !== nextData.agent) return false;

  return true;
};

const AgentNode = memo(({ data, id, selected }: NodeProps) => {
  const { agent, handlePositions, handleTypes, expandedPosition, contractedPosition, isExpanded: dataIsExpanded, isNodeLocked, executionState, hasValidationError, hasValidationWarning, duplicateNameError, validationErrors, validationWarnings } = data as unknown as AgentNodeData;
  const resolvedHandleTypes = useMemo(() => (handleTypes || {}) as Record<string, { outputSource?: string; outputType?: string; acceptedSources?: string[]; acceptedTypes?: string[] }>, [handleTypes]);
  const { setNodes } = useReactFlow();
  const canvasActions = useCanvasActions();
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(dataIsExpanded ?? false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(agent.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Handle style for input handles (used in expanded view)
  const inputHandleStyle = useMemo(() => ({
    width: 10,
    height: 10,
    border: `2px solid ${theme.colors.handles.border}`,
    backgroundColor: theme.colors.handles.input,
  }), [theme.colors.handles.border, theme.colors.handles.input]);

  // Handle configs for AgentPropertiesPanel in expanded view
  const handleConfigs = useMemo(() => ({
    agentInput: {
      id: 'agent-input',
      acceptedSources: resolvedHandleTypes['agent-input']?.acceptedSources,
      acceptedTypes: resolvedHandleTypes['agent-input']?.acceptedTypes,
      style: inputHandleStyle,
    },
    promptInput: {
      id: 'prompt-input',
      acceptedSources: resolvedHandleTypes['prompt-input']?.acceptedSources,
      acceptedTypes: resolvedHandleTypes['prompt-input']?.acceptedTypes,
      style: inputHandleStyle,
    },
    toolsInput: {
      id: 'tools-input',
      acceptedSources: resolvedHandleTypes['tools-input']?.acceptedSources,
      acceptedTypes: resolvedHandleTypes['tools-input']?.acceptedTypes,
      style: inputHandleStyle,
    },
  }), [resolvedHandleTypes, inputHandleStyle]);

  // Optimized selector: only subscribe to parentId changes for this specific node
  const parentId = useStore(
    useCallback((state) => state.nodes.find((n) => n.id === id)?.parentId, [id])
  );

  // Optimized selector: compute connected prompt name directly in the selector
  // Only re-renders when the actual prompt name changes, not on every edge/node update
  const connectedPromptName = useStore(
    useCallback((state) => {
      for (const edge of state.edges) {
        if (edge.target === id && (edge.targetHandle === 'prompt-input' || edge.targetHandle === 'input')) {
          const sourceNode = state.nodes.find((n) => n.id === edge.source);
          if (sourceNode && sourceNode.id.startsWith("prompt_")) {
            const promptData = sourceNode.data as { prompt?: { name?: string } };
            return promptData?.prompt?.name || "Prompt";
          }
        }
      }
      return undefined;
    }, [id])
  );

  // Optimized selector: compute connected tool names directly
  // Use a ref to implement shallow comparison for the array result
  const connectedToolNamesRef = useRef<string[]>([]);
  const connectedToolNames = useStore(
    useCallback((state) => {
      const toolNames: string[] = [];
      for (const edge of state.edges) {
        if (edge.target === id && (edge.targetHandle === 'tools-input' || edge.targetHandle === 'input')) {
          const sourceNode = state.nodes.find((n) => n.id === edge.source);
          if (sourceNode) {
            if (sourceNode.id.startsWith("tool_")) {
              const toolData = sourceNode.data as { name?: string };
              toolNames.push(toolData?.name || "Tool");
            } else if (sourceNode.id.startsWith("agentTool_")) {
              const agentToolData = sourceNode.data as { name?: string };
              toolNames.push(agentToolData?.name || "AgentTool");
            }
          }
        }
      }
      // Only return new array if content changed (shallow comparison)
      if (arraysEqual(connectedToolNamesRef.current, toolNames)) {
        return connectedToolNamesRef.current;
      }
      connectedToolNamesRef.current = toolNames;
      return toolNames;
    }, [id])
  );

  // Optimized selector: compute connected agent name (sub-agent input)
  const connectedAgentName = useStore(
    useCallback((state) => {
      for (const edge of state.edges) {
        if (edge.target === id && (edge.targetHandle === 'agent-input' || edge.targetHandle === 'input')) {
          const sourceNode = state.nodes.find((n) => n.id === edge.source);
          if (sourceNode && sourceNode.id.startsWith("agent_")) {
            const agentData = sourceNode.data as { agent?: { name?: string } };
            return agentData?.agent?.name || "Agent";
          }
        }
      }
      return undefined;
    }, [id])
  );

  const handleCopy = useCallback(() => {
    setNodes((nodes) => nodes.map((n) => ({ ...n, selected: n.id === id })));
    setTimeout(() => canvasActions?.copySelectedNodes(), 0);
  }, [id, setNodes, canvasActions]);

  const handleCut = useCallback(() => {
    setNodes((nodes) => nodes.map((n) => ({ ...n, selected: n.id === id })));
    setTimeout(() => canvasActions?.cutSelectedNodes(), 0);
  }, [id, setNodes, canvasActions]);

  const handlePaste = useCallback(() => {
    canvasActions?.pasteNodes();
  }, [canvasActions]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleNameClick = (e: React.MouseEvent) => {
    if (isNodeLocked) return;
    e.stopPropagation();
    setIsEditing(true);
    setEditedName(agent.name);
  };

  const handleHeaderContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleToggleNodeLock = useCallback(() => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, isNodeLocked: !isNodeLocked } }
          : node
      )
    );
  }, [id, isNodeLocked, setNodes]);

  const handleDetach = useCallback(() => {
    setNodes((nodes) => {
      const currentNode = nodes.find((n) => n.id === id);
      const parentNode = nodes.find((n) => n.id === currentNode?.parentId);
      if (!currentNode || !parentNode) return nodes;

      return nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              parentId: undefined,
              position: {
                x: currentNode.position.x + parentNode.position.x,
                y: currentNode.position.y + parentNode.position.y,
              },
            }
          : node
      );
    });
  }, [id, setNodes]);

  const handleSave = () => {
    if (editedName.trim()) {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  agent: {
                    ...agent,
                    name: editedName.trim(),
                  },
                },
              }
            : node
        )
      );
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setEditedName(agent.name);
      setIsEditing(false);
    }
  };

  const toggleExpand = useCallback(() => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id !== id) return node;

        const nodeData = node.data as unknown as AgentNodeData;
        const currentPosition = node.position;

        if (isExpanded) {
          // Going from expanded → contracted
          // Save current as expandedPosition, restore contractedPosition
          return {
            ...node,
            position: nodeData.contractedPosition ?? currentPosition,
            extent: node.parentId ? "parent" as const : undefined,
            data: {
              ...nodeData,
              expandedPosition: currentPosition,
              isExpanded: false,
            },
          };
        } else {
          // Going from contracted → expanded
          // Save current as contractedPosition, restore expandedPosition
          return {
            ...node,
            position: nodeData.expandedPosition ?? currentPosition,
            extent: undefined,
            data: {
              ...nodeData,
              contractedPosition: currentPosition,
              isExpanded: true,
            },
          };
        }
      })
    );
    setIsExpanded(!isExpanded);
  }, [id, isExpanded, setNodes]);

  const handleAgentUpdate = useCallback(
    (updates: Partial<Agent>) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  agent: {
                    ...agent,
                    ...updates,
                  },
                },
              }
            : node
        )
      );
    },
    [id, agent, setNodes]
  );

  const handleStyle = { width: "10px", height: "10px", border: `2px solid ${theme.colors.handles.border}` };
  const linkHandleStyle = { width: "8px", height: "8px", border: `2px solid ${theme.colors.handles.border}` };

  const typeBadgeLabel = TYPE_BADGE_LABELS[agent.type] || TYPE_BADGE_LABELS.llm;
  const typeBadgeColors = theme.colors.nodes.agent.badges[agent.type] || theme.colors.nodes.agent.badges.llm;

  // Get execution state styling for real-time highlighting
  const getExecutionStyle = useCallback((): React.CSSProperties => {
    // Duplicate name error takes priority - show red glow (static, no pulse for real-time)
    if (duplicateNameError) {
      return {
        boxShadow: `0 0 0 2px #ef4444`,
      };
    }

    // Backend validation error - show red glow with pulse
    if (hasValidationError) {
      return {
        boxShadow: `0 0 0 2px rgba(239, 68, 68, 0.8), 0 0 20px 4px rgba(239, 68, 68, 0.4)`,
        animation: "validation-error-pulse 1s ease-in-out infinite",
      };
    }

    // Validation warning - show yellow glow with pulse
    if (hasValidationWarning) {
      return {
        boxShadow: `0 0 0 2px rgba(234, 179, 8, 0.8), 0 0 20px 4px rgba(234, 179, 8, 0.4)`,
        animation: "validation-warning-pulse 1s ease-in-out infinite",
      };
    }

    switch (executionState) {
      case "running":
        return {
          boxShadow: `0 0 0 2px rgba(59, 130, 246, 0.8), 0 0 20px 4px rgba(59, 130, 246, 0.4)`,
          animation: "execution-pulse 1.5s ease-in-out infinite",
        };
      case "completed":
        return {
          boxShadow: `0 0 0 2px rgba(34, 197, 94, 0.8), 0 0 10px 2px rgba(34, 197, 94, 0.3)`,
          transition: "box-shadow 0.3s ease-out",
        };
      case "error":
        return {
          boxShadow: `0 0 0 2px rgba(239, 68, 68, 0.8), 0 0 15px 3px rgba(239, 68, 68, 0.4)`,
        };
      default:
        return selected ? { boxShadow: `0 0 0 2px ${theme.colors.nodes.agent.ring}` } : {};
    }
  }, [executionState, duplicateNameError, hasValidationError, hasValidationWarning, selected, theme.colors.nodes.agent.ring]);

  // Collapsed view
  if (!isExpanded) {
    return (
      <>
        {/* Keyframes for execution and validation pulse animations */}
        <style>{`
          @keyframes execution-pulse {
            0%, 100% { box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.8), 0 0 20px 4px rgba(59, 130, 246, 0.4); }
            50% { box-shadow: 0 0 0 3px rgba(59, 130, 246, 1), 0 0 30px 8px rgba(59, 130, 246, 0.6); }
          }
          @keyframes validation-error-pulse {
            0%, 100% { box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.8), 0 0 20px 4px rgba(239, 68, 68, 0.4); }
            50% { box-shadow: 0 0 0 3px rgba(239, 68, 68, 1), 0 0 30px 8px rgba(239, 68, 68, 0.6); }
          }
          @keyframes validation-warning-pulse {
            0%, 100% { box-shadow: 0 0 0 2px rgba(234, 179, 8, 0.8), 0 0 20px 4px rgba(234, 179, 8, 0.4); }
            50% { box-shadow: 0 0 0 3px rgba(234, 179, 8, 1), 0 0 30px 8px rgba(234, 179, 8, 0.6); }
          }
        `}</style>
        <div
          className="rounded-lg shadow-lg min-w-[250px] max-w-[300px] transition-all cursor-pointer"
          style={{
            backgroundColor: theme.colors.nodes.common.container.background,
            ...getExecutionStyle(),
          }}
          onDoubleClick={toggleExpand}
          title="Double-click to configure"
        >
        {/* Input Handle */}
        <DraggableHandle
          nodeId={id}
          handleId="input"
          type="target"
          defaultEdge="left"
          defaultPercent={50}
          handlePositions={handlePositions}
          acceptedSources={resolvedHandleTypes['input']?.acceptedSources}
          acceptedTypes={resolvedHandleTypes['input']?.acceptedTypes}
          style={{ ...handleStyle, backgroundColor: theme.colors.handles.input }}
        />

        {/* Hidden handles for typed edges */}
        <Handle
          type="target"
          position={Position.Left}
          id="agent-input"
          style={{ opacity: 0, pointerEvents: 'none', top: '50%', left: 0 }}
        />
        <Handle
          type="target"
          position={Position.Left}
          id="prompt-input"
          style={{ opacity: 0, pointerEvents: 'none', top: '50%', left: 0 }}
        />
        <Handle
          type="target"
          position={Position.Left}
          id="tools-input"
          style={{ opacity: 0, pointerEvents: 'none', top: '50%', left: 0 }}
        />

        {/* Link Handle - Top */}
        <DraggableHandle
          nodeId={id}
          handleId="link-top"
          type="source"
          defaultEdge="top"
          defaultPercent={50}
          handlePositions={handlePositions}
          outputSource={resolvedHandleTypes['link-top']?.outputSource}
          outputType={resolvedHandleTypes['link-top']?.outputType}
          title="Chain with other agents for parallel execution"
          style={{ ...linkHandleStyle, backgroundColor: theme.colors.handles.link }}
        />

        {/* Header */}
        <div
          className="px-2 py-1 rounded-t-lg flex items-center gap-1.5 cursor-pointer"
          style={{
            backgroundColor: theme.colors.nodes.agent.header,
            color: theme.colors.nodes.agent.text,
          }}
          onDoubleClick={(e) => { e.stopPropagation(); toggleExpand(); }}
          onContextMenu={handleHeaderContextMenu}
        >
          {isNodeLocked && <Lock className="w-3 h-3 flex-shrink-0 opacity-80" />}
          <ValidationIndicator
            errors={validationErrors}
            warnings={validationWarnings}
            duplicateNameError={duplicateNameError}
          />
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
              className="flex-1 bg-white text-gray-900 px-1.5 py-0.5 rounded text-xs font-medium outline-none"
            />
          ) : (
            <span
              className="font-medium text-xs hover:opacity-80 truncate max-w-[200px]"
              onClick={handleNameClick}
            >
              {agent.name}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="p-3 text-sm space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: theme.colors.nodes.common.text.secondary }}>Model:</span>
            <span className="text-xs font-medium" style={{ color: theme.colors.nodes.common.text.primary }}>{agent.model || "Not set"}</span>
          </div>

          {connectedPromptName && (
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: theme.colors.nodes.prompt.header }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-xs truncate" style={{ color: theme.colors.nodes.common.text.secondary }}>{connectedPromptName}</span>
            </div>
          )}

          {connectedToolNames.length > 0 && (
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: theme.colors.nodes.tool.header }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-xs truncate" style={{ color: theme.colors.nodes.common.text.secondary }}>{connectedToolNames.join(", ")}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-2 py-1 rounded-b-lg border-t flex items-center justify-between"
          style={{
            backgroundColor: theme.colors.nodes.common.footer.background,
            borderColor: theme.colors.nodes.common.footer.border,
            color: theme.colors.nodes.common.footer.text,
          }}
        >
          <span className="text-xs">Agent</span>
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: typeBadgeColors.background,
              color: typeBadgeColors.text,
            }}
          >
            {typeBadgeLabel}
          </span>
        </div>

        {/* Link Handle - Bottom */}
        <DraggableHandle
          nodeId={id}
          handleId="link-bottom"
          type="target"
          defaultEdge="bottom"
          defaultPercent={50}
          handlePositions={handlePositions}
          acceptedSources={resolvedHandleTypes['link-bottom']?.acceptedSources}
          acceptedTypes={resolvedHandleTypes['link-bottom']?.acceptedTypes}
          title="Chain with other agents for parallel execution"
          style={{ ...linkHandleStyle, backgroundColor: theme.colors.handles.link }}
        />

        {/* Output Handle */}
        <DraggableHandle
          nodeId={id}
          handleId="output"
          type="source"
          defaultEdge="right"
          defaultPercent={50}
          handlePositions={handlePositions}
          outputSource={resolvedHandleTypes['output']?.outputSource}
          outputType={resolvedHandleTypes['output']?.outputType}
          style={{ ...handleStyle, backgroundColor: theme.colors.handles.output }}
        />

        {contextMenu && (
          <NodeContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            isLocked={!!isNodeLocked}
            onToggleLock={handleToggleNodeLock}
            onClose={() => setContextMenu(null)}
            onDetach={parentId ? handleDetach : undefined}
            onCopy={handleCopy}
            onCut={handleCut}
            onPaste={handlePaste}
            hasClipboard={canvasActions?.hasClipboard}
            isCanvasLocked={canvasActions?.isLocked}
          />
        )}
        </div>
      </>
    );
  }

  // Expanded view with properties panel
  return (
    <>
      {/* Keyframes for execution and validation pulse animations */}
      <style>{`
        @keyframes execution-pulse {
          0%, 100% { box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.8), 0 0 20px 4px rgba(59, 130, 246, 0.4); }
          50% { box-shadow: 0 0 0 3px rgba(59, 130, 246, 1), 0 0 30px 8px rgba(59, 130, 246, 0.6); }
        }
        @keyframes validation-error-pulse {
          0%, 100% { box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.8), 0 0 20px 4px rgba(239, 68, 68, 0.4); }
          50% { box-shadow: 0 0 0 3px rgba(239, 68, 68, 1), 0 0 30px 8px rgba(239, 68, 68, 0.6); }
        }
        @keyframes validation-warning-pulse {
          0%, 100% { box-shadow: 0 0 0 2px rgba(234, 179, 8, 0.8), 0 0 20px 4px rgba(234, 179, 8, 0.4); }
          50% { box-shadow: 0 0 0 3px rgba(234, 179, 8, 1), 0 0 30px 8px rgba(234, 179, 8, 0.6); }
        }
      `}</style>
      <div
        className="rounded-lg shadow-lg relative"
        style={{
          minWidth: 400,
          backgroundColor: theme.colors.nodes.common.container.background,
          ...getExecutionStyle(),
        }}
      >
      {/* Hidden input handle for edge compatibility */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        data-accepted-types={JSON.stringify(resolvedHandleTypes['input']?.acceptedTypes || [])}
        style={{
          ...handleStyle,
          backgroundColor: 'transparent',
          border: 'none',
          opacity: 0,
          pointerEvents: 'none',
        }}
      />

      {/* Link Handle - Top */}
      <DraggableHandle
        nodeId={id}
        handleId="link-top"
        type="source"
        defaultEdge="top"
        defaultPercent={50}
        handlePositions={handlePositions}
        outputSource={resolvedHandleTypes['link-top']?.outputSource}
        outputType={resolvedHandleTypes['link-top']?.outputType}
        title="Chain with other agents for parallel execution"
        style={{ ...linkHandleStyle, backgroundColor: theme.colors.handles.link }}
      />

      {/* Header */}
      <div
        className="px-2 py-1 rounded-t-lg flex items-center justify-between cursor-pointer"
        style={{
          backgroundColor: theme.colors.nodes.agent.header,
          color: theme.colors.nodes.agent.text,
        }}
        onDoubleClick={toggleExpand}
        onContextMenu={handleHeaderContextMenu}
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {isNodeLocked && <Lock className="w-3 h-3 flex-shrink-0 opacity-80" />}
          <ValidationIndicator
            errors={validationErrors}
            warnings={validationWarnings}
            duplicateNameError={duplicateNameError}
          />
          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
              className="flex-1 bg-white text-gray-900 px-1.5 py-0.5 rounded text-xs font-medium outline-none min-w-0"
            />
          ) : (
            <span
              className="font-medium text-xs truncate hover:opacity-80"
              onClick={handleNameClick}
            >
              {agent.name}
            </span>
          )}
        </div>
        <button
          onClick={toggleExpand}
          className="ml-1.5 p-0.5 rounded transition-colors flex-shrink-0"
          style={{
            backgroundColor: "transparent",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.nodes.agent.headerHover || theme.colors.nodes.agent.header;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
          title="Collapse"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
      </div>

      {/* Properties Panel */}
      <div className="nodrag">
        <AgentPropertiesPanel
          agent={agent}
          nodeId={id}
          connectedAgentName={connectedAgentName}
          connectedPromptName={connectedPromptName}
          connectedToolNames={connectedToolNames}
          onUpdate={isNodeLocked ? () => {} : handleAgentUpdate}
          disabled={isNodeLocked}
          showHandles={true}
          handleConfigs={handleConfigs}
        />
      </div>

      {/* Footer */}
      <div
        className="px-2 py-1 rounded-b-lg border-t flex items-center justify-between"
        style={{
          backgroundColor: theme.colors.nodes.common.footer.background,
          borderColor: theme.colors.nodes.common.footer.border,
          color: theme.colors.nodes.common.footer.text,
        }}
      >
        <span className="text-xs">Agent</span>
        <span
          className="text-xs px-1.5 py-0.5 rounded"
          style={{
            backgroundColor: typeBadgeColors.background,
            color: typeBadgeColors.text,
          }}
        >
          {typeBadgeLabel}
        </span>
      </div>

      {/* Link Handle - Bottom */}
      <DraggableHandle
        nodeId={id}
        handleId="link-bottom"
        type="target"
        defaultEdge="bottom"
        defaultPercent={50}
        handlePositions={handlePositions}
        acceptedSources={resolvedHandleTypes['link-bottom']?.acceptedSources}
        acceptedTypes={resolvedHandleTypes['link-bottom']?.acceptedTypes}
        title="Chain with other agents for parallel execution"
        style={{ ...linkHandleStyle, backgroundColor: theme.colors.handles.link }}
      />

      {/* Output Handle */}
      <DraggableHandle
        nodeId={id}
        handleId="output"
        type="source"
        defaultEdge="right"
        defaultPercent={50}
        handlePositions={handlePositions}
        outputSource={resolvedHandleTypes['output']?.outputSource}
        outputType={resolvedHandleTypes['output']?.outputType}
        style={{ ...handleStyle, backgroundColor: theme.colors.handles.output }}
      />

      {contextMenu && (
        <NodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isLocked={!!isNodeLocked}
          onToggleLock={handleToggleNodeLock}
          onClose={() => setContextMenu(null)}
          onDetach={parentId ? handleDetach : undefined}
          onCopy={handleCopy}
          onCut={handleCut}
          onPaste={handlePaste}
          hasClipboard={canvasActions?.hasClipboard}
          isCanvasLocked={canvasActions?.isLocked}
        />
      )}
      </div>
    </>
  );
}, agentNodePropsAreEqual);

AgentNode.displayName = "AgentNode";

export default AgentNode;

export function getDefaultAgentData(): Omit<Agent, "id"> & { handleTypes: Record<string, { outputSource?: string; outputType?: string; acceptedSources?: string[]; acceptedTypes?: string[] }> } {
  return {
    name: "New Agent",
    type: "llm",
    model: "gemini-2.5-flash",
    temperature: 0.7,
    description: "",
    planner: { type: "none" },
    max_iterations: 5,
    disallow_transfer_to_parent: false,
    disallow_transfer_to_peers: false,
    code_executor: { enabled: false },
    http_options: {
      timeout: 30000,
      max_retries: 3,
      retry_delay: 1000,
      retry_backoff_multiplier: 2,
    },
    tools: [],
    subagents: [],
    handleTypes: {
      'output': { outputSource: 'agent', outputType: 'dict' },
      'link-top': { outputSource: 'agent', outputType: 'link' },
      'input': { acceptedSources: ['agent', 'prompt', 'tool', 'agent_tool', 'context'], acceptedTypes: ['dict', 'link', 'str', 'callable'] },
      'agent-input': { acceptedSources: ['agent'], acceptedTypes: ['dict', 'link'] },
      'prompt-input': { acceptedSources: ['prompt', 'context'], acceptedTypes: ['str'] },
      'tools-input': { acceptedSources: ['tool', 'agent_tool'], acceptedTypes: ['callable'] },
      'link-bottom': { acceptedSources: ['agent'], acceptedTypes: ['link'] },
    },
  };
}
