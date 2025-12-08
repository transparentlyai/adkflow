"use client";

import { memo, useState, useRef, useEffect, useCallback, useMemo } from "react";
import { type NodeProps, useReactFlow, useStore } from "@xyflow/react";
import type { Agent, AgentType, HandlePositions } from "@/lib/types";
import DraggableHandle from "@/components/DraggableHandle";
import ResizeHandle from "@/components/ResizeHandle";
import AgentPropertiesPanel from "@/components/AgentPropertiesPanel";
import NodeContextMenu from "@/components/NodeContextMenu";
import { Lock } from "lucide-react";

const DEFAULT_WIDTH = 450;
const DEFAULT_HEIGHT = 500;
const MIN_WIDTH = 380;
const MIN_HEIGHT = 350;
const MAX_WIDTH = 800;
const MAX_HEIGHT = 900;

export interface AgentNodeData {
  agent: Agent;
  handlePositions?: HandlePositions;
  expandedSize?: { width: number; height: number };
  isNodeLocked?: boolean;
}

const TYPE_BADGES: Record<AgentType, { label: string; color: string }> = {
  llm: { label: "LLM", color: "bg-purple-100 text-purple-700" },
  sequential: { label: "Sequential", color: "bg-blue-100 text-blue-700" },
  parallel: { label: "Parallel", color: "bg-green-100 text-green-700" },
  loop: { label: "Loop", color: "bg-amber-100 text-amber-700" },
};

const AgentNode = memo(({ data, id, selected }: NodeProps) => {
  const { agent, handlePositions, expandedSize, isNodeLocked } = data as unknown as AgentNodeData;
  const { setNodes } = useReactFlow();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(agent.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const size = useMemo(() => expandedSize ?? { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT }, [expandedSize]);

  // Subscribe to edges and nodes reactively
  const edges = useStore((state) => state.edges);
  const nodes = useStore((state) => state.nodes);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Find connected prompt node
  const connectedPromptName = useMemo(() => {
    // Find edges from prompt nodes targeting this agent
    // Node IDs use underscore format: prompt_123..., tool_123..., etc.
    for (const edge of edges) {
      if (edge.target === id) {
        const sourceNode = nodes.find((n) => n.id === edge.source);
        if (sourceNode && sourceNode.id.startsWith("prompt_")) {
          const promptData = sourceNode.data as { prompt?: { name?: string } };
          return promptData?.prompt?.name || "Prompt";
        }
      }
    }
    return undefined;
  }, [id, edges, nodes]);

  // Find connected tool nodes
  const connectedToolNames = useMemo(() => {
    const toolNames: string[] = [];

    // Find edges from tool/agentTool nodes to this agent
    // Node IDs use underscore format: tool_123..., agentTool_123..., etc.
    edges.forEach((edge) => {
      if (edge.target === id) {
        const sourceNode = nodes.find((n) => n.id === edge.source);
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
    });

    return toolNames;
  }, [id, edges, nodes]);

  const handleResize = useCallback((deltaWidth: number, deltaHeight: number) => {
    const newSize = {
      width: Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, size.width + deltaWidth)),
      height: Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, size.height + deltaHeight)),
    };
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, expandedSize: newSize } }
          : node
      )
    );
  }, [id, size, setNodes]);

  const handleNameDoubleClick = (e: React.MouseEvent) => {
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

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

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

  const handleStyle = { width: "12px", height: "12px", border: "2px solid white" };
  const linkHandleStyle = { width: "10px", height: "10px", border: "2px solid white" };

  const typeBadge = TYPE_BADGES[agent.type] || TYPE_BADGES.llm;

  // Collapsed view
  if (!isExpanded) {
    return (
      <div
        className={`bg-white rounded-lg shadow-lg min-w-[250px] max-w-[300px] transition-all cursor-pointer ${
          selected ? "ring-2 ring-purple-500 shadow-xl" : ""
        }`}
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
          style={{ ...handleStyle, backgroundColor: "#a855f7" }}
        />

        {/* Link Handle - Top */}
        <DraggableHandle
          nodeId={id}
          handleId="link-top"
          type="source"
          defaultEdge="top"
          defaultPercent={50}
          handlePositions={handlePositions}
          title="Chain with other agents for parallel execution"
          style={{ ...linkHandleStyle, backgroundColor: "#9ca3af" }}
        />

        {/* Header */}
        <div
          className="bg-purple-600 text-white px-3 py-1.5 rounded-t-lg flex items-center gap-2"
          onContextMenu={handleHeaderContextMenu}
        >
          {isNodeLocked && <Lock className="w-3.5 h-3.5 flex-shrink-0 opacity-80" />}
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
              className="flex-1 bg-white text-gray-900 px-2 py-0.5 rounded text-sm font-semibold outline-none"
            />
          ) : (
            <div
              className="flex-1 font-semibold text-sm hover:opacity-80"
              onDoubleClick={handleNameDoubleClick}
            >
              {agent.name}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-3 text-sm space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-xs">Model:</span>
            <span className="text-gray-900 text-xs font-medium">{agent.model || "Not set"}</span>
          </div>

          {connectedPromptName && (
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-xs text-gray-700 truncate">{connectedPromptName}</span>
            </div>
          )}

          {connectedToolNames.length > 0 && (
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-cyan-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-xs text-gray-700 truncate">{connectedToolNames.join(", ")}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-3 py-2 rounded-b-lg border-t border-gray-200 flex items-center justify-between">
          <span className="text-xs text-gray-500">Agent</span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${typeBadge.color}`}>
            {typeBadge.label}
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
          title="Chain with other agents for parallel execution"
          style={{ ...linkHandleStyle, backgroundColor: "#9ca3af" }}
        />

        {/* Output Handle */}
        <DraggableHandle
          nodeId={id}
          handleId="output"
          type="source"
          defaultEdge="right"
          defaultPercent={50}
          handlePositions={handlePositions}
          style={{ ...handleStyle, backgroundColor: "#22c55e" }}
        />

        {contextMenu && (
          <NodeContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            isLocked={!!isNodeLocked}
            onToggleLock={handleToggleNodeLock}
            onClose={() => setContextMenu(null)}
          />
        )}
      </div>
    );
  }

  // Expanded view with properties panel
  return (
    <div
      className={`bg-white rounded-lg shadow-lg relative ${
        selected ? "ring-2 ring-purple-500 shadow-xl" : ""
      }`}
      style={{ width: size.width, height: size.height }}
    >
      {/* Input Handle */}
      <DraggableHandle
        nodeId={id}
        handleId="input"
        type="target"
        defaultEdge="left"
        defaultPercent={50}
        handlePositions={handlePositions}
        style={{ ...handleStyle, backgroundColor: "#a855f7" }}
      />

      {/* Link Handle - Top */}
      <DraggableHandle
        nodeId={id}
        handleId="link-top"
        type="source"
        defaultEdge="top"
        defaultPercent={50}
        handlePositions={handlePositions}
        title="Chain with other agents for parallel execution"
        style={{ ...linkHandleStyle, backgroundColor: "#9ca3af" }}
      />

      {/* Header */}
      <div
        className="bg-purple-600 text-white px-3 py-1.5 rounded-t-lg flex items-center justify-between cursor-pointer"
        onDoubleClick={toggleExpand}
        onContextMenu={handleHeaderContextMenu}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isNodeLocked && <Lock className="w-4 h-4 flex-shrink-0 opacity-80" />}
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              className="flex-1 bg-white text-gray-900 px-2 py-0.5 rounded text-sm font-semibold outline-none min-w-0"
            />
          ) : (
            <span
              className="font-semibold text-sm truncate hover:opacity-80"
              onDoubleClick={handleNameDoubleClick}
            >
              {agent.name}
            </span>
          )}
        </div>
        <button
          onClick={toggleExpand}
          className="ml-2 p-1 hover:bg-purple-700 rounded transition-colors flex-shrink-0"
          title="Collapse"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
      </div>

      {/* Properties Panel */}
      <div className="flex-1" style={{ height: size.height - 70 }}>
        <AgentPropertiesPanel
          agent={agent}
          connectedPromptName={connectedPromptName}
          connectedToolNames={connectedToolNames}
          onUpdate={isNodeLocked ? () => {} : handleAgentUpdate}
          disabled={isNodeLocked}
        />
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 bg-gray-50 px-3 py-2 rounded-b-lg border-t border-gray-200 flex items-center justify-between">
        <span className="text-xs text-gray-500">Agent</span>
        <span className={`text-xs px-1.5 py-0.5 rounded ${typeBadge.color}`}>
          {typeBadge.label}
        </span>
      </div>

      {/* Resize Handle */}
      <ResizeHandle onResize={handleResize} />

      {/* Link Handle - Bottom */}
      <DraggableHandle
        nodeId={id}
        handleId="link-bottom"
        type="target"
        defaultEdge="bottom"
        defaultPercent={50}
        handlePositions={handlePositions}
        title="Chain with other agents for parallel execution"
        style={{ ...linkHandleStyle, backgroundColor: "#9ca3af" }}
      />

      {/* Output Handle */}
      <DraggableHandle
        nodeId={id}
        handleId="output"
        type="source"
        defaultEdge="right"
        defaultPercent={50}
        handlePositions={handlePositions}
        style={{ ...handleStyle, backgroundColor: "#22c55e" }}
      />

      {contextMenu && (
        <NodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isLocked={!!isNodeLocked}
          onToggleLock={handleToggleNodeLock}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
});

AgentNode.displayName = "AgentNode";

export default AgentNode;

export function getDefaultAgentData(): Omit<Agent, "id"> {
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
  };
}
