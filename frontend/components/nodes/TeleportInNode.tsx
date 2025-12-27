"use client";

import { memo, useState, useCallback, useEffect } from "react";
import { type NodeProps, useReactFlow, useStore, Handle, Position } from "@xyflow/react";
import NodeContextMenu from "@/components/NodeContextMenu";
import { Lock, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useCanvasActions } from "@/contexts/CanvasActionsContext";
import { useTeleporter } from "@/contexts/TeleporterContext";
import { useTabs } from "@/contexts/TabsContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { HandlePositions, HandleDataType } from "@/lib/types";

export interface TeleportInNodeData extends Record<string, unknown> {
  name: string;
  handlePositions?: HandlePositions;
  expandedPosition?: { x: number; y: number };
  contractedPosition?: { x: number; y: number };
  isExpanded?: boolean;
  isNodeLocked?: boolean;
  handleTypes?: Record<string, { outputSource?: string; outputType?: HandleDataType; acceptedSources?: string[]; acceptedTypes?: HandleDataType[] }>;
}

const TeleportInNode = memo(({ data, id, selected }: NodeProps) => {
  const { name, expandedPosition, contractedPosition, isExpanded: dataIsExpanded, isNodeLocked } = data as TeleportInNodeData;
  const { setNodes } = useReactFlow();
  const canvasActions = useCanvasActions();
  const { updateTeleporterName, getOutputTeleportersByName, getAllOutputTeleporters, getColorForName } = useTeleporter();
  const { navigateToNode } = useTabs();
  const { theme } = useTheme();

  const [isExpanded, setIsExpanded] = useState(dataIsExpanded ?? false);
  const [editedName, setEditedName] = useState(name);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const matchingOutputs = getOutputTeleportersByName(name);
  const color = getColorForName(name);

  const parentId = useStore(
    useCallback((state) => state.nodes.find((n) => n.id === id)?.parentId, [id])
  );

  useEffect(() => {
    setEditedName(name);
  }, [name]);

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

  const handleDoubleClick = useCallback(() => {
    if (isNodeLocked) return;
    const newIsExpanded = !isExpanded;
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, isExpanded: newIsExpanded } }
          : node
      )
    );
    setIsExpanded(newIsExpanded);
  }, [id, isExpanded, isNodeLocked, setNodes]);

  const handleContextMenu = (e: React.MouseEvent) => {
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
      const thisNode = nodes.find((n) => n.id === id);
      const parentNode = nodes.find((n) => n.id === thisNode?.parentId);
      if (!thisNode || !parentNode) return nodes;

      return nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              parentId: undefined,
              position: {
                x: thisNode.position.x + parentNode.position.x,
                y: thisNode.position.y + parentNode.position.y,
              },
            }
          : node
      );
    });
  }, [id, setNodes]);

  const handleNameSave = () => {
    if (editedName.trim() && editedName.trim() !== name) {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? { ...node, data: { ...node.data, name: editedName.trim() } }
            : node
        )
      );
      updateTeleporterName(id, editedName.trim());
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleNameSave();
    } else if (e.key === "Escape") {
      setEditedName(name);
    }
  };

  const handleNavigateToNode = useCallback((tabId: string, nodeId: string) => {
    setIsExpanded(false);
    setTimeout(() => navigateToNode(tabId, nodeId), 0);
  }, [navigateToNode]);

  const width = 90;
  const height = 24;
  const arrowWidth = 10;

  return (
    <>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              onDoubleClick={handleDoubleClick}
              onContextMenu={handleContextMenu}
              className="relative"
              style={{ width, height }}
            >
              {/* Output handle on RIGHT */}
              <Handle
                type="source"
                position={Position.Right}
                id="output"
                style={{
                  background: color,
                  border: "2px solid white",
                  width: 8,
                  height: 8,
                  right: -4,
                }}
              />

              {/* Tag shape pointing LEFT */}
              <svg
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                className="drop-shadow-md"
              >
                <path
                  d={`M${arrowWidth},0 H${width - 4} Q${width},0 ${width},4 V${height - 4} Q${width},${height} ${width - 4},${height} H${arrowWidth} L0,${height / 2} Z`}
                  fill={color}
                  stroke={selected ? "#3b82f6" : "transparent"}
                  strokeWidth="2"
                />
              </svg>

              {/* Content overlay */}
              <div
                className="absolute inset-0 flex items-center justify-center pl-3"
                style={{ paddingRight: 4 }}
              >
                <div className="flex items-center gap-1 text-white text-sm font-medium">
                  {isNodeLocked && <Lock className="w-3 h-3 opacity-80" />}
                  <span className="truncate max-w-[55px]">{name}</span>
                </div>
              </div>

              {/* Connection count badge - on the back (right side) */}
              {matchingOutputs.length > 0 && (
                <div
                  className="absolute -top-1.5 -right-1 bg-white rounded-full px-1 text-[10px] font-medium border shadow-sm"
                  style={{ borderColor: color, color }}
                >
                  {matchingOutputs.length}
                </div>
              )}

              {/* Expand indicator */}
              <div className="absolute bottom-0 left-2 text-white opacity-60">
                {isExpanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[250px]">
            <div className="space-y-1">
              <div className="font-medium flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                {name}
              </div>
              {matchingOutputs.length > 0 ? (
                <div className="text-xs text-muted-foreground">
                  <div className="mb-0.5">Connected to {matchingOutputs.length} output{matchingOutputs.length > 1 ? "s" : ""}:</div>
                  {matchingOutputs.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleNavigateToNode(t.tabId, t.id)}
                      className="block pl-2 hover:text-foreground hover:underline text-left"
                    >
                      • {t.tabName} – {t.name}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">No connections</div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Expanded panel */}
      {isExpanded && (
        <div
          className="absolute top-full left-0 mt-2 rounded-lg shadow-xl z-50 min-w-[280px]"
          style={{
            backgroundColor: theme.colors.nodes.common.container.background,
            border: `1px solid ${theme.colors.nodes.common.container.border}`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Name editor */}
          <div
            className="px-3 py-2 rounded-t-lg"
            style={{
              backgroundColor: theme.colors.nodes.common.footer.background,
              borderBottom: `1px solid ${theme.colors.nodes.common.container.border}`,
            }}
          >
            <label className="text-xs mb-1 block" style={{ color: theme.colors.nodes.common.text.muted }}>
              Connector Name
            </label>
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={handleNameKeyDown}
              className="w-full px-2 py-1 text-sm rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              style={{
                backgroundColor: theme.colors.nodes.common.container.background,
                color: theme.colors.nodes.common.text.primary,
                border: `1px solid ${theme.colors.nodes.common.container.border}`,
              }}
              autoFocus
            />
          </div>

          {/* Linked connectors */}
          {matchingOutputs.length > 0 && (
            <>
              <div
                className="px-3 py-1.5 text-xs flex items-center gap-1"
                style={{
                  backgroundColor: theme.colors.nodes.common.footer.background,
                  borderBottom: `1px solid ${theme.colors.nodes.common.container.border}`,
                  color: theme.colors.nodes.common.text.muted,
                }}
              >
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                Linked ({matchingOutputs.length})
              </div>
              <div className="max-h-[120px] overflow-y-auto">
                {matchingOutputs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleNavigateToNode(t.tabId, t.id)}
                    className="w-full px-3 py-1.5 text-left hover:bg-blue-50 flex items-center gap-2 last:border-b-0"
                    style={{
                      borderBottom: `1px solid ${theme.colors.nodes.common.container.border}`,
                    }}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                    <span className="text-sm flex-1" style={{ color: theme.colors.nodes.common.text.primary }}>
                      {t.name}
                    </span>
                    <span className="text-xs" style={{ color: theme.colors.nodes.common.text.muted }}>
                      {t.tabName}
                    </span>
                    <ExternalLink className="w-3 h-3" style={{ color: theme.colors.nodes.common.text.muted }} />
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Available connectors to link to */}
          {(() => {
            const availableOutputs = getAllOutputTeleporters().filter(t => t.name !== name);
            const uniqueNames = [...new Set(availableOutputs.map(t => t.name))];
            if (uniqueNames.length === 0) return null;
            return (
              <>
                <div
                  className="px-3 py-1.5 text-xs"
                  style={{
                    backgroundColor: theme.colors.nodes.common.footer.background,
                    borderBottom: `1px solid ${theme.colors.nodes.common.container.border}`,
                    color: theme.colors.nodes.common.text.muted,
                  }}
                >
                  Available to link
                </div>
                <div className="max-h-[150px] overflow-y-auto">
                  {uniqueNames.map((linkName) => {
                    const connector = availableOutputs.find(t => t.name === linkName)!;
                    const count = availableOutputs.filter(t => t.name === linkName).length;
                    return (
                      <button
                        key={linkName}
                        onClick={() => {
                          setEditedName(linkName);
                          setNodes((nodes) =>
                            nodes.map((node) =>
                              node.id === id
                                ? { ...node, data: { ...node.data, name: linkName } }
                                : node
                            )
                          );
                          updateTeleporterName(id, linkName);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-green-50 flex items-center gap-2 last:border-b-0"
                        style={{
                          borderBottom: `1px solid ${theme.colors.nodes.common.container.border}`,
                        }}
                      >
                        <div className="w-2 h-2 rounded-full" style={{ background: connector.color }} />
                        <span className="text-sm flex-1" style={{ color: theme.colors.nodes.common.text.primary }}>
                          {linkName}
                        </span>
                        <span className="text-xs" style={{ color: theme.colors.nodes.common.text.muted }}>
                          {count} output{count > 1 ? 's' : ''}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            );
          })()}

          {/* Close button */}
          <div
            className="px-3 py-2 rounded-b-lg"
            style={{
              backgroundColor: theme.colors.nodes.common.footer.background,
              borderTop: `1px solid ${theme.colors.nodes.common.container.border}`,
            }}
          >
            <button
              onClick={() => setIsExpanded(false)}
              className="w-full px-2 py-1 text-xs rounded"
              style={{
                color: theme.colors.nodes.common.text.secondary,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.nodes.common.footer.background;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

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
    </>
  );
});

TeleportInNode.displayName = "TeleportInNode";

export default TeleportInNode;

/**
 * Default data for new teleport in nodes
 */
export function getDefaultTeleportInData(): TeleportInNodeData {
  return {
    name: "Connector",
    handleTypes: {
      'output': { outputSource: 'teleport', outputType: 'any' as HandleDataType },
    },
  };
}
